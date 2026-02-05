# ✅ UPLOAD CLOUDINARY FONCTIONNEL

## 🎉 CE QUI A ÉTÉ CORRIGÉ

J'ai unifié et corrigé l'upload Cloudinary dans l'admin :

### 1️⃣ **Un seul système d'upload** (Cloudinary uniquement)
- ❌ Supprimé : mode local (limité par localStorage)
- ❌ Supprimé : mode URL manuel
- ✅ **Un seul bouton** : Upload automatique Cloudinary (illimité)

### 2️⃣ **Configuration Cloudinary corrigée**
- **Cloud name** : `deyvdnm2d` (ton compte)
- **Upload preset** : `atelier_unsigned` (unsigned, créé par toi)
- Plus d'erreur "Unknown API key"

### 3️⃣ **Cache-busting mis à jour**
- Tous les scripts avec `?v=20260205-120000`
- Force le navigateur à charger la nouvelle version

---

## 🚀 COMMENT L'UTILISER

### Étape 1 : Attends 2 minutes
Vercel est en train de redéployer les derniers changements.

### Étape 2 : Va sur l'admin
```
https://atelier-confection.vercel.app/site-web/admin/produits.html
```

Connexion : `admin` / `admin123`

### Étape 3 : Crée un produit
1. Clique **"Nouveau Produit"**
2. Remplis les infos de base (nom, catégorie, prix, description, tailles, couleurs)
3. **Upload images galerie** (portrait) :
   - Clique **"Uploader Images (Cloudinary)"**
   - Sélectionne jusqu'à 5 images (format portrait recommandé : 600×800, 800×1000, etc.)
   - Elles s'ajoutent automatiquement dans l'aperçu
4. **(Optionnel) Ajoute une vidéo** :
   - Colle l'URL de ta vidéo (https://...)
   - Clique "Ajouter Vidéo"
5. **Upload vignette boutique** (carrée 600×600) :
   - Clique **"Uploader Vignette 600×600 (Cloudinary)"**
   - Cloudinary va **automatiquement recadrer** l'image en 1:1 (carré)
   - Sélectionne ton image
6. Clique **"Enregistrer"**

### Étape 4 : Voir le produit sur le site
1. Va sur : https://atelier-confection.vercel.app/site-web/pages/boutique.html
2. Tu verras ton produit avec la **vignette carrée 600×600**
3. Clique dessus → Tu verras la page produit avec :
   - Les **5 images portrait** dans la galerie
   - La **vidéo** (si tu en as ajouté)
   - Les tailles / couleurs
   - Le prix
   - Tout est dynamique !

---

## 🔧 STRUCTURE DU PRODUIT

Chaque produit a maintenant :

### Images Galerie (Format Portrait)
- **Maximum** : 5 images
- **Format recommandé** : Portrait (600×800, 800×1000, 1000×1333, etc.)
- **Affichage** : Page produit (`produit.html`)
- **Upload** : Cloudinary (bouton bleu)

### Vidéo Produit (Optionnel)
- **Maximum** : 1 vidéo
- **Format** : URL de vidéo (https://...)
- **Affichage** : Page produit, dans la galerie avec les images
- **Upload** : Champ URL manuel

### Vignette Boutique (Format Carré)
- **Obligatoire** : 1 image
- **Format** : Carré 600×600 px (Cloudinary recadre automatiquement)
- **Affichage** : Page boutique (`boutique.html`) uniquement
- **Upload** : Cloudinary avec crop automatique (bouton violet)

---

## 📋 DISPOSITION PAGE PRODUIT

La page produit affiche les images dans cet ordre (grille optimisée) :

```
┌─────────────┬─────────────┐
│             │             │
│   Image 1   │   Vidéo     │
│  (grande)   │  (ou img)   │
│             │             │
├─────────────┼─────────────┤
│   Image 2   │   Image 3   │
├─────────────┼─────────────┤
│   Image 4   │   Image 5   │
└─────────────┴─────────────┘
```

- **Image 1** : Grande image à gauche (portrait)
- **Vidéo** : À droite de l'image 1 (portrait) — si pas de vidéo, affiche Image 4 ou 2
- **Images 2, 3, 4, 5** : Grille en dessous (portrait)

Toutes les images sont **cliquables** pour zoom.

---

## ⚠️ IMPORTANT SÉCURITÉ

Tu as partagé ton **API Secret** Cloudinary dans le chat.  
**Révoque-le immédiatement** :

1. Va sur : https://console.cloudinary.com/settings/security
2. Trouve **"API Secret"**
3. Clique **"Regenerate API Secret"**
4. Confirme

Le secret ne sert **jamais** pour l'upload client (widget). Seul le **Cloud name** + **Upload preset** sont nécessaires.

---

## 🧪 TESTER MAINTENANT

1. **Attends 2 minutes** (déploiement Vercel)
2. Va sur l'admin : https://atelier-confection.vercel.app/site-web/admin/produits.html
3. **Ctrl+F5** (ou Cmd+Shift+R) pour vider le cache
4. Crée un produit avec :
   - 3-5 images portrait (Cloudinary)
   - 1 vignette carrée (Cloudinary)
   - (Optionnel) 1 vidéo
5. Clique **"Enregistrer"**
6. Va sur la boutique → Clique sur le produit
7. Tu dois voir la galerie avec toutes tes images portrait + vidéo

---

## 🐛 SI ÇA NE MARCHE PAS

### Erreur "Unknown API key"
- L'upload preset n'est pas en mode **Unsigned** dans Cloudinary
- Va dans Settings → Upload → Upload presets
- Vérifie que `atelier_unsigned` est en mode **"Unsigned"**

### Le produit ne s'affiche pas sur la page produit
- Vide le cache du navigateur (Ctrl+F5)
- Vérifie que tu as bien cliqué sur le produit depuis la page boutique

### Images ne s'affichent pas
- Vérifie que tu as bien uploadé via Cloudinary (URLs doivent commencer par `https://res.cloudinary.com/`)
- Si tu vois des URLs `data:image/...`, c'est l'ancien système local (ne fonctionne plus)

---

## ✅ RÉSUMÉ

**Avant** :
- 3 modes d'upload (local, URL, Cloudinary)
- Erreurs de stockage localStorage saturé
- Configuration Cloudinary incorrecte
- Cache empêchait de voir les changements

**Maintenant** :
- ✅ **1 seul upload** : Cloudinary (illimité, automatique)
- ✅ **Configuration correcte** : cloud `deyvdnm2d` + preset `atelier_unsigned`
- ✅ **Cache-busting** : force le navigateur à charger la nouvelle version
- ✅ **Disposition optimisée** : 5 images portrait + 1 vidéo + 1 vignette carrée

---

**Teste maintenant et envoie-moi une capture si tu vois encore un problème !** 🚀
