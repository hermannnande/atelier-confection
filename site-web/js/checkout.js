const store = window.SiteStore;

// Charger les articles du panier depuis localStorage
function loadCartSummary() {
  const cartItems = store.getCart();
  const summaryItemsContainer = document.getElementById('summaryItems');
  
  if (cartItems.length === 0) {
    window.location.href = '../pages/panier.html';
    return;
  }

  let subtotal = 0;

  summaryItemsContainer.innerHTML = cartItems.map(item => {
    const price = store.parsePrice(item.price);
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
          <div class="summary-item-price">${store.formatPrice(itemTotal)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Mettre à jour les totaux
  document.getElementById('summarySubtotal').textContent = store.formatPrice(subtotal);
  document.getElementById('summaryTotal').textContent = store.formatPrice(subtotal);
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
    address: formData.get('address') || '',
    notes: formData.get('notes') || '',
    items: store.getCart(),
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

    // Vider le panier
    store.clearCart();

    // Redirection vers page de confirmation
    showSuccessModal(orderData);

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

// Modal de succès
function showSuccessModal(orderData) {
  const modal = document.createElement('div');
  modal.className = 'success-modal';
  modal.innerHTML = `
    <div class="success-modal-overlay"></div>
    <div class="success-modal-content">
      <div class="success-icon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
      </div>
      <h2>🎉 Commande confirmée !</h2>
      <p class="success-message">
        Merci <strong>${orderData.client}</strong> !<br>
        Votre commande a été enregistrée avec succès.
      </p>
      <div class="order-details">
        <div class="detail-item">
          <strong>📍 Livraison :</strong> ${orderData.ville}
        </div>
        <div class="detail-item">
          <strong>⏱️ Délai :</strong> 3 jours ouvrables
        </div>
        <div class="detail-item">
          <strong>💰 Total :</strong> ${orderData.total}
        </div>
        <div class="detail-item">
          <strong>💳 Paiement :</strong> À la livraison
        </div>
      </div>
      <p class="confirmation-text">
        Nous allons confectionner votre tenue avec soin.<br>
        Vous serez contactée au <strong>${orderData.phone}</strong> pour confirmer la livraison.
      </p>
      <button class="btn-home" onclick="goToHome()">Retour à l'accueil</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Ajouter les styles
  const style = document.createElement('style');
  style.textContent = `
    .success-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .success-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      animation: fadeIn 0.3s ease;
    }

    .success-modal-content {
      position: relative;
      background: white;
      border-radius: 24px;
      padding: 48px;
      max-width: 600px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .success-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }

    .success-icon svg {
      color: #10b981;
      animation: checkmark 0.6s ease;
    }

    @keyframes checkmark {
      0% {
        transform: scale(0) rotate(-45deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.2) rotate(5deg);
      }
      100% {
        transform: scale(1) rotate(0);
        opacity: 1;
      }
    }

    .success-modal-content h2 {
      font-size: 32px;
      font-weight: 900;
      color: #000;
      margin-bottom: 16px;
    }

    .success-message {
      font-size: 18px;
      color: #333;
      line-height: 1.8;
      margin-bottom: 32px;
    }

    .order-details {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      text-align: left;
    }

    .detail-item {
      padding: 12px 0;
      border-bottom: 1px solid #dee2e6;
      font-size: 15px;
      color: #333;
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-item strong {
      color: #000;
      margin-right: 8px;
    }

    .confirmation-text {
      font-size: 15px;
      color: #666;
      line-height: 1.8;
      margin-bottom: 32px;
    }

    .btn-home {
      width: 100%;
      padding: 18px 32px;
      background: linear-gradient(135deg, #000 0%, #333 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-home:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 640px) {
      .success-modal-content {
        padding: 32px 24px;
      }

      .success-modal-content h2 {
        font-size: 24px;
      }
    }
  `;
  document.head.appendChild(style);

  // Animation d'entrée
  setTimeout(() => {
    modal.querySelector('.success-modal-overlay').style.opacity = '1';
  }, 10);
}

function goToHome() {
  window.location.href = '../index.html';
}

// Charger le résumé au chargement de la page
loadCartSummary();
