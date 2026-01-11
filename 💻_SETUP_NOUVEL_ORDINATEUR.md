# 💻 SETUP SUR UN NOUVEL ORDINATEUR

## 🎯 Pour travailler sur le projet depuis un autre PC

**Situation** : Tu as déjà accès au projet, tu veux juste le setup sur un nouvel ordinateur.

---

## ⚡ SETUP RAPIDE (15 minutes)

### ÉTAPE 1 : INSTALLER LES OUTILS (10 min)

#### 1. **Node.js** (v18 ou supérieur)
```
https://nodejs.org/
```
- Télécharger et installer
- Vérifier : `node --version`

#### 2. **Git**
```
https://git-scm.com/
```
- Télécharger et installer
- Vérifier : `git --version`

#### 3. **Cursor IDE**
```
https://cursor.sh/
```
- Télécharger et installer

---

### ÉTAPE 2 : CONFIGURER GIT (2 min)

```powershell
# Configurer ton identité Git
git config --global user.name "Ton Nom"
git config --global user.email "ton-email@example.com"

# Vérifier
git config --global --list
```

---

### ÉTAPE 3 : SE CONNECTER À GITHUB (2 min)

#### Option A : Via Cursor (Recommandé)

1. Ouvrir **Cursor**
2. Menu : `File` → `Clone Git Repository...`
3. Entrer l'URL :
   ```
   https://github.com/hermannnande/atelier-confection.git
   ```
