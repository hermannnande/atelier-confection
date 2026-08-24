const store = window.SiteStore;

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const readAdminProducts = () => {
  try {
    const raw = localStorage.getItem('atelier-admin-products');
    const products = raw ? JSON.parse(raw) : [];
    return Array.isArray(products) ? products : [];
  } catch (e) {
    return [];
  }
};

const readAdminCategories = () => {
  try {
    // Ne jamais remplacer la source locale de l'administration par le cache
    // public du catalogue : l'admin synchronise sa clé vers le serveur.
    const raw =
      localStorage.getItem('atelier-admin-categories') ||
      localStorage.getItem('atelier-categories-cache');
    const categories = raw ? JSON.parse(raw) : [];
    return Array.isArray(categories) ? categories : [];
  } catch (e) {
    return [];
  }
};

const getCategoryLabel = (slug, categories) => {
  const match = categories.find((cat) => cat.slug === slug);
  return match?.name || slug || '';
};

const buildColorDots = (colors) => {
  const colorMap = {
    noir: '#000',
    blanc: '#fff',
    beige: '#d2b48c',
    marron: '#8b4513',
    bleu: '#4682b4',
    'bleu ciel': '#87ceeb',
    rouge: '#b91c1c',
    rose: '#f472b6',
    vert: '#16a34a',
    jaune: '#facc15',
    gris: '#6b7280',
    'gris fonce': '#333',
    terracotta: '#C2452D',
    saumon: '#FA8072',
    orange: '#F97316',
    violet: '#8B5CF6',
    'violet clair': '#C084FC',
    'rouge bordeaux': '#7F1D1D',
    'bleu bic': '#2563EB',
    'vert treillis': '#15803D',
    'jaune moutarde': '#CA8A04',
  };

  return colors
    .slice(0, 4)
    .map((color) => {
      const key = normalizeText(color);
      const hex = colorMap[key] || '#ddd';
      const border = key === 'blanc' ? 'border: 1px solid #ddd;' : '';
      return `<span class="color-dot" style="background-color: ${hex}; ${border}"></span>`;
    })
    .join('');
};

const PAGE_SIZE = 12;

let adminProductsCache = [];
let filteredProductsCache = [];
let currentPage = 1;

const buildProductCard = (product, categories, index = 0) => {
  const name = product.name || 'Produit';
  const productId = String(
    product.id || (store?.slugify ? store.slugify(name) : name.toLowerCase().replace(/\s+/g, '-'))
  );
  const safeId = encodeURIComponent(productId);
  const categorySlug = product.category || '';
  const categoryLabel = getCategoryLabel(categorySlug, categories) || categorySlug;
  const price = Number(product.price) || 0;
  const originalPrice = Number(product.originalPrice) || 0;
  const image = product.thumbnail || (product.images && product.images[0]) || 'https://via.placeholder.com/600x600?text=Produit';
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const badge = originalPrice > price
    ? `<div class="product-badge">-${Math.round(((originalPrice - price) / originalPrice) * 100)}%</div>`
    : '';

  return `
    <a
      href="produit?id=${safeId}"
      class="product-card"
      data-id="${productId}"
      data-name="${name}"
      data-category="${categorySlug}"
      data-price="${price}"
      data-image="${image}"
      data-colors="${colors.join(',')}"
    >
      <div class="product-image">
        <img
          src="${image}"
          alt="${name}"
          loading="${index < 4 ? 'eager' : 'lazy'}"
          decoding="async"
          fetchpriority="${index === 0 ? 'high' : 'auto'}"
        />
        ${badge}
        <button class="product-favorite" aria-label="Ajouter aux favoris">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.27 2 7.5 2 5 4 3 6.5 3c1.74 0 3.41.81 4.5 2.09C12.09 3.81 13.76 3 15.5 3 18 3 20 5 20 7.5c0 3.77-3.4 6.86-8.55 11.68L12 20.5z" />
          </svg>
        </button>
      </div>
      <div class="product-info">
        <h3 class="product-name">${name}</h3>
        <p class="product-category">${categoryLabel}</p>
        <div class="product-price">
          <span class="price-current">${price.toLocaleString('fr-FR')} FCFA</span>
          ${originalPrice > price ? `<span class="price-original">${originalPrice.toLocaleString('fr-FR')} FCFA</span>` : ''}
        </div>
        <div class="product-colors">
          ${buildColorDots(colors)}
        </div>
      </div>
    </a>
  `;
};

