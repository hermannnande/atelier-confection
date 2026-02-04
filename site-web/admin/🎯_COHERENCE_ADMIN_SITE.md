# 🎯 Cohérence Admin ↔ Site - Atelier Confection

## ✅ SYSTÈME COMPLET ET COHÉRENT

Votre panneau admin est maintenant **100% cohérent** avec le site public !

---

## 📸 Gestion des Images - Structure Claire

### Page Produit (Détail)
**5 images PORTRAIT + 1 vidéo**
- Format recommandé : 600×800, 800×1000, 900×1200, etc.
- Ratio portrait (3:4 ou similaire)
- Affichées dans la galerie sur `pages/produit.html`

### Page Boutique (Liste)
**1 image CARRÉE 600×600**
- Format obligatoire : 600 × 600 pixels
- Ratio 1:1 (carré)
- Affichée dans la grille sur `pages/boutique.html`

---

## 🎛️ Dans l'Admin - 3 Sections Séparées

### 1. 📸 Images Galerie Produit (Portrait)
```
Section : "📸 Images Galerie Produit (Format Portrait)"
Format : Portrait
Nombre : 1 à 5 images
Utilisation : Page détail du produit
```

**Comment ajouter** :
- **Option 1** : Cliquez sur la zone → Sélectionnez fichiers (max 5)
- **Option 2** : Collez une URL → Cliquez "Ajouter URL Image"

**Compteur** : "Vous pouvez ajouter encore X image(s)"

### 2. 🎥 Vidéo Produit (Optionnel)
```
Section : "🎥 Vidéo Produit (Optionnel)"
Format : MP4, WebM, etc.
Nombre : 1 vidéo maximum
Utilisation : Page détail du produit (dans la galerie)
```

**Comment ajouter** :
- Collez l'URL de la vidéo → Cliquez "Ajouter Vidéo"

### 3. 🔲 Vignette Boutique 600×600 (CARRÉ)
```
Section : "🔲 Vignette Boutique 600×600 (CARRÉ)"
Format : CARRÉ 600 × 600 px OBLIGATOIRE
Nombre : 1 image exactement
Utilisation : Page boutique (grille produits)
```

**Comment ajouter** :
- **Option 1** : Cliquez sur la zone → Upload image 600×600
- **Option 2** : Collez une URL → Cliquez "Ajouter URL Vignette"

**Validation** : L'admin vérifie automatiquement que l'image fait bien 600×600 pixels. Si ce n'est pas le cas, elle est refusée avec un message d'erreur.

---

## 🎨 Gestion des Tailles et Couleurs

### Dans l'Admin
```
Tailles : S, M, L, XL (séparées par virgule)
Couleurs : Noir, Blanc, Beige, Marron, Bleu (séparées par virgule)
```

### Sur le Site
**Page Produit** :
- Boutons de tailles cliquables
- Cercles de couleurs cliquables
- Sélection obligatoire avant ajout au panier

**Page Boutique** :
- Points de couleurs affichés sous chaque produit
- Filtre par couleur fonctionnel

---

## 🔄 Synchronisation Automatique

### Produits Admin → Site

Quand vous ajoutez un produit dans l'admin :

1. **Sauvegarde LocalStorage** : `atelier-admin-products`
2. **Page Boutique** : Lit automatiquement `atelier-admin-products`
3. **Affichage automatique** : Les produits apparaissent sans rafraîchir

### Catégories Admin → Site

Quand vous créez une catégorie dans l'admin :

1. **Sauvegarde LocalStorage** : `atelier-admin-categories`
2. **Filtre Boutique** : Se remplit automatiquement avec vos catégories
3. **Affichage** : Les noms de catégories s'affichent correctement

---

## 📊 Structure des Données Produit

```json
{
  "id": "robe-elegante-satin",
  "name": "Robe Élégante Satin",
  "category": "elegant",
  "price": 45000,
  "originalPrice": 60000,
  "stock": 15,
  "description": "Robe élégante en tissu premium...",
  "sizes": ["S", "M", "L", "XL"],
  "colors": ["Noir", "Blanc", "Beige"],
  "images": [
    "url-image-portrait-1.jpg",
    "url-image-portrait-2.jpg",
    "url-image-portrait-3.jpg",
    "url-image-portrait-4.jpg",
    "url-image-portrait-5.jpg"
  ],
  "video": "url-video-produit.mp4",
  "thumbnail": "url-vignette-600x600.jpg",
  "createdAt": "2026-01-25T...",
  "updatedAt": "2026-01-25T..."
}
```

---

## 🖼️ Ratios d'Images

### Page Boutique (boutique.css)
```css
.product-image {
  padding-bottom: 100%; /* Ratio 1:1 pour vignette 600×600 */
}
```

### Page Produit (produit.css)
```css
.gallery-item {
  aspect-ratio: 3/4; /* Portrait pour galerie */
}
```

---

## ✅ Checklist Ajout Produit

Avant de cliquer "Enregistrer" :

