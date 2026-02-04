// Gestion des produits
let currentImages = []; // Images galerie (portrait) - max 5
let currentVideo = ''; // URL vidéo
let currentThumbnail = ''; // Vignette boutique 600x600
let editingProductId = null;

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

// Charger la liste des produits
function loadProducts() {
  const products = AdminStore.getProducts();
  const tbody = document.getElementById('productsTableBody');
  const count = document.getElementById('productsCount');
  
  if (count) {
    count.textContent = `${products.length} produit(s)`;
  }
  
  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
          Aucun produit. Cliquez sur "Nouveau Produit" pour commencer.
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = products.map(product => {
    const image = product.thumbnail || (product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/60x75');
    const statusBadge = product.stock > 0 
      ? '<span class="badge badge-success">En stock</span>'
      : '<span class="badge badge-danger">Rupture</span>';
    
    return `
      <tr>
        <td><img src="${image}" class="product-img-preview" alt="${product.name}"></td>
        <td><strong>${product.name}</strong></td>
        <td>${product.category || '-'}</td>
        <td><strong>${(product.price || 0).toLocaleString('fr-FR')} FCFA</strong></td>
        <td>${product.stock || 0}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm" onclick="copyProductLink('${product.id}')" title="Copier le lien">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M3.9 12a5 5 0 0 1 1.46-3.54l2.83-2.83a5 5 0 0 1 7.07 7.07l-1.06 1.06-1.41-1.41 1.06-1.06a3 3 0 1 0-4.24-4.24L6.77 9.9a3 3 0 0 0 4.24 4.24l.7-.7 1.41 1.41-.7.7A5 5 0 0 1 3.9 12Zm6.36 1.41 1.41 1.41 2.83-2.83a5 5 0 0 0-7.07-7.07L6.36 6.29l1.41 1.41 1.06-1.06a3 3 0 1 1 4.24 4.24l-2.83 2.83Z"/>
              </svg>
            </button>
            <button class="btn btn-sm btn-primary" onclick="editProduct('${product.id}')">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
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
  document.getElementById('modalTitle').textContent = 'Nouveau Produit';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('previewImages').innerHTML = '';
  document.getElementById('previewVideo').innerHTML = '';
  const previewThumbnail = document.getElementById('previewThumbnail');
  if (previewThumbnail) previewThumbnail.innerHTML = '';
  document.getElementById('productModal').classList.add('active');
  loadCategories();
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
  document.getElementById('productSizes').value = Array.isArray(product.sizes) ? product.sizes.join(', ') : '';
  document.getElementById('productColors').value = Array.isArray(product.colors) ? product.colors.join(', ') : '';
  
  currentImages = product.images || [];
  currentVideo = product.video || '';
  currentThumbnail = product.thumbnail || '';
  updatePreviewImages();
  updateVideoPreview();
  updateThumbnailPreview();
  
  document.getElementById('productModal').classList.add('active');
  loadCategories();
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
      sizes: document.getElementById('productSizes').value.split(',').map(s => s.trim()).filter(Boolean),
      colors: document.getElementById('productColors').value.split(',').map(c => c.trim()).filter(Boolean),
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
loadProducts();
loadCategories();
if (new URLSearchParams(window.location.search).get('action') === 'new') {
  openProductModal();
}

console.log('✓ Products Manager chargé');
