const store = window.SiteStore;

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const readAdminProducts = () => {
  try {
    const raw = localStorage.getItem('atelier-admin-products');
    const products = raw ? JSON.parse(raw) : [];
    return Array.isArray(products) ? products : [];
  } catch (e) {
    return [];
  }
};

const readAdminCategories = () => {
  try {
    const raw = localStorage.getItem('atelier-admin-categories');
    const categories = raw ? JSON.parse(raw) : [];
    return Array.isArray(categories) ? categories : [];
  } catch (e) {
    return [];
  }
};

const getCategoryLabel = (slug, categories) => {
  const match = categories.find((cat) => cat.slug === slug);
  return match?.name || slug || '';
};

const buildColorDots = (colors) => {
  const colorMap = {
    noir: '#000',
    blanc: '#fff',
    beige: '#d2b48c',
    marron: '#8b4513',
    bleu: '#4682b4',
    'bleu ciel': '#87ceeb',
    rouge: '#b91c1c',
    rose: '#f472b6',
    vert: '#16a34a',
    jaune: '#facc15',
    gris: '#6b7280',
    'gris fonce': '#333',
  };

  return colors
    .slice(0, 4)
    .map((color) => {
      const key = normalizeText(color);
      const hex = colorMap[key] || '#ddd';
      const border = key === 'blanc' ? 'border: 1px solid #ddd;' : '';
      return `<span class="color-dot" style="background-color: ${hex}; ${border}"></span>`;
    })
    .join('');
};

let adminProductsCache = [];

const buildProductCard = (product, categories) => {
  const name = product.name || 'Produit';
  const productId = String(
    product.id || (store?.slugify ? store.slugify(name) : name.toLowerCase().replace(/\s+/g, '-'))
  );
  const safeId = encodeURIComponent(productId);
  const categorySlug = product.category || '';
  const categoryLabel = getCategoryLabel(categorySlug, categories) || categorySlug;
  const price = Number(product.price) || 0;
  const originalPrice = Number(product.originalPrice) || 0;
  const image = product.thumbnail || (product.images && product.images[0]) || 'https://via.placeholder.com/600x600?text=Produit';
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const badge = originalPrice > price
    ? `<div class="product-badge">-${Math.round(((originalPrice - price) / originalPrice) * 100)}%</div>`
    : '';

  return `
    <a
      href="produit.html?id=${safeId}"
      class="product-card"
      data-id="${productId}"
      data-name="${name}"
      data-category="${categorySlug}"
      data-price="${price}"
      data-image="${image}"
      data-colors="${colors.join(',')}"
    >
      <div class="product-image">
        <img src="${image}" alt="${name}" loading="lazy" />
        ${badge}
        <button class="product-favorite" aria-label="Ajouter aux favoris">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.27 2 7.5 2 5 4 3 6.5 3c1.74 0 3.41.81 4.5 2.09C12.09 3.81 13.76 3 15.5 3 18 3 20 5 20 7.5c0 3.77-3.4 6.86-8.55 11.68L12 20.5z" />
          </svg>
        </button>
      </div>
      <div class="product-info">
        <h3 class="product-name">${name}</h3>
        <p class="product-category">${categoryLabel}</p>
        <div class="product-price">
          <span class="price-current">${price.toLocaleString('fr-FR')} FCFA</span>
          ${originalPrice > price ? `<span class="price-original">${originalPrice.toLocaleString('fr-FR')} FCFA</span>` : ''}
        </div>
        <div class="product-colors">
          ${buildColorDots(colors)}
        </div>
      </div>
    </a>
  `;
};

