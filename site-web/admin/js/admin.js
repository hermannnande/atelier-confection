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
      const isLocalhost =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const origin = forcedOrigin || (isLocalhost ? DEFAULT_ECOMMERCE_SYNC_ORIGIN : window.location.origin);
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
  
  const deleteProduct = (id) => {
    const products = getProducts();
    const product = products.find(p => p.id === id);
    const filtered = products.filter(p => p.id !== id);
    saveProducts(filtered);
    if (product) {
      addActivity('Produit supprimé', `${product.name} a été supprimé`);
    }
  };
  
  const getProduct = (id) => getProducts().find(p => p.id === id);
  
  // Catégories
  const getCategories = () => JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
  const saveCategories = (categories) => localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  
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
  
  const deleteCategory = (id) => {
    const categories = getCategories();
    const category = categories.find(c => c.id === id);
    const filtered = categories.filter(c => c.id !== id);
    saveCategories(filtered);
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
    // Catégories
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
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