const bindProductClickStore = () => {
  const container = document.querySelector('.products-container');
  if (!container || container.dataset.productStoreBound === 'true') return;

  container.dataset.productStoreBound = 'true';

  container.addEventListener('click', (event) => {
    const card = event.target.closest('.product-card');
    if (!card) return;

    const id = card.dataset.id;
    const source = adminProductsCache.length ? adminProductsCache : readAdminProducts();
    if (!adminProductsCache.length) adminProductsCache = source;
    const product = source.find((p) => {
      const fallbackId = store?.slugify
        ? store.slugify(p.name || '')
        : String(p.name || '').toLowerCase().replace(/\s+/g, '-');
      return String(p.id || fallbackId) === String(id);
    });
    if (!product) return;

    try {
      sessionStorage.setItem('atelier-selected-product', JSON.stringify(product));
      localStorage.setItem('atelier-selected-product', JSON.stringify(product));
    } catch (e) {
      // ignore storage errors
    }
  });
};

const getProductData = (card) => {
  const name = card.dataset.name || card.querySelector('.product-name')?.textContent.trim();
  const priceText = card.dataset.price || card.querySelector('.price-current')?.textContent;
  const image =
    card.dataset.image ||
    card.querySelector('img')?.getAttribute('src');
  const category = card.dataset.category || card.querySelector('.product-category')?.textContent.trim();
  const colors = card.dataset.colors
    ? card.dataset.colors.split(',').map((color) => color.trim())
    : [];
  const id = card.dataset.id || store.slugify(name);

  return {
    id,
    name,
    price: store.parsePrice(priceText),
    image,
    category,
    colors,
  };
};

const setFavoriteState = (btn, isFavorite) => {
  const svg = btn.querySelector('svg');
  if (!svg) return;

  if (isFavorite) {
    svg.style.fill = '#ff0000';
    svg.style.stroke = '#ff0000';
  } else {
    svg.style.fill = 'none';
    svg.style.stroke = '#000';
  }
};

const bindFavorites = () => {
  document.querySelectorAll('.product-favorite').forEach(btn => {
    const card = btn.closest('.product-card');
    if (!card) return;

    const product = getProductData(card);
    setFavoriteState(btn, store.isInWishlist(product.id));

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const result = store.toggleWishlist(product);
      setFavoriteState(btn, result.added);

      // Animation
      this.style.transform = 'scale(1.2)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 200);

      store.showToast(
        result.added ? "Ajouté à la liste d'envie" : 'Retiré des favoris',
        'info'
      );
    });
  });
};

const hydrateCategoryFilterOptions = () => {
  const select = document.getElementById('category-filter');
  if (!select) return;

  const categories = readAdminCategories().filter((cat) => cat.active !== false);
  if (!categories.length) return;

  const current = select.value || 'all';
  select.innerHTML = '<option value="all">Toutes les catégories</option>';
  categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.slug;
    option.textContent = cat.name;
    select.appendChild(option);
  });
  select.value = current;
};

// L'API (backend) est hébergée sur Vercel. Le site peut être servi depuis
// nousunique.com ou ailleurs : on appelle donc toujours l'API Vercel (CORS *).
const API_ORIGIN = 'https://atelier-confection.vercel.app';
const API_URL = API_ORIGIN + '/api/ecommerce/products?view=card';
const CATEGORIES_API_URL = API_ORIGIN + '/api/ecommerce/categories';

// Convertit un produit serveur (snake_case) vers le format du site (camelCase)
const mapApiProduct = (row) => ({
  id: String(row.id),
  name: row.name || '',
  category: row.category || '',
  price: Number(row.price) || 0,
  originalPrice: Number(row.original_price ?? row.originalPrice) || 0,
  stock: Number(row.stock) || 0,
  description: row.description || '',
  sizes: Array.isArray(row.sizes) ? row.sizes : [],
  colors: Array.isArray(row.colors) ? row.colors : [],
  images: Array.isArray(row.images) ? row.images : [],
  video: row.video || '',
  thumbnail: row.thumbnail || '',
  active: row.active !== false,
});

