# 🚀 Guide de Démarrage Rapide

## Installation Express (5 minutes)

### 1️⃣ Installer les dépendances
```powershell
npm run install-all
```

### 2️⃣ Configurer l'environnement

Créez `backend/.env` avec ce contenu:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/atelier-confection
JWT_SECRET=changez_moi_secret_key_production_2026
NODE_ENV=development
```

### 3️⃣ Démarrer MongoDB

**Option A - Service Windows:**
```powershell
net start MongoDB
```

**Option B - MongoDB Compass:**
- Ouvrez MongoDB Compass
- Connectez à: `mongodb://localhost:27017`

### 4️⃣ Initialiser la base de données
```powershell
cd backend
node scripts/seed.js
cd ..
```

### 5️⃣ Lancer l'application
```powershell
npm run dev
```

### 6️⃣ Ouvrir dans le navigateur
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 🔐 Se Connecter

**Administrateur:**
- Email: `admin@atelier.com`
- Mot de passe: `password123`

**Autres comptes:**
- appelant@atelier.com / password123
- styliste@atelier.com / password123
- couturier@atelier.com / password123
- livreur@atelier.com / password123

## ✅ C'est prêt !

Vous pouvez maintenant:
1. Créer des commandes (Appelant)
2. Gérer la découpe (Styliste)
3. Gérer la couture (Couturier)
4. Assigner des livraisons (Gestionnaire)
5. Livrer les commandes (Livreur)
6. Consulter les performances (Gestionnaire/Admin)

---

**Problème?** Consultez `INSTALLATION.md` pour le guide détaillé.




