const header = document.getElementById("site-header");

const updateHeader = () => {
  if (!header) return;
  if (window.scrollY > 20) {
    header.classList.add("is-solid");
  } else {
    header.classList.remove("is-solid");
  }
};

window.addEventListener("scroll", updateHeader, { passive: true });

// Intersection Observer pour animer les catégories au scroll
const observeCategories = () => {
  const cards = document.querySelectorAll('.category-card');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('animate-in');
        }, index * 150);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px'
  });
  
  cards.forEach(card => observer.observe(card));
};

window.addEventListener("load", () => {
  updateHeader();
  observeCategories();
});
