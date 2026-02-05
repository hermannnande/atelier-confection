// ===========================
// TIROIR PANIER (CART DRAWER)
// ===========================

const CART_KEY = 'atelier-cart';
const CHECKOUT_CART_KEY = 'checkoutCart';
const getStore = () => window.SiteStore;

const readCartFromStorage = () => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const CartDrawer = {
  overlay: null,
  drawer: null,
  content: null,
  footer: null,
  isReady: false,
  confirmModal: null,
  confirmCallback: null,

  init() {
    this.createDrawerHTML();
    this.overlay = document.getElementById('cartDrawerOverlay');
    this.drawer = document.getElementById('cartDrawer');
    this.content = document.getElementById('cartDrawerContent');
    this.footer = document.getElementById('cartDrawerFooter');
    this.confirmModal = document.getElementById('cartConfirmModal');

    // Événements
    this.overlay?.addEventListener('click', () => this.close());
    document.getElementById('cartDrawerClose')?.addEventListener('click', () => this.close());

    // Empêcher la propagation des clics sur le drawer
    this.drawer?.addEventListener('click', (e) => e.stopPropagation());

    // Événements de la modal de confirmation
    document.getElementById('cartConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());
    document.getElementById('cartConfirmOverlay')?.addEventListener('click', () => this.hideConfirmModal());
    document.getElementById('cartConfirmDelete')?.addEventListener('click', () => {
      if (this.confirmCallback) {
        this.confirmCallback();
      }
      this.hideConfirmModal();
    });

    this.isReady = Boolean(this.overlay && this.drawer && this.content && this.footer);
  },

  showConfirmModal(callback) {
    this.confirmCallback = callback;
    this.confirmModal?.classList.add('active');
  },

  hideConfirmModal() {
    this.confirmModal?.classList.remove('active');
    this.confirmCallback = null;
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

      <!-- Modal de confirmation -->
      <div class="cart-confirm-modal" id="cartConfirmModal">
        <div class="cart-confirm-overlay" id="cartConfirmOverlay"></div>
        <div class="cart-confirm-dialog">
          <div class="cart-confirm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 class="cart-confirm-title">Retirer cet article ?</h3>
          <p class="cart-confirm-message">Voulez-vous vraiment supprimer cet article de votre panier ?</p>
          <div class="cart-confirm-actions">
            <button class="cart-confirm-btn cart-confirm-cancel" id="cartConfirmCancel">Annuler</button>
            <button class="cart-confirm-btn cart-confirm-delete" id="cartConfirmDelete">Retirer</button>
          </div>
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
    // Sécuriser l'initialisation (au cas où DOMContentLoaded est déjà passé)
    if (!this.isReady) {
      this.init();
    }
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
    const store = getStore();
    const cart = store?.getCart ? store.getCart() : readCartFromStorage();
    
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
    const store = getStore();
    const price = store?.parsePrice ? store.parsePrice(item.price) : Number(item.price) || 0;
    const total = price * (item.qty || 1);

    return `
      <div class="cart-drawer-item" data-id="${item.id}" data-size="${item.size}" data-color="${item.color}">
        <img src="${item.image}" alt="${item.name}" class="cart-drawer-item-image">
        <div class="cart-drawer-item-details">
          <h4 class="cart-drawer-item-name">${item.name}</h4>
          <p class="cart-drawer-item-meta">${item.size} • ${item.color}</p>
          <p class="cart-drawer-item-price">${
            store?.formatPrice ? store.formatPrice(total) : `${total} FCFA`
          }</p>
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
    const store = getStore();
    const subtotal = cart.reduce((sum, item) => {
      const price = store?.parsePrice ? store.parsePrice(item.price) : Number(item.price) || 0;
      return sum + (price * (item.qty || 1));
    }, 0);

    this.footer.innerHTML = `
      <div class="cart-drawer-summary">
        <div class="drawer-summary-line">
          <span>Sous-total</span>
          <span class="drawer-summary-value">${
            store?.formatPrice ? store.formatPrice(subtotal) : `${subtotal} FCFA`
          }</span>
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
            ${store?.formatPrice ? store.formatPrice(subtotal) : `${subtotal} FCFA`}
          </span>
        </div>
      </div>
      <div class="cart-drawer-actions">
        <button type="button" class="cart-drawer-btn cart-drawer-btn-primary drawer-checkout-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          Procéder au paiement
        </button>
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
    const store = getStore();
    // Événements pour les boutons +/-
    this.content.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.cart-drawer-item');
        const id = itemEl.dataset.id;
        const size = itemEl.dataset.size;
        const color = itemEl.dataset.color;
        const action = e.target.dataset.action;

        const cart = store?.getCart ? store.getCart() : readCartFromStorage();
        const item = cart.find((i) => i.id === id && i.size === size && i.color === color);

        if (item) {
          let newQty = item.qty;
          if (action === 'increase') {
            newQty += 1;
          } else if (action === 'decrease' && newQty > 1) {
            newQty -= 1;
          }

          if (store?.updateCartItem) {
            store.updateCartItem(id, size, color, newQty);
          } else {
            item.qty = Math.max(1, newQty);
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
          }
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

        this.showConfirmModal(() => {
          if (store?.removeFromCart) {
            store.removeFromCart(id, size, color);
          } else {
            const cart = readCartFromStorage().filter(
              (it) => !(it.id === id && it.size === size && it.color === color)
            );
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
          }
          this.render();
        });
      });
    });
  },

  attachFooterEvents() {
    const store = getStore();
    const promoBtn = this.footer.querySelector('.drawer-promo-btn');
    const promoInput = this.footer.querySelector('.drawer-promo-input');
    const totalEl = this.footer.querySelector('#drawerTotal');
    const checkoutBtn = this.footer.querySelector('.drawer-checkout-btn');

    // Gestion du code promo
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

    // Gestion du bouton checkout (afficher le popup d'info)
    checkoutBtn?.addEventListener('click', () => {
      const cart = store?.getCart ? store.getCart() : readCartFromStorage();
      if (cart.length === 0) {
        store?.showToast('Votre panier est vide');
        return;
      }
      this.showCheckoutModal();
    });
  },

  showCheckoutModal() {
    const modal = document.createElement('div');
    modal.className = 'checkout-modal';
    modal.innerHTML = `
      <div class="checkout-modal-overlay"></div>
      <div class="checkout-modal-content">
        <div class="checkout-modal-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
        </div>
        <h2>⚡ Paiement à la livraison</h2>
        <div class="checkout-modal-message">
          <p class="greeting">✨ <strong>Bonjour Madame</strong>,</p>
          <p>Nous vous proposons de <strong style="color: #d4af37;">magnifiques tenues</strong>, confectionnées avec soin.</p>
          <div class="delivery-info">
            <div class="info-badge">
              <span class="icon">⏱️</span>
              <span><strong>Délai</strong> : confection + livraison en <strong style="color: #d4af37;">3 jours ouvrables</strong></span>
            </div>
            <div class="info-badge">
              <span class="icon">💰</span>
              <span><strong style="color: #d4af37;">Paiement uniquement à la livraison</strong></span>
            </div>
            <div class="info-badge">
              <span class="icon">✨</span>
              <span>Rendu <strong style="color: #d4af37;">élégant, bien fini et de qualité</strong></span>
            </div>
          </div>
          <p class="note" style="font-size: 13px; margin-top: 16px;">Votre commande sera traitée par notre atelier, puis livrée à votre adresse.</p>
        </div>
        <div class="checkout-modal-actions">
          <button class="btn-cancel">Annuler</button>
          <button class="btn-continue">Continuer →</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Animation d'entrée
    setTimeout(() => {
      modal.querySelector('.checkout-modal-overlay').style.opacity = '1';
      modal.querySelector('.checkout-modal-content').style.opacity = '1';
      modal.querySelector('.checkout-modal-content').style.transform = 'translateY(0) scale(1)';
    }, 10);

    // Événements
    modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
      this.closeCheckoutModal(modal);
    });
    modal.querySelector('.btn-continue')?.addEventListener('click', () => {
      this.closeCheckoutModal(modal);
      // Fermer le tiroir d'abord
      this.close();
      // Sauvegarder le panier pour la page checkout
      try {
        const store = getStore();
        const cart = store?.getCart ? store.getCart() : readCartFromStorage();
        sessionStorage.setItem(CHECKOUT_CART_KEY, JSON.stringify(cart));
      } catch (e) {
        // Ignorer si sessionStorage indisponible
      }
      // Rediriger vers checkout (chemin relatif adaptatif)
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const isInPagesFolder = currentPath.includes('/pages/');
        const checkoutUrl = isInPagesFolder ? 'checkout.html' : 'pages/checkout.html';
        window.location.href = checkoutUrl;
      }, 300);
    });
    modal.querySelector('.checkout-modal-overlay')?.addEventListener('click', () => {
      this.closeCheckoutModal(modal);
    });
  },

  closeCheckoutModal(modal) {
    if (modal) {
      modal.querySelector('.checkout-modal-overlay').style.opacity = '0';
      modal.querySelector('.checkout-modal-content').style.opacity = '0';
      modal.querySelector('.checkout-modal-content').style.transform = 'translateY(-20px) scale(0.95)';
      setTimeout(() => modal.remove(), 300);
    }
  }
};

// Rendre le CartDrawer accessible globalement (même avant init)
window.CartDrawer = CartDrawer;

// Initialiser le tiroir dès que possible (même si DOMContentLoaded est déjà passé)
const bootstrapCartDrawer = () => {
  try {
    CartDrawer.init();
  } catch (e) {
    // Ne pas bloquer le site si le drawer échoue, mais log pour debug
    console.error('[CartDrawer] init failed', e);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapCartDrawer);
} else {
  bootstrapCartDrawer();
}
