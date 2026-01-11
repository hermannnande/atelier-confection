# 🎯 ÉTAPES POUR TERMINER LA CONFIGURATION SUPABASE

## ⚠️ IMPORTANT - Récupérer la clé secrète

Vous avez fourni la **Publishable Key** (publique), mais nous avons besoin de la **Service Role Key** (secrète) pour le backend.

### 1️⃣ Récupérer la Service Role Key

1. Allez sur votre Supabase Dashboard (projet)
2. Cliquez sur **Settings** (⚙️)
3. Cliquez sur **API**
4. Trouvez la section **Project API keys**
5. Copiez la clé **service_role** (elle commence par `eyJ...` et est beaucoup plus longue)
6. ⚠️ **NE LA PARTAGEZ JAMAIS** - c'est une clé secrète !

### 2️⃣ Récupérer le JWT Secret

Dans la même page API :
1. Scrollez jusqu'à **JWT Settings**
2. Copiez le **JWT Secret**

### 3️⃣ Mettre à jour backend/.env

Éditez le fichier `backend/.env` et remplacez :

```env
SUPABASE_SERVICE_KEY=VOTRE_SERVICE_ROLE_KEY_ICI
JWT_SECRET=votre_jwt_secret_supabase
```

Par vos vraies valeurs.

---

## 🗄️ CRÉER LES TABLES DANS SUPABASE

### Option A : Via l'interface Web (Recommandé)

1. Allez sur votre projet Supabase (Dashboard)
2. Cliquez sur **SQL Editor** dans le menu de gauche
3. Cliquez sur **New Query**

#### Étape 1 : Créer la structure

Copiez-collez tout le contenu du fichier :
**`supabase/migrations/20260110000000_initial_schema.sql`**

Cliquez sur **Run** ▶️

Si tout va bien, vous verrez : ✅ Success

#### Étape 2 : Ajouter les utilisateurs de test (Recommandé)

Plutôt que d’insérer des mots de passe en SQL, utilisez le script Node (il génère les hash bcrypt automatiquement) :

```bash
cd backend
node scripts/seed-supabase.js
cd ..
```

Si vous préférez absolument le SQL, vous pouvez utiliser `supabase/migrations/20260110000001_seed_data.sql` (à condition d’y mettre de vrais hash bcrypt).

```sql
-- Hash bcrypt pour 'password123'
-- Généré avec: bcrypt.hashSync('password123', 10)

insert into users (nom, email, password, role, telephone)
values
  ('Admin Principal', 'admin@atelier.com', '$2a$10$Xu9ZLxPKGZ9qHJ0pGxCLMeqHUJxHVxGhCK1FHKGxGxGxGxGxGxGxG', 'administrateur', '+225 07 00 00 00 01'),
  ('Gestionnaire Principal', 'gestionnaire@atelier.com', '$2a$10$Xu9ZLxPKGZ9qHJ0pGxCLMeqHUJxHVxGhCK1FHKGxGxGxGxGxGxGxG', 'gestionnaire', '+225 07 00 00 00 02'),
  ('Appelant Marie', 'appelant@atelier.com', '$2a$10$Xu9ZLxPKGZ9qHJ0pGxCLMeqHUJxHVxGhCK1FHKGxGxGxGxGxGxGxG', 'appelant', '+225 07 00 00 00 03'),
  ('Styliste Fatou', 'styliste@atelier.com', '$2a$10$Xu9ZLxPKGZ9qHJ0pGxCLMeqHUJxHVxGhCK1FHKGxGxGxGxGxGxGxG', 'styliste', '+225 07 00 00 00 05'),
  ('Couturier Amadou', 'couturier@atelier.com', '$2a$10$Xu9ZLxPKGZ9qHJ0pGxCLMeqHUJxHVxGhCK1FHKGxGxGxGxGxGxGxG', 'couturier', '+225 07 00 00 00 06'),
  ('Livreur Koffi', 'livreur@atelier.com', '$2a$10$Xu9ZLxPKGZ9qHJ0pGxCLMeqHUJxHVxGhCK1FHKGxGxGxGxGxGxGxG', 'livreur', '+225 07 00 00 00 08');
```

Cliquez sur **Run** ▶️

### Option B : Via Supabase CLI

```bash
# Lier votre projet
supabase link --project-ref VOTRE_PROJECT_REF

# Appliquer les migrations
supabase db push
```

---

## ✅ VÉRIFIER QUE TOUT FONCTIONNE

1. Allez sur votre projet Supabase (Dashboard)
2. Cliquez sur **Table Editor**
3. Vous devriez voir les tables : `users`, `commandes`, `stock`, `livraisons`
4. Cliquez sur `users` → vous devriez voir vos 6 utilisateurs

---

## 🚀 LANCER L'APPLICATION

Une fois les étapes 1️⃣, 2️⃣ et 3️⃣ terminées :

```bash
# Installer les dépendances (si pas encore fait)
npm run install-all

# Lancer l'application
npm run dev
```

**Ouvrez** : http://localhost:3000

**Connexion** :
- Email : admin@atelier.com
- Mot de passe : password123

---

## 🆘 AIDE RAPIDE

### Les fichiers .env sont déjà créés avec votre URL !

Vous devez juste :
1. ✅ Récupérer la **service_role key**
2. ✅ Récupérer le **JWT secret**
3. ✅ Les ajouter dans `backend/.env`
4. ✅ Exécuter les migrations SQL dans Supabase Studio
5. ✅ Lancer `npm run dev`

---

**C'est presque fini ! Plus que quelques étapes ! 💪**