const refreshCategoriesFromServer = async () => {
  try {
    const res = await fetch(CATEGORIES_API_URL);
    if (!res.ok) return;
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.categories || []);
    if (!Array.isArray(rows) || !rows.length) return;
    const categories = rows.map((c) => ({
      id: String(c.id),
      name: c.name || '',
      slug: c.slug || '',
      description: c.description || '',
      active: c.active !== false,
    }));
    localStorage.setItem('atelier-categories-cache', JSON.stringify(categories));
  } catch (e) { /* non bloquant: cache local utilisé */ }
};

const renderProductList = (products) => {
  const container = document.querySelector('.products-container');
  if (!container) return;

  container.querySelectorAll('.product-card').forEach((card) => {
    productObserver.unobserve(card);
  });

  if (!products.length) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #6b7280;">
        Aucun produit ne correspond à vos filtres.
      </div>
    `;
    return;
  }

  const categories = readAdminCategories().filter((cat) => cat.active !== false);
  container.innerHTML = products
    .slice(0, PAGE_SIZE)
    .map((p, index) => buildProductCard(p, categories, index))
    .join('');
};

const finalizeRender = () => {
  hydrateCategoryFilterOptions();
  bindProductClickStore();
  applyCategoryFromURL();
  refreshCatalog({ resetPage: true });
};

// SOURCE DE VÉRITÉ: le serveur. Le localStorage ne sert que de cache hors-ligne.
const fetchAndRenderProducts = async () => {
  // Les deux requêtes sont indépendantes : les lancer ensemble évite une
  // attente réseau séquentielle avant d'afficher le catalogue.
  const categoriesPromise = refreshCategoriesFromServer();

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.products || []);
    const products = rows.map(mapApiProduct).filter((p) => p.active !== false);

    try {
      // Cette réponse est volontairement compacte. Elle ne doit jamais être
      // écrite dans les clés utilisées par l'administration ou par les fiches
      // produit complètes, sous peine d'effacer galerie, vidéo, stock, etc.
      localStorage.setItem('atelier-products-card-cache', JSON.stringify(products));
    } catch (e) { /* cache non bloquant */ }

    adminProductsCache = products;
    await categoriesPromise;
    finalizeRender();
    return;
  } catch (e) {
    console.warn('API produits indisponible, utilisation du cache local:', e);
  }

  // Secours hors-ligne: cache local
  const local = readAdminProducts();
  const cached = (() => {
    try {
      const raw = localStorage.getItem('atelier-products-card-cache');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  })();
  const fallback = local.length ? local : cached;
  adminProductsCache = fallback;
  await categoriesPromise;
  finalizeRender();
};

const observeAllCards = () => {
  document.querySelectorAll('.product-card').forEach(card => {
    productObserver.observe(card);
  });
};

// Filtres
const categoryFilter = document.getElementById('category-filter');
const colorFilter = document.getElementById('color-filter');
const sortFilter = document.getElementById('sort-filter');
const productCount = document.getElementById('product-count');
const pagination = document.querySelector('.pagination');
const paginationNumbers = pagination?.querySelector('.pagination-numbers');
const paginationButtons = pagination?.querySelectorAll('.pagination-btn') || [];
const prevBtn = paginationButtons[0];
const nextBtn = paginationButtons[paginationButtons.length - 1];

// Le compteur représente toujours le total filtré, pas seulement la page courante.
function updateProductCount(total = filteredProductsCache.length) {
  if (!productCount) return;
  productCount.textContent = String(total);
}

function getFilteredAndSortedProducts() {
  const categories = readAdminCategories().filter((cat) => cat.active !== false);
  const selectedCategory = normalizeText(categoryFilter?.value || 'all');
  const selectedColor = normalizeText(colorFilter?.value || 'all');
  const sortType = sortFilter?.value || 'recent';

  const products = adminProductsCache.filter((product) => {
    if (product.active === false) return false;

    if (selectedCategory && selectedCategory !== 'all') {
      const categorySlug = normalizeText(product.category || '');
      const categoryLabel = normalizeText(getCategoryLabel(product.category, categories));
      const categoryMatches =
        categorySlug === selectedCategory ||
        categorySlug.includes(selectedCategory) ||
        categoryLabel === selectedCategory ||
        categoryLabel.includes(selectedCategory);

      if (!categoryMatches) return false;
    }

    if (selectedColor && selectedColor !== 'all') {
      const colors = Array.isArray(product.colors)
        ? product.colors
        : String(product.colors || '').split(',');
      const colorMatches = colors.some((color) => {
        const normalizedColor = normalizeText(color);
        return normalizedColor === selectedColor || normalizedColor.includes(selectedColor);
      });

      if (!colorMatches) return false;
    }

    return true;
  });

  return products.sort((a, b) => {
    if (sortType === 'price-asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortType === 'price-desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortType === 'name') {
      return String(a.name || '').localeCompare(String(b.name || ''), 'fr', {
        sensitivity: 'base',
      });
    }
    return 0;
  });
}

function renderPagination(totalProducts) {
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);

  if (pagination) pagination.hidden = totalProducts === 0 || totalPages <= 1;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalProducts === 0;
  if (!paginationNumbers) return;

  const fragment = document.createDocumentFragment();
  for (let page = 1; page <= totalPages; page += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pagination-number${page === currentPage ? ' active' : ''}`;
    button.dataset.page = String(page);
    button.textContent = String(page);
    button.setAttribute('aria-label', `Page ${page}`);
    if (page === currentPage) button.setAttribute('aria-current', 'page');
    fragment.appendChild(button);
  }

  paginationNumbers.replaceChildren(fragment);
}