4. **GitHub te demandera de te connecter** → Se connecter avec ton compte
5. Choisir où cloner (ex: `C:\Users\VotreNom\Projects\`)
6. Ouvrir le projet cloné

#### Option B : Via Terminal

```powershell
# Cloner le projet
cd C:\Users\VotreNom\Projects
git clone https://github.com/hermannnande/atelier-confection.git
cd atelier-confection

# GitHub peut demander tes credentials la première fois
# Utilise ton username et un Personal Access Token (PAT)
```

**Si Git demande un mot de passe** :
- Ne pas utiliser ton mot de passe GitHub
- Créer un **Personal Access Token** :
  1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Generate new token → Cocher `repo`
  3. Copier le token et l'utiliser comme mot de passe

---

### ÉTAPE 4 : INSTALLER LES DÉPENDANCES (3 min)

```powershell
# Dans le dossier du projet

# 1. Backend
cd backend
npm install

# 2. Frontend
cd ../frontend
npm install

# 3. API (Vercel)
cd ../api
npm install

# Revenir à la racine
cd ..
```

---

### ÉTAPE 5 : RÉCUPÉRER LES VARIABLES D'ENVIRONNEMENT

Tu as **3 options** :

#### Option A : Copier depuis l'ancien ordinateur

**Sur l'ancien PC** :
```powershell
# Afficher le contenu du .env
Get-Content "backend\.env"
```

**Sur le nouveau PC** :
```powershell
# Créer le fichier backend/.env et copier le contenu
notepad backend\.env
# Coller le contenu et sauvegarder

# Créer le fichier frontend/.env
notepad frontend\.env
# Coller le contenu et sauvegarder
```

#### Option B : Récupérer depuis Vercel

1. Aller sur : https://vercel.com/dashboard
2. Sélectionner le projet : `atelier-confection`
3. `Settings` → `Environment Variables`
4. Copier toutes les variables

**Créer `backend/.env`** :
```env
SUPABASE_URL=<copier depuis Vercel>
SUPABASE_SERVICE_KEY=<copier depuis Vercel>
JWT_SECRET=<copier depuis Vercel>
USE_SUPABASE=true
PUBLIC_API_SECRET=NOUSUNIQUE123
PORT=5000
NODE_ENV=development
```

**Créer `frontend/.env`** :
```env
VITE_API_URL=http://localhost:5000/api
```

#### Option C : Récupérer depuis Supabase

1. **SUPABASE_URL** et **SUPABASE_SERVICE_KEY** :
   - https://supabase.com/dashboard/project/rgvojiacsitztpdmruss/settings/api
   - Copier `URL` et `service_role key`

2. **JWT_SECRET** :
   - Soit récupérer depuis l'ancien PC
   - Soit récupérer depuis Vercel
   - ⚠️ Doit être **exactement le même** que sur l'ancien PC

---

### ÉTAPE 6 : LANCER LE PROJET

#### Terminal 1 : Backend

```powershell
cd backend
npm run dev
```

**✅ Résultat attendu** :
```
🟣 Mode base de données: Supabase (PostgreSQL)
✅ Connexion Supabase réussie
🚀 Serveur démarré sur http://localhost:5000
```

#### Terminal 2 : Frontend

```powershell
cd frontend
npm run dev
```

**✅ Résultat attendu** :
```
VITE ready in 500 ms
➜  Local:   http://localhost:5173/
```

#### Tester l'application

Ouvrir : **http://localhost:5173**

Login : `admin@atelier.com` / `admin123`

---

## ✅ CHECKLIST RAPIDE

- [ ] Node.js installé ✅
- [ ] Git installé ✅
- [ ] Cursor installé ✅
- [ ] Git configuré (user.name, user.email) ✅
- [ ] Projet cloné depuis GitHub ✅
- [ ] Dépendances installées (backend + frontend + api) ✅
- [ ] Fichier `backend/.env` créé ✅
- [ ] Fichier `frontend/.env` créé ✅
- [ ] Backend démarre sur port 5000 ✅
- [ ] Frontend démarre sur port 5173 ✅
- [ ] Connexion admin fonctionne ✅

---

## 🚀 COMMANDES GIT UTILES

```powershell
# Récupérer les dernières modifications
git pull origin main

# Voir l'état actuel
git status

# Voir les branches
git branch

# Créer une nouvelle branche
git checkout -b feature/nom-fonctionnalite

# Committer des changements
git add .
git commit -m "message"

# Pousser sur GitHub
git push origin main
```

---

## 🔄 SYNCHRONISATION ENTRE LES 2 ORDINATEURS

### Sur l'ancien PC (avant de quitter)

```powershell
# Sauvegarder ton travail
git add .
git commit -m "wip: travail en cours"
git push origin main
```

### Sur le nouveau PC (pour récupérer)

```powershell
# Récupérer les dernières modifications
git pull origin main
```

---

## 💡 CONSEIL PRO

### Utiliser des branches pour chaque PC (optionnel)

Si tu travailles souvent sur les 2 PC en parallèle :

**Sur PC 1** :
```powershell
git checkout -b pc1-work
# Travailler...
git push origin pc1-work
```

**Sur PC 2** :
```powershell
git checkout -b pc2-work
# Travailler...
git push origin pc2-work
```

**Pour merger** :
```powershell
git checkout main
git merge pc1-work
git merge pc2-work
git push origin main
```

---

## 🐛 SI PROBLÈME...

### Git demande credentials à chaque fois

**Solution** : Activer le cache credentials
```powershell
git config --global credential.helper wincred
```

### Port 5000 ou 5173 déjà utilisé

**Solution** :
```powershell
# Tuer le processus
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
```

### Erreur "Module not found"

**Solution** :
```powershell
# Réinstaller les dépendances
cd backend
Remove-Item -Recurse -Force node_modules
npm install

cd ../frontend
Remove-Item -Recurse -Force node_modules
npm install
```

---

## 📦 ALTERNATIVE : TRANSFERT DIRECT

Si les 2 PC sont sur le même réseau local, tu peux copier directement :

### Sur l'ancien PC :

```powershell
# Créer une archive (sans node_modules)
Compress-Archive -Path "C:\Users\nande\Desktop\NOUS UNIQUE\*" `
  -DestinationPath "C:\Users\nande\Desktop\atelier-backup.zip" `
  -Exclude "node_modules","dist",".git"
```

### Sur le nouveau PC :

1. Copier `atelier-backup.zip` (clé USB, réseau, cloud)
2. Extraire dans `C:\Users\VotreNom\Projects\`
3. Installer dépendances :
   ```powershell
   cd backend && npm install
   cd ../frontend && npm install
   cd ../api && npm install
   ```
4. Les fichiers `.env` sont déjà inclus ✅

---

## 🎉 C'EST TOUT !

En **15 minutes**, tu as le projet opérationnel sur le nouvel ordinateur !

**Prochaine étape** : Coder ! 💻✨

---

**💡 Astuce** : Garde ce guide sous la main pour les prochains setup !
