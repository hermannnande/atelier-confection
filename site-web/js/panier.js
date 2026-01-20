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

// Bouton checkout
document.querySelector('.checkout-btn')?.addEventListener('click', function() {
  const itemCount = document.querySelectorAll('.cart-item').length;
  
  if (itemCount === 0) {
    alert('Votre panier est vide');
    return;
  }

  // Redirection vers une page de paiement (à implémenter)
  alert('Redirection vers le paiement...');
});
