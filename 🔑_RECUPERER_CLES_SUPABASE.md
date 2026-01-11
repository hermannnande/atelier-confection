# 🔑 RÉCUPÉRER LES BONNES CLÉS SUPABASE

## ⚠️ PROBLÈME ACTUEL
La connexion échoue car **SUPABASE_SERVICE_KEY** est incorrecte dans `backend/.env`.

---

## ✅ SOLUTION (2 minutes)

### 📍 Étape 1 : Aller sur Supabase Dashboard

1. Ouvre : **https://supabase.com/dashboard/project/rgvojiacsitztpdmruss/settings/api**
2. Tu verras la page "**API Settings**"

---

### 📍 Étape 2 : Copier les bonnes clés

Tu vas voir 3 sections :

#### 🟢 **Project URL** (en haut)
```
https://rgvojiacsitztpdmruss.supabase.co
```
✅ **Copie exactement ça** (c'est déjà corrigé dans ton `.env`)

---

#### 🟡 **Project API keys**

Tu verras 2 clés :

1. **`anon` `public`** ← ❌ NE PAS UTILISER pour le backend !
   - Cette clé commence souvent par : `eyJhbGci...` (JWT court)
   - C'est pour le **frontend seulement**

2. **`service_role` `secret`** ← ✅ **C'EST CELLE-CI QU'IL FAUT !**
   - Clique sur "**Reveal**" (ou l'icône 👁️) à côté de `service_role`
   - Cette clé est **beaucoup plus longue** (JWT très long)
   - Commence aussi par `eyJhbGci...` mais **beaucoup plus de caractères**
   
   **📋 COPIE CETTE CLÉ ENTIÈRE**

---

#### 🔵 **JWT Secret** (tout en bas)
- Clique sur "**Reveal**"
- C'est une clé secrète (pas un JWT)
- Exemple : `sFGRh3HLICY8lJPniXdvCZNRvl+J8WLDlOIbAj8AxbFu50ZzOk9DmFCF4tuiYRULEfJfoVDdKARkOeJj+tlouw==`

**📋 COPIE CETTE CLÉ**

---

### 📍 Étape 3 : Mettre à jour backend/.env

Ouvre `backend/.env` et **remplace** :

```env
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_ANON_KEY=TA_CLE_ANON_ICI
SUPABASE_SERVICE_KEY=TA_VRAIE_SERVICE_ROLE_KEY_ICI
JWT_SECRET=TON_JWT_SECRET_ICI
```

⚠️ **ATTENTION** :
- `SUPABASE_SERVICE_KEY` doit être la clé **`service_role`** (très longue)
- PAS la clé `anon` !

---

### 📍 Étape 4 : Tester

Lance dans un terminal :

```bash
cd backend
node scripts/check-supabase.js
```

Tu devrais voir :
```
✅ Connexion Supabase OK. Table `users` accessible.
```

---

## 🆘 Besoin d'aide ?

Colle ici :
1. Le **début** de ta `SUPABASE_SERVICE_KEY` (premiers 30 caractères)
2. Le **résultat** de `node scripts/check-supabase.js`

Et je t'aide à corriger !
