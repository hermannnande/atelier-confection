/* Produit (page détail) - Chargement dynamique depuis l'admin
   - Boutique: lien = produit.html?id=<product.id>
   - Ici: on lit localStorage('atelier-admin-products') et on remplit la page
   - Galerie: 5 images portrait + 1 vidéo (optionnelle)
   - Vignette boutique 600x600: utilisée uniquement sur boutique, pas ici */

if (window.__PRODUIT_JS_INIT) {
  console.warn('produit.js déjà chargé, arrêt.');
} else {
  window.__PRODUIT_JS_INIT = true;
  window.__PRODUIT_LOADED = true;

  (function () {
const getStore = () => window.SiteStore;
const productRoot = document.querySelector('.product-page');

const parsePrice = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^0-9]/g, '')) || 0;
};

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const readJsonArray = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const readSelectedProduct = () => {
  try {
    const sessionRaw = sessionStorage.getItem('atelier-selected-product');
    if (sessionRaw) return JSON.parse(sessionRaw);
    const localRaw = localStorage.getItem('atelier-selected-product');
    return localRaw ? JSON.parse(localRaw) : null;
  } catch (e) {
    return null;
  }
};

const getProductIdFromUrl = () => {
  const id = new URLSearchParams(window.location.search).get('id');
  return id ? String(id) : '';
};

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const readAllProducts = () => {
  const admin = readJsonArray('atelier-admin-products');
  if (admin.length) return admin;
  const cache = readJsonArray('atelier-products-cache');
  return cache.length ? cache : [];
};

