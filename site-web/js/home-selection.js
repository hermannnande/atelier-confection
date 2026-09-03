(() => {
  'use strict';

  const HOME_PRODUCTS_LIMIT = 12;
  const HOME_PRODUCTS_API = 'https://atelier-confection.vercel.app/api/ecommerce/products';
  const HOME_FALLBACK_PRODUCTS = [
    { id: 'robe-elegante-marron', name: 'Robe Élégante Marron', category: 'elegant', price: 15000, image: 'https://obrille.com/wp-content/uploads/2026/01/ChatGPT-Image-19-janv.-2026-18_33_27.png' },
    { id: 'robe-blanche-elegante', name: 'Robe Blanche Élégante', category: 'perle-rare', price: 16500, image: 'https://obrille.com/wp-content/uploads/2026/01/A1.png' },
    { id: 'ensemble-bleu-ciel', name: 'Ensemble Bleu Ciel', category: 'style-event', price: 18000, image: 'https://obrille.com/wp-content/uploads/2026/01/A3.png' },
    { id: 'robe-marron-premium', name: 'Robe Marron Premium', category: 'perle-unique', price: 17000, image: 'https://obrille.com/wp-content/uploads/2026/01/gesvd.jpg' },
    { id: 'ensemble-blanc-chic', name: 'Ensemble Blanc Chic', category: 'elegant', price: 19000, image: 'https://obrille.com/wp-content/uploads/2026/01/vjhbj.png' },
    { id: 'robe-noire-elegante', name: 'Robe Noire Élégante', category: 'perle-rare', price: 14500, image: 'https://obrille.com/wp-content/uploads/2026/01/B2.png' },
  ];

  let homeCatalogProducts = [];

  const slugify = (value = '') => String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const escapeMarkup = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));

  const getSafeImageUrl = (value = '') => {
    try {
      const parsed = new URL(String(value), window.location.href);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (error) {
      return '';
    }
  };

  const normalizeProduct = (product = {}) => {
    const name = String(product.name || '').trim();
    const sourceImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const image = getSafeImageUrl(product.thumbnail || product.image || sourceImages[0]);
    const images = sourceImages.length ? sourceImages : (image ? [image] : []);

    return {
      ...product,
      id: String(product.id || slugify(name)),
      name,
      category: String(product.category || '').trim(),
      price: Number(product.price) || 0,
      originalPrice: Number(product.originalPrice ?? product.original_price) || 0,
      image,
      thumbnail: getSafeImageUrl(product.thumbnail) || image,
      images,
      colors: Array.isArray(product.colors) ? product.colors.filter(Boolean) : [],
      sizes: Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [],
      createdAt: product.createdAt || product.created_at || '',
      updatedAt: product.updatedAt || product.updated_at || '',
      active: product.active !== false,
    };
  };

  const normalizeCatalog = (products) => {
    if (!Array.isArray(products)) return [];
    const unique = new Map();
    products
      .map(normalizeProduct)
      .filter((product) => product.active && product.id && product.name && product.image)
      .forEach((product) => unique.set(product.id, product));
    return Array.from(unique.values());
  };

  const readProducts = (key) => {
    try {
      return normalizeCatalog(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch (error) {
      return [];
    }
  };

  const getCachedProducts = () => {
    const apiCache = readProducts('atelier-products-cache');
    return apiCache.length ? apiCache : readProducts('atelier-admin-products');
  };

  const shuffle = (items) => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  };

  const getCreatedTime = (product) => {
    const timestamp = Date.parse(product.createdAt || product.updatedAt || '');
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const selectBalancedProducts = (products) => {
    const target = Math.min(HOME_PRODUCTS_LIMIT, products.length);
    if (!target) return { products: [], newestIds: new Set() };

    const newest = [...products]
      .filter((product) => getCreatedTime(product) > 0)
      .sort((first, second) => getCreatedTime(second) - getCreatedTime(first))
      .slice(0, Math.min(2, target));
    const newestIds = new Set(newest.map((product) => product.id));
    const grouped = new Map();

    products
      .filter((product) => !newestIds.has(product.id))
      .forEach((product) => {
        const groupKey = product.category || 'collection';
        if (!grouped.has(groupKey)) grouped.set(groupKey, []);
        grouped.get(groupKey).push(product);
      });

    const buckets = shuffle(
      Array.from(grouped.values()).map((group) => shuffle(group)),
    );
    const selected = [...newest];

    while (selected.length < target && buckets.some((bucket) => bucket.length)) {
      buckets.forEach((bucket) => {
        if (selected.length < target && bucket.length) selected.push(bucket.shift());
      });
    }

    return {
      products: shuffle(selected).slice(0, target),
      newestIds,
    };
  };

  const getCategoryLabel = (slug = '') => String(slug || 'Collection')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const getColorStyle = (color = '') => {
    const colorMap = {
      noir: '#111111', blanc: '#ffffff', beige: '#d8c3a5', marron: '#7c4a2d',
      rouge: '#a91e2c', rose: '#df8ca5', vert: '#47765b', jaune: '#d7ad3d',
      bleu: '#416a8a', 'bleu ciel': '#8dbed1', gris: '#777777',
      bordeaux: '#6f1d2b', violet: '#73528f', orange: '#d97936',
    };
    const key = String(color).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return colorMap[key] || '#d7d4cd';
  };

  const renderCard = (product, index, newestIds) => {
    const id = escapeMarkup(product.id);
    const name = escapeMarkup(product.name);
    const category = escapeMarkup(getCategoryLabel(product.category));
    const image = escapeMarkup(product.image);
    const price = product.price.toLocaleString('fr-FR');
    const hasDiscount = product.originalPrice > product.price && product.price > 0;
    const discount = hasDiscount
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;
    const badge = newestIds.has(product.id)
      ? '<span class="home-product-badge home-product-badge--new">Nouveauté</span>'
      : hasDiscount
        ? `<span class="home-product-badge">-${discount}%</span>`
        : '';
    const colors = product.colors.slice(0, 4).map((color) => `
      <span
        class="home-product-color"
        style="--swatch: ${getColorStyle(color)}"
        title="${escapeMarkup(color)}"
      ></span>
    `).join('');

    return `
      <a
        href="pages/produit?id=${encodeURIComponent(product.id)}"
        class="product-card home-product-card"
        data-home-product-id="${id}"
        style="--card-order: ${index}"
        aria-label="Découvrir ${name}, ${price} FCFA"
      >
        <div class="product-image">
          <img src="${image}" alt="${name}" loading="lazy" decoding="async" fetchpriority="low">
          ${badge}
          <span class="home-product-discover">
            Voir le modèle
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </div>
        <div class="product-info">
          <div class="home-product-eyebrow">
            <p class="product-category">${category}</p>
            <span>${String(index + 1).padStart(2, '0')}</span>
          </div>
          <h3 class="product-name">${name}</h3>
          <div class="home-product-footer">
            <div class="product-price">
              <span class="price-current">${price} FCFA</span>
              ${hasDiscount ? `<span class="price-original">${product.originalPrice.toLocaleString('fr-FR')} FCFA</span>` : ''}
            </div>
            ${colors ? `<span class="home-product-colors" aria-label="${product.colors.length} coloris disponibles">${colors}</span>` : ''}
          </div>
        </div>
      </a>
    `;
  };

  const bindProductNavigation = (grid) => {
    if (grid.dataset.productNavigationBound === 'true') return;
    grid.dataset.productNavigationBound = 'true';
    grid.addEventListener('click', (event) => {
      const card = event.target.closest('[data-home-product-id]');
      if (!card) return;
      const product = homeCatalogProducts.find((item) => item.id === card.dataset.homeProductId);
      if (!product) return;
      try {
        sessionStorage.setItem('atelier-selected-product', JSON.stringify(product));
        localStorage.setItem('atelier-selected-product', JSON.stringify(product));
      } catch (error) {
        // La fiche produit pourra encore utiliser son propre chargement serveur.
      }
    });
  };

  const renderCatalog = (products) => {
    const grid = document.getElementById('homeBestsellersGrid');
    if (!grid) return;
    homeCatalogProducts = normalizeCatalog(products);
    const selection = selectBalancedProducts(homeCatalogProducts);

    grid.innerHTML = selection.products.length
      ? selection.products.map((product, index) => renderCard(product, index, selection.newestIds)).join('')
      : '<p class="home-products-empty">La sélection est momentanément indisponible. Retrouvez tous nos modèles dans la boutique.</p>';

    grid.setAttribute('aria-busy', 'false');
    bindProductNavigation(grid);
    requestAnimationFrame(() => {
      grid.querySelectorAll('.home-product-card').forEach((card) => card.classList.add('is-ready'));
    });
  };

  const getCatalogSignature = (products) => products
    .map((product) => [
      product.id,
      product.name,
      product.category,
      product.price,
      product.originalPrice,
      product.image,
      product.createdAt,
      product.updatedAt,
      product.active,
    ].join(':'))
    .sort()
    .join('|');

  const loadHomeSelection = async () => {
    const grid = document.getElementById('homeBestsellersGrid');
    if (!grid) return;

    const cachedProducts = getCachedProducts();
    renderCatalog(cachedProducts.length ? cachedProducts : HOME_FALLBACK_PRODUCTS);
    const initialSignature = getCatalogSignature(homeCatalogProducts);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6500);

    try {
      const response = await fetch(HOME_PRODUCTS_API, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) return;

      const payload = await response.json();
      const apiProducts = normalizeCatalog(Array.isArray(payload) ? payload : payload.products);
      if (!apiProducts.length) return;

      try {
        localStorage.setItem('atelier-products-cache', JSON.stringify(apiProducts));
      } catch (error) {
        // L'affichage reste fonctionnel si le stockage du navigateur est saturé.
      }

      if (getCatalogSignature(apiProducts) !== initialSignature) {
        renderCatalog(apiProducts);
      } else {
        homeCatalogProducts = apiProducts;
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Catalogue de la page d’accueil indisponible:', error);
      }
    } finally {
      window.clearTimeout(timeout);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHomeSelection, { once: true });
  } else {
    loadHomeSelection();
  }
})();
