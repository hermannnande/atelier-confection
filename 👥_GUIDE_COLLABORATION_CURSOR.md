# 👥 GUIDE DE COLLABORATION - Travailler sur le Projet avec Cursor

## 🎯 Pour un nouveau développeur qui veut rejoindre le projet

---

## 📋 PRÉREQUIS À INSTALLER

### 1. **Node.js** (v18 ou supérieur)
- Télécharger : https://nodejs.org/
- Vérifier installation : `node --version` et `npm --version`

### 2. **Git**
- Télécharger : https://git-scm.com/
- Vérifier installation : `git --version`

### 3. **Cursor IDE**
- Télécharger : https://cursor.sh/
- C'est un fork de VS Code avec IA intégrée

### 4. **Compte GitHub**
- Si pas de compte : https://github.com/signup
- Demander au propriétaire du projet de t'ajouter comme **collaborateur**

---

## 🚀 ÉTAPE 1 : CLONER LE PROJET

### Option A : Via Cursor (Recommandé)

1. **Ouvrir Cursor**
2. **Menu** : `File` → `Clone Git Repository...`
3. **Entrer l'URL** :
   ```
   https://github.com/hermannnande/atelier-confection.git
   ```
4. **Choisir un dossier** où cloner le projet (ex: `C:\Users\VotreNom\Projects\`)
5. **Cliquer** : `Select Repository Location`
6. **Attendre** le clonage (quelques secondes)
7. **Ouvrir** le projet cloné

### Option B : Via Terminal

```powershell
# Se placer dans le dossier de vos projets
cd C:\Users\VotreNom\Projects

# Cloner le projet
git clone https://github.com/hermannnande/atelier-confection.git

# Entrer dans le dossier
cd atelier-confection

# Ouvrir avec Cursor
cursor .
```

---

## 🔧 ÉTAPE 2 : INSTALLER LES DÉPENDANCES

### Dans Cursor, ouvrir le Terminal intégré :
- **Menu** : `Terminal` → `New Terminal`
- Ou **Raccourci** : `Ctrl + ù` (ou `Ctrl + ~`)

### Installer les dépendances :

```powershell
# 1. Installer les dépendances du BACKEND
cd backend
npm install
cd ..

# 2. Installer les dépendances du FRONTEND
cd frontend
npm install
cd ..

# 3. Installer les dépendances de l'API (Vercel)
cd api
npm install
cd ..
```

⏱️ **Temps estimé** : 2-5 minutes selon votre connexion

---

## 🔑 ÉTAPE 3 : OBTENIR LES ACCÈS SUPABASE

### Tu as 2 options :

### **Option A : Accès Complet au Projet Supabase (Recommandé)**

**Demander au propriétaire du projet de t'inviter :**

1. Le propriétaire va sur : https://supabase.com/dashboard/project/rgvojiacsitztpdmruss/settings/general
2. **Onglet** : `Settings` → `General` → `Team members`
3. **Cliquer** : `Invite member`
4. **Entrer ton email** et envoyer l'invitation
5. **Tu reçois un email** → Accepter l'invitation
6. **Tu auras accès** au dashboard Supabase complet

### **Option B : Recevoir les Clés API (Plus Simple)**

**Demander au propriétaire de te partager ces 3 informations** (via email sécurisé ou message privé) :

```
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=le_secret_jwt_du_projet
```

⚠️ **Important** : Ces clés sont **sensibles** et ne doivent **JAMAIS** être partagées publiquement ou committées dans Git !

---

## 📝 ÉTAPE 4 : CONFIGURER LES VARIABLES D'ENVIRONNEMENT

### 1. Créer le fichier `.env` pour le BACKEND

```powershell
# Créer le fichier
New-Item -Path "backend\.env" -ItemType File -Force
```

### 2. Ouvrir `backend/.env` dans Cursor et coller :

```env
# Configuration Supabase
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# ⬆️ REMPLACER par la vraie clé fournie par le propriétaire

# Configuration JWT
JWT_SECRET=le_secret_jwt_fourni_par_le_proprietaire
# ⬆️ REMPLACER par le vrai secret fourni

# Configuration Database
USE_SUPABASE=true

# Configuration API publique
PUBLIC_API_SECRET=NOUSUNIQUE123

# Configuration serveur
PORT=5000
NODE_ENV=development
```

### 3. Créer le fichier `.env` pour le FRONTEND

```powershell
# Créer le fichier
New-Item -Path "frontend\.env" -ItemType File -Force
```

### 4. Ouvrir `frontend/.env` dans Cursor et coller :

```env
# API Backend (pour développement local)
VITE_API_URL=http://localhost:5000/api
```

### ✅ Vérifier que `.env` est bien ignoré par Git

Les fichiers `.env` sont **déjà dans `.gitignore`**, donc ils ne seront **jamais committés** (sécurité ✅).

---

## 🚀 ÉTAPE 5 : LANCER LE PROJET EN LOCAL

### Tu dois lancer 2 serveurs en parallèle :

### Terminal 1 : BACKEND (API)

```powershell
# Dans Cursor, ouvrir un terminal
cd backend
npm run dev
```

**Résultat attendu** :
```
🟣 Mode base de données: Supabase (PostgreSQL)
✅ Connexion Supabase réussie
🚀 Serveur démarré sur http://localhost:5000
```

### Terminal 2 : FRONTEND (React)

```powershell
# Dans Cursor, ouvrir un NOUVEAU terminal (cliquer sur le +)
cd frontend
npm run dev
```

**Résultat attendu** :
```
VITE ready in 500 ms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 🌐 Accéder à l'application

**Ouvrir le navigateur** et aller sur : http://localhost:5173

**Credentials de test** :
- Email : `admin@atelier.com`
- Mot de passe : `admin123`

---

## 📂 STRUCTURE DU PROJET (Pour s'orienter)

```
atelier-confection/
│
├── frontend/                    # Application React (Interface)
│   ├── src/
│   │   ├── pages/              # Pages principales
│   │   │   ├── Appel.jsx       ⭐ Page traitement commandes
│   │   │   ├── Commandes.jsx
│   │   │   ├── Stock.jsx
│   │   │   ├── Modeles.jsx
│   │   │   └── ...
│   │   ├── components/         # Composants réutilisables
│   │   ├── services/api.js     # Appels API
│   │   └── store/authStore.js  # État global (Zustand)
│   └── .env                    # Config frontend (localhost)
│
├── backend/                     # API Express (Logique métier)
│   ├── supabase/
│   │   ├── client.js           # Connexion Supabase
│   │   └── routes/             # Routes API
│   │       ├── commandes.js
│   │       ├── commandes-public.js  # Route publique site web
│   │       ├── stock.js
│   │       ├── modeles.js
│   │       ├── auth.js
│   │       └── ...
│   ├── server.js               # Point d'entrée serveur
│   └── .env                    # Config backend (Supabase, JWT)
│
├── api/                         # Point d'entrée Vercel (production)
│   └── index.js                # Export pour serverless
│
├── supabase/
│   └── migrations/             # Scripts SQL pour la base de données
│
├── formulaire-site-web.html    # Formulaire commande site web
├── vercel.json                 # Configuration déploiement Vercel
│
└── 📚 Documentation/
    ├── 📚_SAUVEGARDE_COMPLETE_PROJET.md
    ├── ⚡_SESSION_SUIVANTE.md
    └── 🔥_RAPPEL_EXPRESS.txt
```

---

## 🛠️ WORKFLOW DE TRAVAIL AVEC GIT

### 1. **Avant de commencer à coder** (TOUJOURS !)

```powershell
# Récupérer les dernières modifications
git pull origin main
```

### 2. **Créer une branche pour ta fonctionnalité**

```powershell
# Créer et se placer sur une nouvelle branche
git checkout -b feature/nom-de-ta-fonctionnalite

# Exemples :
git checkout -b feature/ajout-notifications
git checkout -b fix/bug-connexion
git checkout -b design/amelioration-ui
```

### 3. **Faire tes modifications** dans Cursor

- Éditer les fichiers
- Tester en local (http://localhost:5173)
- Vérifier que tout fonctionne

### 4. **Committer tes changements**

```powershell
# Voir les fichiers modifiés
git status

# Ajouter les fichiers modifiés
git add .

# Committer avec un message clair
git commit -m "feat: ajout de la fonctionnalité X"
git commit -m "fix: correction du bug Y"
git commit -m "design: amélioration de l'UI Z"
```

### 5. **Pousser ta branche sur GitHub**

```powershell
# Première fois (créer la branche sur GitHub)
git push -u origin feature/nom-de-ta-fonctionnalite

# Fois suivantes
git push
```

### 6. **Créer une Pull Request (PR)**

1. Aller sur : https://github.com/hermannnande/atelier-confection
2. **Cliquer** : `Compare & pull request` (apparaît automatiquement)
3. **Remplir** :
   - Titre : Description courte de ta fonctionnalité
   - Description : Ce que tu as fait, pourquoi, comment tester
4. **Assigner** le propriétaire comme reviewer
5. **Cliquer** : `Create pull request`

### 7. **Attendre la review et le merge**

Le propriétaire du projet va :
- Regarder ton code
- Tester localement
- Demander des modifications si nécessaire
- **Merger** ta branche dans `main` quand c'est OK ✅

---

## 🎨 UTILISER CURSOR EFFICACEMENT

### Extensions recommandées (déjà installées normalement)

1. **ESLint** : Détection d'erreurs JavaScript
2. **Prettier** : Formatage automatique du code
3. **Tailwind CSS IntelliSense** : Autocomplétion Tailwind
4. **ES7+ React Snippets** : Snippets React

### Raccourcis Cursor utiles

| Raccourci | Action |
|-----------|--------|
| `Ctrl + P` | Recherche rapide de fichier |
| `Ctrl + Shift + F` | Rechercher dans tous les fichiers |
| `Ctrl + D` | Sélectionner occurrence suivante |
| `Ctrl + /` | Commenter/décommenter |
| `Alt + ↑/↓` | Déplacer ligne |
| `Ctrl + Space` | Autocomplétion |
| `Ctrl + K` | Ouvrir l'IA Cursor |
| `Ctrl + L` | Chat avec l'IA |

### Utiliser l'IA de Cursor (Super Pratique !)

1. **Sélectionner du code**
2. **Appuyer** : `Ctrl + K`
3. **Demander** à l'IA :
   - "Explique-moi ce code"
   - "Ajoute des commentaires"
   - "Améliore la performance"
   - "Corrige les bugs"
   - "Refactorise ce code"

---

## 🧪 TESTER LE PROJET

### 1. **Tester le Backend**

```powershell
# Tester la connexion Supabase
cd backend
node -e "import('./supabase/client.js').then(m => m.getSupabaseAdmin().from('users').select('count').then(console.log))"
```

### 2. **Tester le Frontend**

1. Ouvrir : http://localhost:5173
2. Tester la page de login
3. Se connecter avec : `admin@atelier.com` / `admin123`
4. Naviguer dans les différentes pages

### 3. **Tester l'API**

```powershell
# Tester le login
$body = @{email="admin@atelier.com"; password="admin123"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
```

---

## 🐛 PROBLÈMES COURANTS ET SOLUTIONS

### ❌ Erreur : `EADDRINUSE :::5000`

**Cause** : Le port 5000 est déjà utilisé

**Solution** :
```powershell
# Tuer le processus sur le port 5000
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force

# Ou changer le port dans backend/.env
PORT=5001
```

### ❌ Erreur : `Module not found`

**Cause** : Dépendances non installées

**Solution** :
```powershell
cd backend
npm install

cd ../frontend
npm install
```

### ❌ Erreur : `Cannot connect to Supabase`

**Cause** : Mauvaises variables d'environnement

**Solution** :
1. Vérifier `backend/.env`
2. Vérifier que `SUPABASE_SERVICE_KEY` est correct
3. Redémarrer le serveur backend

### ❌ Erreur : `Login failed`

**Cause** : JWT_SECRET incorrect ou utilisateur inexistant

**Solution** :
1. Vérifier `backend/.env` → `JWT_SECRET`
2. Vérifier dans Supabase que l'utilisateur existe :
   - https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
   - Menu : `Table Editor` → `users`

### ❌ Page blanche sur http://localhost:5173

**Cause** : Erreur React non gérée

**Solution** :
1. Ouvrir la Console du navigateur (F12)
2. Regarder les erreurs
3. Vérifier que `frontend/.env` contient `VITE_API_URL=http://localhost:5000/api`

---

## 📞 ACCÈS SUPABASE DASHBOARD

Si tu as été invité au projet Supabase :

1. **Aller sur** : https://supabase.com/dashboard
2. **Se connecter** avec ton compte
3. **Sélectionner** le projet : `atelier-confection` (rgvojiacsitztpdmruss)

### Ce que tu peux faire dans le Dashboard :

- **Table Editor** : Voir et modifier les données
- **SQL Editor** : Exécuter des requêtes SQL
- **Authentication** : Gérer les utilisateurs
- **Storage** : Gérer les fichiers uploadés
- **Logs** : Voir les logs en temps réel

---

## 🔒 SÉCURITÉ ET BONNES PRATIQUES

### ✅ À FAIRE

- ✅ **Toujours** faire un `git pull` avant de commencer à coder
- ✅ **Travailler sur une branche** (pas sur `main`)
- ✅ **Committer souvent** avec des messages clairs
- ✅ **Tester localement** avant de pousser
- ✅ **Demander une review** via Pull Request
- ✅ **Garder les `.env` locaux** (jamais commit)

### ❌ À NE PAS FAIRE

- ❌ **NE JAMAIS** commit les fichiers `.env`
- ❌ **NE JAMAIS** push directement sur `main` (utiliser une branche)
- ❌ **NE JAMAIS** partager les clés API publiquement
- ❌ **NE JAMAIS** modifier la production sans test local
- ❌ **NE PAS** supprimer de fichiers sans vérifier

---

## 📚 DOCUMENTATION UTILE

### Documentation du Projet

| Document | Description |
|----------|-------------|
| `📚_SAUVEGARDE_COMPLETE_PROJET.md` | Documentation ultra-complète (architecture, API, déploiement) |
| `⚡_SESSION_SUIVANTE.md` | Aide-mémoire rapide avec liens et commandes |
| `🔥_RAPPEL_EXPRESS.txt` | Rappel ultra-compact (format texte) |

### Documentation Technologies

- **React** : https://react.dev/
- **Vite** : https://vitejs.dev/
- **Tailwind CSS** : https://tailwindcss.com/
- **Express.js** : https://expressjs.com/
- **Supabase** : https://supabase.com/docs
- **Zustand** : https://github.com/pmndrs/zustand

---

## 🎯 CHECKLIST DE DÉMARRAGE

Cocher au fur et à mesure :

- [ ] Node.js installé (v18+)
- [ ] Git installé
- [ ] Cursor IDE installé
- [ ] Compte GitHub créé
- [ ] Accès au repository GitHub (collaborateur)
- [ ] Projet cloné sur mon ordinateur
- [ ] Dépendances backend installées (`npm install`)
- [ ] Dépendances frontend installées (`npm install`)
- [ ] Fichier `backend/.env` créé avec les bonnes clés
- [ ] Fichier `frontend/.env` créé
- [ ] Backend démarre sur http://localhost:5000 ✅
- [ ] Frontend démarre sur http://localhost:5173 ✅
- [ ] Connexion avec admin@atelier.com fonctionne ✅
- [ ] Accès Supabase Dashboard obtenu (optionnel)
- [ ] Branche de développement créée
- [ ] Premier commit effectué ✅

---

## 💬 BESOIN D'AIDE ?

### 1. **Lire la documentation** du projet (dans le dossier racine)

### 2. **Vérifier les issues GitHub**
- https://github.com/hermannnande/atelier-confection/issues
- Peut-être que quelqu'un a eu le même problème

### 3. **Créer une issue GitHub** si problème non résolu
- Décrire le problème
- Partager les logs d'erreur
- Dire ce que tu as déjà essayé

### 4. **Demander au propriétaire du projet**
- Via email / message privé
- Expliquer clairement le problème

---

## 🎉 PRÊT À CODER !

Une fois tous ces setup terminés, tu es **prêt à contribuer** au projet ! 🚀

**Workflow idéal** :

1. `git pull origin main` → Récupérer les derniers changements
2. `git checkout -b feature/ma-nouvelle-fonctionnalite` → Créer une branche
3. **Coder** dans Cursor avec l'aide de l'IA
4. **Tester** en local
5. `git add .` + `git commit -m "feat: ..."` → Committer
6. `git push -u origin feature/ma-nouvelle-fonctionnalite` → Pousser
7. **Créer une Pull Request** sur GitHub
8. **Attendre la review** et le merge ✅

---

**Bienvenue dans l'équipe ! 👋**

Si tu as des questions, n'hésite pas à consulter la documentation complète dans `📚_SAUVEGARDE_COMPLETE_PROJET.md` ou à créer une issue sur GitHub.

**Happy Coding! 💻✨**