const fetchEcommerceProductFromApi = async (id) => {
  if (!id) return null;
  try {
    const res = await fetch(`/api/ecommerce/products/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.product || null;
  } catch (e) {
    return null;
  }
};

const fetchEcommerceProductsFromApi = async () => {
  try {
    const res = await fetch('/api/ecommerce/products', { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const json = await res.json();
    const products = Array.isArray(json?.products) ? json.products : [];
    return products;
  } catch (e) {
    return [];
  }
};

const getAdminProductById = (id) => {
  if (!id) return null;
  const products = readAllProducts();
  const byId = products.find((p) => String(p.id) === String(id));
  if (byId) return byId;
  return products.find((p) => slugify(p.name || '') === String(id)) || null;
};

const getCategoryLabel = (slug) => {
  const cats = readJsonArray('atelier-admin-categories');
  return cats.find((c) => c.slug === slug)?.name || slug || 'Produits';
};

const isHexColor = (value = '') => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value).trim());

const colorToHex = (name = '') => {
  const raw = String(name || '').trim();
  if (isHexColor(raw)) return raw;

  const map = {
    noir: '#000000',
    blanc: '#ffffff',
    beige: '#d2b48c',
    marron: '#8b4513',
    rouge: '#b91c1c',
    rose: '#f472b6',
    orange: '#fb923c',
    vert: '#16a34a',
    jaune: '#facc15',
    bleu: '#4682b4',
    'bleu ciel': '#87ceeb',
    violet: '#9333ea',
    bordeaux: '#7f1d1d',
    gris: '#6b7280',
    'gris fonce': '#333333',
  };
  return map[normalizeText(name)] || '#dddddd';
};

const normalizeColorList = (colors) => {
  if (Array.isArray(colors)) {
    return colors
      .flatMap((c) => {
        const raw = String(c || '').trim();
        if (!raw) return [];

        // Support format Postgres text[] sérialisé: "{Noir,Blanc}"
        const unwrapped =
          raw.startsWith('{') && raw.endsWith('}') ? raw.slice(1, -1) : raw;

        // Support cas "Noir, Blanc" stocké dans UNE entrée
        if (unwrapped.includes(',')) {
          return unwrapped
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean);
        }
        return [unwrapped];
      })
      .filter(Boolean);
  }

  if (typeof colors === 'string') {
    const raw = colors.trim();
    if (!raw) return [];

    // Support JSON string: '["Noir","Blanc"]'
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map((c) => String(c || '').trim())
            .filter(Boolean);
        }
      } catch (e) {
        // fallback split below
      }
    }

    const unwrapped =
      raw.startsWith('{') && raw.endsWith('}') ? raw.slice(1, -1) : raw;

    return unwrapped
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }

  return [];
};

const getUpdatedTs = (product) => {
  const raw =
    product?.updatedAt ||
    product?.updated_at ||
    product?.createdAt ||
    product?.created_at;
  const ts = Date.parse(String(raw || ''));
  return Number.isFinite(ts) ? ts : 0;
};

const getColorsLen = (product) => normalizeColorList(product?.colors).length;

const pickBestProduct = (a, b) => {
  if (!a) return b || null;
  if (!b) return a || null;

  const aTs = getUpdatedTs(a);
  const bTs = getUpdatedTs(b);
  if (bTs !== aTs) return bTs > aTs ? b : a;

  const aColors = getColorsLen(a);
  const bColors = getColorsLen(b);
  if (bColors !== aColors) return bColors > aColors ? b : a;

  const aImages = Array.isArray(a?.images) ? a.images.length : 0;
  const bImages = Array.isArray(b?.images) ? b.images.length : 0;
  if (bImages !== aImages) return bImages > aImages ? b : a;

  return a;
};

const persistSelectedProduct = (product) => {
  if (!product?.id) return;
  try {
    sessionStorage.setItem('atelier-selected-product', JSON.stringify(product));
    localStorage.setItem('atelier-selected-product', JSON.stringify(product));
  } catch (e) {
    // ignore
  }
};

const upsertProductToStorageList = (key, product, max = 200) => {
  if (!product?.id) return;
  try {
    const existing = readJsonArray(key);
    const merged = [product, ...existing.filter((p) => String(p?.id) !== String(product.id))];
    localStorage.setItem(key, JSON.stringify(merged.slice(0, max)));
  } catch (e) {
    // ignore
  }
};

// ===== TYPEWRITER =====
let __typewriterTimeoutId = null;
let __typewriterRunId = 0;
const typewriterEffect = () => {
  const titleElement = document.querySelector('.product-title');
  if (!titleElement) return;
  // Éviter de relancer si déjà en cours
  if (titleElement.dataset.typewriterActive === 'true') return;

  const fullText = titleElement.dataset.fullText || titleElement.textContent.trim();
  if (!fullText) return;

  titleElement.dataset.fullText = fullText;
  titleElement.dataset.typewriterActive = 'true';

  // Annuler une animation précédente (ex: "Chargement..." puis vrai titre)
  __typewriterRunId += 1;
  const runId = __typewriterRunId;
  if (__typewriterTimeoutId) {
    try {
      clearTimeout(__typewriterTimeoutId);
    } catch (e) {}
    __typewriterTimeoutId = null;
  }

  let charIndex = 0;
  let isDeleting = false;

  const type = () => {
    if (runId !== __typewriterRunId) return;

    // Phase d'écriture
    if (!isDeleting && charIndex <= fullText.length) {
      titleElement.textContent = fullText.substring(0, charIndex);
      charIndex += 1;
      __typewriterTimeoutId = setTimeout(type, 55);
      return;
    }

    // Pause après avoir tout écrit
    if (!isDeleting && charIndex > fullText.length) {
      isDeleting = true;
      __typewriterTimeoutId = setTimeout(type, 1800);
      return;
    }

    // Phase de suppression
    if (isDeleting && charIndex > 0) {
      charIndex -= 1;
      titleElement.textContent = fullText.substring(0, charIndex);
      __typewriterTimeoutId = setTimeout(type, 40);
      return;
    }

    // Pause avant de recommencer + boucle infinie
    if (isDeleting && charIndex === 0) {
      isDeleting = false;
      __typewriterTimeoutId = setTimeout(type, 500);
      return;
    }
  };

  type();
};

// ===== OPTIONS (TAILLE / COULEUR) =====
const getSelectedSize = () => document.querySelector('.size-btn.active')?.dataset.size;
const getSelectedColor = () => document.querySelector('.color-btn.active')?.dataset.color;

const bindSizeButtons = () => {
  document.querySelectorAll('.size-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
};

const bindColorButtons = () => {
  document.querySelectorAll('.color-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
};

const renderSizes = (sizes) => {
  const container = document.querySelector('.size-grid');
  if (!container) return;
  const list = Array.isArray(sizes) && sizes.length ? sizes : ['S', 'M', 'L', 'XL'];
  container.innerHTML = list
    .map(
      (s, idx) =>
        `<button class="size-btn${idx === 0 ? ' active' : ''}" type="button" data-size="${s}">${s}</button>`
    )
    .join('');
};

const renderColors = (colors) => {
  const container = document.querySelector('.color-grid');
  if (!container) return;
  const list = normalizeColorList(colors);
  const finalList = list.length ? list : ['Noir'];
  container.innerHTML = finalList
    .map((c, idx) => {
      const hex = colorToHex(c);
      const border = normalizeText(c) === 'blanc' ? 'border: 2px solid #ddd;' : '';
      return `<button class="color-btn${idx === 0 ? ' active' : ''}" type="button" data-color="${c}" style="background-color: ${hex}; ${border}" aria-label="${c}"></button>`;
    })
    .join('');
};

// ===== GALERIE (PORTRAIT + VIDEO) =====
let galleryObserver = null;
let zoomImages = [];
let currentZoomIndex = 0;

const zoomModal = document.getElementById('imageZoomModal');
const zoomImage = zoomModal?.querySelector('.zoom-modal-image');
const zoomClose = zoomModal?.querySelector('.zoom-modal-close');
const zoomOverlay = zoomModal?.querySelector('.zoom-modal-overlay');

const setupGalleryObserver = () => {
  if (galleryObserver) galleryObserver.disconnect();

  const observerOptions = { threshold: 0.2, rootMargin: '0px 0px -100px 0px' };
  galleryObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = '0';
      entry.target.style.transform = 'translateY(30px)';
      setTimeout(() => {
        entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, 100);
      galleryObserver?.unobserve(entry.target);
    });
  }, observerOptions);

  document.querySelectorAll('.gallery-item').forEach((item) => galleryObserver.observe(item));
};

const openZoomModal = (index = 0) => {
  if (!zoomModal || !zoomImage || !zoomImages.length) return;
  currentZoomIndex = index;
  zoomImage.src = zoomImages[currentZoomIndex] || '';
  zoomModal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeZoomModal = () => {
  if (!zoomModal) return;
  zoomModal.classList.remove('active');
  document.body.style.overflow = '';
};

const nextZoomImage = () => {
  if (!zoomImages.length) return;
  currentZoomIndex = (currentZoomIndex + 1) % zoomImages.length;
  if (zoomImage) zoomImage.src = zoomImages[currentZoomIndex] || '';
};

const prevZoomImage = () => {
  if (!zoomImages.length) return;
  currentZoomIndex = (currentZoomIndex - 1 + zoomImages.length) % zoomImages.length;
  if (zoomImage) zoomImage.src = zoomImages[currentZoomIndex] || '';
};

const setupZoom = () => {
  const items = Array.from(document.querySelectorAll('.gallery-item'));
  zoomImages = items
    .map((item) => {
      const media = item.querySelector('img, video');
      if (!media) return null;
      return media.tagName === 'VIDEO' ? media.getAttribute('poster') : media.getAttribute('src');
    })
    .filter(Boolean);

  items.forEach((item, index) => {
    item.onclick = () => openZoomModal(index);
  });
};

zoomClose?.addEventListener('click', closeZoomModal);
zoomOverlay?.addEventListener('click', closeZoomModal);
zoomImage?.addEventListener('click', closeZoomModal);
document.querySelector('.zoom-next')?.addEventListener('click', nextZoomImage);
document.querySelector('.zoom-prev')?.addEventListener('click', prevZoomImage);
document.addEventListener('keydown', (e) => {
  if (!zoomModal?.classList.contains('active')) return;
  if (e.key === 'Escape') closeZoomModal();
  if (e.key === 'ArrowRight') nextZoomImage();
  if (e.key === 'ArrowLeft') prevZoomImage();
});

const renderGallery = (product) => {
  const gallery = document.querySelector('.product-gallery');
  if (!gallery) return;

  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const videoUrl = product.video ? String(product.video) : '';

  const img1 = images[0] || product.image || product.thumbnail || '';
  const img2 = images[1] || '';
  const img3 = images[2] || '';
  const img4 = images[3] || '';
  const img5 = images[4] || '';
  const poster = images[0] || product.thumbnail || img4 || img2 || '';

  const parts = [];

  if (img1) {
    parts.push(`
      <div class="gallery-item gallery-item-1">
        <img src="${img1}" alt="${product.name || 'Produit'} - Vue 1" loading="lazy" />
      </div>
    `);
  }

  // Slot vidéo (en haut à droite)
  if (videoUrl) {
    parts.push(`
      <div class="gallery-item gallery-item-video">
        <video autoplay muted loop playsinline ${poster ? `poster="${poster}"` : ''}>
          <source src="${videoUrl}" type="video/mp4" />
        </video>
      </div>
    `);
  } else if (img2) {
    // Pas de vidéo: on met img2 à la place
    parts.push(`
      <div class="gallery-item gallery-item-video">
        <img src="${img2}" alt="${product.name || 'Produit'} - Vue 2" loading="lazy" />
      </div>
    `);
  }

  // Images restantes (seulement si pas déjà utilisées dans le slot vidéo)
  if (img2 && videoUrl) {
    // Si vidéo existe, img2 va en bas à gauche
    parts.push(`
      <div class="gallery-item gallery-item-2">
        <img src="${img2}" alt="${product.name || 'Produit'} - Vue 2" loading="lazy" />
      </div>
    `);
  }
  
  if (img3) {
    parts.push(`
      <div class="gallery-item gallery-item-3">
        <img src="${img3}" alt="${product.name || 'Produit'} - Vue 3" loading="lazy" />
      </div>
    `);
  }
  
  if (img4) {
    parts.push(`
      <div class="gallery-item gallery-item-4">
        <img src="${img4}" alt="${product.name || 'Produit'} - Vue 4" loading="lazy" />
      </div>
    `);
  }
  
  if (img5) {
    parts.push(`
      <div class="gallery-item gallery-item-5">
        <img src="${img5}" alt="${product.name || 'Produit'} - Vue 5" loading="lazy" />
      </div>
    `);
  }

  gallery.innerHTML = parts.join('');
};

// ===== PRODUITS SIMILAIRES =====
const renderSimilarProducts = async (currentProduct) => {
  const section = document.getElementById('similarProductsSection');
  const grid = document.getElementById('similarProductsGrid');
  
  if (!section || !grid || !currentProduct) return;
  
  try {
    // Récupérer tous les produits disponibles
    let allProducts = [];
    
    // Essayer depuis l'API
    try {
      const apiProducts = await fetchEcommerceProductsFromApi();
      if (apiProducts && apiProducts.length > 0) {
        allProducts = apiProducts;
      }
    } catch (e) {
      console.warn('API non disponible, utilisation du cache local');
    }
    
    // Fallback sur localStorage
    if (allProducts.length === 0) {
      const cached = getStore(PRODUCTS_CACHE_KEY);
      if (cached && Array.isArray(cached)) {
        allProducts = cached;
      }
    }
    
    if (allProducts.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    // Filtrer: exclure le produit actuel
    let similarProducts = allProducts.filter(p => p.id !== currentProduct.id && p.active !== false);
    
    // Prioriser les produits de la même catégorie
    const sameCategory = similarProducts.filter(p => p.category === currentProduct.category);
    const otherProducts = similarProducts.filter(p => p.category !== currentProduct.category);
    
    // Mélanger et prendre max 4 produits
    similarProducts = [...sameCategory, ...otherProducts].slice(0, 4);
    
    if (similarProducts.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    // Générer le HTML
    grid.innerHTML = similarProducts.map(product => {
      const thumbnail = product.thumbnail || (product.images && product.images[0]) || '';
      const price = (product.price || 0).toLocaleString('fr-FR');
      const category = product.category || 'Collection';
      
      return `
        <a href="produit.html?id=${product.id}" class="similar-card">
          <div class="similar-image">
            <img
              src="${thumbnail}"
              alt="${product.name || 'Produit'}"
              loading="lazy"
            />
          </div>
          <div class="similar-info">
            <h3>${product.name || 'Produit'}</h3>
            <span>${category}</span>
            <span class="similar-price">${price} FCFA</span>
          </div>
        </a>
      `;
    }).join('');
    
    section.style.display = 'block';
  } catch (error) {
    console.error('Erreur chargement produits similaires:', error);
    section.style.display = 'none';
  }
};

// ===== FAVORIS / PANIER =====
const getProductDataFromRoot = () => {
  if (!productRoot) return null;
  return {
    id: productRoot.dataset.id,
    name: productRoot.dataset.name,
    category: productRoot.dataset.category,
    price: parsePrice(productRoot.dataset.price),
    image: productRoot.dataset.image,
  };
};

const updateBadgesFallback = (cart) => {
  const count = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  document.querySelectorAll('[data-badge="cart"]').forEach((badge) => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });
};

const addToCartFallback = (item) => {
  const CART_KEY = 'atelier-cart';
  const cart = (() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  })();

  const existing = cart.find(
    (entry) => entry.id === item.id && entry.size === item.size && entry.color === item.color
  );

  if (existing) {
    existing.qty += item.qty || 1;
  } else {
    cart.push({ ...item, qty: item.qty || 1, price: parsePrice(item.price) });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateBadgesFallback(cart);
};

const bindFavoriteButton = () => {
  const favoriteBtn = document.querySelector('.btn-favorite');
  if (!favoriteBtn) return;

  const svg = favoriteBtn.querySelector('svg');
  const updateFavoriteStyle = (active) => {
    if (!svg) return;
    if (active) {
      svg.style.fill = '#ff0000';
      svg.style.stroke = '#ff0000';
      favoriteBtn.style.borderColor = '#ff0000';
    } else {
      svg.style.fill = 'none';
      svg.style.stroke = '#000';
      favoriteBtn.style.borderColor = '#e0e0e0';
    }
  };

  const base = getProductDataFromRoot();
  if (base?.id) updateFavoriteStyle(getStore()?.isInWishlist(base.id));

  favoriteBtn.onclick = null;
  favoriteBtn.addEventListener('click', () => {
    const store = getStore();
    const baseNow = getProductDataFromRoot();
    if (!store || !baseNow?.id) return;

    const wishlistItem = {
      ...baseNow,
      size: getSelectedSize(),
      color: getSelectedColor(),
      sizes: Array.from(document.querySelectorAll('.size-btn')).map((b) => b.dataset.size),
      colors: Array.from(document.querySelectorAll('.color-btn')).map((b) => b.dataset.color),
    };

    const result = store.toggleWishlist(wishlistItem);
    updateFavoriteStyle(result.added);
    store.showToast(result.added ? "Ajouté à la liste d'envie" : 'Retiré des favoris');
  });
};

const bindAddToCartButton = () => {
  const addCartBtn = document.querySelector('.btn-add-cart');
  const optionsWrapper = document.querySelector('.product-options-wrapper');
  const productOptions = document.querySelectorAll('.product-option');
  
  if (!addCartBtn) return;

  // Indiquer à main.js (fallback) que produit.js gère l'ajout panier
  window.__ProductAddToCartBound = true;

  // Anti-double-binding (bindAddToCartButton peut être appelé plusieurs fois)
  if (addCartBtn.__atelierAddToCartHandler) {
    try {
      addCartBtn.removeEventListener('click', addCartBtn.__atelierAddToCartHandler, true);
    } catch (e) {}
    addCartBtn.__atelierAddToCartHandler = null;
  }

  // État: est-ce que les options sont déjà affichées?
  let optionsVisible = false;
  
  // Sauvegarder le texte original du bouton UNE SEULE FOIS
  const originalButtonHTML = addCartBtn.innerHTML;

  // Fonction pour afficher les options
  const showOptions = () => {
    productOptions.forEach(option => {
      option.style.display = 'flex';
      option.style.animation = 'slideInUp 0.4s ease forwards';
    });
    
    // Changer le texte du bouton
    addCartBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      Confirmer l'ajout
    `;
    
    // Ajouter un bouton de fermeture (X) en haut à droite du bloc options
    if (optionsWrapper && !optionsWrapper.querySelector('.options-close-btn')) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'options-close-btn';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Fermer les options');
      closeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      `;
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        hideOptions();
      };
      optionsWrapper.appendChild(closeBtn);
    }
    
    optionsVisible = true;
    
    // Scroll vers les options sur mobile
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        optionsWrapper?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  };
  
  // Fonction pour cacher les options
  const hideOptions = () => {
    productOptions.forEach(option => {
      option.style.display = 'none';
    });
    addCartBtn.innerHTML = originalButtonHTML;
    
    // Supprimer le bouton de fermeture (X)
    const closeBtn = optionsWrapper?.querySelector('.options-close-btn');
    if (closeBtn) closeBtn.remove();
    
    optionsVisible = false;
  };

  addCartBtn.onclick = null;
  const handler = function (e) {
    // Empêcher toute propagation
    // - stopImmediatePropagation (capture) bloque aussi les listeners déjà attachés (ex: fallback main.js)
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
    
    const store = getStore();
    const base = getProductDataFromRoot();
    if (!base?.id) return;

    // ÉTAPE 1: Si les options ne sont pas encore visibles, les afficher UNIQUEMENT
    if (!optionsVisible) {
      showOptions();
      return; // ← IMPORTANT: On sort ici, panier ne s'ouvre PAS
    }

    // ÉTAPE 2: Vérifier la sélection et ajouter au panier
    const size = getSelectedSize();
    const color = getSelectedColor();
    if (!size || !color) {
      store?.showToast('Veuillez sélectionner une taille et une couleur', 'info');
      return;
    }

    // Ajouter au panier
    const payload = { ...base, size, color, qty: 1 };
    if (store?.addToCart) store.addToCart(payload);
    else addToCartFallback(payload);

    // MAINTENANT ouvrir le panier (seulement après ajout réussi)
    setTimeout(() => {
      window.CartDrawer?.open();
    }, 200);

    // Feedback visuel
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.style.transform = 'scale(1)';
    }, 150);

    this.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      Ajouté au panier !
    `;
    
    // Reset après 2 secondes
    setTimeout(() => {
      hideOptions();
    }, 2000);
  };

  // Capture pour passer AVANT les listeners bubble (fallback)
  addCartBtn.__atelierAddToCartHandler = handler;
  addCartBtn.addEventListener('click', handler, true);
};

// ===== PARTAGE SOCIAL =====
const bindShareButtons = () => {
  const shareButtons = document.querySelectorAll('.share-btn');
  shareButtons.forEach((btn) => {
    btn.onclick = null;
    btn.addEventListener('click', function () {
      const shareType = this.dataset.share;
      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent(document.querySelector('.product-title')?.textContent || 'Produit');
      const text = encodeURIComponent(
        `Découvrez ${document.querySelector('.product-title')?.textContent || 'ce produit'} sur Atelier Confection`
      );

      let shareUrl = '';
      switch (shareType) {
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
          break;
        case 'whatsapp':
          shareUrl = `https://wa.me/?text=${text}%20${url}`;
          break;
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
          break;
        case 'copy':
          navigator.clipboard.writeText(window.location.href).then(() => {
            const originalHTML = this.innerHTML;
            this.innerHTML =
              '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            setTimeout(() => {
              this.innerHTML = originalHTML;
            }, 2000);
            window.SiteStore?.showToast('Lien copié !', 'success');
          });
          return;
      }

      if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
    });
  });
};

