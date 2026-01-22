const store = window.SiteStore;

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

// Gestion des favoris
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

// Filtres
const categoryFilter = document.getElementById('category-filter');
const colorFilter = document.getElementById('color-filter');
const sortFilter = document.getElementById('sort-filter');
const productCount = document.getElementById('product-count');

// Fonction pour compter et afficher le nombre de produits visibles
function updateProductCount() {
  const visibleProducts = document.querySelectorAll('.product-card:not([style*="display: none"])').length;
  productCount.textContent = visibleProducts;
}

// Gestion du filtre de catégorie
if (categoryFilter) {
  categoryFilter.addEventListener('change', function() {
    const selectedCategory = this.value;
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(product => {
      if (selectedCategory === 'all') {
        product.style.display = '';
      } else {
        const category = product.querySelector('.product-category').textContent.trim();
        if (category.toLowerCase().includes(selectedCategory)) {
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
    const selectedColor = this.value;
    // Logique de filtrage par couleur à implémenter
    console.log('Filtre couleur:', selectedColor);
  });
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
