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

// ---- Checkout (commande dans une modale, sans changer de page) ----
const CHECKOUT_API_URL = 'https://atelier-confection.vercel.app/api/commandes/public';
const CHECKOUT_API_TOKEN = 'NOUSUNIQUE123';

const parsePriceSafe = (v) => {
  const store = getStore();
  return store?.parsePrice ? store.parsePrice(v) : (Number(v) || 0);
};
const formatPriceSafe = (v) => {
  const store = getStore();
  return store?.formatPrice ? store.formatPrice(v) : `${v} FCFA`;
};

const sendItemToApi = async (item, clientInfo) => {
  const body = {
    token: CHECKOUT_API_TOKEN,
    client: clientInfo.client,
    phone: clientInfo.phone,
    ville: clientInfo.ville,
    name: item.name || 'Produit',
    taille: item.size || 'Standard',
    couleur: item.color || 'Non specifie',
    price: String(parsePriceSafe(item.price)),
    image: item.image || '',
    category: item.category || '',
    source: 'site-web-ecommerce',
  };
  const res = await fetch(CHECKOUT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${res.status}`);
  }
  return res.json();
};

const CartDrawer = {
  overlay: null,
  drawer: null,
  content: null,
  footer: null,
  isReady: false,

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

    this.isReady = Boolean(this.overlay && this.drawer && this.content && this.footer);
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
          Commander
        </button>
        <a href="#" class="cart-drawer-btn cart-drawer-btn-secondary drawer-view-cart-btn">
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

        if (confirm('Retirer cet article du panier ?')) {
          if (store?.removeFromCart) {
            store.removeFromCart(id, size, color);
          } else {
            const cart = readCartFromStorage().filter(
              (it) => !(it.id === id && it.size === size && it.color === color)
            );
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
          }
          this.render();
        }
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

    checkoutBtn?.addEventListener('click', () => {
      const cart = store?.getCart ? store.getCart() : readCartFromStorage();
      if (cart.length === 0) {
        store?.showToast('Votre panier est vide');
        return;
      }
      // Ouvre la modale de commande (reste sur la meme page)
      this.openCheckoutModal();
    });

    const viewCartBtn = this.drawer?.querySelector('.drawer-view-cart-btn');
    viewCartBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.close();
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const isInPagesFolder = currentPath.includes('/pages/');
        window.location.href = isInPagesFolder ? 'panier' : 'pages/panier';
      }, 300);
    });
  },

  // ===== MODALE CHECKOUT =====
  openCheckoutModal() {
    if (!document.getElementById('checkoutModal')) {
      this.createCheckoutModalHTML();
    }
    this.close(); // fermer le tiroir
    this.renderCheckoutSummary();
    requestAnimationFrame(() => {
      document.getElementById('checkoutModalOverlay')?.classList.add('active');
      document.getElementById('checkoutModal')?.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  },

  closeCheckoutModal() {
    document.getElementById('checkoutModalOverlay')?.classList.remove('active');
    document.getElementById('checkoutModal')?.classList.remove('active');
    document.body.style.overflow = '';
  },

  createCheckoutModalHTML() {
    const html = `
      <div class="checkout-modal-overlay" id="checkoutModalOverlay"></div>
      <div class="checkout-modal" id="checkoutModal" role="dialog" aria-modal="true" aria-label="Finaliser la commande">
        <div class="checkout-modal-header">
          <h2>Finaliser ma commande</h2>
          <button class="checkout-modal-close" id="checkoutModalClose" type="button" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="checkout-modal-body">
          <div class="checkout-modal-summary" id="checkoutModalSummary"></div>
          <form class="checkout-modal-form" id="checkoutModalForm" novalidate>
            <div class="cm-field">
              <label for="cmFullname">Nom complet *</label>
              <input type="text" id="cmFullname" name="fullname" autocomplete="name" placeholder="Votre nom et prénom" required />
            </div>
            <div class="cm-field">
              <label for="cmPhone">Téléphone *</label>
              <input type="tel" id="cmPhone" name="phone" autocomplete="tel" placeholder="07 00 00 00 00" required />
            </div>
            <div class="cm-field">
              <label for="cmCity">Ville / Quartier *</label>
              <input type="text" id="cmCity" name="city" placeholder="Ex : Abidjan, Cocody" required />
            </div>
            <div class="cm-field">
              <label for="cmNotes">Note (facultatif)</label>
              <textarea id="cmNotes" name="notes" rows="2" placeholder="Précisions sur la livraison..."></textarea>
            </div>
            <div class="cm-payment">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
              <span>Paiement à la livraison &middot; Livraison rapide &middot; Retour 7 jours</span>
            </div>
            <button type="submit" class="checkout-modal-submit" id="checkoutModalSubmit">
              <span>Confirmer ma commande</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>
        </div>
      </div>
    `;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    while (tmp.firstChild) document.body.appendChild(tmp.firstChild);

    document.getElementById('checkoutModalOverlay')?.addEventListener('click', () => this.closeCheckoutModal());
    document.getElementById('checkoutModalClose')?.addEventListener('click', () => this.closeCheckoutModal());
    document.getElementById('checkoutModalForm')?.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('checkoutModal')?.classList.contains('active')) {
        this.closeCheckoutModal();
      }
    });
  },

  renderCheckoutSummary() {
    const store = getStore();
    const cart = store?.getCart ? store.getCart() : readCartFromStorage();
    const el = document.getElementById('checkoutModalSummary');
    if (!el) return;
    let subtotal = 0;
    const rows = cart.map((item) => {
      const price = parsePriceSafe(item.price);
      const qty = item.qty || 1;
      subtotal += price * qty;
      return `
        <div class="cm-sum-item">
          <img src="${item.image}" alt="${item.name}" />
          <div class="cm-sum-info">
            <span class="cm-sum-name">${item.name}</span>
            <span class="cm-sum-meta">${item.size} &bull; ${item.color} &bull; Qté ${qty}</span>
          </div>
          <span class="cm-sum-price">${formatPriceSafe(price * qty)}</span>
        </div>`;
    }).join('');
    el.innerHTML = `
      <div class="cm-sum-items">${rows}</div>
      <div class="cm-sum-total"><span>Total</span><span class="cm-sum-total-value">${formatPriceSafe(subtotal)}</span></div>
    `;
  },

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const store = getStore();
    const form = e.currentTarget;
    const btn = document.getElementById('checkoutModalSubmit');
    const clientInfo = {
      client: (form.fullname?.value || '').trim(),
      phone: (form.phone?.value || '').trim(),
      ville: (form.city?.value || '').trim(),
      notes: (form.notes?.value || '').trim(),
    };
    const cart = store?.getCart ? store.getCart() : readCartFromStorage();

    if (!clientInfo.client || !clientInfo.phone || !clientInfo.ville) {
      store?.showToast ? store.showToast('Veuillez remplir tous les champs obligatoires') : alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!cart.length) {
      store?.showToast ? store.showToast('Votre panier est vide') : alert('Votre panier est vide');
      return;
    }

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = '<span>Envoi en cours...</span>';

    try {
      const results = [];
      for (const item of cart) {
        const qty = item.qty || 1;
        for (let i = 0; i < qty; i++) {
          results.push(await sendItemToApi(item, clientInfo));
        }
      }

      const subtotal = cart.reduce((s, it) => s + parsePriceSafe(it.price) * (it.qty || 1), 0);
      const totalStr = formatPriceSafe(subtotal);

      try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push({
          ...clientInfo,
          items: cart,
          total: totalStr,
          id: results[0]?.numeroCommande || ('CMD' + Date.now()),
          status: 'en_attente_validation',
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('orders', JSON.stringify(orders));
      } catch (_) {}

      try {
        sessionStorage.setItem('lastOrder', JSON.stringify({
          fullname: clientInfo.client,
          phone: clientInfo.phone,
          city: clientInfo.ville,
          notes: clientInfo.notes,
          total: totalStr,
        }));
      } catch (_) {}

      if (store?.clearCart) store.clearCart();
      else localStorage.setItem(CART_KEY, JSON.stringify([]));

      const isInPages = window.location.pathname.includes('/pages/');
      window.location.href = isInPages ? 'merci' : 'pages/merci';
    } catch (err) {
      console.error('Erreur envoi commande:', err);
      alert("Erreur lors de l'envoi de la commande.\n" + err.message + "\n\nVeuillez réessayer ou nous contacter au 07 05 88 11 16.");
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = originalHTML;
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
