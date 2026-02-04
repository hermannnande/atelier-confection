const form = document.getElementById('settingsForm');

function loadSettings() {
  const settings = AdminStore.getSettings();
  document.getElementById('siteName').value = settings.siteName || '';
  document.getElementById('siteEmail').value = settings.siteEmail || '';
  document.getElementById('sitePhone').value = settings.sitePhone || '';
  document.getElementById('siteAddress').value = settings.siteAddress || '';
  document.getElementById('siteDescription').value = settings.siteDescription || '';

  document.getElementById('socialFacebook').value = settings.socialFacebook || '';
  document.getElementById('socialInstagram').value = settings.socialInstagram || '';
  document.getElementById('socialWhatsApp').value = settings.socialWhatsApp || '';

  document.getElementById('deliveryFee').value = settings.deliveryFee || '';
  document.getElementById('freeDelivery').value = settings.freeDelivery || '';
  document.getElementById('deliveryZones').value = settings.deliveryZones || '';
}

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    AdminStore.saveSetting('siteName', document.getElementById('siteName').value.trim());
    AdminStore.saveSetting('siteEmail', document.getElementById('siteEmail').value.trim());
    AdminStore.saveSetting('sitePhone', document.getElementById('sitePhone').value.trim());
    AdminStore.saveSetting('siteAddress', document.getElementById('siteAddress').value.trim());
    AdminStore.saveSetting('siteDescription', document.getElementById('siteDescription').value.trim());

    AdminStore.saveSetting('socialFacebook', document.getElementById('socialFacebook').value.trim());
    AdminStore.saveSetting('socialInstagram', document.getElementById('socialInstagram').value.trim());
    AdminStore.saveSetting('socialWhatsApp', document.getElementById('socialWhatsApp').value.trim());

    AdminStore.saveSetting('deliveryFee', document.getElementById('deliveryFee').value.trim());
    AdminStore.saveSetting('freeDelivery', document.getElementById('freeDelivery').value.trim());
    AdminStore.saveSetting('deliveryZones', document.getElementById('deliveryZones').value.trim());

    alert('Paramètres enregistrés.');
  });
}

loadSettings();
console.log('✓ Settings Manager chargé');
