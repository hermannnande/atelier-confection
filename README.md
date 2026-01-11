# Atelier de Confection - Application de Gestion

Une application web complète pour la gestion d'un atelier de vente et de confection, avec suivi des commandes, gestion de stock, et système de livraison.

## 🚀 Fonctionnalités

### 👥 Gestion des Rôles
- **Administrateur**: Accès complet à toutes les fonctionnalités
- **Gestionnaire**: Gestion des opérations, stock, livraisons et performances
- **Appelant**: Création et suivi des commandes clients
- **Styliste**: Gestion de la découpe des modèles
- **Couturier**: Gestion de la couture et confection
- **Livreur**: Gestion des livraisons

### 📦 Fonctionnalités Principales

#### Gestion des Commandes
- Création de commandes avec détails client et modèle
- Modification des commandes (taille, couleur, prix automatique)
- Statuts: nouvelle, validée, en attente paiement, etc.
- Marquage des commandes urgentes
- Notes pour l'atelier
- Historique complet des actions

#### Workflow Atelier
1. **Appelant**: Reçoit et valide les commandes
2. **Styliste**: Découpe les modèles
3. **Couturier**: Confectionne les tenues
4. **Stock**: Gestion automatique après confection
5. **Livreur**: Livraison aux clients

#### Gestion du Stock
- Stock principal (en atelier)
- Stock en livraison (chez les livreurs)
- Suivi des mouvements (entrées, sorties, transferts, retours)
- Alertes de rupture et faible stock
- Inventaire par modèle, taille et couleur

#### Livraisons
- Assignation des commandes aux livreurs
- Suivi en temps réel
- Gestion des refus clients
- Retour au stock en cas de refus

#### Tableau de Bord & Performances
- Vue d'ensemble des statistiques
- Performances individuelles:
  - Appelants: taux de validation, CA généré
  - Stylistes: nombre de découpes
  - Couturiers: productivité, temps moyen
  - Livreurs: taux de réussite, CA livré

## 🛠️ Technologies Utilisées

### Backend
- **Node.js** & **Express.js**: Serveur API REST
- **MongoDB** & **Mongoose**: Base de données
- **JWT**: Authentification sécurisée
- **Bcrypt**: Hashage des mots de passe

### Frontend
- **React 18**: Interface utilisateur
- **Vite**: Build tool ultra-rapide
- **React Router**: Navigation
- **Zustand**: Gestion d'état
- **Tailwind CSS**: Styling moderne
- **Lucide React**: Icônes
- **Axios**: Requêtes HTTP
- **React Hot Toast**: Notifications

## 📋 Prérequis

- Node.js (v16 ou supérieur)
- MongoDB (v5 ou supérieur)
- npm ou yarn

## 🔧 Installation

### 1. Cloner le projet
```bash
cd "NOUS UNIQUE"
```

### 2. Installer les dépendances

#### Installation globale (recommandé)
```bash
npm run install-all
```

#### Ou installation manuelle
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configuration de la base de données

Assurez-vous que MongoDB est installé et en cours d'exécution:

```bash
# Windows (avec MongoDB installé)
mongod

# Ou utilisez MongoDB Compass pour une interface graphique
```

### 4. Configuration de l'environnement

