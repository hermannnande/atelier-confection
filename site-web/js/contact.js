// Gestion du formulaire de contact
const contactForm = document.getElementById('contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Récupérer les valeurs
    const formData = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      subject: document.getElementById('subject').value,
      message: document.getElementById('message').value
    };
    
    // Validation simple
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Veuillez entrer une adresse email valide');
      return;
    }
    
    // Animation du bouton
    const submitBtn = this.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Envoi en cours...
    `;
    
    // Simuler l'envoi (à remplacer par un vrai appel API)
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        Message envoyé !
      `;
      
      // Message de succès
      alert('Merci pour votre message ! Nous vous répondrons dans les plus brefs délais.');
      
      // Réinitialiser le formulaire
      contactForm.reset();
      
      // Restaurer le bouton après 3 secondes
      setTimeout(() => {
        submitBtn.innerHTML = originalText;
      }, 3000);
      
      console.log('Formulaire soumis:', formData);
    }, 2000);
  });
}

// Animation des cartes d'info
const observerOptions = {
  threshold: 0.2,
  rootMargin: '0px 0px -50px 0px'
};

const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.style.opacity = '0';
        entry.target.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
          entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, 100);
        
        cardObserver.unobserve(entry.target);
      }, index * 100);
    }
  });
}, observerOptions);

// Observer les cartes d'info et les FAQ
document.querySelectorAll('.info-card, .faq-item').forEach(card => {
  cardObserver.observe(card);
});

// Animation du formulaire
const formObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '0';
      entry.target.style.transform = 'translateX(50px)';
      
      setTimeout(() => {
        entry.target.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateX(0)';
      }, 100);
      
      formObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

const formSection = document.querySelector('.contact-form-section');
if (formSection) {
  formObserver.observe(formSection);
}

// Style pour l'animation de spin
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
