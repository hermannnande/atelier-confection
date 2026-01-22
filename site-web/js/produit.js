const getStore = () => window.SiteStore;
const productRoot = document.querySelector('.product-page');

const parsePriceFallback = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^0-9]/g, '')) || 0;
};

const productData = productRoot
  ? {
      id: productRoot.dataset.id,
      name: productRoot.dataset.name,
      category: productRoot.dataset.category,
      price: parsePriceFallback(productRoot.dataset.price),
      image: productRoot.dataset.image,
    }
  : null;

const getSelectedSize = () =>
  document.querySelector('.size-btn.active')?.dataset.size;
const getSelectedColor = () =>
  document.querySelector('.color-btn.active')?.dataset.color;

// Gestion de la sélection de taille
document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
  });
});

// Gestion de la sélection de couleur
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
  });
});

// Gestion du bouton favoris
const favoriteBtn = document.querySelector('.btn-favorite');
if (favoriteBtn && productData) {
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

  updateFavoriteStyle(getStore()?.isInWishlist(productData.id));

  favoriteBtn.addEventListener('click', function() {
    const store = getStore();
    if (!store) return;
    const selectedSize = getSelectedSize();
    const selectedColor = getSelectedColor();
    const wishlistItem = {
      ...productData,
      size: selectedSize,
      color: selectedColor,
      sizes: Array.from(document.querySelectorAll('.size-btn')).map((btn) => btn.dataset.size),
      colors: Array.from(document.querySelectorAll('.color-btn')).map((btn) => btn.dataset.color),
    };

    const result = store.toggleWishlist(wishlistItem);
    updateFavoriteStyle(result.added);
    store.showToast(
      result.added ? "Ajouté à la liste d'envie" : 'Retiré des favoris'
    );
  });
}

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
      price: parsePriceFallback(item.price),
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateBadgesFallback(cart);
};

// Gestion du bouton ajouter au panier
const addCartBtn = document.querySelector('.btn-add-cart');
if (addCartBtn && productData) {
  addCartBtn.addEventListener('click', function() {
    const selectedSize = getSelectedSize();
    const selectedColor = getSelectedColor();
    const store = getStore();

    if (!selectedSize || !selectedColor) {
      store?.showToast('Veuillez sélectionner une taille et une couleur', 'info');
      return;
    }

    const payload = {
      ...productData,
      size: selectedSize,
      color: selectedColor,
      qty: 1,
    };

    if (store?.addToCart) {
      store.addToCart(payload);
    } else {
      addToCartFallback(payload);
    }

    window.CartDrawer?.open();

    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.style.transform = 'scale(1)';
    }, 150);

    const originalText = this.innerHTML;
    this.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      Ajouté au panier !
    `;

    setTimeout(() => {
      this.innerHTML = originalText;
    }, 2000);
  });
}

// Animation au scroll pour les images de la galerie
const observerOptions = {
  threshold: 0.2,
  rootMargin: '0px 0px -100px 0px'
};

const galleryObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '0';
      entry.target.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, 100);
      
      galleryObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observer les éléments de la galerie
document.querySelectorAll('.gallery-item').forEach(item => {
  galleryObserver.observe(item);
});
