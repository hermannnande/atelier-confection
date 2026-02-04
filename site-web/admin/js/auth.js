// Système d'authentification
const AUTH_KEY = 'atelier-admin-auth';
const USERS_KEY = 'atelier-admin-users';

// Utilisateurs par défaut
const defaultUsers = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // En production, utiliser bcrypt
    name: 'Administrateur',
    role: 'admin',
    email: 'admin@atelier-confection.com',
    createdAt: new Date().toISOString()
  }
];

// Initialiser les utilisateurs par défaut
function initUsers() {
  const users = localStorage.getItem(USERS_KEY);
  if (!users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  }
}

// Vérifier si l'utilisateur est connecté
function isAuthenticated() {
  const auth = localStorage.getItem(AUTH_KEY);
  if (!auth) return false;
  
  try {
    const authData = JSON.parse(auth);
    // Vérifier si la session n'a pas expiré (24h)
    const sessionTime = new Date(authData.timestamp).getTime();
    const now = new Date().getTime();
    const hoursDiff = (now - sessionTime) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      logout();
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

// Obtenir l'utilisateur connecté
function getCurrentUser() {
  const auth = localStorage.getItem(AUTH_KEY);
  if (!auth) return null;
  
  try {
    return JSON.parse(auth);
  } catch (e) {
    return null;
  }
}

// Connexion
function login(username, password, remember = false) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return { success: false, message: 'Identifiants invalides' };
  }
  
  const authData = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email,
    timestamp: new Date().toISOString(),
    remember
  };
  
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  
  // Log de l'activité
  addActivity('Connexion', `${user.name} s'est connecté`);
  
  return { success: true, user: authData };
}

// Déconnexion
function logout() {
  const user = getCurrentUser();
  if (user) {
    addActivity('Déconnexion', `${user.name} s'est déconnecté`);
  }
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'index.html';
}

// Ajouter une activité
function addActivity(type, message) {
  const ACTIVITY_KEY = 'atelier-admin-activity';
  const activities = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
  
  activities.unshift({
    id: Date.now().toString(),
    type,
    message,
    timestamp: new Date().toISOString(),
    user: getCurrentUser()?.name || 'Système'
  });
  
  // Garder seulement les 50 dernières activités
  if (activities.length > 50) {
    activities.length = 50;
  }
  
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
}

// Protéger les pages admin
function protectAdminPage() {
  const currentPage = window.location.pathname;
  
  // Si on est sur la page de login, ne rien faire
  if (currentPage.includes('index.html') || currentPage.endsWith('/admin/') || currentPage.endsWith('/admin')) {
    if (isAuthenticated()) {
      window.location.href = 'dashboard.html';
    }
    return;
  }
  
  // Sinon, vérifier l'authentification
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
  }
}

// Initialiser sur la page de login
if (document.getElementById('loginForm')) {
  initUsers();
  
  const loginForm = document.getElementById('loginForm');
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  
  // Toggle password visibility
  if (togglePassword) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
    });
  }
  
  // Gestion du formulaire de connexion
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('rememberMe').checked;
    
    const btn = loginForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<span>Connexion...</span>';
    
    // Simuler un délai de connexion
    setTimeout(() => {
      const result = login(username, password, remember);
      
      if (result.success) {
        btn.innerHTML = '<span>✓ Connecté !</span>';
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
        
        // Afficher l'erreur
        alert(result.message);
      }
    }, 800);
  });
}

// Initialiser sur les pages admin
if (document.getElementById('btnLogout')) {
  protectAdminPage();
  
  // Bouton déconnexion
  document.getElementById('btnLogout').addEventListener('click', logout);
  
  // Afficher le nom de l'utilisateur
  const user = getCurrentUser();
  if (user) {
    const userNameElement = document.querySelector('.admin-user span');
    const userAvatarElement = document.querySelector('.user-avatar');
    
    if (userNameElement) {
      userNameElement.textContent = user.name;
    }
    
    if (userAvatarElement) {
      userAvatarElement.textContent = user.name.charAt(0).toUpperCase();
    }
  }
  
  // Toggle sidebar sur mobile
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('adminSidebar');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
    
    // Fermer le sidebar quand on clique sur un lien (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          sidebar.classList.remove('active');
        }
      });
    });
  }
}

console.log('✓ Système d\'authentification chargé');