// ===== APPLY PRODUCT =====
const applyProductToPage = (product) => {
  if (!productRoot || !product) return;

  const name = product.name || 'Produit';
  const categorySlug = product.category || '';
  const categoryLabel = getCategoryLabel(categorySlug);
  const price = parsePrice(product.price);
  const originalPrice = parsePrice(product.originalPrice);
  const hasDiscount = originalPrice > 0 && originalPrice > price;

  const mainImage = (product.images && product.images[0]) || product.thumbnail || product.image || '';

  // dataset pour favoris/panier
  productRoot.dataset.id = String(product.id || '');
  productRoot.dataset.name = name;
  productRoot.dataset.category = categoryLabel || categorySlug;
  productRoot.dataset.price = String(price || 0);
  productRoot.dataset.image = mainImage || '';

  document.title = `${name} - Atelier Confection`;

  const gallery = document.querySelector('.product-gallery');
  if (gallery) {
    gallery.setAttribute('aria-busy', 'false');
  }

  const breadcrumb = document.querySelector('.product-breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <a href="../index.html">Accueil</a>
      <span>/</span>
      <a href="boutique.html">${categoryLabel}</a>
      <span>/</span>
      <span>${name}</span>
    `;
  }

  const titleEl = document.querySelector('.product-title');
  if (titleEl) {
    titleEl.textContent = name;
    titleEl.dataset.fullText = name;
    // autoriser une nouvelle animation (et annuler une éventuelle précédente)
    titleEl.dataset.typewriterActive = '';
  }

  const priceCurrentEl = document.querySelector('.product-price .price-current');
  const priceOriginalEl = document.querySelector('.product-price .price-original');
  const priceBadgeEl = document.querySelector('.product-price .price-badge');
  const priceWrap = document.querySelector('.product-price');
  if (priceWrap) priceWrap.style.display = '';
  if (priceCurrentEl) priceCurrentEl.textContent = `${(price || 0).toLocaleString('fr-FR')} FCFA`;
  if (priceOriginalEl) {
    priceOriginalEl.textContent = `${originalPrice.toLocaleString('fr-FR')} FCFA`;
    priceOriginalEl.style.display = hasDiscount ? '' : 'none';
  }
  if (priceBadgeEl) {
    priceBadgeEl.textContent = hasDiscount
      ? `-${Math.round(((originalPrice - price) / originalPrice) * 100)}%`
      : '';
    priceBadgeEl.style.display = hasDiscount ? '' : 'none';
  }

  const descP = document.querySelector('.product-description p');
  if (descP) descP.textContent = product.description || 'Description à venir.';

  renderSizes(product.sizes);
  renderColors(product.colors);
  bindSizeButtons();
  bindColorButtons();

  renderGallery(product);
  setupGalleryObserver();
  setupZoom();

  bindFavoriteButton();
  bindAddToCartButton();
  bindShareButtons();

  typewriterEffect();
  
  // Charger les produits similaires
  renderSimilarProducts(product);
};

const showNotFoundState = () => {
  if (!productRoot) return;

  // Titre / breadcrumb
  document.title = `Produit introuvable - Atelier Confection`;
  const titleEl = document.querySelector('.product-title');
  if (titleEl) {
    titleEl.textContent = 'Produit introuvable';
    titleEl.dataset.fullText = 'Produit introuvable';
    titleEl.dataset.typewriterActive = '';
  }
  const breadcrumb = document.querySelector('.product-breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <a href="../index.html">Accueil</a>
      <span>/</span>
      <a href="boutique.html">Produits</a>
      <span>/</span>
      <span>Introuvable</span>
    `;
  }

  // Prix
  const priceWrap = document.querySelector('.product-price');
  if (priceWrap) priceWrap.style.display = 'none';

  // Description
  const descP = document.querySelector('.product-description p');
  if (descP) {
    const id = getProductIdFromUrl();
    descP.textContent =
      `Produit introuvable (id=${id || 'aucun'}). Ouvrez la boutique et cliquez sur le produit, ` +
      `ou vérifiez que l'admin est ouvert sur la même adresse (127.0.0.1:8080).`;
  }

  // Galerie: on vide pour éviter de voir l'ancien contenu statique
  const gallery = document.querySelector('.product-gallery');
  if (gallery) {
    gallery.setAttribute('aria-busy', 'false');
    gallery.innerHTML = `
      <div class="gallery-item gallery-item-1" style="display:flex;align-items:center;justify-content:center;padding:24px;background:#f5f5f5;">
        <div style="text-align:center;color:#6b7280;font-weight:600;">
          Aucune image (produit introuvable)
        </div>
      </div>
    `;
  }

  // Options: vider
  const sizeGrid = document.querySelector('.size-grid');
  if (sizeGrid) sizeGrid.innerHTML = '';
  const colorGrid = document.querySelector('.color-grid');
  if (colorGrid) colorGrid.innerHTML = '';

  // Lancer l'effet ici (boot ne le lance plus sur le placeholder)
  typewriterEffect();
};

