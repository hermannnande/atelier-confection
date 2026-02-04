const ORDER_STATUSES = [
  { value: 'en_attente_validation', label: 'En attente', badge: 'badge-warning' },
  { value: 'confirmee', label: 'Confirmée', badge: 'badge-success' },
  { value: 'en_preparation', label: 'En préparation', badge: 'badge-warning' },
  { value: 'en_livraison', label: 'En livraison', badge: 'badge-warning' },
  { value: 'livree', label: 'Livrée', badge: 'badge-success' },
  { value: 'annulee', label: 'Annulée', badge: 'badge-danger' }
];

function getStatusMeta(status) {
  return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
}

function loadOrders() {
  const orders = AdminStore.getOrders();
  const tbody = document.getElementById('ordersTableBody');
  const count = document.getElementById('ordersCount');

  if (count) count.textContent = `${orders.length} commande(s)`;

  if (!orders.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">
          Aucune commande pour le moment.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const status = getStatusMeta(order.status);
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsText = items.map(i => `${i.name} x${i.qty || 1}`).join(', ');
    const total = typeof order.total === 'string' ? order.total : `${order.total || 0} FCFA`;
    const date = order.createdAt ? new Date(order.createdAt).toLocaleString('fr-FR') : '-';

    return `
      <tr>
        <td><strong>${order.id || '-'}</strong></td>
        <td>
          <div><strong>${order.client || '-'}</strong></div>
          <div style="font-size: 12px; color: #6b7280;">${order.phone || ''}</div>
        </td>
        <td class="order-items">${itemsText || '-'}</td>
        <td><strong>${total}</strong></td>
        <td>
          <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)">
            ${ORDER_STATUSES.map(opt => `
              <option value="${opt.value}" ${opt.value === order.status ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        </td>
        <td>${date}</td>
      </tr>
    `;
  }).join('');
}

function updateOrderStatus(id, status) {
  if (!id) return;
  AdminStore.updateOrderStatus(id, status);
  loadOrders();
  alert('Statut mis à jour.');
}

loadOrders();
console.log('✓ Orders Manager chargé');