const renderAdminProducts = () => {
  const container = document.querySelector('.products-container');
  if (!container) return false;

  const adminProducts = readAdminProducts();
  adminProductsCache = adminProducts;
  try {
    localStorage.setItem('atelier-products-cache', JSON.stringify(adminProducts));
  } catch (e) {
    // ignore storage errors
  }
  if (!adminProducts.length) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #6b7280;">
        Aucun produit trouvé. Ajoutez des produits dans l'admin.
      </div>
    `;
    return false;
  }

  const categories = readAdminCategories().filter((cat) => cat.active !== false);
  container.innerHTML = adminProducts.map((product) => buildProductCard(product, categories)).join('');
  return true;
};

const bindProductClickStore = () => {
  const container = document.querySelector('.products-container');
  if (!container) return;

  container.addEventListener('click', (event) => {
    const card = event.target.closest('.product-card');
    if (!card) return;

    const id = card.dataset.id;
    const source = adminProductsCache.length ? adminProductsCache : readAdminProducts();
    if (!adminProductsCache.length) adminProductsCache = source;
    const product = source.find((p) => String(p.id) === String(id));
    if (!product) return;

    try {
      sessionStorage.setItem('atelier-selected-product', JSON.stringify(product));
      localStorage.setItem('atelier-selected-product', JSON.stringify(product));
    } catch (e) {
      // ignore storage errors
    }
  });
};

const getProductData = (card) => {
  const name = card.dataset.name || card.querySelector('.product-name')?.textContent.trim();
  const priceText = card.dataset.price || card.querySelector('.price-current')?.textContent;
  const image =
    card.dataset.image ||
    card.querySelector('img')?.getAttribute('src');
  const category = card.dataset.category || card.querySelector('.product-category')?.textContent.trim();
  const colors = card.dataset.colors
    ? card.dataset.colors.split(',').map((color) => color.trim())
    : [];
  const id = card.dataset.id || store.slugify(name);

  return {
    id,
    name,
    price: store.parsePrice(priceText),
    image,
    category,
    colors,
  };
};

const setFavoriteState = (btn, isFavorite) => {
  const svg = btn.querySelector('svg');
  if (!svg) return;

  if (isFavorite) {
    svg.style.fill = '#ff0000';
    svg.style.stroke = '#ff0000';
  } else {
    svg.style.fill = 'none';
    svg.style.stroke = '#000';
  }
};

const bindFavorites = () => {
  document.querySelectorAll('.product-favorite').forEach(btn => {
    const card = btn.closest('.product-card');
    if (!card) return;

    const product = getProductData(card);
    setFavoriteState(btn, store.isInWishlist(product.id));

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const result = store.toggleWishlist(product);
      setFavoriteState(btn, result.added);

      // Animation
      this.style.transform = 'scale(1.2)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 200);

      store.showToast(
        result.added ? "Ajouté à la liste d'envie" : 'Retiré des favoris',
        'info'
      );
    });
  });
};

const hydrateCategoryFilterOptions = () => {
  const select = document.getElementById('category-filter');
  if (!select) return;

  const categories = readAdminCategories().filter((cat) => cat.active !== false);
  if (!categories.length) return;

  const current = select.value || 'all';
  select.innerHTML = '<option value="all">Toutes les catégories</option>';
  categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.slug;
    option.textContent = cat.name;
    select.appendChild(option);
  });
  select.value = current;
};

const hasAdminProducts = renderAdminProducts();
if (hasAdminProducts) {
  hydrateCategoryFilterOptions();
}
bindFavorites();
bindProductClickStore();

// Filtres
const categoryFilter = document.getElementById('category-filter');
const colorFilter = document.getElementById('color-filter');
const sortFilter = document.getElementById('sort-filter');
const productCount = document.getElementById('product-count');

// Fonction pour compter et afficher le nombre de produits visibles
function updateProductCount() {
  if (!productCount) return;
  const visibleProducts = document.querySelectorAll('.product-card:not([style*="display: none"])').length;
  productCount.textContent = visibleProducts;
}

// Gestion du filtre de catégorie
if (categoryFilter) {
  categoryFilter.addEventListener('change', function() {
    const selectedCategory = normalizeText(this.value);
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(product => {
      if (selectedCategory === 'all') {
        product.style.display = '';
      } else {
        const rawCategory = product.dataset.category || product.querySelector('.product-category')?.textContent.trim();
        const category = normalizeText(rawCategory);
        if (category.includes(selectedCategory)) {
          product.style.display = '';
        } else {
          product.style.display = 'none';
        }
      }
    });
    
    updateProductCount();
  });
}

// Gestion du filtre de couleur
if (colorFilter) {
  colorFilter.addEventListener('change', function() {
    const selectedColor = normalizeText(this.value);
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(product => {
      if (selectedColor === 'all') {
        // Ne pas masquer si déjà visible par le filtre de catégorie
        if (product.style.display !== 'none') {
          product.style.display = '';
        }
      } else {
        const colors = normalizeText(product.dataset.colors || '');
        const colorDots = Array.from(product.querySelectorAll('.color-dot'));
        
        // Vérifier si le produit a la couleur sélectionnée
        const hasColor = colors.includes(selectedColor) || 
                        colorDots.some(dot => {
                          const bg = window.getComputedStyle(dot).backgroundColor;
                          return bg && checkColorMatch(bg, selectedColor);
                        });
        
        if (hasColor) {
          // Ne masquer que si la catégorie ne le masque pas déjà
          const categoryMatch = checkCategoryFilter(product);
          if (categoryMatch) {
            product.style.display = '';
          }
        } else {
          product.style.display = 'none';
        }
      }
    });
    
    updateProductCount();
  });
}

function checkColorMatch(rgbColor, colorName) {
  // Convertir le nom de couleur en correspondance approximative
  const colorMap = {
    'marron': ['139, 69, 19', '101, 67, 33'],
    'noir': ['0, 0, 0', '51, 51, 51'],
    'blanc': ['255, 255, 255', '245, 245, 220'],
    'beige': ['210, 180, 140', '245, 245, 220'],
    'bleu': ['135, 206, 235', '70, 130, 180'],
    'bleu ciel': ['135, 206, 235'],
    'gris fonce': ['51, 51, 51']
  };
  
  return colorMap[colorName]?.some(color => rgbColor.includes(color));
}

function checkCategoryFilter(product) {
  const categoryFilter = document.getElementById('category-filter');
  const selectedCategory = normalizeText(categoryFilter?.value);
  
  if (!selectedCategory || selectedCategory === 'all') return true;
  
  const rawCategory = product.dataset.category || product.querySelector('.product-category')?.textContent.trim();
  const category = normalizeText(rawCategory);
  return category.includes(selectedCategory);
}

// Fonction pour réinitialiser tous les filtres
function resetFilters() {
  if (categoryFilter) categoryFilter.value = 'all';
  if (colorFilter) colorFilter.value = 'all';
  if (sortFilter) sortFilter.value = 'recent';
  
  document.querySelectorAll('.product-card').forEach(product => {
    product.style.display = '';
  });
  
  updateProductCount();
}

// Ajouter un bouton de réinitialisation si présent
const resetBtn = document.getElementById('reset-filters');
if (resetBtn) {
  resetBtn.addEventListener('click', resetFilters);
}

// Gestion du tri
if (sortFilter) {
  sortFilter.addEventListener('change', function() {
    const sortType = this.value;
    const container = document.querySelector('.products-container');
    const products = Array.from(document.querySelectorAll('.product-card'));
    
    products.sort((a, b) => {
      if (sortType === 'price-asc') {
        const priceA = parseInt(a.querySelector('.price-current').textContent.replace(/[^0-9]/g, ''));
        const priceB = parseInt(b.querySelector('.price-current').textContent.replace(/[^0-9]/g, ''));
        return priceA - priceB;
      } else if (sortType === 'price-desc') {
        const priceA = parseInt(a.querySelector('.price-current').textContent.replace(/[^0-9]/g, ''));
        const priceB = parseInt(b.querySelector('.price-current').textContent.replace(/[^0-9]/g, ''));
        return priceB - priceA;
      } else if (sortType === 'name') {
        const nameA = a.querySelector('.product-name').textContent;
        const nameB = b.querySelector('.product-name').textContent;
        return nameA.localeCompare(nameB);
      }
      return 0;
    });
    
    // Réorganiser les produits
    products.forEach(product => container.appendChild(product));
  });
}

// Animation au scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const productObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '0';
      entry.target.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, 100);
      
      productObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observer tous les produits
document.querySelectorAll('.product-card').forEach(card => {
  productObserver.observe(card);
});

// Pagination
document.querySelectorAll('.pagination-number').forEach(btn => {
  btn.addEventListener('click', function() {
    // Retirer l'active de tous les boutons
    document.querySelectorAll('.pagination-number').forEach(b => b.classList.remove('active'));
    // Ajouter l'active au bouton cliqué
    this.classList.add('active');
    
    // Scroll vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Boutons précédent/suivant
const prevBtn = document.querySelector('.pagination-btn:first-child');
const nextBtn = document.querySelector('.pagination-btn:last-child');

if (prevBtn) {
  prevBtn.addEventListener('click', function() {
    const activePage = document.querySelector('.pagination-number.active');
    const prevPage = activePage.previousElementSibling;
    if (prevPage && prevPage.classList.contains('pagination-number')) {
      prevPage.click();
    }
  });
}

if (nextBtn) {
  nextBtn.addEventListener('click', function() {
    const activePage = document.querySelector('.pagination-number.active');
    const nextPage = activePage.nextElementSibling;
    if (nextPage && nextPage.classList.contains('pagination-number')) {
      nextPage.click();
    }
  });
}

// Initialiser le compteur au chargement
updateProductCount();
