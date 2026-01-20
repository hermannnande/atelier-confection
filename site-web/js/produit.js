// Gestion de la sélection de taille
document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    // Retirer la classe active de tous les boutons
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    // Ajouter la classe active au bouton cliqué
    this.classList.add('active');
  });
});

// Gestion de la sélection de couleur
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    // Retirer la classe active de tous les boutons
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    // Ajouter la classe active au bouton cliqué
    this.classList.add('active');
  });
});

// Gestion du bouton favoris
const favoriteBtn = document.querySelector('.btn-favorite');
let isFavorite = false;

favoriteBtn.addEventListener('click', function() {
  isFavorite = !isFavorite;
  const svg = this.querySelector('svg');
  
  if (isFavorite) {
    svg.style.fill = '#ff0000';
    svg.style.stroke = '#ff0000';
    this.style.borderColor = '#ff0000';
  } else {
    svg.style.fill = 'none';
    svg.style.stroke = '#000';
    this.style.borderColor = '#e0e0e0';
  }
});

// Gestion du bouton ajouter au panier
const addCartBtn = document.querySelector('.btn-add-cart');

addCartBtn.addEventListener('click', function() {
  const selectedSize = document.querySelector('.size-btn.active')?.dataset.size;
  const selectedColor = document.querySelector('.color-btn.active')?.dataset.color;
  
  if (!selectedSize || !selectedColor) {
    alert('Veuillez sélectionner une taille et une couleur');
    return;
  }
  
  // Animation du bouton
  this.style.transform = 'scale(0.95)';
  setTimeout(() => {
    this.style.transform = 'scale(1)';
  }, 150);
  
  // Message de confirmation
  const originalText = this.innerHTML;
  this.innerHTML = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
    Ajouté au panier !
  `;
  
  setTimeout(() => {
    this.innerHTML = originalText;
  }, 2000);
  
  console.log('Produit ajouté:', { size: selectedSize, color: selectedColor });
});

// Animation au scroll pour les images de la galerie
const observerOptions = {
  threshold: 0.2,
  rootMargin: '0px 0px -100px 0px'
};

const galleryObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '0';
      entry.target.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, 100);
      
      galleryObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observer les éléments de la galerie
document.querySelectorAll('.gallery-item').forEach(item => {
  galleryObserver.observe(item);
});
