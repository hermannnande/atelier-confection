// ===========================
// TIROIR PANIER (CART DRAWER)
// ===========================

const store = window.SiteStore;

const CartDrawer = {
  overlay: null,
  drawer: null,
  content: null,
  footer: null,

  init() {
    this.createDrawerHTML();
    this.overlay = document.getElementById('cartDrawerOverlay');
    this.drawer = document.getElementById('cartDrawer');
    this.content = document.getElementById('cartDrawerContent');
    this.footer = document.getElementById('cartDrawerFooter');

    // Événements
    this.overlay?.addEventListener('click', () => this.close());
    document.getElementById('cartDrawerClose')?.addEventListener('click', () => this.close());

    // Empêcher la propagation des clics sur le drawer
    this.drawer?.addEventListener('click', (e) => e.stopPropagation());
  },

  createDrawerHTML() {
    const drawerHTML = `
      <!-- Overlay -->
      <div class="cart-drawer-overlay" id="cartDrawerOverlay"></div>

      <!-- Tiroir -->
      <div class="cart-drawer" id="cartDrawer">
        <!-- Header -->
        <div class="cart-drawer-header">
          <h2 class="cart-drawer-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Mon Panier
          </h2>
          <button class="cart-drawer-close" id="cartDrawerClose" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Contenu -->
        <div class="cart-drawer-content" id="cartDrawerContent">
          <!-- Les articles seront ajoutés dynamiquement -->
        </div>

        <!-- Footer -->
        <div class="cart-drawer-footer" id="cartDrawerFooter">
          <!-- Le total et les boutons seront ajoutés dynamiquement -->
        </div>
      </div>
    `;

    // Ajouter au body
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = drawerHTML;
    while (tempDiv.firstChild) {
      document.body.appendChild(tempDiv.firstChild);
    }
  },

  open() {
    this.render();
    this.overlay?.classList.add('active');
    this.drawer?.classList.add('active');
    document.body.style.overflow = 'hidden'; // Bloquer le scroll
  },

  close() {
    this.overlay?.classList.remove('active');
    this.drawer?.classList.remove('active');
    document.body.style.overflow = ''; // Réactiver le scroll
  },

  render() {
    const cart = store?.getCart() || [];
    
    if (cart.length === 0) {
      this.renderEmpty();
    } else {
      this.renderItems(cart);
      this.renderFooter(cart);
    }
  },

  renderEmpty() {
    this.content.innerHTML = `
      <div class="cart-drawer-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p>Votre panier est vide</p>
      </div>
    `;
    this.footer.innerHTML = '';
  },

  renderItems(cart) {
    this.content.innerHTML = `
      <div class="cart-drawer-items">
        ${cart.map(item => this.renderItem(item)).join('')}
      </div>
    `;

    // Ajouter les événements après le rendu
    this.attachItemEvents();
  },

  renderItem(item) {
    const price = store?.parsePrice(item.price) || 0;
    const total = price * (item.qty || 1);

    return `
      <div class="cart-drawer-item" data-id="${item.id}" data-size="${item.size}" data-color="${item.color}">
        <img src="${item.image}" alt="${item.name}" class="cart-drawer-item-image">
        <div class="cart-drawer-item-details">
          <h4 class="cart-drawer-item-name">${item.name}</h4>
          <p class="cart-drawer-item-meta">${item.size} • ${item.color}</p>
          <p class="cart-drawer-item-price">${store?.formatPrice(total) || '0 FCFA'}</p>
          <div class="cart-drawer-item-actions">
            <div class="cart-drawer-item-qty">
              <button class="qty-btn qty-minus" data-action="decrease">−</button>
              <span class="qty-value">${item.qty || 1}</span>
              <button class="qty-btn qty-plus" data-action="increase">+</button>
            </div>
            <button class="cart-drawer-item-remove" data-action="remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderFooter(cart) {
    const subtotal = cart.reduce((sum, item) => {
      const price = store?.parsePrice(item.price) || 0;
      return sum + (price * (item.qty || 1));
    }, 0);

    this.footer.innerHTML = `
      <div class="cart-drawer-summary">
        <div class="drawer-summary-line">
          <span>Sous-total</span>
          <span class="drawer-summary-value">${store?.formatPrice(subtotal) || '0 FCFA'}</span>
        </div>
        <div class="drawer-summary-line">
          <span>Livraison</span>
          <span class="drawer-summary-value drawer-free">Gratuite</span>
        </div>
        <div class="drawer-summary-line drawer-promo-line">
          <input type="text" class="drawer-promo-input" placeholder="Code promo" />
          <button class="drawer-promo-btn">Appliquer</button>
        </div>
        <div class="drawer-summary-divider"></div>
        <div class="drawer-summary-line drawer-total">
          <span>Total</span>
          <span class="drawer-summary-value drawer-total-value" id="drawerTotal">
            ${store?.formatPrice(subtotal) || '0 FCFA'}
          </span>
        </div>
      </div>
      <div class="cart-drawer-actions">
        <a href="pages/checkout.html" class="cart-drawer-btn cart-drawer-btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          Procéder au paiement
        </a>
        <a href="pages/panier.html" class="cart-drawer-btn cart-drawer-btn-secondary">
          Voir le panier complet
        </a>
      </div>
      <div class="cart-drawer-trust">
        <div class="drawer-trust-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Paiement sécurisé</span>
        </div>
        <div class="drawer-trust-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <span>Livraison rapide</span>
        </div>
        <div class="drawer-trust-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
            <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
          </svg>
          <span>Retour 7 jours</span>
        </div>
      </div>
    `;

    this.attachFooterEvents();
  },

  attachItemEvents() {
    // Événements pour les boutons +/-
    this.content.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.cart-drawer-item');
        const id = itemEl.dataset.id;
        const size = itemEl.dataset.size;
        const color = itemEl.dataset.color;
        const action = e.target.dataset.action;

        const item = store?.getCart().find(
          i => i.id === id && i.size === size && i.color === color
        );

        if (item) {
          let newQty = item.qty;
          if (action === 'increase') {
            newQty += 1;
          } else if (action === 'decrease' && newQty > 1) {
            newQty -= 1;
          }

          store?.updateCartItem(id, size, color, newQty);
          this.render();
        }
      });
    });

    // Événements pour les boutons de suppression
    this.content.querySelectorAll('.cart-drawer-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.cart-drawer-item');
        const id = itemEl.dataset.id;
        const size = itemEl.dataset.size;
        const color = itemEl.dataset.color;

        if (confirm('Retirer cet article du panier ?')) {
          store?.removeFromCart(id, size, color);
          this.render();
        }
      });
    });
  },

  attachFooterEvents() {
    const promoBtn = this.footer.querySelector('.drawer-promo-btn');
    const promoInput = this.footer.querySelector('.drawer-promo-input');
    const totalEl = this.footer.querySelector('#drawerTotal');

    promoBtn?.addEventListener('click', () => {
      const code = promoInput?.value.trim().toUpperCase();

      if (!code) {
        store?.showToast('Veuillez entrer un code promo');
        return;
      }

      const promoCodes = {
        BIENVENUE20: 0.2,
        PROMO10: 0.1,
        NOEL15: 0.15,
      };

      if (!promoCodes[code]) {
        store?.showToast('Code promo invalide');
        return;
      }

      const subtotal = (store?.getCart() || []).reduce((sum, item) => {
        const price = store?.parsePrice(item.price) || 0;
        return sum + (price * (item.qty || 1));
      }, 0);

      const newTotal = subtotal * (1 - promoCodes[code]);
      if (totalEl) totalEl.textContent = store?.formatPrice(newTotal) || '0 FCFA';
      if (promoInput) promoInput.value = '';
      store?.showToast(`Code promo appliqué ! -${promoCodes[code] * 100}%`);
    });
  }
};

// Initialiser le tiroir au chargement
document.addEventListener('DOMContentLoaded', () => {
  CartDrawer.init();
});

// Rendre le CartDrawer accessible globalement
window.CartDrawer = CartDrawer;