Créez un fichier `.env` dans le dossier `backend`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/atelier-confection
JWT_SECRET=votre_secret_jwt_changez_moi_en_production
NODE_ENV=development
```

### 5. Initialisation des données (optionnel)

Créez un script `backend/scripts/seed.js` pour les données de test:

```bash
node backend/scripts/seed.js
```

## 🚀 Lancement de l'Application

### Démarrage complet (Backend + Frontend)
```bash
npm run dev
```

### Démarrage séparé

#### Backend seul (port 5000)
```bash
npm run server
```

#### Frontend seul (port 3000)
```bash
npm run client
```

## 🔐 Comptes de Démonstration

Pour tester l'application, utilisez ces comptes:

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Administrateur | admin@atelier.com | password123 |
| Gestionnaire | gestionnaire@atelier.com | password123 |
| Appelant | appelant@atelier.com | password123 |
| Styliste | styliste@atelier.com | password123 |
| Couturier | couturier@atelier.com | password123 |
| Livreur | livreur@atelier.com | password123 |

**Note**: Ces comptes doivent être créés via le script de seed ou manuellement par un administrateur.

## 📱 Utilisation

### Pour les Appelants
1. Connexion avec votre compte
2. Créer une nouvelle commande
3. Remplir les informations client et modèle
4. Valider la commande
5. Suivre l'évolution dans le dashboard

### Pour les Stylistes
1. Voir les commandes validées
2. Commencer la découpe
3. Envoyer en couture une fois terminé

### Pour les Couturiers
1. Voir les commandes en couture
2. Terminer la couture
3. L'article est automatiquement ajouté au stock

### Pour les Gestionnaires
1. Assigner les livraisons aux livreurs
2. Gérer le stock
3. Consulter les performances
4. Gérer les utilisateurs

### Pour les Livreurs
1. Voir les livraisons assignées
2. Marquer comme livrée ou refusée
3. Suivre ses performances

## 📊 Intégration Google Sheets (À venir)

L'application peut être configurée pour recevoir automatiquement les commandes depuis un Google Sheet via Apps Script.

### Configuration
1. Créer un projet Google Cloud
2. Activer l'API Google Sheets
3. Configurer les credentials
4. Ajouter les variables d'environnement:

```env
GOOGLE_SHEETS_CLIENT_EMAIL=votre-email@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=votre-cle-privee
GOOGLE_SHEETS_SPREADSHEET_ID=votre-spreadsheet-id
```

## 🎨 Design & UX

L'application suit les meilleures pratiques de design moderne:
- Interface responsive (mobile, tablette, desktop)
- Thème cohérent avec Tailwind CSS
- Animations fluides
- Navigation intuitive
- Feedback utilisateur avec notifications toast
- Badge de statut colorés et icônes explicites

## 🔒 Sécurité

- Authentification JWT
- Mots de passe hashés avec bcrypt
- Routes protégées par rôle
- Validation des données côté serveur
- Protection CORS

## 📦 Structure du Projet

```
NOUS UNIQUE/
├── backend/
│   ├── models/          # Modèles Mongoose
│   ├── routes/          # Routes API
│   ├── middleware/      # Middleware d'authentification
│   ├── server.js        # Point d'entrée
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Composants React
│   │   ├── pages/       # Pages de l'application
│   │   ├── services/    # Services API
│   │   ├── store/       # Store Zustand
│   │   ├── App.jsx      # Composant principal
│   │   └── main.jsx     # Point d'entrée
│   ├── public/
│   ├── index.html
│   └── package.json
├── package.json         # Scripts globaux
└── README.md
```

## 🐛 Dépannage

### Le serveur ne démarre pas
- Vérifiez que MongoDB est en cours d'exécution
- Vérifiez les variables d'environnement dans `.env`

### Erreur de connexion à la base de données
```bash
# Windows - Démarrer MongoDB
net start MongoDB

# Ou vérifier l'URI dans .env
MONGODB_URI=mongodb://localhost:27017/atelier-confection
```

### Port déjà utilisé
```bash
# Changer le port dans backend/.env
PORT=5001
```

## 🔮 Fonctionnalités Futures

- [ ] Intégration complète Google Sheets
- [ ] Notifications en temps réel (WebSocket)
- [ ] Upload d'images directement
- [ ] Rapports PDF exportables
- [ ] Multi-langues (i18n)
- [ ] Mode sombre
- [ ] Application mobile (React Native)
- [ ] Système de facturation
- [ ] Gestion des paiements

## 👨‍💻 Développement

### Lancer en mode développement
```bash
npm run dev
```

### Build pour production

#### Backend
```bash
cd backend
npm start
```

#### Frontend
```bash
cd frontend
npm run build
npm run preview
```

## 📝 Licence

Ce projet est développé pour un usage interne de l'atelier de confection.

## 🤝 Support

Pour toute question ou problème, contactez l'équipe de développement.

---

**Fait avec ❤️ pour votre Atelier de Confection**




