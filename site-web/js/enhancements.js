// ===== MODAL DE RECHERCHE =====
const searchModal = document.getElementById('searchModal');
const searchModalOverlay = document.getElementById('searchModalOverlay');
const searchModalClose = document.getElementById('searchModalClose');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchBtn = document.querySelector('.icon-btn[aria-label="Rechercher"]');

// Produits de démo (fallback si aucun produit admin)
const demoProducts = [
  { id: 'robe-elegante-marron', name: 'Robe Élégante Marron', category: 'Élégant', price: 15000, image: 'https://obrille.com/wp-content/uploads/2026/01/ChatGPT-Image-19-janv.-2026-18_33_27.png' },
  { id: 'robe-blanche-elegante', name: 'Robe Blanche Élégante', category: 'Perle Rare', price: 16500, image: 'https://obrille.com/wp-content/uploads/2026/01/A1.png' },
  { id: 'ensemble-bleu-ciel', name: 'Ensemble Bleu Ciel', category: 'Style Event', price: 18000, image: 'https://obrille.com/wp-content/uploads/2026/01/A3.png' },
  { id: 'robe-marron-premium', name: 'Robe Marron Premium', category: 'Perle Unique', price: 17000, image: 'https://obrille.com/wp-content/uploads/2026/01/gesvd.jpg' },
  { id: 'ensemble-blanc-chic', name: 'Ensemble Blanc Chic', category: 'Élégant', price: 19000, image: 'https://obrille.com/wp-content/uploads/2026/01/vjhbj.png' },
  { id: 'robe-noire-elegante', name: 'Robe Noire Élégante', category: 'Perle Rare', price: 14500, image: 'https://obrille.com/wp-content/uploads/2026/01/B2.png' }
];

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const readAdminProducts = () => {
  try {
    const raw = localStorage.getItem('atelier-admin-products');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const toSearchProduct = (product) => {
  const id = String(product.id || slugify(product.name || 'produit'));
  const safeId = encodeURIComponent(id);
  return {
    id,
    name: product.name || 'Produit',
    category: product.category || '',
    price: Number(product.price) || 0,
    image: product.thumbnail || (product.images && product.images[0]) || product.image || '',
    url: `pages/produit.html?id=${safeId}`,
  };
};

const getSearchProducts = () => {
  const admin = readAdminProducts();
  if (admin.length) return admin.map(toSearchProduct);
  return demoProducts.map((product) => ({
    ...product,
    url: `pages/produit.html?id=${encodeURIComponent(product.id)}`,
  }));
};

function openSearchModal() {
  searchModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => searchInput.focus(), 100);
}

function closeSearchModal() {
  searchModal.classList.remove('active');
  document.body.style.overflow = '';
  searchInput.value = '';
  searchResults.innerHTML = '';
}

function searchProducts(query) {
  if (!query || query.length < 2) {
    searchResults.innerHTML = '<p class="search-empty">Entrez au moins 2 caractères...</p>';
    return;
  }

  const filtered = getSearchProducts().filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.category.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) {
    searchResults.innerHTML = '<p class="search-empty">Aucun résultat trouvé</p>';
    return;
  }

  searchResults.innerHTML = filtered.map(p => `
    <a href="${p.url}" class="search-result-item">
      <img src="${p.image}" alt="${p.name}" loading="lazy">
      <div class="search-result-info">
        <h4>${p.name}</h4>
        <span class="search-result-category">${p.category}</span>
        <span class="search-result-price">${(p.price || 0).toLocaleString('fr-FR')} FCFA</span>
      </div>
    </a>
  `).join('');
}

if (searchBtn) {
  searchBtn.addEventListener('click', openSearchModal);
}

if (searchModalOverlay) {
  searchModalOverlay.addEventListener('click', closeSearchModal);
}

if (searchModalClose) {
  searchModalClose.addEventListener('click', closeSearchModal);
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchProducts(e.target.value);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchModal.classList.contains('active')) {
    closeSearchModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openSearchModal();
  }
});

// ===== SCROLL TO TOP =====
const scrollToTopBtn = document.getElementById('scrollToTop');

function updateScrollToTop() {
  if (window.scrollY > 400) {
    scrollToTopBtn?.classList.add('visible');
  } else {
    scrollToTopBtn?.classList.remove('visible');
  }
}

if (scrollToTopBtn) {
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

window.addEventListener('scroll', updateScrollToTop, { passive: true });

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#' || href === '#!') return;
    
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  });
});

// ===== LOADER DE PAGE =====
const pageLoader = document.getElementById('pageLoader');

window.addEventListener('load', () => {
  setTimeout(() => {
    pageLoader?.classList.add('fade-out');
    setTimeout(() => {
      if (pageLoader) pageLoader.style.display = 'none';
    }, 400);
  }, 300);
});

// ===== NEWSLETTER VALIDATION =====
const newsletterForm = document.querySelector('.newsletter-form');

if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = newsletterForm.querySelector('input[type="email"]');
    const email = emailInput?.value.trim();

    if (!email || !email.includes('@')) {
      window.SiteStore?.showToast('Veuillez entrer une adresse email valide', 'error');
      return;
    }

    // Simulation d'envoi
    const btn = newsletterForm.querySelector('button');
    const originalText = btn?.textContent;
    if (btn) btn.textContent = 'Envoi...';
    if (btn) btn.disabled = true;

    setTimeout(() => {
      window.SiteStore?.showToast('Merci ! Vous êtes inscrit(e) à notre newsletter 🎉', 'success');
      if (emailInput) emailInput.value = '';
      if (btn) btn.textContent = originalText || 'S\'inscrire';
      if (btn) btn.disabled = false;
    }, 1200);
  });
}

// ===== ANIMATIONS D'APPARITION AU SCROLL =====
const observeElements = (selector, className = 'fade-in-up', threshold = 0.1) => {
  const elements = document.querySelectorAll(selector);
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add(className);
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold, rootMargin: '0px 0px -50px 0px' });
  
  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    observer.observe(el);
  });
};

// Appliquer les animations
window.addEventListener('load', () => {
  observeElements('.product-card');
  observeElements('.testimonial-card');
  observeElements('.instagram-item');
});

console.log('✨ Enhancements chargés avec succès');
