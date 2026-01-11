# 🎯 CONFIGURATION SUPABASE - ÉTAPE PAR ÉTAPE

## ✅ Vos informations

**Project URL** : `https://xxxx.supabase.co`  
**Anon Key** : (clé publique anon)

---

## 🚀 3 ÉTAPES POUR DÉMARRER

### 📍 ÉTAPE 1 : Récupérer les clés secrètes (2 min)

1. **Ouvrez** : Supabase Dashboard → **Settings** → **API**

2. **Copiez 2 clés** :
   
   #### a) Service Role Key (Secret)
   - Trouvez la section **"Project API keys"**
   - Cliquez sur **"Reveal"** à côté de **service_role**
   - Copiez la clé (elle commence par `eyJ...`)
   - ⚠️ **C'est une clé SECRÈTE** - ne la partagez jamais !
   
   #### b) JWT Secret
   - Scrollez vers le bas jusqu'à **"JWT Settings"**
   - Copiez le **JWT Secret**

### 📍 ÉTAPE 2 : Configurer l'application (1 min)

**Option A - Script automatique (Recommandé)** :
```bash
.\setup-supabase.bat
```
Le script vous demandera de coller vos 2 clés.

**Option B - Manuel** :

Créez `backend/.env` avec :
```env
PORT=5000
NODE_ENV=development

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=VOTRE_ANON_KEY
SUPABASE_SERVICE_KEY=COLLEZ_VOTRE_SERVICE_ROLE_KEY_ICI
JWT_SECRET=COLLEZ_VOTRE_JWT_SECRET_ICI
```

Créez `frontend/.env` avec :
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_ANON_KEY
```

### 📍 ÉTAPE 3 : Créer les tables dans Supabase (3 min)

1. **Ouvrez** : Supabase Dashboard → **SQL Editor**

2. **Cliquez sur "New Query"**

3. **Migration 1 - Structure** :
   - Ouvrez le fichier `supabase/migrations/20260110000000_initial_schema.sql`
   - Copiez TOUT le contenu
   - Collez dans SQL Editor
   - Cliquez sur **"Run"** ▶️
   - Attendez : ✅ **Success. No rows returned**

4. **Migration 2 - Données** :
   - Cliquez sur **"New Query"**
   - Ouvrez le fichier `supabase/migrations/20260110000001_seed_data.sql`
   - Copiez TOUT le contenu
   - Collez dans SQL Editor
   - Cliquez sur **"Run"** ▶️
   - Vous devriez voir : ✅ **Success. 9 rows affected**

5. **Vérifier** :
   - Allez dans **"Table Editor"** (menu de gauche)
   - Vous devriez voir 4 tables : `users`, `commandes`, `stock`, `livraisons`
   - Cliquez sur `users` → vous devriez voir 9 utilisateurs

---

## 🎉 LANCER L'APPLICATION

```bash
# Installer les dépendances
npm run install-all

# Lancer l'application
npm run dev
```

**Ouvrez** : http://localhost:3000

**Connexion** :
- Email : `admin@atelier.com`
- Mot de passe : `password123`

---

## ✅ CHECKLIST RAPIDE

- [ ] Récupéré la **service_role key** depuis Supabase
- [ ] Récupéré le **JWT secret** depuis Supabase
- [ ] Créé `backend/.env` avec les 2 clés
- [ ] Créé `frontend/.env`
- [ ] Exécuté la migration SQL 1 (structure)
- [ ] Exécuté la migration SQL 2 (données)
- [ ] Vérifié que les tables existent
- [ ] Lancé `npm run install-all`
- [ ] Lancé `npm run dev`
- [ ] Ouvert http://localhost:3000
- [ ] Connecté avec admin@atelier.com

---

## 🆘 PROBLÈMES ?

### "Error: Invalid API key"
➡️ Vérifiez que vous avez copié la **service_role** key (pas l'anon key)

### "Tables not found"
➡️ Exécutez les 2 migrations SQL dans le bon ordre

### "Cannot connect to database"
➡️ Vérifiez votre `SUPABASE_URL` dans backend/.env

---

## 📝 LIENS UTILES

- **SQL Editor** : Supabase Dashboard → SQL Editor  
- **Table Editor** : Supabase Dashboard → Table Editor  
- **API Settings** : Supabase Dashboard → Settings → API
- **Documentation** : https://supabase.com/docs

---

**C'est tout ! En 3 étapes simples, votre app est prête ! 🚀**


