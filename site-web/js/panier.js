// Gestion des quantités
document.querySelectorAll('.qty-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const action = this.dataset.action;
    const input = this.parentElement.querySelector('.qty-input');
    let value = parseInt(input.value);

    if (action === 'decrease' && value > 1) {
      input.value = value - 1;
    } else if (action === 'increase') {
      input.value = value + 1;
    }

    updateCartTotals();
  });
});

// Mise à jour manuelle de la quantité
document.querySelectorAll('.qty-input').forEach(input => {
  input.addEventListener('change', function() {
    if (this.value < 1) {
      this.value = 1;
    }
    updateCartTotals();
  });
});

// Supprimer un article
document.querySelectorAll('.item-remove').forEach(btn => {
  btn.addEventListener('click', function() {
    const item = this.closest('.cart-item');
    
    if (confirm('Voulez-vous vraiment supprimer cet article ?')) {
      item.style.opacity = '0';
      item.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        item.remove();
        updateCartTotals();
        updateCartBadge();
      }, 300);
    }
  });
});

// Calculer les totaux
function updateCartTotals() {
  const items = document.querySelectorAll('.cart-item');
  let subtotal = 0;

  items.forEach(item => {
    const price = parseInt(item.querySelector('.item-price').textContent.replace(/[^0-9]/g, ''));
    const qty = parseInt(item.querySelector('.qty-input').value);
    subtotal += price * qty;
  });

  // Mettre à jour l'affichage
  document.getElementById('subtotal').textContent = subtotal.toLocaleString() + ' FCFA';
  document.getElementById('total').textContent = subtotal.toLocaleString() + ' FCFA';
}

// Mettre à jour le badge du panier
function updateCartBadge() {
  const itemCount = document.querySelectorAll('.cart-item').length;
  const badge = document.querySelector('.header-actions .badge');
  if (badge) {
    badge.textContent = itemCount;
    if (itemCount === 0) {
      badge.style.display = 'none';
    }
  }
}

// Code promo
document.querySelector('.promo-btn')?.addEventListener('click', function() {
  const promoInput = document.querySelector('.promo-input');
  const promoCode = promoInput.value.trim().toUpperCase();

  if (!promoCode) {
    alert('Veuillez entrer un code promo');
    return;
  }

  // Codes promo d'exemple
  const promoCodes = {
    'BIENVENUE20': 0.20,
    'PROMO10': 0.10,
    'NOEL15': 0.15
  };

  if (promoCodes[promoCode]) {
    const discount = promoCodes[promoCode];
    const currentTotal = parseInt(document.getElementById('total').textContent.replace(/[^0-9]/g, ''));
    const newTotal = currentTotal * (1 - discount);

    document.getElementById('total').textContent = newTotal.toLocaleString() + ' FCFA';
    alert(`Code promo appliqué ! Réduction de ${discount * 100}%`);
    promoInput.value = '';
  } else {
    alert('Code promo invalide');
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
        <p>Nous vous proposons de <strong>magnifiques tenues</strong>, confectionnées avec soin et de belles finitions.</p>
        <div class="delivery-info">
          <div class="info-badge">
            <span class="icon">⏱️</span>
            <span><strong>Délai</strong> : confection + livraison en <strong>3 jours ouvrables</strong></span>
          </div>
          <div class="info-badge">
            <span class="icon">💰</span>
            <span><strong>Paiement uniquement à la livraison</strong></span>
          </div>
          <div class="info-badge">
            <span class="icon">✨</span>
            <span>Rendu élégant, bien fini et de qualité</span>
          </div>
        </div>
        <p class="note">Votre commande sera traitée par notre atelier, puis livrée à votre adresse.</p>
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
  // Sauvegarder le panier dans localStorage
  const cartItems = [];
  document.querySelectorAll('.cart-item').forEach(item => {
    cartItems.push({
      name: item.querySelector('.item-details h3').textContent,
      size: item.querySelector('.item-size').textContent,
      color: item.querySelector('.item-color').textContent,
      price: item.querySelector('.item-price').textContent,
      qty: item.querySelector('.qty-input').value
    });
  });
  localStorage.setItem('cartItems', JSON.stringify(cartItems));
  
  // Redirection vers la page de commande
  window.location.href = '../pages/checkout.html';
}

// Bouton checkout
document.querySelector('.checkout-btn')?.addEventListener('click', function() {
  const itemCount = document.querySelectorAll('.cart-item').length;
  
  if (itemCount === 0) {
    alert('Votre panier est vide');
    return;
  }

  showCheckoutModal();
});
