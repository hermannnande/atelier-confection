const header = document.getElementById("site-header");

const updateHeader = () => {
  if (!header) return;
  if (window.scrollY > 20) {
    header.classList.add("is-solid");
  } else {
    header.classList.remove("is-solid");
  }
};

window.addEventListener("scroll", updateHeader, { passive: true });

const SiteStore = (() => {
  const CART_KEY = "atelier-cart";
  const WISHLIST_KEY = "atelier-wishlist";

  const read = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  };

  const write = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const parsePrice = (value) => {
    if (typeof value === "number") return value;
    if (!value) return 0;
    return Number(String(value).replace(/[^0-9]/g, "")) || 0;
  };

  const formatPrice = (value) => {
    const amount = typeof value === "number" ? value : parsePrice(value);
    return `${amount.toLocaleString("fr-FR")} FCFA`;
  };

  const slugify = (text) => {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const getCart = () => read(CART_KEY);
  const saveCart = (items) => write(CART_KEY, items);
  const getWishlist = () => read(WISHLIST_KEY);
  const saveWishlist = (items) => write(WISHLIST_KEY, items);

  const addToCart = (item) => {
    const cart = getCart();
    const existing = cart.find(
      (entry) =>
        entry.id === item.id &&
        entry.size === item.size &&
        entry.color === item.color
    );

    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      cart.push({
        ...item,
        qty: item.qty || 1,
        price: parsePrice(item.price),
      });
    }

    saveCart(cart);
    updateBadges();
    
    // Ouvrir le tiroir panier
    if (window.CartDrawer) {
      window.CartDrawer.open();
    }
    
    return cart;
  };

  const updateCartItem = (id, size, color, qty) => {
    const cart = getCart();
    cart.forEach((item) => {
      if (item.id === id && item.size === size && item.color === color) {
        item.qty = Math.max(1, qty);
      }
    });
    saveCart(cart);
    updateBadges();
    return cart;
  };

  const removeFromCart = (id, size, color) => {
    const cart = getCart().filter(
      (item) => !(item.id === id && item.size === size && item.color === color)
    );
    saveCart(cart);
    updateBadges();
    return cart;
  };

  const clearCart = () => {
    saveCart([]);
    updateBadges();
  };

  const toggleWishlist = (item) => {
    const wishlist = getWishlist();
    const index = wishlist.findIndex((entry) => entry.id === item.id);
    let added = false;

    if (index >= 0) {
      wishlist.splice(index, 1);
    } else {
      wishlist.push({
        ...item,
        price: parsePrice(item.price),
      });
      added = true;
    }

    saveWishlist(wishlist);
    updateBadges();
    return { wishlist, added };
  };

  const isInWishlist = (id) => {
    return getWishlist().some((item) => item.id === id);
  };

  const updateBadges = () => {
    const cartCount = getCart().reduce((sum, item) => sum + item.qty, 0);
    const wishlistCount = getWishlist().length;

    document.querySelectorAll('[data-badge="cart"]').forEach((badge) => {
      badge.textContent = cartCount;
      badge.style.display = cartCount > 0 ? "inline-flex" : "none";
    });

    document.querySelectorAll('[data-badge="wishlist"]').forEach((badge) => {
      badge.textContent = wishlistCount;
      badge.style.display = wishlistCount > 0 ? "inline-flex" : "none";
    });
  };

  const showToast = (message, tone = "info") => {
    const container =
      document.querySelector(".toast-container") ||
      (() => {
        const wrapper = document.createElement("div");
        wrapper.className = "toast-container";
        document.body.appendChild(wrapper);
        return wrapper;
      })();

    const toast = document.createElement("div");
    toast.className = `toast toast-${tone}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  };

  return {
    getCart,
    saveCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getWishlist,
    saveWishlist,
    toggleWishlist,
    isInWishlist,
    updateBadges,
    parsePrice,
    formatPrice,
    slugify,
    showToast,
  };
})();

window.SiteStore = SiteStore;

// Fallback: gestion ajout panier sur page produit si produit.js ne charge pas
const bindProductAddToCartFallback = () => {
  if (window.__ProductAddToCartFallbackBound) return;
  if (window.__ProductAddToCartBound) return;

  const productRoot = document.querySelector(".product-page");
  const addBtn = document.querySelector(".btn-add-cart");

  if (!productRoot || !addBtn) return;

  const getSelectedSize = () =>
    document.querySelector(".size-btn.active")?.dataset.size;
  const getSelectedColor = () =>
    document.querySelector(".color-btn.active")?.dataset.color;

  addBtn.addEventListener("click", () => {
    if (window.__ProductAddToCartBound) return;
    const size = getSelectedSize();
    const color = getSelectedColor();

    if (!size || !color) {
      SiteStore.showToast?.("Veuillez sélectionner une taille et une couleur");
      return;
    }

    const payload = {
      id: productRoot.dataset.id,
      name: productRoot.dataset.name,
      category: productRoot.dataset.category,
      price: SiteStore.parsePrice(productRoot.dataset.price),
      image: productRoot.dataset.image,
      size,
      color,
      qty: 1,
    };

    if (SiteStore?.addToCart) {
      SiteStore.addToCart(payload);
    } else {
      // Fallback localStorage si SiteStore indisponible
      const cart = (() => {
        try {
          const raw = localStorage.getItem("atelier-cart");
          return raw ? JSON.parse(raw) : [];
        } catch (e) {
          return [];
        }
      })();

      const existing = cart.find(
        (item) => item.id === payload.id && item.size === size && item.color === color
      );

      if (existing) {
        existing.qty += 1;
      } else {
        cart.push(payload);
      }

      localStorage.setItem("atelier-cart", JSON.stringify(cart));
      SiteStore.updateBadges?.();
    }

    window.CartDrawer?.open();
  });

  window.__ProductAddToCartFallbackBound = true;
};

// Intersection Observer pour animer les catégories au scroll
const observeCategories = () => {
  const cards = document.querySelectorAll('.category-card');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('animate-in');
        }, index * 150);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px'
  });
  
  cards.forEach(card => observer.observe(card));
};

// ===== MENU HAMBURGER MOBILE =====
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileNav = document.getElementById('mobileNav');
const mobileNavOverlay = document.getElementById('mobileNavOverlay');
const mobileNavClose = document.getElementById('mobileNavClose');

const openMobileNav = () => {
  mobileNav?.classList.add('open');
  mobileNavOverlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
};

const closeMobileNav = () => {
  mobileNav?.classList.remove('open');
  mobileNavOverlay?.classList.remove('open');
  document.body.style.overflow = '';
};

hamburgerBtn?.addEventListener('click', openMobileNav);
mobileNavOverlay?.addEventListener('click', closeMobileNav);
mobileNavClose?.addEventListener('click', closeMobileNav);

document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

// ===== BESTSELLERS DYNAMIQUES =====
const renderHomeBestsellers = () => {
  const grid = document.getElementById('homeBestsellersGrid');
  if (!grid) return;

  const slugify = (v = '') =>
    String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  let products = [];
  try {
    const raw = localStorage.getItem('atelier-admin-products');
    products = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(products)) products = [];
  } catch (e) { products = []; }

  if (!products.length) {
    try {
      const cached = localStorage.getItem('atelier-products-cache');
      products = cached ? JSON.parse(cached) : [];
      if (!Array.isArray(products)) products = [];
    } catch (e) { products = []; }
  }

  const displayed = products.filter(p => p.name && (p.thumbnail || (p.images && p.images.length))).slice(0, 8);

  if (!displayed.length) {
    const fallback = [
      { id: 'robe-elegante-satin', name: 'Robe Elegante Satin', category: 'Elegant', price: 45000, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80', badge: 'Bestseller' },
      { id: 'ensemble-chic-modern', name: 'Ensemble Chic Modern', category: 'Perle Rare', price: 52000, image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', badge: 'Nouveau', badgeClass: 'new' },
      { id: 'tenue-soiree-luxe', name: 'Tenue de Soiree Luxe', category: 'Perle Unique', price: 75000, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', badge: '-25%', badgeClass: 'sale' },
      { id: 'robe-cocktail-premium', name: 'Robe Cocktail Premium', category: 'Style Event', price: 68000, image: 'https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=800&q=80', badge: 'Bestseller' },
    ];
    grid.innerHTML = fallback.map(p => `
      <a href="pages/produit.html?id=${encodeURIComponent(p.id)}" class="product-card"
         data-id="${p.id}" data-name="${p.name}" data-category="${p.category}"
         data-price="${p.price}" data-image="${p.image}">
        <div class="product-image">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
          <div class="product-badge ${p.badgeClass || ''}">${p.badge}</div>
        </div>
        <div class="product-info">
          <h3 class="product-name">${p.name}</h3>
          <p class="product-category">Collection ${p.category}</p>
          <div class="product-price">
            <span class="price-current">${p.price.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>
      </a>
    `).join('');
    return;
  }

  grid.innerHTML = displayed.map((p, i) => {
    const id = String(p.id || slugify(p.name));
    const img = p.thumbnail || (p.images && p.images[0]) || '';
    const price = Number(p.price) || 0;
    const cat = p.category || '';
    const badge = i === 0 ? '<div class="product-badge">Bestseller</div>' :
                  i === 1 ? '<div class="product-badge new">Nouveau</div>' : '';
    return `
      <a href="pages/produit.html?id=${encodeURIComponent(id)}" class="product-card"
         data-id="${id}" data-name="${p.name}" data-category="${cat}"
         data-price="${price}" data-image="${img}">
        <div class="product-image">
          <img src="${img}" alt="${p.name}" loading="lazy">
          ${badge}
        </div>
        <div class="product-info">
          <h3 class="product-name">${p.name}</h3>
          ${cat ? `<p class="product-category">${cat}</p>` : ''}
          <div class="product-price">
            <span class="price-current">${price.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
};

window.addEventListener("load", () => {
  updateHeader();
  observeCategories();
  renderHomeBestsellers();
  bindProductAddToCartFallback();
  SiteStore.updateBadges();
});
