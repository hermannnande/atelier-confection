# 🌍 Système Multi-Pays - Guide de Setup

**Date** : 03 mai 2026
**Statut Étape 1** : ✅ Fondations posées (DB + backend commandes + frontend selector)
**Statut Étape 2** : ✅ Filtrage pays propagé sur toutes les routes backend
**Statut Étape 3** : ✅ Site web reste CI-only (rétro-compat assurée, aucune modif nécessaire)
**Statut Étape 4** : ✅ Templates Google Apps Script BF & FR fournis (prêts à coller)
**Pays supportés** : 🇨🇮 Côte d'Ivoire (CI) • 🇧🇫 Burkina Faso (BF) • 🇫🇷 France (FR)

---

## 📋 Vue d'ensemble

L'application supporte désormais plusieurs pays sur **la même infrastructure** (1 seule base Supabase, 1 seul Vercel, 1 seul GitHub). Chaque pays a ses **données isolées** (commandes, users, stock, livraisons, sessions caisse, présence) mais **partage** le catalogue produit (modèles + ecommerce_products).

### Architecture

```
┌──────────────────────────────────────────────────┐
│  1 BASE SUPABASE                                 │
│                                                  │
│  ┌─ Table 'pays' ──────────────────┐            │
│  │  CI  Cote d'Ivoire  XOF  +225  🇨🇮 │            │
│  │  BF  Burkina Faso   XOF  +226  🇧🇫 │            │
│  │  FR  France         EUR  +33   🇫🇷 │            │
│  └────────────────────────────────┘            │
│                                                  │
│  Tables AVEC pays_code (séparées par pays):     │
│   • users                                        │
│   • commandes                                    │
│   • stock                                        │
│   • livraisons                                   │
│   • sessions_caisse                              │
│   • attendances (présence GPS)                   │
│   • store_config (1 par pays)                    │
│   • sms_historique                               │
│                                                  │
│  Tables PARTAGÉES (sans pays_code):             │
│   • modeles (catalogue marque)                   │
│   • ecommerce_products                           │
│   • sms_templates                                │
│   • sms_config                                   │
└──────────────────────────────────────────────────┘
```

### Comment ça marche

1. Chaque user a un `pays_code` (CI, BF ou FR) qui est son **pays principal**.
2. Les **admin** et **gestionnaire** ont en plus une liste `pays_autorises` (par défaut `['CI','BF','FR']`) qui leur permet de **switcher** entre les pays.
3. Les autres rôles (livreur, couturier, styliste, appelant) sont **bloqués** sur leur pays_code.
4. Le frontend envoie un header HTTP `X-Country: BF` pour indiquer le pays actif.
5. Le backend filtre **automatiquement** toutes les requêtes par `pays_code = req.country`.

---

## 🚀 Étapes pour activer le multi-pays

### 1️⃣ Appliquer la migration SQL sur Supabase

**Fichier** : `supabase/migrations/20260503000000_multi_country_support.sql`

**Méthode A — Supabase Dashboard (recommandé)** :

1. Va sur https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
2. Clique sur **SQL Editor** dans le menu de gauche
3. Clique sur **New Query**
4. Copie-colle tout le contenu du fichier `20260503000000_multi_country_support.sql`
5. Clique **Run** (ou `Ctrl+Enter`)
6. Tu dois voir : `Success. No rows returned`

**Vérifications après migration** :
```sql
-- Doit retourner 3 lignes (CI, BF, FR)
select * from public.pays order by ordre;

-- Toutes tes commandes existantes sont taggées CI
select pays_code, count(*) from public.commandes group by pays_code;
-- Résultat attendu : CI | <nombre de tes commandes>

-- Idem pour stock, users, livraisons, sessions_caisse
select pays_code, count(*) from public.stock group by pays_code;
select pays_code, count(*) from public.users group by pays_code;

-- Tes admins/gestionnaires ont accès aux 3 pays
select email, role, pays_code, pays_autorises from public.users
where role in ('administrateur','gestionnaire');
-- pays_autorises devrait être {CI,BF,FR}
```

**⚠️ La migration est non destructive et idempotente** : tu peux la rejouer sans risque, elle utilise `IF NOT EXISTS` partout.

