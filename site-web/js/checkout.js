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
        <a href="panier" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700;">
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

// URL de l'API (prod Vercel ou localhost)
const resolveApiUrl = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'https://atelier-confection.vercel.app/api/commandes/public';
  }
  return window.location.origin + '/api/commandes/public';
};

const API_URL = resolveApiUrl();
const API_TOKEN = 'NOUSUNIQUE123';

// Envoyer un article au backend
const sendItemToApi = async (item, clientInfo) => {
  const body = {
    token: API_TOKEN,
    client: clientInfo.client,
    phone: clientInfo.phone,
    ville: clientInfo.ville,
    name: item.name || 'Produit',
    taille: item.size || 'Standard',
    couleur: item.color || 'Non specifie',
    price: String(store?.parsePrice ? store.parsePrice(item.price) : Number(item.price) || 0),
    image: item.image || '',
    category: item.category || '',
    source: 'site-web-ecommerce',
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Erreur ${response.status}`);
  }

  return response.json();
};

// Validation du formulaire
document.getElementById('deliveryForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const submitBtn = this.querySelector('.submit-btn');
  const formData = new FormData(this);

  const clientInfo = {
    client: formData.get('fullname'),
    phone: formData.get('phone'),
    ville: formData.get('city'),
    notes: formData.get('notes') || '',
  };

  const cartItems = store?.getCart ? store.getCart() : readCartFallback();

  if (!clientInfo.client || !clientInfo.phone || !clientInfo.ville) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }

  if (!cartItems.length) {
    alert('Votre panier est vide');
    return;
  }

  submitBtn.classList.add('loading');
  submitBtn.innerHTML = '<span>Envoi en cours...</span>';

  try {
    const results = [];
    for (const item of cartItems) {
      const qty = item.qty || 1;
      for (let i = 0; i < qty; i++) {
        const result = await sendItemToApi(item, clientInfo);
        results.push(result);
      }
    }

    console.log('Commandes envoyees:', results);

    // Sauvegarde locale en backup
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push({
      ...clientInfo,
      items: cartItems,
      total: document.getElementById('summaryTotal').textContent,
      id: results[0]?.numeroCommande || ('CMD' + Date.now()),
      status: 'en_attente_validation',
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('orders', JSON.stringify(orders));

    sessionStorage.setItem('lastOrder', JSON.stringify({
      fullname: clientInfo.client,
      phone: clientInfo.phone,
      city: clientInfo.ville,
      notes: clientInfo.notes,
      total: document.getElementById('summaryTotal').textContent,
    }));

    if (store?.clearCart) {
      store.clearCart();
    } else {
      localStorage.setItem(CART_KEY, JSON.stringify([]));
    }

    window.location.href = 'merci';

  } catch (error) {
    console.error('Erreur envoi commande:', error);
    alert(
      'Erreur lors de l\'envoi de la commande.\n' +
      error.message + '\n\n' +
      'Veuillez reessayer ou nous contacter au 07 05 88 11 16.'
    );
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
