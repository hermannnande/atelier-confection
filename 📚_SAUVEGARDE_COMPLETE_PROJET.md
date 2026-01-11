# 📚 SAUVEGARDE COMPLÈTE DU PROJET
## Atelier de Confection - Web App Complète

---

## 🎯 RÉSUMÉ DU PROJET

**Application Web Professionnelle** pour la gestion complète d'un atelier de confection et de vente.

### 🌐 URLs Principales
- **Site Web Déployé** : https://atelier-confection.vercel.app
- **Dépôt GitHub** : https://github.com/hermannnande/atelier-confection.git
- **Supabase Dashboard** : https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
- **Supabase URL** : https://rgvojiacsitztpdmruss.supabase.co

### 🔐 Compte Admin
- **Email** : `admin@atelier.com`
- **Mot de passe** : `admin123`

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Stack Technologique
```
Frontend :  React 18 + Vite + Tailwind CSS + Zustand
Backend  :  Node.js + Express.js (ES Modules)
Database :  Supabase (PostgreSQL)
Deploy   :  Vercel (Serverless + Static)
Version  :  Git + GitHub
```

### Structure du Projet
```
NOUS UNIQUE/
├── frontend/               # React App
│   ├── src/
│   │   ├── pages/         # Pages principales
│   │   │   ├── Appel.jsx          ⭐ Page traitement commandes
│   │   │   ├── Commandes.jsx       
│   │   │   ├── Stock.jsx
│   │   │   ├── Modeles.jsx        ⭐ Bibliothèque modèles
│   │   │   └── ...
│   │   ├── components/
│   │   ├── services/api.js
│   │   └── store/authStore.js
│   └── package.json
│
├── backend/               # API Express
│   ├── server.js          # Point d'entrée principal
│   ├── supabase/
│   │   ├── client.js
│   │   └── routes/
│   │       ├── commandes.js
│   │       ├── commandes-public.js  ⭐ Route publique site web
│   │       ├── stock.js
│   │       ├── modeles.js
│   │       └── ...
│   └── package.json
│
├── api/                   # Point d'entrée Vercel
│   ├── index.js           # Export du serveur Express
│   └── package.json       # {"type": "module"}
│
├── supabase/
│   └── migrations/        # Migrations SQL
│       ├── 20260110000000_initial_schema.sql
│       ├── 20260111000000_add_modeles_table.sql
│       └── 20260111000001_add_appel_statuts.sql
│
├── formulaire-site-web.html  ⭐ Formulaire commande site web
├── vercel.json            # Configuration Vercel
└── .env (local)           # Variables d'environnement locales
```

---

## 👥 RÔLES UTILISATEURS (6 types)

1. **Administrateur** : Accès total, gestion utilisateurs, stock, modèles
2. **Gestionnaire** : Gestion commandes, stock, livraisons
3. **Appelant** : Page `/appel`, validation des commandes
4. **Styliste** : Découpe des modèles
5. **Couturier** : Couture et confection
6. **Livreur** : Gestion des livraisons

---

## 🔄 WORKFLOW COMPLET

```
1. 📞 APPEL
   ↓ Commandes arrivent (Google Sheets ou Site Web)
   ↓ Statut: "en_attente_validation"
   ↓ Appelant traite: CONFIRMER / URGENT / ANNULER / EN ATTENTE
   ↓
2. ✅ COMMANDES
   ↓ Statut: "validee" (urgence si urgent)
   ↓ Note appelant ajoutée
   ↓
3. ✂️ ATELIER STYLISTE
   ↓ Découpe du modèle
   ↓ Statut: "en_decoupe" → "decoupee"
   ↓
4. 🧵 ATELIER COUTURIER
   ↓ Couture de la tenue
   ↓ Statut: "en_couture" → "confectionnee"
   ↓ Ajout au STOCK PRINCIPAL automatique
   ↓
5. 📦 STOCK
   ↓ Préparation commande
   ↓ Assignment au livreur
   ↓ Stock Principal → Stock en Livraison
   ↓
6. 🚚 LIVRAISON
   ↓ Livreur reçoit détails
   ↓ Marque: LIVREE / REFUSEE
   ↓ Si livrée: Stock Livraison réduit
   ↓ Si refusée: Reste en livraison → Retour atelier
   ↓ Gestionnaire marque retour → Stock revient
```