---

### 2️⃣ Déployer le code

```powershell
git add .
git commit -m "feat: support multi-pays (CI, BF, FR) - etapes 1 et 2"
git push origin main
```

Vercel va redéployer automatiquement (2-3 min).

---

### 3️⃣ Tester en local après déploiement Vercel

1. Va sur https://atelier-confection.vercel.app
2. Connecte-toi avec **admin@atelier.com / admin123**
3. Tu devrais voir un **drapeau 🇨🇮 dans le header** à côté de la cloche
4. Clique dessus → menu déroulant avec les 3 pays
5. Switch sur 🇧🇫 Burkina Faso
6. La page se recharge → toutes les commandes/stock/livraisons disparaissent (normal, aucune donnée BF encore)
7. Reswitch sur 🇨🇮 → tes données CI reviennent

---

## 📊 État du backend (Étapes 1 + 2)

### Routes multi-pays ✅ (toutes les routes métier sont scopées par pays)

**Authentification & comptes**
- `GET /api/pays` → liste des pays accessibles à l'user
- `GET /api/pays/all` → tous les pays (admin only)
- `POST /api/auth/register` → assigne le pays au nouvel user
- `GET /api/users` → liste les users du pays actif uniquement
- `GET /api/users/:id` → vérifie l'accès au pays
- `PUT /api/users/:id` → vérifie l'accès, admin peut réassigner `pays_code`/`pays_autorises`
- `DELETE /api/users/:id` → vérifie l'accès au pays

**Commandes**
- `GET /api/commandes` → filtre par pays
- `POST /api/commandes` → crée dans le pays actif
- Toutes les routes `:id` (valider, decoupe, couture, terminer-couture, annuler, delete) → vérifient l'accès
- `GET /api/commandes/statistiques/analyse` → filtre par pays
- `POST /api/commandes/public` → accepte `country` dans le body (default 'CI')

**Stock**
- `GET /api/stock` → filtre par pays
- `GET /api/stock/stats/resume` → filtre par pays
- `POST /api/stock` → insert dans le pays actif (clé unique : pays+modèle+taille+couleur)
- `PUT /api/stock/:id` + `/:id/ajuster` → vérifient l'accès au pays

**Livraisons**
- `GET /api/livraisons` → filtre par pays (et par livreur_id si role=livreur)
- `POST /api/livraisons/assigner` → utilise le pays de la commande
- `PUT /api/livraisons/:id` → vérifie l'accès au pays
- `POST /api/livraisons/:id/livree`, `/refusee`, `/confirmer-retour` → vérifient l'accès, stock géré dans le bon pays
- `POST /api/livraisons/livreur/:livreurId/marquer-paiement-recu` → filtre par pays

**Sessions caisse**
- `GET /api/sessions-caisse` → filtre par pays
- `GET /api/sessions-caisse/livreur/:id/session-active` → filtre par pays + insert dans le pays actif
- `POST /api/sessions-caisse/:id/cloturer` → vérifie l'accès, stock géré dans le bon pays
- `POST /api/sessions-caisse/livreur/:id/ajouter-livraisons` → filtre par pays
- `POST /api/sessions-caisse/livreur/:id/cloturer-tout` → filtre par pays
- `GET /api/sessions-caisse/livreur/:id/historique` → filtre par pays
- `DELETE /api/sessions-caisse/session/:id` → vérifie l'accès au pays

**Performances** (toutes les routes filtrent par pays actif)
- `GET /api/performances/overview`
- `GET /api/performances/appelants`
- `GET /api/performances/stylistes`
- `GET /api/performances/couturiers`
- `GET /api/performances/livreurs`

**SMS**
- `GET /api/sms/historique` → filtre par pays (templates `/templates*` restent partagés)
- `GET /api/sms/stats` → filtre par pays
- `POST /api/sms/send` → log avec le pays actif
- `POST /api/sms/test` → log avec le pays actif
- `POST /api/sms/send-notification` → log avec le pays de la commande
- Cron `/cron/rappel-en-couture` → cross-pays mais log avec le pays de chaque commande

