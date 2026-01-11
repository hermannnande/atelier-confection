# 🚀 LANCEMENT avec Supabase

## Option 1: Supabase Cloud (RECOMMANDÉ - Pas besoin de Docker)

### 1️⃣ Créer un compte Supabase
1. Allez sur https://supabase.com
2. Créez un compte gratuit
3. Créez un nouveau projet
4. Notez vos credentials :
   - `Project URL`
   - `anon public key`
   - `service_role key` (secret)

### 2️⃣ Configurer les variables d'environnement

Créez `backend/.env`:
```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_KEY=votre_service_role_key

# JWT (utilisez le JWT secret de Supabase)
JWT_SECRET=votre_jwt_secret_supabase
```

### 3️⃣ Créer les tables dans Supabase

1. Allez dans votre projet Supabase
2. Cliquez sur "SQL Editor"
3. Copiez le contenu de `supabase/migrations/20260110000000_initial_schema.sql`
4. Exécutez la migration
5. Copiez le contenu de `supabase/migrations/20260110000001_seed_data.sql`
6. Exécutez le seed

### 4️⃣ Installer les dépendances
```bash
npm run install-all
```

### 5️⃣ Lancer l'application
```bash
npm run dev
```

### 6️⃣ Ouvrir le navigateur
http://localhost:3000

**Connexion:** admin@atelier.com / password123

---

## Option 2: Supabase Local (avec Docker Desktop)

### Prérequis
1. Installer Docker Desktop: https://www.docker.com/products/docker-desktop
2. Démarrer Docker Desktop
3. Attendre que Docker soit prêt (icône verte)

### Ensuite:

```bash
# Démarrer Supabase localement
supabase start

# Vous obtiendrez les credentials locaux
# Copiez-les dans backend/.env

# Appliquer les migrations
supabase db reset

# Lancer l'application
npm run dev
```

---

## 🎯 RECOMMANDATION

**Utilisez Supabase Cloud (Option 1)** car :
- ✅ Pas besoin de Docker
- ✅ Gratuit pour commencer
- ✅ Déjà configuré
- ✅ Accessible de partout
- ✅ Sauvegardes automatiques
- ✅ Interface web intuitive

---

## 📝 Notes importantes

Les fichiers MongoDB ont déjà été créés. Ils fonctionnent de la même manière.

Si vous préférez **continuer avec MongoDB** :
```bash
# Démarrer MongoDB
net start MongoDB

# Initialiser la base de données
cd backend
node scripts/seed.js
cd ..

# Lancer l'application
npm run dev
```

**MongoDB fonctionne parfaitement pour ce projet !** Supabase est une alternative moderne avec PostgreSQL.