---

## 🗄️ BASE DE DONNÉES SUPABASE

### Table `users`
```sql
- id (uuid, primary key)
- nom (text)
- email (text, unique)
- password (text, bcrypt)
- role (text) CHECK: administrateur, gestionnaire, appelant, styliste, couturier, livreur
- telephone (text)
- actif (boolean)
- stats (jsonb)
- created_at, updated_at
```

### Table `commandes` ⭐
```sql
- id (uuid, primary key)
- numero_commande (text, auto CMD000001)
- client (jsonb) → {nom, contact, ville}
- modele (jsonb) → {nom, sku, description, image, categorie, prix_base}
- taille (text)
- couleur (text)
- prix (numeric)
- statut (text) CHECK: 
    en_attente_validation, en_attente_paiement, 
    validee, confirmee, en_decoupe, decoupee, 
    en_couture, confectionnee, en_livraison, livree, annulee
- urgence (boolean)
- appelant_id (uuid FK users, nullable)
- note_appelant (text)
- styliste_id, couturier_id, livreur_id (uuid FK users, nullable)
- historique (jsonb[]) → [{action, statut, date, utilisateur}]
- created_at, updated_at
- Trigger: auto_increment_numero_commande
```

### Table `modeles` ⭐
```sql
- id (uuid, primary key)
- nom (text, unique) ← Lien avec commandes
- description (text)
- image (text)
- prix_base (numeric)
- categorie (text) CHECK: Robe, Chemise, Pantalon, Ensemble, Accessoire, Autre
- actif (boolean)
- created_at, updated_at

MODÈLE ACTUEL :
- Nom: "Robe Volante"
- Catégorie: "Robe"
- Prix: 11000 FCFA
- Image: https://nousunique.com/wp-content/uploads/2025/12/Femme-en-robe-bleu-ciel-avec-talons-noirs-1.png
```

### Table `stock`
```sql
- id (uuid, primary key)
- modele (text)
- taille (text)
- couleur (text)
- quantite_principale (integer)
- quantite_en_livraison (integer)
- prix (numeric)
- image (text)
- mouvements (jsonb[]) → historique
- created_at, updated_at
- UNIQUE (modele, taille, couleur)
```

### Table `livraisons`
```sql
- id (uuid, primary key)
- commande_id (uuid FK commandes)
- livreur_id (uuid FK users)
- statut (text) CHECK: assignee, en_cours, livree, refusee, retournee
- date_assignation, date_livraison
- notes (text)
```

---

## 🎨 PAGE APPEL (Fonctionnalité Star) ⭐

### URL
`https://atelier-confection.vercel.app/appel`

### Fonctionnement
1. **Affiche** les commandes avec statut :
   - `en_attente_validation` (nouvelles commandes)
   - `en_attente_paiement` (en attente client)

2. **Interface** :
   - Grille responsive (1 à 4 colonnes)
   - Cartes modernes avec animations
   - **Contact cliquable** : `href="tel:+225xxxxxxxx"` pour appel direct
   - Bouton "Traiter la commande" → Ouvre popup

3. **Actions disponibles** (dans la popup) :
   - **CONFIRMER** : `statut → validee` → va dans `/commandes`
   - **URGENT** : `statut → validee` + `urgence = true` → va dans `/commandes`
   - **EN ATTENTE** : `statut → en_attente_paiement` → reste dans `/appel`
   - **ANNULER** : `statut → annulee` → disparaît de `/appel`

4. **Design** :
   - Gradients bleu/indigo
   - Glassmorphism
   - Animations fade-in et scale
   - Hover effects
   - Modal élégante

### Code Clé
Fichier : `frontend/src/pages/Appel.jsx`

---

## 🌐 INTÉGRATION SITE WEB

### 1. API Publique (sans authentification)

**Fichier** : `backend/supabase/routes/commandes-public.js`

**Route** : `POST /api/commandes/public`