**Pointage GPS / Attendance**
- `POST /api/attendance/mark-arrival` → utilise le pays du user (pas le pays admin)
- `POST /api/attendance/mark-departure` → idem
- `GET /api/attendance/my-attendance-today` → filtre par pays du user
- `GET /api/attendance/history` → filtre par pays actif
- `GET /api/attendance/statistics` → filtre par les user_ids du pays actif
- `GET /api/attendance/store-config` → 1 config par pays
- `PUT /api/attendance/store-config` → upsert sur la config du pays actif
- `DELETE /api/attendance/attendances/:id` → vérifie l'accès au pays

### Tables partagées (pas de `pays_code`, données communes)

- `modeles` → catalogue marque (mêmes produits dans tous les pays)
- `ecommerce_products` → catalogue site web
- `sms_templates` → templates partagés (même message, juste l'historique d'envoi est par pays)
- `sms_config` → toggles globaux SMS
- `pays` → table de référence

### Helper centralisé

Le middleware `backend/supabase/middleware/country.js` expose :
- `resolveCountry` (route authentifiée) — résout le pays demandé via header `X-Country`, query `?country=`, ou body `country`. Vérifie les permissions (`pays_autorises` pour admin/gestionnaire, `pays_code` pour les autres rôles).
- `resolveCountryPublic` (routes publiques) — extrait le pays demandé, ou par défaut 'CI'.
- `ensureCountryAccess(row, req, res)` — helper utilisé après un SELECT pour vérifier qu'une ressource appartient bien à un pays autorisé pour l'utilisateur courant.
- `scopeQueryToCountry(query, country)` — helper optionnel pour appliquer `.eq('pays_code', country)` à un query Supabase.

### Comportement par défaut sécurisé

- Toute donnée existante (créée avant la migration) a `pays_code = 'CI'` par défaut.
- Tout le code legacy continue de fonctionner sans changement.
- Les rôles non-admin/gestionnaire sont **strictement bloqués** sur leur `pays_code` même s'ils essayent d'envoyer un autre `X-Country`.
- Aucun risque de fuite de données entre pays.

---

## 🔌 Intégration Google Sheets

### Côte d'Ivoire (configuration actuelle, RIEN À CHANGER)

Le sheet CI continue d'utiliser `google-sheets-appel-auto.js` qui poste vers `/api/commandes` (route privée avec JWT admin) **sans header X-Country**. Comme l'admin a `pays_code = 'CI'` par défaut, le backend assigne automatiquement les commandes au pays CI. **Aucune modification nécessaire**.

### Burkina Faso (template prêt)

**Fichier** : `google-sheets-appel-auto-BF.js`

Étapes :
1. Crée ton Google Sheet Burkina Faso
2. Ouvre `Extensions → Apps Script`
3. Copie-colle tout le contenu de `google-sheets-appel-auto-BF.js`
4. Remplace `'COLLE_TON_TOKEN_ICI'` par le JWT d'un admin/gestionnaire qui a `'BF'` dans `pays_autorises`
5. Sauvegarde, puis exécute la fonction `installerTriggersAutomatiques()` une fois
6. C'est tout : le script enverra automatiquement les nouvelles lignes vers le pays BF

**Différence avec le script CI** : 2 lignes ajoutées
- `const COUNTRY_CODE = 'BF';`
- Ajout du header `'X-Country': COUNTRY_CODE` dans la requête HTTP

### France (template prêt)

**Fichier** : `google-sheets-appel-auto-FR.js`

Procédure identique, mais `COUNTRY_CODE = 'FR'`.

### Site web e-commerce (`site-web/`)

Le site web reste **CI-only** pour l'instant. Le formulaire de commande envoie vers `/api/commandes/public` sans `country` → fallback automatique sur `'CI'`. **Pas de modification du site web**.

### Comment récupérer un JWT pour les scripts Apps Script

```powershell
# Sur ton poste, après login, le JWT est dans localStorage du navigateur
# OU récupère-le via l'API :
$body = @{ email = "admin@atelier.com"; password = "TON_MDP" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/auth/login" `
  -Method POST -ContentType "application/json" -Body $body
