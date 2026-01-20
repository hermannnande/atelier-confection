// Ajouter au panier
document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    
    const item = this.closest('.wishlist-item');
    const itemName = item.querySelector('.item-name').textContent;
    
    // Animation
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.style.transform = 'scale(1)';
    }, 150);
    
    // Message de confirmation
    const originalText = this.innerHTML;
    this.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
      Ajouté !
    `;
    
    setTimeout(() => {
      this.innerHTML = originalText;
    }, 2000);
    
    console.log('Ajouté au panier:', itemName);
  });
});

// Supprimer des favoris
document.querySelectorAll('.remove-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    
    const item = this.closest('.wishlist-item');
    
    if (confirm('Retirer cet article de votre liste d\'envie ?')) {
      item.style.opacity = '0';
      item.style.transform = 'scale(0.8)';
      
      setTimeout(() => {
        item.remove();
        updateWishlistCount();
      }, 300);
    }
  });
});

// Mettre à jour le compteur
function updateWishlistCount() {
  const count = document.querySelectorAll('.wishlist-item').length;
  const subtitle = document.querySelector('.page-subtitle');
  const badge = document.querySelector('.header-actions .icon-btn[href="favoris.html"] .badge');
  
  if (subtitle) {
    subtitle.textContent = `${count} article${count > 1 ? 's' : ''} sauvegardé${count > 1 ? 's' : ''}`;
  }
  
  if (badge) {
    badge.textContent = count;
    if (count === 0) {
      badge.style.display = 'none';
    }
  }
  
  // Afficher un message si la liste est vide
  if (count === 0) {
    const grid = document.querySelector('.wishlist-grid');
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
    
    document.querySelector('.wishlist-actions').style.display = 'none';
  }
}

// Ajouter tout au panier
document.querySelector('.add-all-to-cart')?.addEventListener('click', function() {
  const items = document.querySelectorAll('.wishlist-item');
  
  if (items.length === 0) {
    return;
  }
  
  // Animation
  this.style.transform = 'scale(0.95)';
  setTimeout(() => {
    this.style.transform = 'scale(1)';
  }, 150);
  
  // Message de confirmation
  alert(`${items.length} article${items.length > 1 ? 's' : ''} ajouté${items.length > 1 ? 's' : ''} au panier !`);
  
  console.log('Tous les articles ajoutés au panier');
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
document.querySelectorAll('.wishlist-item').forEach(item => {
  wishlistObserver.observe(item);
});
