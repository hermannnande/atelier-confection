# 📦 Sauvegarde complète — Nous Unique (atelier-confection)

**Date :** 13 juin 2026
**Statut :** ✅ Boutique en ligne sur nousunique.com + app de gestion sur Vercel

---

## 1. Emplacements & accès

| Élément | URL / Chemin |
|---|---|
| Site e-commerce (accueil = boutique) | https://nousunique.com/ |
| Boutique (catalogue) | https://nousunique.com/pages/boutique |
| Témoignages | https://nousunique.com/pages/temoignages |
| Admin boutique (protégé) | https://nousunique.com/gestion/ |
| App de gestion (atelier) | https://atelier-confection.vercel.app |
| Dépôt GitHub (source de vérité) | https://github.com/hermannnande/atelier-confection |
| Supabase (base de données) | https://supabase.com/dashboard/project/rgvojiacsitztpdmruss |
| VPS (LWS / ISPConfig) | vps113817.serveur-vps.net |

### Identifiants
- **Admin boutique `/gestion/`** : protection Apache `boutique` / `5SlKwO8WCsnD0B`, puis login appli `admin` ou `hermann` / `admin123`
- **App gestion Vercel** : `admin@atelier.com` / `admin123`
- **SSH VPS** : utilisateur `defaultboutique`, **par clé** `~/.ssh/atelier_vps` (pas de mot de passe)
- **Token upload WordPress** : `ATLRwpUP_9Kx2Qm7Zv3Fq`
- **Token API e-commerce (sync)** : `ATELIER_ECOM_2026`
- **Token commande publique** : `NOUSUNIQUE123`

---

## 2. Architecture

```
Navigateur (nousunique.com)
   │  HTML/CSS/JS statiques servis par Apache (VPS, à côté de WordPress)
   │  Appels API en absolu -> Vercel
   ▼
API Vercel (atelier-confection.vercel.app/api/...)
   ▼
Supabase (PostgreSQL) : produits, catégories, commandes, stock...

Images produits  -> Médiathèque WordPress (nousunique.com/wp-content/uploads/)
Vidéos hero      -> VPS (site-web/videos/)
Upload admin     -> nousunique.com/atelier-upload.php -> Médiathèque WP
```

- **Le serveur (Supabase via API Vercel) est la source de vérité.** Le localStorage n'est qu'un cache de secours.
- **Cloudinary n'est plus utilisé** : toutes les images (187) ont été migrées vers WordPress.

---

## 3. Données sauvegardées (dossier `backups/`)

- `produits-<date>.json` — export complet des 36 produits (API ecommerce/products)
- `categories-<date>.json` — export des catégories (API ecommerce/categories)

> Pour restaurer : renvoyer ces données via `POST /api/ecommerce/products/sync` et `/api/ecommerce/categories/sync` avec le token de sync.

---

## 4. Configuration serveur sauvegardée (dossier `server-config/`)

- `deploy-boutique.sh` — script de déploiement (télécharge la branche `main` depuis GitHub et synchronise css/js/pages/images/videos + `gestion/` en préservant le `.htaccess` d'auth)
- `htaccess-racine.txt` — `.htaccess` racine (règles boutique AVANT le bloc WordPress : accueil = boutique, URLs propres, `/gestion/`)
- `gestion-htaccess.txt` — protection Basic Auth de l'admin
- `atelier-upload.php` — endpoint d'upload images vers la Médiathèque WordPress

> Emplacement réel sur le VPS : `~/web/` (= `/var/www/clients/client0/web1/web`).
> Le fichier de mots de passe Basic Auth est dans `~/private/.htpasswd-admin` (hors web).

---

## 5. Déploiement

Pour publier des changements de code :
```bash
# 1. Commit + push
git add . && git commit -m "..." && git push origin main
# 2. Déployer sur le VPS
ssh -i ~/.ssh/atelier_vps defaultboutique@vps113817.serveur-vps.net "bash ~/deploy-boutique.sh"
```
L'app de gestion (Vercel) se redéploie automatiquement au push.

---

## 6. Fonctionnalités livrées (juin 2026)

- ✅ Boutique e-commerce hébergée sur `nousunique.com` (accueil = boutique), WordPress préservé
- ✅ Page d'accueil premium (typo serif, hero vidéo, bandes défilantes, responsive)
- ✅ Vidéos hero dédiées mobile (verticale) et PC, compressées (47 Mo → 2,2 Mo)
- ✅ Identité « NOUS UNIQUE » en texte dégradé animé + favicon dédié
- ✅ Galerie produit adaptative (1 à 5 images, vidéo optionnelle)
- ✅ Page Témoignages (captures Facebook + vidéos)
- ✅ Checkout en modale responsive (sans changer de page) → page de remerciement
- ✅ Produits similaires réels (même catégorie en priorité)
- ✅ Upload admin + toutes les images sur la Médiathèque WordPress (Cloudinary retiré)
- ✅ Admin protégé par mot de passe Apache (`/gestion/`)
- ✅ Correctif défilement horizontal mobile

---

## 7. Tables Supabase principales

- `ecommerce_products` — catalogue boutique (id, name, category, price, original_price, stock, sizes[], colors[], images(jsonb), video, thumbnail, active)
- `ecommerce_categories` — catégories boutique (RLS service_role)
- `commandes`, `stock`, `livraisons`, `users`, `modeles` — app de gestion atelier

---

**Tout le code est sur GitHub (branche `main`), entièrement commité et poussé.**
Cette sauvegarde = code (GitHub) + données (backups/) + config serveur (server-config/) + cette documentation.