$response.token # <-- voici le JWT à coller dans le script Apps Script
```

⚠️ Le JWT a une durée de vie limitée (probablement 7-30 jours selon ta config). Pour un script Apps Script qui tourne en continu, tu peux soit :
- Régénérer le JWT et mettre à jour les scripts manuellement quand il expire
- Configurer un JWT à durée de vie très longue côté backend (variable `JWT_EXPIRES_IN`)
- Idéal : créer un user dédié au script (ex. `apps-script-bot-bf@atelier.com`) avec rôle `appelant` et `pays_code = 'BF'`, puis garder son JWT

---

## 🌐 Variables d'environnement Vercel

**Aucune nouvelle variable n'est nécessaire pour l'Étape 1.**

Les variables existantes restent valides :
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `USE_SUPABASE`
- `PUBLIC_API_SECRET=NOUSUNIQUE123` (token pour `/api/commandes/public`)

---

## 🧪 Tester l'API en PowerShell

### Lister les pays accessibles à l'user connecté
```powershell
$token = "<TON_JWT_APRES_LOGIN>"
Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/pays" `
  -Headers @{ Authorization = "Bearer $token" }
```

### Récupérer les commandes du Burkina Faso
```powershell
Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/commandes" `
  -Headers @{
    Authorization = "Bearer $token"
    "X-Country" = "BF"
  }
```

### Créer une commande publique au Burkina Faso (test)
```powershell
$body = @{
  token = "NOUSUNIQUE123"
  country = "BF"
  client = "Test BF"
  phone = "+226 70000000"
  ville = "Ouagadougou"
  name = "Robe Volante"
  taille = "M"
  couleur = "Bleu ciel"
  price = 11000
  source = "test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/commandes/public" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

## 📝 Comment ajouter un nouveau pays (Sénégal SN par exemple)

1. **SQL** : ajouter une ligne dans la table `pays`
   ```sql
   insert into public.pays (code, nom, devise, symbole_devise, indicatif_tel, drapeau, ordre, actif)
   values ('SN', 'Senegal', 'XOF', 'FCFA', '+221', '🇸🇳', 4, true);
   ```

2. **Donner accès aux admins** : ils l'ont automatiquement si tu as fait l'UPDATE de la migration. Sinon :
   ```sql
   update public.users
   set pays_autorises = array_append(pays_autorises, 'SN')
   where role in ('administrateur','gestionnaire');
   ```

3. **C'est tout** ! Le drapeau apparaît dans le selector après refresh.

---

## 🔄 Prochaines étapes

### Étape 2 — Propager le filtre pays sur les autres routes
Modifier les routes :
- `stock.js` (filtre + insertion par pays)
- `livraisons.js`
- `sessions-caisse.js`
- `users.js` (les livreurs/couturiers ne voient que les users de leur pays)
- `performances.js`
- `sms.js`
- `attendance.js`

→ ⏱️ Estimation : 30-45 min

### Étape 3 — Site web (sera skippée vu ton choix)
Site reste CI uniquement. Rétrocompatibilité OK : la route publique fallback sur 'CI'.

### Étape 4 — Templates Google Sheets BF + FR
Créer 2 templates Apps Script (1 par pays) avec le `country` injecté automatiquement.

→ ⏱️ Estimation : 15 min + setup côté Google Sheets

---

## 🎉 Récapitulatif Étape 1

✅ Migration SQL créée (non destructive, idempotente)
✅ Table `pays` avec CI/BF/FR
✅ Colonne `pays_code` sur 8 tables (avec FK)
✅ Migration auto des données CI existantes (DEFAULT 'CI')
✅ Admin/Gestionnaire ont accès aux 3 pays automatiquement
✅ Middleware backend `country.js` (resolveCountry + resolveCountryPublic)
✅ Route `/api/pays` (liste filtrée selon les droits)
✅ Toutes les routes `/api/commandes/*` sont multi-pays
✅ Frontend `countryStore` (Zustand persist)
✅ Composant `CountrySelector` (drapeau dans header)
✅ Intercepteur axios ajoute `X-Country` automatiquement
✅ Layout intégré
✅ Build frontend OK