**Token Secret** : `NOUSUNIQUE123`

**Payload (JSON)** :
```json
{
  "token": "NOUSUNIQUE123",
  "client": "Kouadio Serge",
  "phone": "+225 0700000000",
  "ville": "Abidjan",
  "sku": "Robe Volante",
  "name": "Robe Volante",
  "taille": "M",
  "couleur": "Terracotta",
  "price": "11000",
  "source": "https://nousunique.com/..."
}
```

**Comportement** :
1. Vérifie le token secret
2. Cherche le modèle dans `modeles` par nom exact
3. Si trouvé : utilise image, catégorie, description du modèle
4. Crée commande avec statut `en_attente_validation`
5. Ajoute dans historique : "Commande web reçue"
6. **Résultat** : Commande apparaît dans `/appel` ! ✅

### 2. Formulaire HTML Site Web

**Fichier** : `formulaire-site-web.html`

**Caractéristiques** :
- 4 produits "Robe Volante" avec galeries d'images différentes
- Autoplay des images avec effet flash
- Tailles : S, M, L, XL, 2XL, 3XL
- Couleurs : Terracotta, Vert Treillis, Blanc, Noir, Bleu ciel, Bleu bic, Rouge Bordeaux, Grise, Violet clair, Marron, Saumon, Jaune Moutarde
- Prix fixe : 11 000 FCFA

**Soumission DOUBLE** (en parallèle avec `Promise.allSettled`) :
1. **API Vercel** (`/api/commandes/public`) → Commande dans `/appel`
2. **Google Apps Script** (Google Sheets) → Backup dans sheet

**Après succès** : Redirection vers page de remerciement

**Code JavaScript clé** :
```javascript
const API_URL = 'https://atelier-confection.vercel.app/api/commandes/public';
const SECRET_TOKEN = 'NOUSUNIQUE123';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/...';

// Envoi parallèle
const [apiResult, sheetResult] = await Promise.allSettled([
  fetch(API_URL, {...}),
  fetch(GOOGLE_SCRIPT_URL, {...})
]);
```

---

## 📊 INTÉGRATION GOOGLE SHEETS

### Script Apps Script
**Fichier source** : `google-sheets-appel-auto.js`

**Mapping colonnes** :
- Colonne B : Nom client
- Colonne C : Contact
- Colonne D : Modèles
- Colonne E : Spécificité
- Colonne F : Taille
- Colonne G : Couleur
- Colonne I : Prix
- Colonne P : Ville

**Fonctionnement** :
1. Colonne dédiée "Sync App" pour tracker envoi
2. Déclencheurs : `onChange` + timer 5 minutes
3. Envoie vers `POST /api/commandes` avec JWT
4. Marque ligne "✅ Envoyée" après succès

---

## 🚀 DÉPLOIEMENT VERCEL

### Configuration `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {"src": "api/index.js", "use": "@vercel/node"},
    {"src": "frontend/package.json", "use": "@vercel/static-build"}
  ],
  "routes": [
    {"src": "/api/(.*)", "dest": "/api/index.js"},
    {"src": "/(.*)", "dest": "/frontend/index.html"}
  ]
}
```

### Point d'entrée Serverless : `api/index.js`
```javascript
import app from '../backend/server.js';
export default app; // Pas de app.listen() !
```

### Variables d'environnement Vercel (obligatoires)
```
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=votre_secret_jwt_ultra_securise
VITE_API_URL=/api
PUBLIC_API_SECRET=NOUSUNIQUE123
```

### Processus de Déploiement
```powershell
# 1. Commit changements
git add .
git commit -m "feat: nouvelle fonctionnalité"

# 2. Push vers GitHub
git push origin main