- [ ] **Nom du produit** ✓
- [ ] **Catégorie** ✓
- [ ] **Prix** ✓
- [ ] **Stock** ✓
- [ ] **Description** ✓
- [ ] **Tailles** (ex: S, M, L, XL) ✓
- [ ] **Couleurs** (ex: Noir, Blanc, Beige) ✓
- [ ] **Images galerie** (1 à 5 images portrait) ✓
- [ ] **Vidéo** (optionnel) ⚪
- [ ] **Vignette boutique** (1 image 600×600 OBLIGATOIRE) ✓

---

## 🎯 Workflow Recommandé

### Pour ajouter un nouveau produit :

1. **Préparez vos visuels** :
   - 5 photos du produit (format portrait)
   - 1 vidéo (optionnel)
   - 1 image carrée 600×600 pour la boutique

2. **Connectez-vous à l'admin** :
   - `site-web/admin/index.html`
   - Login : `admin` / `admin123`

3. **Cliquez "Nouveau Produit"**

4. **Remplissez le formulaire** :
   - Informations de base
   - Tailles et couleurs
   - **Images galerie** (portrait, max 5)
   - **Vidéo** (si vous en avez une)
   - **Vignette boutique** (600×600 OBLIGATOIRE)

5. **Enregistrez**

6. **Vérifiez sur le site** :
   - Boutique : La vignette 600×600 s'affiche
   - Produit : Les 5 images + vidéo s'affichent

---

## 🔍 Où Trouver des Images 600×600

### Sites gratuits :
- **Unsplash** : https://unsplash.com/
  - Recherchez votre produit
  - Téléchargez l'image
  - Redimensionnez à 600×600 (avec Photoshop, Canva, etc.)

- **Canva** : https://canva.com/
  - Créez un design 600×600
  - Téléchargez

- **Photopea** : https://photopea.com/ (Photoshop gratuit en ligne)
  - Redimensionnez vos images à 600×600

### Outils de redimensionnement :
- **ImageResizer.com** : https://imageresizer.com/
- **iLoveIMG** : https://www.iloveimg.com/fr/redimensionner-image

---

## 🛠️ Maintenance

### Modifier un produit existant
1. Allez dans "Produits"
2. Cliquez sur l'icône **crayon** ✏️
3. Modifiez ce que vous voulez
4. Enregistrez

### Changer la vignette boutique
1. Éditez le produit
2. Supprimez l'ancienne vignette (cliquez ×)
3. Ajoutez la nouvelle (600×600)
4. Enregistrez

### Ajouter/Supprimer des images galerie
1. Éditez le produit
2. Supprimez les images non désirées (cliquez ×)
3. Ajoutez-en de nouvelles (max 5 au total)
4. Enregistrez

---

## 🐛 Résolution de Problèmes

### "Mon produit n'apparaît pas sur la boutique"
✅ **Vérifiez** :
- Avez-vous ajouté la vignette 600×600 ?
- Le stock est-il > 0 ?
- Avez-vous rafraîchi la page ? (Ctrl+F5)

### "Je ne peux pas ajouter la vignette 600×600"
✅ **Vérifiez** :
- L'image fait-elle vraiment 600×600 pixels ?
- Utilisez un outil de redimensionnement si nécessaire

### "Les couleurs ne s'affichent pas correctement"
✅ **Utilisez ces noms** :
- Noir, Blanc, Beige, Marron, Bleu, Bleu Ciel, Rouge, Rose, Vert, Jaune, Gris, Gris Foncé

### "La vidéo ne marche pas"
✅ **Vérifiez** :
- L'URL est-elle correcte ?
- La vidéo est-elle accessible publiquement ?
- Format MP4 recommandé

---

## 📋 Récapitulatif Technique

### LocalStorage Keys
```
atelier-admin-products      → Produits admin
atelier-admin-categories    → Catégories admin
atelier-admin-orders        → Commandes admin
atelier-admin-settings      → Paramètres admin
```

### Synchronisation
- **Boutique** : Lit `atelier-admin-products` et affiche les produits
- **Filtres** : Lit `atelier-admin-categories` pour le filtre catégories
- **Commandes** : Synchronisées avec `orders` du site public

### Fichiers Modifiés
```
✅ site-web/admin/produits.html         → Formulaire complet
✅ site-web/admin/js/products-manager.js → Gestion images/vidéo
✅ site-web/js/boutique.js              → Lecture produits admin
✅ site-web/css/boutique.css            → Ratio 1:1 pour vignettes
```

---

## 🎉 Résumé

Vous avez maintenant un système **cohérent et professionnel** :

✅ **Admin** : 3 types d'uploads distincts (galerie portrait, vidéo, vignette carrée)
✅ **Boutique** : Affichage carré 600×600
✅ **Produit** : Galerie portrait + vidéo
✅ **Validation** : Format 600×600 vérifié automatiquement
✅ **Synchronisation** : Automatique entre admin et site
✅ **Tailles/Couleurs** : Gestion complète et cohérente

---

**Tout est prêt ! Vous pouvez ajouter vos produits ! 🚀**

*Date : 25 Janvier 2026*
