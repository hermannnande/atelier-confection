# 🚀 DÉPLOYER SUR VERCEL + GITHUB

## 📋 **Ce qui sera déployé**

```
Frontend (React + Vite) → Vercel
    ↓
Backend (Node.js + Express) → Vercel Serverless
    ↓
Supabase (Base de données) → Déjà hébergé ✅
    ↓
Google Sheets → Appelle ton URL Vercel
```

---

## 🎯 **Étapes Complètes**

### **1️⃣ Préparer le Projet**

#### **A. Créer `.gitignore` à la racine (si pas déjà fait)**

Vérifie que tu as un fichier `.gitignore` avec :

```
node_modules/
.env
.env.local
dist/
build/
.DS_Store
*.log
```

#### **B. Créer `vercel.json` à la racine**

Ce fichier configure le déploiement backend + frontend :

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

### **2️⃣ Initialiser Git (si pas déjà fait)**

```powershell
cd "C:\Users\nande\Desktop\NOUS UNIQUE"

# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Atelier de Confection"
```

---

### **3️⃣ Créer un Repository GitHub**

1. Va sur **https://github.com/new**
2. **Nom du repo** : `atelier-confection` (ou autre)
3. **Visibilité** : Private (recommandé)
4. **NE coche PAS** "Add README" (tu en as déjà un)
5. Clique **"Create repository"**

Tu verras des commandes comme :

```bash
git remote add origin https://github.com/TON_USERNAME/atelier-confection.git
git branch -M main
git push -u origin main
```

**Copie et exécute ces commandes** dans PowerShell (dans le dossier du projet)

---

### **4️⃣ Déployer sur Vercel**

#### **Option A : Via le Site Web (Plus simple)**

1. Va sur **https://vercel.com**
2. **Connecte-toi** avec ton compte GitHub
3. Clique **"Add New" → "Project"**
4. **Importe** ton repo GitHub `atelier-confection`
5. **Configure** :
   - **Framework Preset** : Vite
   - **Root Directory** : `./` (racine)
   - **Build Command** : Laisse vide (Vercel détectera automatiquement)
   - **Output Directory** : `frontend/dist`

6. **Variables d'environnement** → Clique "Add" et ajoute :

```
# Backend
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=TON_SERVICE_ROLE_KEY
JWT_SECRET=TON_JWT_SECRET
USE_SUPABASE=true
NODE_ENV=production

# Frontend
VITE_API_URL=/api
```

7. Clique **"Deploy"** → Attends 2-3 minutes ⏳

8. **Récupère ton URL** : `https://ton-projet.vercel.app`

---

#### **Option B : Via CLI (Plus rapide si tu aimes le terminal)**

```powershell
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivre les instructions :
# - Set up and deploy? Yes
# - Which scope? (ton compte)
# - Link to existing project? No
# - Project name? atelier-confection
# - In which directory? ./ (racine)
# - Override settings? No

# Une fois déployé, tu auras une URL !
```

---

### **5️⃣ Configurer les Variables d'Environnement sur Vercel**

Si tu as déployé via CLI, ajoute les variables :

```powershell
vercel env add SUPABASE_URL
# Colle : https://rgvojiacsitztpdmruss.supabase.co

vercel env add SUPABASE_SERVICE_KEY
# Colle : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

vercel env add JWT_SECRET
# Colle : sFGRh3HLICY8lJPniXdvCZNRvl+J8WLDlOIbAj8A...

vercel env add USE_SUPABASE
# Colle : true

# Redéployer avec les nouvelles variables
vercel --prod
```

---

### **6️⃣ Mettre à Jour le Script Google Sheets**

Une fois déployé, tu auras une URL comme : `https://atelier-confection.vercel.app`

**Dans `google-sheets-appel.js`**, change :

```javascript
// ⚙️ CONFIGURATION
const API_URL = 'https://atelier-confection.vercel.app/api/commandes'; // ⚠️ TON URL Vercel
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Ton token
```

**Sauvegarde** et **réexécute** dans Apps Script !

---

### **7️⃣ Tester le Déploiement**

1. **Va sur ton URL Vercel** : `https://ton-projet.vercel.app`
2. **Connecte-toi** avec `admin@atelier.com` / `admin123`
3. **Va sur `/appel`**
4. **Envoie une ligne** depuis Google Sheets
5. **Recharge `/appel`** → La commande apparaît ! 🎉

---

## 📁 **Structure Finale**

```
NOUS UNIQUE/
├── backend/
│   ├── server.js          # Point d'entrée backend
│   ├── package.json
│   └── ...
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── .gitignore             # Fichiers à ignorer
├── vercel.json            # Config Vercel
├── package.json           # Scripts racine (optionnel)
└── README.md
```

---

## ⚙️ **Variables d'Environnement Récapitulatif**

### **Backend** (`backend/.env` - NE PAS COMMIT)
```
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=sFGRh3HLICY8lJPniXdvCZNRvl+J8WLDlOIbAj8A...
USE_SUPABASE=true
PORT=5000
```

### **Frontend** (`frontend/.env` - NE PAS COMMIT)
```
VITE_API_URL=/api
```

### **Vercel** (Ajouter dans le dashboard)
```
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=sFGRh3HLICY8lJPniXdvCZNRvl+J8WLDlOIbAj8A...
USE_SUPABASE=true
VITE_API_URL=/api
NODE_ENV=production
```

---

## 🎊 **Workflow Final**

```
1. Code en local → Test OK
   ↓
2. Git commit + push GitHub
   ↓
3. Vercel détecte le push → Redéploie auto ✨
   ↓
4. Google Sheets → Appelle l'URL Vercel
   ↓
5. Commandes arrivent dans /appel ! 🎉
```

---

## 🔧 **Commandes Utiles**

```powershell
# Voir les logs Vercel
vercel logs

# Redéployer
vercel --prod

# Voir les domaines
vercel domains ls

# Ajouter un domaine custom (optionnel)
vercel domains add ton-domaine.com
```

---

## 📞 **Support**

Si tu as des erreurs :
1. **Vois les logs** : Dashboard Vercel → Ton projet → "Deployments" → Clique sur le déploiement → "View Function Logs"
2. **Vérifie les variables** : Dashboard Vercel → Ton projet → "Settings" → "Environment Variables"

---

**Prêt à déployer ? Suis les étapes et dis-moi quand tu as ton URL Vercel ! 🚀**
