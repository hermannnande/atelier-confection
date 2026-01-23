const store = window.SiteStore;
const grid = document.getElementById('wishlistGrid');
const actions = document.querySelector('.wishlist-actions');
const subtitle = document.querySelector('.page-subtitle');

const buildWishlistItem = (item) => {
  const defaultSize = item.size || item.sizes?.[0] || 'M';
  const defaultColor = item.color || item.colors?.[0] || 'Standard';

  return `
    <div
      class="wishlist-item"
      data-id="${item.id}"
      data-name="${item.name}"
      data-price="${item.price}"
      data-image="${item.image}"
      data-category="${item.category || ''}"
      data-size="${defaultSize}"
      data-color="${defaultColor}"
    >
      <a href="produit.html" class="item-image">
        <img src="${item.image}" alt="${item.name}" />
      </a>
      <div class="item-info">
        <a href="produit.html" class="item-name">${item.name}</a>
        <p class="item-category">${item.category || ''}</p>
        <div class="item-price">
          <span class="price-current">${store.formatPrice(item.price)}</span>
        </div>
        <div class="item-actions">
          <button class="add-to-cart-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 4h-2l-1 2h2l3.6 7.59-1.35 2.44A2 2 0 009 19h10v-2H9.42a.25.25 0 01-.22-.37L10 15h7a2 2 0 001.8-1.1l3.2-6.9H6.21l-.94-2z"/>
            </svg>
            Ajouter au panier
          </button>
          <button class="remove-btn" aria-label="Supprimer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
};

const renderWishlist = () => {
  const wishlist = store.getWishlist();

  if (subtitle) {
    subtitle.textContent = `${wishlist.length} article${wishlist.length > 1 ? 's' : ''} sauvegardé${wishlist.length > 1 ? 's' : ''}`;
  }

  if (!grid) return;

  if (wishlist.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 20px; color: #ccc;">
          <path d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.27 2 7.5 2 5 4 3 6.5 3c1.74 0 3.41.81 4.5 2.09C12.09 3.81 13.76 3 15.5 3 18 3 20 5 20 7.5c0 3.77-3.4 6.86-8.55 11.68L12 20.5z"/>
        </svg>
        <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 12px;">Votre liste d'envie est vide</h3>
        <p style="color: #666; margin-bottom: 24px;">Parcourez notre boutique et ajoutez vos coups de cœur</p>
        <a href="boutique.html" style="display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: #000; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700;">
          Découvrir la boutique
        </a>
      </div>
    `;
    if (actions) actions.style.display = 'none';
    store.updateBadges();
    return;
  }

  if (actions) actions.style.display = '';
  grid.innerHTML = wishlist.map(buildWishlistItem).join('');
  observeWishlistItems();
  store.updateBadges();
};

if (grid) {
  grid.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('.remove-btn');
    const addBtn = event.target.closest('.add-to-cart-btn');
    const item = event.target.closest('.wishlist-item');
    if (!item) return;

    if (removeBtn) {
      const id = item.dataset.id;
      const wishlist = store.getWishlist().filter((entry) => entry.id !== id);
      store.saveWishlist(wishlist);
      store.updateBadges();
      renderWishlist();
      store.showToast('Retiré de la liste d\'envie');
    }

    if (addBtn) {
      store.addToCart({
        id: item.dataset.id,
        name: item.dataset.name,
        price: item.dataset.price,
        image: item.dataset.image,
        category: item.dataset.category,
        size: item.dataset.size,
        color: item.dataset.color,
        qty: 1,
      });
      store.showToast('Ajouté au panier');
    }
  });
}

document.querySelector('.add-all-to-cart')?.addEventListener('click', function() {
  const wishlist = store.getWishlist();
  if (wishlist.length === 0) return;

  wishlist.forEach((item) => {
    store.addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      category: item.category,
      size: item.size || item.sizes?.[0] || 'M',
      color: item.color || item.colors?.[0] || 'Standard',
      qty: 1,
    });
  });

  store.showToast('Tout ajouté au panier');
});

// Animation au scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const wishlistObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '0';
      entry.target.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, 100);
      
      wishlistObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observer tous les articles
function observeWishlistItems() {
  document.querySelectorAll('.wishlist-item').forEach(item => {
    wishlistObserver.observe(item);
  });
}

renderWishlist();
