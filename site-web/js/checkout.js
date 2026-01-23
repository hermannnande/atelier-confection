(() => {
  if (window.__CheckoutPageLoaded) return;
  window.__CheckoutPageLoaded = true;

  const store = window.SiteStore;
  const CART_KEY = 'atelier-cart';
  const CHECKOUT_CART_KEY = 'checkoutCart';

const readCartFallback = () => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const readCheckoutCart = () => {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

// Charger les articles du panier depuis localStorage
function loadCartSummary() {
  const sessionCart = readCheckoutCart();
  const localCart = readCartFallback();
  const storeCart = store?.getCart ? store.getCart() : [];
  
  console.log('🔍 DEBUG CHECKOUT:');
  console.log('  sessionStorage.checkoutCart:', sessionCart);
  console.log('  localStorage.atelier-cart:', localCart);
  console.log('  SiteStore.getCart():', storeCart);
  
  const cartItems = sessionCart.length
    ? sessionCart
    : (storeCart.length ? storeCart : localCart);
  
  console.log('  ✅ Panier final utilisé:', cartItems);
  
  const summaryItemsContainer = document.getElementById('summaryItems');
  
  if (cartItems.length === 0) {
    summaryItemsContainer.innerHTML = `
      <div class="summary-empty" style="padding: 40px; text-align: center; background: #fff3cd; border-radius: 12px;">
        <h3 style="color: #856404; margin-bottom: 12px;">⚠️ Panier vide</h3>
        <p style="color: #856404; margin-bottom: 20px;">
          Aucun article détecté.<br>
          <small>Vérifiez la console (F12) pour plus de détails.</small>
        </p>
        <a href="panier.html" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700;">
          Retour au panier
        </a>
      </div>
    `;
    document.getElementById('summarySubtotal').textContent = '0 FCFA';
    document.getElementById('summaryTotal').textContent = '0 FCFA';
    return;
  }

  // Nettoyer le cache checkout pour éviter un vieux panier
  if (sessionCart.length) {
    sessionStorage.removeItem(CHECKOUT_CART_KEY);
  }

  let subtotal = 0;

  summaryItemsContainer.innerHTML = cartItems.map(item => {
    const price = store?.parsePrice ? store.parsePrice(item.price) : Number(item.price) || 0;
    const qty = parseInt(item.qty, 10) || 1;
    const itemTotal = price * qty;
    subtotal += itemTotal;

    return `
      <div class="summary-item">
        <img src="${item.image}" 
             alt="${item.name}" 
             class="summary-item-image">
        <div class="summary-item-details">
          <h4>${item.name}</h4>
          <div class="summary-item-meta">
            ${item.size} • ${item.color} • Qté: ${qty}
          </div>
          <div class="summary-item-price">${
            store?.formatPrice ? store.formatPrice(itemTotal) : `${itemTotal} FCFA`
          }</div>
        </div>
      </div>
    `;
  }).join('');

  // Mettre à jour les totaux
  const formatted = store?.formatPrice ? store.formatPrice(subtotal) : `${subtotal} FCFA`;
  document.getElementById('summarySubtotal').textContent = formatted;
  document.getElementById('summaryTotal').textContent = formatted;
}

// Validation du formulaire
document.getElementById('deliveryForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const submitBtn = this.querySelector('.submit-btn');
  const formData = new FormData(this);
  
  // Données du formulaire
  const orderData = {
    client: formData.get('fullname'),
    phone: formData.get('phone'),
    ville: formData.get('city'),
    notes: formData.get('notes') || '',
    items: store?.getCart ? store.getCart() : readCartFallback(),
    total: document.getElementById('summaryTotal').textContent,
    source: 'site-web',
    date: new Date().toISOString()
  };

  // Validation
  if (!orderData.client || !orderData.phone || !orderData.ville) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }

  // Animation de chargement
  submitBtn.classList.add('loading');
  submitBtn.innerHTML = '<span>Envoi en cours...</span>';

  try {
    // Simuler l'envoi (à remplacer par votre vraie API)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Ici, vous pouvez envoyer à votre backend :
    // const response = await fetch('https://atelier-confection.vercel.app/api/commandes/public', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     token: 'NOUSUNIQUE123',
    //     client: orderData.client,
    //     phone: orderData.phone,
    //     ville: orderData.ville,
    //     items: orderData.items,
    //     ...
    //   })
    // });

    // Sauvegarder la commande
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push({
      ...orderData,
      id: 'CMD' + Date.now(),
      status: 'en_attente_validation',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('orders', JSON.stringify(orders));

    // Stocker les données pour la page de remerciement
    sessionStorage.setItem('lastOrder', JSON.stringify({
      fullname: orderData.client,
      phone: orderData.phone,
      city: orderData.ville,
      notes: orderData.notes,
      total: orderData.total
    }));

    // Vider le panier
    if (store?.saveCart) {
      store.cart = [];
      store.saveCart();
    } else {
      localStorage.setItem(CART_KEY, JSON.stringify([]));
    }

    // Redirection vers la page de remerciement
    window.location.href = 'merci.html';

  } catch (error) {
    console.error('Erreur:', error);
    alert('Une erreur est survenue. Veuillez réessayer.');
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = `
      <span>Confirmer ma commande</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14"></path>
        <path d="m12 5 7 7-7 7"></path>
      </svg>
    `;
  }
});

// Cette fonction n'est plus nécessaire avec la page de remerciement dédiée

// Charger le résumé au chargement de la page
loadCartSummary();
})();