const renderDebugPanel = () => {
  const shouldDebug =
    new URLSearchParams(window.location.search).get('debug') === '1' ||
    localStorage.getItem('atelier-debug') === '1';
  if (!shouldDebug) return;

  const id = getProductIdFromUrl();
  const admin = (() => {
    try {
      const raw = localStorage.getItem('atelier-admin-products');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  })();
  const cache = (() => {
    try {
      const raw = localStorage.getItem('atelier-products-cache');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  })();
  const selected = (() => {
    try {
      const raw = localStorage.getItem('atelier-selected-product') || sessionStorage.getItem('atelier-selected-product');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();

  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:12px;bottom:12px;z-index:99999;background:#111;color:#fff;' +
    'padding:10px 12px;border-radius:10px;font:12px/1.4 system-ui,Segoe UI,Arial;' +
    'box-shadow:0 12px 30px rgba(0,0,0,.35);max-width:520px;opacity:.92';

  const ids = (arr) => arr.slice(0, 5).map((p) => p?.id).filter(Boolean).join(', ');
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;">
      <strong>DEBUG Produit</strong>
      <button id="dbgClose" style="background:#333;color:#fff;border:0;border-radius:8px;padding:4px 8px;cursor:pointer;">Fermer</button>
    </div>
    <div><b>URL</b>: ${window.location.pathname}</div>
    <div><b>id</b>: ${id || '(vide)'}</div>
    <div><b>atelier-admin-products</b>: ${admin.length} (ids: ${ids(admin) || '-'})</div>
    <div><b>atelier-products-cache</b>: ${cache.length} (ids: ${ids(cache) || '-'})</div>
    <div><b>selected</b>: ${selected?.id ? `${selected.id} (${selected.name || ''})` : '-'}</div>
  `;
  panel.querySelector('#dbgClose')?.addEventListener('click', () => panel.remove());
  document.body.appendChild(panel);
};

// ===== BOOT =====
const boot = async () => {
  // base init (page statique)
  bindSizeButtons();
  bindColorButtons();
  setupGalleryObserver();
  setupZoom();
  bindFavoriteButton();
  bindAddToCartButton();
  bindShareButtons();
  renderDebugPanel();

  const id = getProductIdFromUrl();
  const selected = readSelectedProduct();

  const selectedMatchesId =
    !!selected?.id &&
    (!id || String(selected.id) === String(id) || slugify(selected.name || '') === String(id));

  // 1) Candidats locaux (pour affichage immédiat)
  const adminProduct = getAdminProductById(id);
  let best = pickBestProduct(selectedMatchesId ? selected : null, adminProduct);
  if (best) {
    applyProductToPage(best);
  }

  // Fallback ONLINE: charger depuis l'API (permet mobile / autre appareil)
  if (id) {
    const apiProduct = await fetchEcommerceProductFromApi(id);
    if (apiProduct) {
      const finalProduct = pickBestProduct(best, apiProduct) || apiProduct;

      // Si la version API apporte des données plus riches/récentes, on ré-applique.
      const shouldReapply =
        !best ||
        getUpdatedTs(finalProduct) !== getUpdatedTs(best) ||
        getColorsLen(finalProduct) !== getColorsLen(best);

      if (shouldReapply) {
        applyProductToPage(finalProduct);
        best = finalProduct;
      }

      // Persister (évite de rester bloqué sur un vieux "selected" avec 1 couleur)
      persistSelectedProduct(best);
      upsertProductToStorageList('atelier-products-cache', best, 200);
      upsertProductToStorageList('atelier-admin-products', best, 400);
      return;
    }
    // Si on a déjà un produit local, on le garde même si l'API est indisponible
    if (best) return;
  } else {
    // Sans id: si on n'a rien en local, on peut essayer de charger le catalogue online pour éviter "Introuvable"
    const apiProducts = await fetchEcommerceProductsFromApi();
    if (apiProducts.length) {
      try {
        localStorage.setItem('atelier-products-cache', JSON.stringify(apiProducts));
      } catch (e) {}
      applyProductToPage(apiProducts[0]);
      return;
    }
  }

  // Si un produit local est affiché, ne pas basculer en "Introuvable"
  if (best) return;

  // Aucun produit trouvé: ne pas afficher l'ancien contenu statique
  showNotFoundState();
};

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
}

