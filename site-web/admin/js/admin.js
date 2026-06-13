// AdminStore - Gestion centralisée des données
const AdminStore = (() => {
  const PRODUCTS_KEY = 'atelier-admin-products';
  const CATEGORIES_KEY = 'atelier-admin-categories';
  const ORDERS_KEY = 'atelier-admin-orders';
  const SITE_ORDERS_KEY = 'orders';
  const SETTINGS_KEY = 'atelier-admin-settings';

  // Sync catalogue e-commerce vers backend (Supabase via API Vercel)
  // Important: si l'admin est ouvert en local (localhost), on synchronise vers la prod Vercel
  // afin que le catalogue soit visible sur mobile / autres appareils.
  const DEFAULT_ECOMMERCE_SYNC_ORIGIN = 'https://atelier-confection.vercel.app';
  const resolveEcommerceSyncUrl = () => {
    try {
      const forcedOrigin = localStorage.getItem('atelier-ecom-sync-origin');
      const origin = forcedOrigin || DEFAULT_ECOMMERCE_SYNC_ORIGIN;
      return origin.replace(/\/$/, '') + '/api/ecommerce/products/sync';
    } catch (e) {
      return '/api/ecommerce/products/sync';
    }
  };
  const ECOMMERCE_SYNC_URL = resolveEcommerceSyncUrl();
  const ECOMMERCE_SYNC_TOKEN = 'ATELIER_ECOM_2026';

  const syncProductsToServer = async (products) => {
    try {
      // Ne pas bloquer l'UI admin si le backend est indisponible
      await fetch(ECOMMERCE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ECOMMERCE_SYNC_TOKEN, products }),
      });
    } catch (e) {
      console.warn('⚠️ Sync produits échouée (non bloquant):', e);
    }
  };
  
  // Catégories par défaut
  const defaultCategories = [
    { id: '1', name: 'Élégant', slug: 'elegant', description: 'Collection élégante et raffinée', active: true },
    { id: '2', name: 'Perle Rare', slug: 'perle-rare', description: 'Pièces uniques et précieuses', active: true },
    { id: '3', name: 'Perle Unique', slug: 'perle-unique', description: 'Créations exclusives', active: true },
    { id: '4', name: 'Style Event', slug: 'style-event', description: 'Tenues pour événements', active: true }
  ];
  
  // Initialiser les données par défaut
  const init = () => {
    if (!localStorage.getItem(CATEGORIES_KEY)) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
    }
    if (!localStorage.getItem(PRODUCTS_KEY)) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(ORDERS_KEY)) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify([]));
    }
    // Sync initial pour rendre le catalogue disponible sur mobile
    try {
      const products = getProducts();
      if (Array.isArray(products) && products.length) {
        syncProductsToServer(products);
      }
    } catch (e) {
      // ignore
    }
    // Recharger les catégories depuis le serveur (source de vérité)
    try { refreshCategoriesFromServer(); } catch (e) { /* ignore */ }
  };
  
  // Produits
  const getProducts = () => JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
  const saveProducts = (products) => {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      // Sync en arrière-plan (pour que mobile voie les produits)
      syncProductsToServer(products);
      return true;
    } catch (error) {
      console.error('❌ Échec sauvegarde produits (localStorage saturé ?)', error);
      return false;
    }
  };
  
  const addProduct = (product) => {
    const products = getProducts();
    const newProduct = {
      ...product,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    products.push(newProduct);
    if (!saveProducts(products)) {
      return { error: 'storage' };
    }
    addActivity('Produit ajouté', `${product.name} a été ajouté au catalogue`);
    return newProduct;
  };
  
  const updateProduct = (id, updates) => {
    const products = getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = {
        ...products[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      if (!saveProducts(products)) {
        return { error: 'storage' };
      }
      addActivity('Produit modifié', `${products[index].name} a été modifié`);
      return products[index];
    }
    return null;
  };
  
  const deleteProductFromServer = async (id) => {
    try {
      const origin = resolveEcommerceSyncUrl().replace('/api/ecommerce/products/sync', '');
      await fetch(`${origin}/api/ecommerce/products/${encodeURIComponent(id)}?token=${ECOMMERCE_SYNC_TOKEN}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Suppression serveur echouee (non bloquant):', e);
    }
  };

  const deleteProduct = (id) => {
    const products = getProducts();
    const product = products.find(p => p.id === id);
    const filtered = products.filter(p => p.id !== id);
    saveProducts(filtered);
    deleteProductFromServer(id);
    if (product) {
      addActivity('Produit supprimé', `${product.name} a été supprimé`);
    }
  };
  
  const getProduct = (id) => getProducts().find(p => p.id === id);

  // Convertir un produit serveur (snake_case) vers le format admin (camelCase)
  const mapServerProduct = (row) => ({
    id: String(row.id),
    name: row.name || '',
    category: row.category || '',
    price: Number(row.price) || 0,
    originalPrice: Number(row.original_price) || 0,
    stock: Number(row.stock) || 0,
    description: row.description || '',
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    colors: Array.isArray(row.colors) ? row.colors : [],
    images: Array.isArray(row.images) ? row.images : [],
    video: row.video || '',
    thumbnail: row.thumbnail || '',
    active: row.active !== false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  });

  // Recharger le catalogue depuis le serveur (Supabase) et fusionner avec le local.
  // Permet de voir les produits crees depuis un autre navigateur/appareil.
  const refreshProductsFromServer = async () => {
    try {
      const origin = resolveEcommerceSyncUrl().replace('/api/ecommerce/products/sync', '');
      const res = await fetch(`${origin}/api/ecommerce/products`);
      if (!res.ok) return null;
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.products || []);
      if (!Array.isArray(rows) || !rows.length) return null;

      const server = rows.map(mapServerProduct);
      const serverIds = new Set(server.map(p => String(p.id)));
      // Conserver les produits locaux pas encore synchronises vers le serveur
      const localOnly = getProducts().filter(p => !serverIds.has(String(p.id)));
      const merged = [...server, ...localOnly];

      try {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn('localStorage sature, liste serveur non mise en cache:', e);
      }
      return merged;
    } catch (e) {
      console.warn('Chargement produits serveur echoue (non bloquant):', e);
      return null;
    }
  };
  
  // Catégories
  const getCategories = () => JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');

  const syncCategoriesToServer = async (categories) => {
    try {
      const url = resolveEcommerceSyncUrl().replace('/api/ecommerce/products/sync', '/api/ecommerce/categories/sync');
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ECOMMERCE_SYNC_TOKEN, categories }),
      });
    } catch (e) {
      console.warn('Sync catégories échouée (non bloquant):', e);
    }
  };

  const saveCategories = (categories) => {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    syncCategoriesToServer(categories);
  };

  // Recharger les catégories depuis le serveur
  const refreshCategoriesFromServer = async () => {
    try {
      const origin = resolveEcommerceSyncUrl().replace('/api/ecommerce/products/sync', '');
      const res = await fetch(`${origin}/api/ecommerce/categories`);
      if (!res.ok) return null;
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.categories || []);
      if (!Array.isArray(rows) || !rows.length) return null;

      const server = rows.map((c) => ({
        id: String(c.id),
        name: c.name || '',
        slug: c.slug || '',
        description: c.description || '',
        active: c.active !== false,
        createdAt: c.created_at || new Date().toISOString(),
      }));
      const serverIds = new Set(server.map(c => String(c.id)));
      const localOnly = getCategories().filter(c => !serverIds.has(String(c.id)));
      const merged = [...server, ...localOnly];
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(merged));
      // Pousser les catégories locales pas encore synchronisées
      if (localOnly.length) syncCategoriesToServer(merged);
      return merged;
    } catch (e) {
      console.warn('Chargement catégories serveur échoué (non bloquant):', e);
      return null;
    }
  };

  const addCategory = (category) => {
    const categories = getCategories();
    const newCategory = {
      ...category,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    categories.push(newCategory);
    saveCategories(categories);
    addActivity('Catégorie ajoutée', `${category.name} a été créée`);
    return newCategory;
  };
  
  const updateCategory = (id, updates) => {
    const categories = getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updates };
      saveCategories(categories);
      addActivity('Catégorie modifiée', `${categories[index].name} a été modifiée`);
      return categories[index];
    }
    return null;
  };
  
  const deleteCategoryFromServer = async (id) => {
    try {
      const origin = resolveEcommerceSyncUrl().replace('/api/ecommerce/products/sync', '');
      await fetch(`${origin}/api/ecommerce/categories/${encodeURIComponent(id)}?token=${ECOMMERCE_SYNC_TOKEN}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Suppression catégorie serveur échouée (non bloquant):', e);
    }
  };

  const deleteCategory = (id) => {
    const categories = getCategories();
    const category = categories.find(c => c.id === id);
    const filtered = categories.filter(c => c.id !== id);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered));
    deleteCategoryFromServer(id);
    if (category) {
      addActivity('Catégorie supprimée', `${category.name} a été supprimée`);
    }
  };
  
  // Commandes
  const getOrders = () => {
    const siteOrders = JSON.parse(localStorage.getItem(SITE_ORDERS_KEY) || '[]');
    if (siteOrders.length) return siteOrders;
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  };
  const saveOrders = (orders) => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    localStorage.setItem(SITE_ORDERS_KEY, JSON.stringify(orders));
  };
  
  const updateOrderStatus = (id, status) => {
    const orders = getOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index].status = status;
      orders[index].updatedAt = new Date().toISOString();
      saveOrders(orders);
      addActivity('Commande mise à jour', `Commande #${id} - statut: ${status}`);
      return orders[index];
    }
    return null;
  };
  
  // Paramètres
  const getSettings = () => JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const saveSetting = (key, value) => {
    const settings = getSettings();
    settings[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  };
  
  // Stats
  const parseAmount = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return Number(String(value).replace(/[^0-9]/g, '')) || 0;
  };

  const getStats = () => {
    const products = getProducts();
    const categories = getCategories();
    const orders = getOrders();
    
    const totalRevenue = orders
      .filter(o => ['completed', 'livree'].includes(o.status))
      .reduce((sum, o) => sum + parseAmount(o.total), 0);
    
    return {
      productsCount: products.length,
      categoriesCount: categories.length,
      ordersCount: orders.length,
      totalRevenue
    };
  };
  
  return {
    init,
    // Produits
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    refreshProductsFromServer,
    // Catégories
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategoriesFromServer,
    // Commandes
    getOrders,
    updateOrderStatus,
    // Paramètres
    getSettings,
    saveSetting,
    // Stats
    getStats
  };
})();