function renderCurrentPage({ scroll = false } = {}) {
  const totalPages = Math.max(1, Math.ceil(filteredProductsCache.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageProducts = filteredProductsCache.slice(start, start + PAGE_SIZE);

  renderProductList(pageProducts);
  updateProductCount(filteredProductsCache.length);
  renderPagination(filteredProductsCache.length);
  bindFavorites();
  observeAllCards();

  if (scroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function refreshCatalog({ resetPage = true } = {}) {
  filteredProductsCache = getFilteredAndSortedProducts();
  if (resetPage) currentPage = 1;
  renderCurrentPage();
}

function goToPage(page) {
  const totalPages = Math.max(1, Math.ceil(filteredProductsCache.length / PAGE_SIZE));
  const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  if (nextPage === currentPage) return;

  currentPage = nextPage;
  renderCurrentPage({ scroll: true });
}

[categoryFilter, colorFilter, sortFilter].forEach((filter) => {
  filter?.addEventListener('change', () => {
    refreshCatalog({ resetPage: true });
  });
});

// Fonction pour réinitialiser tous les filtres
function resetFilters() {
  if (categoryFilter) categoryFilter.value = 'all';
  if (colorFilter) colorFilter.value = 'all';
  if (sortFilter) sortFilter.value = 'recent';
  refreshCatalog({ resetPage: true });
}

const resetBtn = document.getElementById('reset-filters');
if (resetBtn) {
  resetBtn.addEventListener('click', resetFilters);
}

// Animation au scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const productObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '0';
      entry.target.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, 100);
      
      productObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Les boutons numérotés sont recréés à chaque rendu. La délégation conserve
// un seul listener sur leur conteneur, quelle que soit la page affichée.
paginationNumbers?.addEventListener('click', (event) => {
  const button = event.target.closest('.pagination-number');
  if (!button || !paginationNumbers.contains(button)) return;
  goToPage(button.dataset.page);
});

prevBtn?.addEventListener('click', () => goToPage(currentPage - 1));
nextBtn?.addEventListener('click', () => goToPage(currentPage + 1));

// Appliquer le filtre catégorie depuis l'URL (?cat=elegant)
const applyCategoryFromURL = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('cat');
    if (!catParam) return;

    const select = document.getElementById('category-filter');
    if (!select) return;

    const target = normalizeText(catParam);
    const options = Array.from(select.options);
    const match = options.find(opt => normalizeText(opt.value) === target || normalizeText(opt.textContent) === target);

    if (match) {
      select.value = match.value;
    } else {
      select.value = catParam;
    }
  } catch (e) { /* ignore */ }
};

// Démarrer seulement après l'initialisation des filtres, de la pagination et
// de l'observer afin qu'aucune réponse réseau rapide ne précède ces bindings.
fetchAndRenderProducts();
