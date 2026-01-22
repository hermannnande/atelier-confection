const store = window.SiteStore;
const cartItemsContainer = document.getElementById('cartItems');
const subtotalEl = document.getElementById('subtotal');
const totalEl = document.getElementById('total');

const renderCart = () => {
  const cart = store.getCart();

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div style="text-align: center; padding: 80px 20px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 20px; color: #ccc;">
          <path d="M6 2l1.5 4h10L19 2" />
          <path d="M3 6h18l-1.5 12H4.5L3 6z" />
          <path d="M9 10v6" />
          <path d="M15 10v6" />
        </svg>
        <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 12px;">Votre panier est vide</h3>
        <p style="color: #666; margin-bottom: 24px;">Découvrez nos collections et ajoutez vos pièces préférées</p>
        <a href="boutique.html" style="display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: #000; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700;">
          Continuer mes achats
        </a>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '0 FCFA';
    if (totalEl) totalEl.textContent = '0 FCFA';
    store.updateBadges();
    return;
  }

  cartItemsContainer.innerHTML = `
    ${cart
      .map(
        (item) => `
      <div class="cart-item" data-id="${item.id}" data-size="${item.size}" data-color="${item.color}">
        <div class="item-image">
          <img src="${item.image}" alt="${item.name}" />
        </div>
        <div class="item-details">
          <h3 class="item-name">${item.name}</h3>
          <p class="item-specs">Taille: <strong>${item.size}</strong> • Couleur: <strong>${item.color}</strong></p>
          <p class="item-price-mobile">${store.formatPrice(item.price)}</p>
        </div>
        <div class="item-quantity">
          <button class="qty-btn" data-action="decrease">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
            </svg>
          </button>
          <input type="number" class="qty-input" value="${item.qty}" min="1" />
          <button class="qty-btn" data-action="increase">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
        <div class="item-price">${store.formatPrice(item.price)}</div>
        <button class="item-remove" aria-label="Supprimer">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `
      )
      .join('')}
    <a href="boutique.html" class="continue-shopping">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      Continuer mes achats
    </a>
  `;

  updateCartTotals();
};

const updateCartTotals = () => {
  const cart = store.getCart();
  const subtotal = cart.reduce((sum, item) => sum + store.parsePrice(item.price) * item.qty, 0);

  if (subtotalEl) subtotalEl.textContent = store.formatPrice(subtotal);
  if (totalEl) totalEl.textContent = store.formatPrice(subtotal);
};

// Gestion des interactions panier
cartItemsContainer?.addEventListener('click', (event) => {
  const qtyBtn = event.target.closest('.qty-btn');
  const removeBtn = event.target.closest('.item-remove');
  const item = event.target.closest('.cart-item');
  if (!item) return;

  const id = item.dataset.id;
  const size = item.dataset.size;
  const color = item.dataset.color;

  if (qtyBtn) {
    const input = item.querySelector('.qty-input');
    let value = parseInt(input.value, 10) || 1;
    if (qtyBtn.dataset.action === 'decrease') {
      value = Math.max(1, value - 1);
    } else {
      value += 1;
    }
    input.value = value;
    store.updateCartItem(id, size, color, value);
    updateCartTotals();
  }

  if (removeBtn) {
    store.removeFromCart(id, size, color);
    renderCart();
    store.showToast('Article supprimé');
  }
});

cartItemsContainer?.addEventListener('change', (event) => {
  const input = event.target.closest('.qty-input');
  const item = event.target.closest('.cart-item');
  if (!input || !item) return;

  const id = item.dataset.id;
  const size = item.dataset.size;
  const color = item.dataset.color;
  const value = Math.max(1, parseInt(input.value, 10) || 1);

  input.value = value;
  store.updateCartItem(id, size, color, value);
  updateCartTotals();
});

// Code promo
document.querySelector('.promo-btn')?.addEventListener('click', function() {
  const promoInput = document.querySelector('.promo-input');
  const promoCode = promoInput.value.trim().toUpperCase();

  if (!promoCode) {
    store.showToast('Veuillez entrer un code promo');
    return;
  }

  const promoCodes = {
    'BIENVENUE20': 0.20,
    'PROMO10': 0.10,
    'NOEL15': 0.15
  };

  if (promoCodes[promoCode]) {
    const discount = promoCodes[promoCode];
    const currentTotal = store.parsePrice(totalEl?.textContent || 0);
    const newTotal = currentTotal * (1 - discount);

    if (totalEl) totalEl.textContent = store.formatPrice(newTotal);
    store.showToast(`Code promo appliqué ! -${discount * 100}%`);
    promoInput.value = '';
  } else {
    store.showToast('Code promo invalide');
  }
});

// Popup de confirmation
function showCheckoutModal() {
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
        <button class="btn-cancel" onclick="closeCheckoutModal()">Annuler</button>
        <button class="btn-continue" onclick="proceedToCheckout()">Continuer →</button>
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
}

function closeCheckoutModal() {
  const modal = document.querySelector('.checkout-modal');
  if (modal) {
    modal.querySelector('.checkout-modal-overlay').style.opacity = '0';
    modal.querySelector('.checkout-modal-content').style.opacity = '0';
    modal.querySelector('.checkout-modal-content').style.transform = 'translateY(-20px) scale(0.95)';
    setTimeout(() => modal.remove(), 300);
  }
}

function proceedToCheckout() {
  const cart = store.getCart();
  if (cart.length === 0) {
    store.showToast('Votre panier est vide');
    return;
  }
  window.location.href = 'checkout.html';
}

// Bouton checkout
document.querySelector('.checkout-btn')?.addEventListener('click', function() {
  if (store.getCart().length === 0) {
    store.showToast('Votre panier est vide');
    return;
  }

  showCheckoutModal();
});

renderCart();
store.updateBadges();