# 3. Vercel redéploie automatiquement (2-3 min)
# 4. Vérifier sur https://atelier-confection.vercel.app
```

---

## 🎨 SYSTÈME DE DESIGN 2026

### Palette de Couleurs
```css
--primary: #3b82f6 (Bleu)
--primary-dark: #1e40af
--secondary: #8b5cf6 (Violet)
--success: #10b981 (Vert)
--warning: #f59e0b (Orange)
--danger: #ef4444 (Rouge)
--gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
--gradient-2: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)
```

### Effets Visuels
- **Glassmorphism** : `backdrop-filter: blur(12px)`
- **Ombres douces** : `0 8px 32px rgba(0,0,0,0.1)`
- **Animations** : `fade-in`, `slide-up`, `scale-in`, `shimmer`
- **Hover** : Transform scale(1.02) + shadow
- **Border radius** : 12-20px
- **Transitions** : 300ms ease

### Composants Réutilisables
- `.stat-card` : Cartes avec gradient
- `.btn-primary`, `.btn-secondary` : Boutons animés
- `.badge-status` : Badges de statut colorés
- `.modal-overlay` : Modals modernes

---

## 🔧 COMMANDES UTILES

### Développement Local
```powershell
# Installation
npm install

# Lancer frontend (port 5173)
cd frontend
npm run dev

# Lancer backend (port 5000)
cd backend
npm run dev

# Variables .env requis
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...
USE_SUPABASE=true
```

### Supabase
```powershell
# Migrations
supabase migration list
supabase migration up

# Reset database
supabase db reset

# SQL Editor
https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
```

### Git & Deploy
```powershell
# Statut
git status

# Commit
git add .
git commit -m "message"

# Push (déclenche deploy Vercel)
git push origin main

