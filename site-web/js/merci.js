// ===========================
// PAGE DE REMERCIEMENT
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  // Récupérer les données de la commande depuis sessionStorage
  const orderData = JSON.parse(sessionStorage.getItem('lastOrder') || '{}');

  // Afficher les informations du client si disponibles
  if (orderData.fullname) {
    document.getElementById('customerName').textContent = orderData.fullname;
  }
  if (orderData.phone) {
    document.getElementById('customerPhone').textContent = orderData.phone;
  }
  if (orderData.city) {
    document.getElementById('customerCity').textContent = orderData.city;
  }

  // Vider le panier après la commande
  if (window.store) {
    window.store.cart = [];
    window.store.saveCart();
  }

  // Nettoyer sessionStorage après affichage
  // sessionStorage.removeItem('lastOrder');
});
