// Gestion des produits
let currentImages = []; // Images galerie (portrait) - max 5
let currentVideo = ''; // URL vidéo
let currentThumbnail = ''; // Vignette boutique 600x600
let editingProductId = null;
let selectedSizes = []; // Tailles sélectionnées
let selectedColors = []; // Couleurs sélectionnées {name, hex}

// Tailles prédéfinies
const PREDEFINED_SIZES = ['Taille standard', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

// Couleurs prédéfinies
const PREDEFINED_COLORS = [
  { name: 'Noir', hex: '#000000' },
  { name: 'Blanc', hex: '#FFFFFF' },
  { name: 'Gris', hex: '#6B7280' },
  { name: 'Beige', hex: '#D2B48C' },
  { name: 'Marron', hex: '#8B4513' },
  { name: 'Terracotta', hex: '#C2452D' },
  { name: 'Rouge', hex: '#DC2626' },
  { name: 'Bordeaux', hex: '#7F1D1D' },
  { name: 'Rose', hex: '#F472B6' },
  { name: 'Saumon', hex: '#FA8072' },
  { name: 'Orange', hex: '#FB923C' },
  { name: 'Jaune', hex: '#FBBF24' },
  { name: 'Jaune Moutarde', hex: '#CA8A04' },
  { name: 'Vert', hex: '#16A34A' },
  { name: 'Vert Treillis', hex: '#15803D' },
  { name: 'Bleu', hex: '#3B82F6' },
  { name: 'Bleu Ciel', hex: '#87CEEB' },
  { name: 'Bleu Bic', hex: '#2563EB' },
  { name: 'Violet', hex: '#9333EA' },
  { name: 'Violet Clair', hex: '#C084FC' },
  { name: 'Multicolore', hex: 'linear-gradient(135deg, #DC2626, #FBBF24, #3B82F6)' },
];

// ========== GESTION DES TAILLES ==========

function initSizesCheckboxes() {
  const container = document.getElementById('sizesCheckboxContainer');
  if (!container) return;
  
  container.innerHTML = PREDEFINED_SIZES.map(size => {
    const checked = selectedSizes.includes(size) ? 'checked' : '';
    return `
      <label style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border: 2px solid ${checked ? '#8b5cf6' : '#d1d5db'}; border-radius: 6px; cursor: pointer; background: ${checked ? '#f3f0ff' : 'white'}; transition: all 0.2s;">
        <input type="checkbox" value="${size}" ${checked} onchange="toggleSize('${size}')" style="width: 18px; height: 18px; cursor: pointer;">
        <span style="font-weight: 600; font-size: 13px;">${size}</span>
      </label>
    `;
  }).join('');
}

function toggleSize(size) {
  const index = selectedSizes.indexOf(size);
  if (index > -1) {
    selectedSizes.splice(index, 1);
  } else {
    selectedSizes.push(size);
  }
  initSizesCheckboxes(); // Re-render pour mettre à jour les styles
}

function addCustomSize() {
  const input = document.getElementById('customSizeInput');
  const size = input.value.trim().toUpperCase();
  
  if (!size) {
    alert('Veuillez entrer une taille personnalisée');
    return;
  }
  
  if (selectedSizes.includes(size)) {
    alert('Cette taille est déjà ajoutée');
    return;
  }
  
  selectedSizes.push(size);
  input.value = '';
  initSizesCheckboxes();
}

// ========== GESTION DES COULEURS ==========

function initColorsDisplay() {
  const container = document.getElementById('colorsPickerContainer');
  if (!container) return;
  
  if (selectedColors.length === 0) {
    container.innerHTML = `<p style="color: #9ca3af; font-size: 13px; width: 100%;">Aucune couleur sélectionnée. Cliquez sur le bouton pour ajouter des couleurs.</p>`;
    return;
  }
  
  container.innerHTML = selectedColors.map((color, index) => `
    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: white; border: 2px solid #e5e7eb; border-radius: 8px;">
      <div style="width: 24px; height: 24px; border-radius: 4px; background: ${color.hex}; border: 2px solid #d1d5db;"></div>
      <span style="font-weight: 600; font-size: 13px; flex: 1;">${color.name}</span>
      <button type="button" onclick="removeColor(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function removeColor(index) {
  selectedColors.splice(index, 1);
  initColorsDisplay();
}

function openColorPicker() {
  const modal = document.getElementById('colorPickerModal');
  if (!modal) return;
  
  // Initialiser les couleurs prédéfinies
  const grid = document.getElementById('predefinedColorsGrid');
  if (grid) {
    grid.innerHTML = PREDEFINED_COLORS.map(color => {
      const isSelected = selectedColors.some(c => c.name === color.name);
      return `
        <div onclick="togglePredefinedColor('${color.name}', '${color.hex}')" style="cursor: pointer; padding: 10px; border: 2px solid ${isSelected ? '#8b5cf6' : '#e5e7eb'}; border-radius: 8px; text-align: center; background: ${isSelected ? '#f3f0ff' : 'white'}; transition: all 0.2s;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: ${color.hex}; border: 2px solid #d1d5db; margin: 0 auto 6px;"></div>
          <span style="font-size: 11px; font-weight: 600; color: #374151;">${color.name}</span>
        </div>
      `;
    }).join('');
  }
  
  modal.classList.add('active');
}

function closeColorPicker() {
  const modal = document.getElementById('colorPickerModal');
  if (!modal) return;
  modal.classList.remove('active');
  initColorsDisplay();
}

function togglePredefinedColor(name, hex) {
  const index = selectedColors.findIndex(c => c.name === name);
  if (index > -1) {
    selectedColors.splice(index, 1);
  } else {
    selectedColors.push({ name, hex });
  }
  openColorPicker(); // Re-render le modal
}

function addCustomColorToSelection() {
  const nameInput = document.getElementById('customColorName');
  const hexInput = document.getElementById('customColorHex');
  
  const name = nameInput.value.trim();
  const hex = hexInput.value;
  
  if (!name) {
    alert('Veuillez entrer un nom pour la couleur');
    return;
  }
  
  if (selectedColors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    alert('Cette couleur existe déjà');
    return;
  }
  
  selectedColors.push({ name, hex });
  nameInput.value = '';
  hexInput.value = '#000000';
  openColorPicker(); // Re-render
}

// Charger les catégories dans le select
function loadCategories() {
  const select = document.getElementById('productCategory');
  if (!select) return;
  
  const categories = AdminStore.getCategories();
  select.innerHTML = '<option value="">Sélectionner...</option>';
  
  categories.forEach(cat => {
    if (cat.active) {
      const option = document.createElement('option');
      option.value = cat.slug;
      option.textContent = cat.name;
      select.appendChild(option);
    }
  });
}

// ========== FILTRES & RECHERCHE ==========
let productFilters = { search: '', category: 'all', status: 'all' };

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Retrouver le nom lisible d'une catégorie à partir de son slug
function getCategoryLabel(slug) {
  if (!slug) return '';
  try {
    const cat = AdminStore.getCategories().find(c => c.slug === slug || c.id === slug);
    return cat ? cat.name : slug;
  } catch (e) {
    return slug;
  }
}

// Statut de stock d'un produit
function getStockStatus(stock) {
  const n = Number(stock) || 0;
  if (n <= 0) return { key: 'out', label: 'Rupture', color: '#ef4444', badge: 'badge-danger' };
  if (n <= 5) return { key: 'low', label: 'Stock faible', color: '#f59e0b', badge: 'badge-warning' };
  return { key: 'in-stock', label: 'En stock', color: '#10b981', badge: 'badge-success' };
}

// Remplir le filtre catégorie
function populateCategoryFilter() {
  const select = document.getElementById('productCategoryFilter');
  if (!select) return;
  const current = select.value || 'all';
  const categories = AdminStore.getCategories();
  select.innerHTML = '<option value="all">Toutes les catégories</option>' +
    categories.map(c => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>`).join('');
  select.value = current;
}

// Appliquer recherche + filtres
function getFilteredProducts() {
  let products = AdminStore.getProducts();
  const term = productFilters.search.trim().toLowerCase();

  if (term) {
    products = products.filter(p => (p.name || '').toLowerCase().includes(term));
  }
  if (productFilters.category !== 'all') {
    products = products.filter(p => p.category === productFilters.category);
  }
  if (productFilters.status !== 'all') {
    products = products.filter(p => getStockStatus(p.stock).key === productFilters.status);
  }
  return products;
}

// Charger la liste des produits
function loadProducts() {
  const tbody = document.getElementById('productsTableBody');
  const count = document.getElementById('productsCount');
  if (!tbody) return;

  const total = AdminStore.getProducts().length;
  const products = getFilteredProducts();

  if (count) {
    count.textContent = (products.length === total)
      ? `${total} produit(s)`
      : `${products.length} sur ${total} produit(s)`;
  }

  if (total === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="table-empty">
          <svg viewBox="0 0 24 24" width="56" height="56" fill="currentColor">
            <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 00-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
          </svg>
          <h3>Aucun produit</h3>
          <p>Cliquez sur « Nouveau Produit » pour créer votre premier article.</p>
        </div>
      </td></tr>
    `;
    return;
  }

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="table-empty">
          <svg viewBox="0 0 24 24" width="56" height="56" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 110-9 4.5 4.5 0 010 9z"/>
          </svg>
          <h3>Aucun résultat</h3>
          <p>Aucun produit ne correspond à votre recherche ou à vos filtres.</p>
        </div>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(product => {
    const image = product.thumbnail || (product.images && product.images[0]) || 'https://via.placeholder.com/120x150?text=%20';
    const name = escapeHtml(product.name || 'Sans nom');
    const catLabel = getCategoryLabel(product.category);
    const price = Number(product.price) || 0;
    const originalPrice = Number(product.originalPrice) || 0;
    const hasPromo = originalPrice > price && price > 0;
    const promoPct = hasPromo ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    const status = getStockStatus(product.stock);
    const mediaCount = (Array.isArray(product.images) ? product.images.length : 0) + (product.video ? 1 : 0);

    return `
      <tr>
        <td>
          <div class="prod-cell">
            <img src="${image}" class="prod-thumb" alt="${name}" loading="lazy">
            <div>
              <div class="prod-name">${name}</div>
              <div class="prod-meta">
                <span>${mediaCount} média${mediaCount > 1 ? 's' : ''}</span>
                ${product.video ? '<span class="dot-sep">•</span><span>vidéo</span>' : ''}
              </div>
            </div>
          </div>
        </td>
        <td>${catLabel ? `<span class="cat-pill">${escapeHtml(catLabel)}</span>` : '<span style="color:#9ca3af;">—</span>'}</td>
        <td>
          <div class="price-main">${price.toLocaleString('fr-FR')} FCFA</div>
          ${hasPromo ? `<div class="price-sub"><span class="price-old">${originalPrice.toLocaleString('fr-FR')} FCFA</span><span class="price-promo">-${promoPct}%</span></div>` : ''}
        </td>
        <td>
          <span class="stock-pill"><span class="stock-dot" style="background:${status.color};"></span>${Number(product.stock) || 0}</span>
        </td>
        <td><span class="badge ${status.badge}">${status.label}</span></td>
        <td>
          <div class="action-btns">
            <button class="icon-btn view" onclick="copyProductLink('${product.id}')" title="Copier le lien">
              <svg viewBox="0 0 24 24" width="17" height="17">
                <path fill="currentColor" d="M3.9 12a5 5 0 0 1 1.46-3.54l2.83-2.83a5 5 0 0 1 7.07 7.07l-1.06 1.06-1.41-1.41 1.06-1.06a3 3 0 1 0-4.24-4.24L6.77 9.9a3 3 0 0 0 4.24 4.24l.7-.7 1.41 1.41-.7.7A5 5 0 0 1 3.9 12Zm6.36 1.41 1.41 1.41 2.83-2.83a5 5 0 0 0-7.07-7.07L6.36 6.29l1.41 1.41 1.06-1.06a3 3 0 1 1 4.24 4.24l-2.83 2.83Z"/>
              </svg>
            </button>
            <button class="icon-btn edit" onclick="editProduct('${product.id}')" title="Modifier">
              <svg viewBox="0 0 24 24" width="17" height="17">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="icon-btn delete" onclick="deleteProduct('${product.id}')" title="Supprimer">
              <svg viewBox="0 0 24 24" width="17" height="17">
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Brancher la recherche et les filtres
function setupProductFilters() {
  const search = document.getElementById('productSearch');
  const catFilter = document.getElementById('productCategoryFilter');
  const statusFilter = document.getElementById('productStatusFilter');

  if (search && !search.dataset.bound) {
    search.dataset.bound = '1';
    search.addEventListener('input', (e) => {
      productFilters.search = e.target.value;
      loadProducts();
    });
  }
  if (catFilter && !catFilter.dataset.bound) {
    catFilter.dataset.bound = '1';
    catFilter.addEventListener('change', (e) => {
      productFilters.category = e.target.value;
      loadProducts();
    });
  }
  if (statusFilter && !statusFilter.dataset.bound) {
    statusFilter.dataset.bound = '1';
    statusFilter.addEventListener('change', (e) => {
      productFilters.status = e.target.value;
      loadProducts();
    });
  }
}

// Copier le lien produit
function copyProductLink(id) {
  const url = new URL('../pages/produit.html', window.location.href);
  url.searchParams.set('id', id);

  navigator.clipboard.writeText(url.toString()).then(() => {
    alert(`Lien copié : ${url}`);
  }).catch(() => {
    prompt('Copiez le lien du produit :', url.toString());
  });
}

// Ouvrir le modal de création
function openProductModal() {
  editingProductId = null;
  currentImages = [];
  currentVideo = '';
  currentThumbnail = '';
  selectedSizes = []; // Reset tailles
  selectedColors = []; // Reset couleurs
  
  document.getElementById('modalTitle').textContent = 'Nouveau Produit';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('previewImages').innerHTML = '';
  document.getElementById('previewVideo').innerHTML = '';
  const previewThumbnail = document.getElementById('previewThumbnail');
  if (previewThumbnail) previewThumbnail.innerHTML = '';
  
  document.getElementById('productModal').classList.add('active');
  loadCategories();
  initSizesCheckboxes();
  initColorsDisplay();
}

// Fermer le modal
function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
  editingProductId = null;
  currentImages = [];
  currentVideo = '';
  currentThumbnail = '';
}

// Éditer un produit
function editProduct(id) {
  const product = AdminStore.getProduct(id);
  if (!product) return;
  
  editingProductId = id;
  document.getElementById('modalTitle').textContent = 'Modifier le Produit';
  document.getElementById('productId').value = id;
  document.getElementById('productName').value = product.name || '';
  document.getElementById('productCategory').value = product.category || '';
  document.getElementById('productPrice').value = product.price || '';
  document.getElementById('productOriginalPrice').value = product.originalPrice || '';
  document.getElementById('productStock').value = product.stock || 0;
  document.getElementById('productDescription').value = product.description || '';
  
  // Charger les tailles et couleurs
  selectedSizes = Array.isArray(product.sizes) ? [...product.sizes] : [];
  
  // Charger les couleurs (format: array of strings ou array of objects)
  if (Array.isArray(product.colors)) {
    selectedColors = product.colors.map(c => {
      if (typeof c === 'string') {
        // Format ancien: chercher dans PREDEFINED_COLORS
        const found = PREDEFINED_COLORS.find(pc => pc.name.toLowerCase() === c.toLowerCase());
        return found || { name: c, hex: '#000000' };
      } else if (c && c.name && c.hex) {
        // Format nouveau: déjà un objet {name, hex}
        return { name: c.name, hex: c.hex };
      }
      return null;
    }).filter(Boolean);
  } else {
    selectedColors = [];
  }
  
  currentImages = product.images || [];
  currentVideo = product.video || '';
  currentThumbnail = product.thumbnail || '';
  updatePreviewImages();
  updateVideoPreview();
  updateThumbnailPreview();
  
  document.getElementById('productModal').classList.add('active');
  loadCategories();
  initSizesCheckboxes();
  initColorsDisplay();
}

// Supprimer un produit
function deleteProduct(id) {
  const product = AdminStore.getProduct(id);
  if (!product) return;
  
  if (confirm(`Êtes-vous sûr de vouloir supprimer "${product.name}" ?`)) {
    AdminStore.deleteProduct(id);
    loadProducts();
    alert('Produit supprimé avec succès !');
  }
}

// Fonction globale pour ajouter une image depuis Cloudinary
window.addCloudinaryImageToGallery = function(url) {
  if (currentImages.length >= 5) {
    alert('Maximum 5 images pour la galerie produit');
    return;
  }
  currentImages.push(url);
  updatePreviewImages();
};

// Fonction globale pour ajouter une vignette depuis Cloudinary
window.addCloudinaryThumbnail = function(url) {
  currentThumbnail = url;
  updateThumbnailPreview();
};

// Mettre à jour l'aperçu des images galerie (portrait)
function updatePreviewImages() {
  const container = document.getElementById('previewImages');
  if (!container) return;
  
  const remaining = 5 - currentImages.length;
  const info = remaining > 0 
    ? `<p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Vous pouvez ajouter encore ${remaining} image(s)</p>`
    : `<p style="font-size: 12px; color: #f59e0b; margin-bottom: 8px;">Maximum atteint (5 images)</p>`;
  
  container.innerHTML = info + currentImages.map((img, index) => `
    <div class="preview-image-item">
      <img src="${img}" alt="Preview">
      <button type="button" class="remove-image" onclick="removeImage(${index})">×</button>
    </div>
  `).join('');
}

// Mettre à jour l'aperçu de l'image boutique
function updateThumbnailPreview() {
  const container = document.getElementById('previewThumbnail');
  if (!container) return;
  if (!currentThumbnail) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <div class="preview-image-item" style="width: 120px; height: 120px;">
      <img src="${currentThumbnail}" alt="Aperçu boutique">
      <button type="button" class="remove-image" onclick="removeThumbnail()">×</button>
      <div style="position: absolute; bottom: 4px; left: 4px; background: #667eea; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">BOUTIQUE 600×600</div>
    </div>
  `;
}

function removeThumbnail() {
  currentThumbnail = '';
  updateThumbnailPreview();
}

// Gestion de la vidéo
function setVideoUrl() {
  const urlInput = document.getElementById('productVideoUrl');
  const url = urlInput.value.trim();
  
  if (!url || !url.startsWith('http')) {
    alert('Veuillez entrer une URL valide de vidéo');
    return;
  }
  
  currentVideo = url;
  updateVideoPreview();
  urlInput.value = '';
}

function updateVideoPreview() {
  const container = document.getElementById('previewVideo');
  if (!container) return;
  
  if (!currentVideo) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <div class="preview-image-item" style="width: 150px; height: 200px;">
      <video style="width: 100%; height: 100%; object-fit: cover;" muted>
        <source src="${currentVideo}" type="video/mp4">
      </video>
      <button type="button" class="remove-image" onclick="removeVideo()">×</button>
      <div style="position: absolute; bottom: 4px; left: 4px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">VIDÉO</div>
    </div>
  `;
}

function removeVideo() {
  currentVideo = '';
  updateVideoPreview();
}

// Supprimer une image
function removeImage(index) {
  currentImages.splice(index, 1);
  updatePreviewImages();
}

// Soumettre le formulaire
const productForm = document.getElementById('productForm');
if (productForm) {
  productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const productData = {
      name: document.getElementById('productName').value.trim(),
      category: document.getElementById('productCategory').value,
      price: parseInt(document.getElementById('productPrice').value) || 0,
      originalPrice: parseInt(document.getElementById('productOriginalPrice').value) || 0,
      stock: parseInt(document.getElementById('productStock').value) || 0,
      description: document.getElementById('productDescription').value.trim(),
      sizes: [...selectedSizes], // Tailles sélectionnées via checkboxes
      colors: selectedColors.map(c => c.name), // Noms des couleurs (on pourrait aussi stocker {name, hex} si besoin)
      images: currentImages, // Images galerie portrait (max 5)
      video: currentVideo, // Vidéo optionnelle
      thumbnail: currentThumbnail // Vignette boutique 600x600
    };
    
    if (currentImages.length === 0) {
      alert('Veuillez ajouter au moins 1 image PORTRAIT pour la galerie produit (max 5)');
      return;
    }

    if (!currentThumbnail) {
      alert('Veuillez ajouter la vignette boutique 600×600 (image CARRÉE obligatoire)');
      return;
    }
    
    if (editingProductId) {
      const result = AdminStore.updateProduct(editingProductId, productData);
      if (result && result.error === 'storage') {
        alert('Stockage local saturé. Réduisez la taille/nb d’images ou utilisez des URLs.');
        return;
      }
      alert('Produit modifié avec succès !');
    } else {
      const result = AdminStore.addProduct(productData);
      if (result && result.error === 'storage') {
        alert('Stockage local saturé. Réduisez la taille/nb d’images ou utilisez des URLs.');
        return;
      }
      alert('Produit ajouté avec succès !');
    }
    
    closeProductModal();
    loadProducts();
  });
}

// Bouton nouveau produit
const btnNewProduct = document.getElementById('btnNewProduct');
if (btnNewProduct) {
  btnNewProduct.addEventListener('click', openProductModal);
}

// Charger au démarrage
populateCategoryFilter();
setupProductFilters();
loadProducts();
loadCategories();

// Recharger depuis le serveur pour voir les produits crees sur d'autres appareils
if (typeof AdminStore.refreshProductsFromServer === 'function') {
  AdminStore.refreshProductsFromServer().then((merged) => {
    if (merged && merged.length) loadProducts();
  });
}
if (typeof AdminStore.refreshCategoriesFromServer === 'function') {
  AdminStore.refreshCategoriesFromServer().then((merged) => {
    if (merged && merged.length) {
      populateCategoryFilter();
      loadCategories();
      loadProducts();
    }
  });
}
if (new URLSearchParams(window.location.search).get('action') === 'new') {
  openProductModal();
}

console.log('✓ Products Manager chargé');