# Vérifier logs Vercel
https://vercel.com/dashboard
```

---

## 🧪 TESTER LE SYSTÈME

### 1. Tester Page Appel
1. Va sur https://atelier-confection.vercel.app/appel
2. Login : `admin@atelier.com` / `admin123`
3. Vérifie que les commandes s'affichent en grille
4. Clique sur un numéro de téléphone → devrait ouvrir l'appli d'appel
5. Clique "Traiter la commande" → popup s'ouvre
6. Test actions : CONFIRMER, URGENT, EN ATTENTE, ANNULER

### 2. Tester Formulaire Site Web
1. Ouvre `formulaire-site-web.html` dans navigateur
2. Clique "Commander" sur un produit
3. Popup livraison → Clique "Continuer"
4. Remplis formulaire complet (ville obligatoire)
5. Clique "Confirmer la commande"
6. **Résultat attendu** :
   - Loader s'affiche
   - Redirection vers page remerciement
   - Commande visible dans `/appel` avec statut `en_attente_validation`
   - Modèle enrichi avec image de la bibliothèque

### 3. Tester API Publique
```powershell
$body = @{
    token = "NOUSUNIQUE123"
    client = "Test User"
    phone = "+225 0701234567"
    ville = "Abidjan"
    sku = "Robe Volante"
    name = "Robe Volante"
    taille = "M"
    couleur = "Terracotta"
    price = "11000"
    source = "test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/commandes/public" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

---

## 🐛 RÉSOLUTION DE PROBLÈMES

### Erreur : Login ne fonctionne pas
- Vérifier variables Vercel : SUPABASE_SERVICE_KEY, JWT_SECRET
- Vérifier route `/api/auth/login` répond (200)
- Vérifier mot de passe bcrypt dans Supabase users table

### Erreur : Commandes n'apparaissent pas dans /appel
- Vérifier statut commande = `en_attente_validation` ou `en_attente_paiement`
- Vérifier table `commandes` dans Supabase SQL Editor
- Vérifier `frontend/src/services/api.js` pointe vers `/api`

### Erreur : SQL "prix_de_base" n'existe pas
- Colonne correcte : `prix_base` (sans underscore "de")
- Vérifier migration `20260111000000_add_modeles_table.sql`

### Erreur : Formulaire HTML ne soumet pas
- Ouvrir Console navigateur (F12)
- Vérifier URL API accessible
- Vérifier token secret = `NOUSUNIQUE123`
- Vérifier CORS (normalement OK avec Vercel)

---

## 📚 FICHIERS DE DOCUMENTATION

Guides créés dans le projet :
- `🎉_LISEZ_MOI_DABORD.md` : Guide de démarrage rapide
- `🎉_APPLICATION_LANCEE.md` : Confirmation lancement app
- `🚀_GUIDE_NOUVEAU_SYSTEME.md` : Guide système variations
- `🎨_VUE_STOCK_GROUPEE.md` : Affichage stock groupé
- `✏️_MODIFICATION_STOCK.md` : Modification stock admin
- `📞_PAGE_APPEL.md` : Documentation page Appel
- `🔗_INSTALLATION_GOOGLE_SHEETS.md` : Intégration Google Sheets
- `🚀_DEPLOIEMENT_VERCEL.md` : Déploiement Vercel
- `🔑_RECUPERER_CLES_SUPABASE.md` : Obtenir clés Supabase

---

## ✅ CHECKLIST FONCTIONNALITÉS

### Authentification ✅
- [x] Login JWT
- [x] 6 rôles utilisateurs
- [x] Protection routes

### Commandes ✅
- [x] Page Appel avec actions
- [x] Contacts cliquables (tel:)
- [x] Popup traitement moderne
- [x] Grid responsive
- [x] API publique site web
- [x] Enrichissement auto depuis modèles
- [x] Historique actions
- [x] Numéro auto CMD000001

### Modèles ✅
- [x] Bibliothèque modèles
- [x] CRUD complet
- [x] Images, catégories, prix
- [x] Robe Volante ajoutée
- [x] Liaison auto avec commandes

### Stock ✅
- [x] Variations taille/couleur
- [x] Affichage groupé par modèle
- [x] Modal détaillée
- [x] Modification admin
- [x] Double stock (principal/livraison)
- [x] Historique mouvements

### Livraisons ✅
- [x] Assignment livreur
- [x] Statuts (livree/refusee/retournee)
- [x] Gestion retours
- [x] Ajustement stocks auto

### Design ✅
- [x] UI/UX moderne 2026
- [x] Glassmorphism
- [x] Animations fluides
- [x] Responsive mobile
- [x] Gradients élégants

### Intégrations ✅
- [x] Google Sheets → Appel
- [x] Site Web → Appel
- [x] Envoi double (API + Sheets)
- [x] Formulaire HTML complet

### Déploiement ✅
- [x] Vercel production
- [x] GitHub version control
- [x] Variables environnement
- [x] Serverless functions
- [x] SPA routing

---

## 🎯 PROCHAINES ÉTAPES POSSIBLES

### Améliorations suggérées
- [ ] Notifications push pour nouvelles commandes
- [ ] Dashboard analytics avec graphiques
- [ ] Export commandes PDF/Excel
- [ ] Envoi SMS confirmations clients
- [ ] Multi-tenancy (plusieurs ateliers)
- [ ] Application mobile React Native
- [ ] Système de facturation automatique
- [ ] Intégration paiement mobile money
- [ ] Chat en temps réel équipe
- [ ] QR code suivi commandes

---

## 📞 INFORMATIONS CONTACT

**Projet** : Atelier de Confection - Nous Unique
**Créé** : Janvier 2026
**Version** : 1.0.0
**Status** : ✅ En production

---

## 💡 NOTES IMPORTANTES

1. **Sécurité** :
   - Ne jamais commit `.env` dans Git
   - Tokens secrets uniquement dans Vercel
   - JWT secret ultra sécurisé
   - Service key Supabase protégée

2. **Performance** :
   - Images optimisées WebP
   - Lazy loading composants
   - Memoization React
   - Index Supabase sur statut, dates

3. **Maintenance** :
   - Logs Vercel pour debugging
   - Backup Supabase automatique
   - Git historique complet
   - Documentation à jour

4. **Support** :
   - Supabase Dashboard pour DB
   - Vercel Dashboard pour logs
   - GitHub pour code
   - Documentation Markdown

---

**🎉 PROJET COMPLET ET FONCTIONNEL !**

Cette sauvegarde contient TOUTES les informations nécessaires pour comprendre, maintenir et faire évoluer le projet.

✅ Système de commandes web opérationnel
✅ Page Appel professionnelle avec contacts cliquables
✅ Intégration site web + Google Sheets
✅ Bibliothèque modèles avec liaison auto
✅ Déploiement Vercel production
✅ Design moderne 2026

**Pour toute question, se référer à cette documentation ! 📚**