// Initialiser le store
AdminStore.init();

// Mettre à jour les stats sur le dashboard
if (document.getElementById('statProducts')) {
  const stats = AdminStore.getStats();
  
  document.getElementById('statProducts').textContent = stats.productsCount;
  document.getElementById('statCategories').textContent = stats.categoriesCount;
  document.getElementById('statOrders').textContent = stats.ordersCount;
    const revenueEl = document.getElementById('statRevenue');
    if (revenueEl) {
      revenueEl.textContent = `${stats.totalRevenue.toLocaleString('fr-FR')} FCFA`;
    }
  
  // Afficher les activités récentes
  const ACTIVITY_KEY = 'atelier-admin-activity';
  const activities = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
  const activityList = document.getElementById('activityList');
  
  if (activities.length > 0 && activityList) {
    activityList.innerHTML = activities.slice(0, 10).map(activity => {
      const date = new Date(activity.timestamp);
      const timeAgo = getTimeAgo(date);
      
      return `
        <div class="activity-item" style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <strong>${activity.type}</strong>
              <p style="font-size: 13px; color: #6b7280; margin: 4px 0 0;">${activity.message}</p>
            </div>
            <span style="font-size: 12px; color: #9ca3af; white-space: nowrap;">${timeAgo}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Fonction utilitaire pour "il y a X temps"
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'À l\'instant';
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
  if (seconds < 2592000) return `Il y a ${Math.floor(seconds / 86400)}j`;
  return date.toLocaleDateString('fr-FR');
}

console.log('✓ AdminStore chargé');
