# 🚀 DÉPLOIEMENT COMPLET - Site E-commerce avec Admin

## ✅ DÉPLOYÉ SUR VERCEL

### 📍 URLs du Site

#### Site E-commerce (Public)
```
https://atelier-confection.vercel.app/site-web/
```

#### Admin E-commerce (Gestion Produits)
```
https://atelier-confection.vercel.app/site-web/admin/
```

**Identifiants Admin :**
- **Username** : `admin`
- **Password** : `admin123`

#### Application Gestion Atelier (React)
```
https://atelier-confection.vercel.app/
```

**Identifiants App :**
- **Email** : `admin@atelier.com`
- **Password** : `admin123`

---

## 🎯 CE QUI A ÉTÉ DÉPLOYÉ

### 1️⃣ **Admin E-commerce Complet**
✅ Panneau d'administration WordPress-like
✅ Gestion des produits (CRUD)
✅ Gestion des catégories
✅ Gestion des commandes
✅ Paramètres du site

### 2️⃣ **Stockage Illimité (Mode URLs)**
✅ Plus de limite de stockage LocalStorage
✅ Mode "URLs d'images" activé par défaut
✅ Support des images hébergées externes
✅ Compatible avec Cloudinary, ImgBB, etc.

### 3️⃣ **Pages E-commerce**
✅ Page d'accueil moderne
✅ Boutique avec filtres dynamiques
✅ Page produit avec galerie portrait + vidéo
✅ Panier avec tiroir latéral
✅ Checkout complet
✅ Page favoris

### 4️⃣ **Cohérence Admin ↔ Site**
✅ Produits créés dans l'admin apparaissent automatiquement sur le site
✅ Images galerie (5 portrait max) + vidéo optionnelle
✅ Vignette boutique 600×600px (carrée, obligatoire)
✅ Synchronisation en temps réel

---

## 📋 UTILISATION DE L'ADMIN

### Étape 1 : Se Connecter
1. Va sur : `https://atelier-confection.vercel.app/site-web/admin/`
2. Entre les identifiants : `admin` / `admin123`

### Étape 2 : Créer un Produit
1. Clique sur **"Produits"** dans le menu
2. Clique sur **"Nouveau Produit"**
3. Remplis les champs :
   - Nom, catégorie, prix, stock, description
   - Tailles (ex: `S, M, L, XL`)
   - Couleurs (ex: `Noir, Blanc, Beige`)

### Étape 3 : Ajouter les Images

#### Mode Stockage (par défaut : URLs)
- **Stockage illimité (URLs d'images)** : Colle les URLs d'images hébergées
- **Stockage local** : Upload direct (limité à ~5MB)

#### Images Galerie Produit (Portrait)
- **5 images maximum**
- Format portrait recommandé : 600×800, 800×1000, etc.
- Ces images apparaissent sur la page produit

#### Vidéo Produit (Optionnelle)
- **1 vidéo** (URL uniquement)
- Apparaît dans la galerie produit

#### Vignette Boutique 600×600 (OBLIGATOIRE)
- **1 image carrée 600×600px**
- Apparaît sur la page boutique (liste produits)

### Étape 4 : Enregistrer
1. Clique sur **"Enregistrer"**
2. Le produit apparaît automatiquement sur :
   - `https://atelier-confection.vercel.app/site-web/pages/boutique.html`

---

## 🔧 FONCTIONNALITÉS ADMIN

### Produits
- ✅ Créer, modifier, supprimer
- ✅ Gestion des images (galerie + vignette)
- ✅ Gestion des vidéos
- ✅ Tailles et couleurs personnalisées
- ✅ Stock et prix
- ✅ Copier le lien direct du produit

### Catégories
- ✅ Créer des catégories personnalisées
- ✅ Activer/désactiver
- ✅ Description et slug

### Commandes
- ✅ Voir toutes les commandes du site
- ✅ Statuts : En attente, Livrée, Annulée
- ✅ Détails client et produits

### Paramètres
- ✅ Informations du site
- ✅ Contact et réseaux sociaux
- ✅ Livraison et paiement

---

## 🌐 HÉBERGEMENT D'IMAGES (GRATUIT)

Si tu veux utiliser le mode "URLs illimité", héberge tes images sur :

### 1. **ImgBB** (Recommandé)
- URL : https://imgbb.com
- Upload gratuit illimité
- Copie le lien "Direct Link"

### 2. **Cloudinary**
- URL : https://cloudinary.com
- 10GB gratuit
- Qualité optimisée automatiquement

### 3. **PostImages**
- URL : https://postimages.org
- Simple et rapide
- Pas de compression

---

## 🔄 DÉPLOIEMENT AUTOMATIQUE

Vercel redéploie automatiquement à chaque `git push` :

```bash
cd c:\Users\nande\Desktop\atelier-confection-git
git add .
git commit -m "Ton message"
git push origin main
```

⏱️ **Temps de déploiement** : 1-2 minutes

---

## 📊 SURVEILLANCE

### Vérifier le déploiement
1. Va sur : https://vercel.com/dashboard
2. Clique sur le projet **atelier-confection**
3. Voir les logs de déploiement

### Tester le site
1. **Site public** : https://atelier-confection.vercel.app/site-web/
2. **Admin** : https://atelier-confection.vercel.app/site-web/admin/
3. Créer un produit → Vérifier qu'il apparaît sur la boutique

---

## 🐛 DÉPANNAGE

### Le produit n'apparaît pas sur la boutique
- Vide le cache du navigateur (Ctrl+Shift+R)
- Vérifie que les images sont bien en URLs (pas en base64)
- Ouvre la console (F12) pour voir les erreurs

### Impossible d'enregistrer un produit
- **Message "Stockage saturé"** → Passe en mode "URLs d'images"
- **Vignette refusée** → Vérifie qu'elle fait exactement 600×600px

### Admin ne charge pas
- Réinitialise les identifiants : https://atelier-confection.vercel.app/site-web/admin/reset.html

---

## 📞 SUPPORT

Si tu as des problèmes :
1. Vérifie les logs Vercel
2. Ouvre la console navigateur (F12)
3. Envoie-moi les erreurs

---

## ✅ CHECKLIST POST-DÉPLOIEMENT

- [ ] ✅ Site accessible sur https://atelier-confection.vercel.app/site-web/
- [ ] ✅ Admin accessible sur https://atelier-confection.vercel.app/site-web/admin/
- [ ] ✅ Connexion admin fonctionne (`admin` / `admin123`)
- [ ] ✅ Création de produit fonctionne
- [ ] ✅ Produit créé apparaît sur la boutique
- [ ] ✅ Mode "URLs illimité" configuré

---

**Date de déploiement** : 4 février 2026  
**Repository** : https://github.com/hermannnande/atelier-confection  
**Branche** : `main`  
**Commit** : `e11ce34`

🎉 **TON SITE E-COMMERCE EST EN LIGNE AVEC ADMIN COMPLET !**
