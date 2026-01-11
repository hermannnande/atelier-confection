# Guide d'Installation et de Démarrage

## Étape 1: Vérifier les prérequis

### Windows
1. **Node.js**: Téléchargez et installez depuis https://nodejs.org (version LTS recommandée)
2. **MongoDB**: 
   - Téléchargez depuis https://www.mongodb.com/try/download/community
   - Installez MongoDB Community Server
   - Ou utilisez MongoDB Compass (interface graphique incluse)

### Vérifier l'installation
```powershell
node --version
npm --version
mongod --version
```

## Étape 2: Installer les dépendances

Ouvrez PowerShell ou l'invite de commande dans le dossier du projet:

```powershell
# Installer toutes les dépendances (backend + frontend)
npm run install-all
```

## Étape 3: Démarrer MongoDB

### Option 1: Service Windows
```powershell
# Démarrer MongoDB comme service
net start MongoDB
```

### Option 2: MongoDB Compass
1. Ouvrez MongoDB Compass
2. Connectez-vous à `mongodb://localhost:27017`
3. Créez une base de données nommée `atelier-confection`

## Étape 4: Initialiser la base de données

```powershell
# Créer les comptes utilisateurs de démonstration
cd backend
node scripts/seed.js
cd ..
```

## Étape 5: Lancer l'application

### Option A: Tout lancer en même temps (Recommandé)
```powershell
npm run dev
```

### Option B: Lancer séparément

**Terminal 1 - Backend:**
```powershell
npm run server
```

**Terminal 2 - Frontend:**
```powershell
npm run client
```

## Étape 6: Accéder à l'application

Ouvrez votre navigateur et allez à:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/health

## Connexion

Utilisez l'un des comptes créés:
- **Admin**: admin@atelier.com / password123
- **Appelant**: appelant@atelier.com / password123
- **Styliste**: styliste@atelier.com / password123
- **Couturier**: couturier@atelier.com / password123
- **Livreur**: livreur@atelier.com / password123

## Dépannage

### MongoDB ne démarre pas
```powershell
# Vérifier si MongoDB est installé
mongod --version

# Démarrer MongoDB manuellement
mongod --dbpath C:\data\db
```

### Port déjà utilisé
Modifiez le port dans `backend/.env`:
```
PORT=5001
```

### Erreur de connexion à l'API
Vérifiez que:
1. Le backend est démarré (port 5000)
2. MongoDB est en cours d'exécution
3. Le fichier `.env` existe dans le dossier backend

## Scripts disponibles

- `npm run dev` - Lance backend + frontend
- `npm run server` - Lance uniquement le backend
- `npm run client` - Lance uniquement le frontend
- `npm run install-all` - Installe toutes les dépendances

## Arrêter l'application

Appuyez sur `Ctrl+C` dans chaque terminal où l'application s'exécute.

## Support

Pour toute question, consultez le README.md principal ou contactez l'équipe de développement.




