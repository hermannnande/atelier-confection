# 📐 DIMENSIONS BANNIÈRE PLEINE LARGEUR

## ✅ Modifications appliquées

La bannière "Style Event" prend maintenant **toute la largeur** de l'écran !

---

## 🖼️ **Dimensions d'image recommandées**

### Pour la bannière "Style Event" (pleine largeur)

#### 📏 Dimensions optimales
- **Largeur** : **1920px** (minimum)
- **Hauteur** : **500px à 600px**
- **Ratio** : **16:5** ou **3.2:1** (format bannière horizontale)

#### 📐 Exemples de dimensions
1. **1920 x 500px** ⭐ Recommandé (ratio 3.84:1)
2. **1920 x 600px** (ratio 3.2:1)
3. **2400 x 600px** (pour haute résolution)
4. **2560 x 640px** (pour écrans 4K)

---

## 🎨 **Conseils pour créer/modifier votre bannière**

### Option 1 : Canva (gratuit)
1. Créer un nouveau design
2. Dimensions personnalisées : **1920 x 500px**
3. Ajouter votre image/design
4. Exporter en PNG ou JPG (qualité maximale)

### Option 2 : Photoshop/GIMP
1. Nouveau document : **1920 x 500px**, 72 DPI
2. Créer votre composition
3. Exporter pour le web (qualité 80-90%)

### Option 3 : Redimensionner une image existante
**Sites gratuits :**
- https://www.iloveimg.com/fr/redimensionner-image
- https://www.resizepixel.com/fr/
- https://imageresizer.com/

**Paramètres :**
- Largeur : 1920px
- Hauteur : 500px ou 600px
- Mode : "Remplir" ou "Cover" (pour éviter la déformation)

---

## 🔧 **Ce qui a été modifié dans le code**

### HTML (`index.html`)
```html
<!-- Ajout de la classe "full-width-banner" -->
<a class="category-card full-width-banner" id="categorie-style-event">
```

### CSS (`style.css`)
```css
/* Bannière prend toute la largeur de la grille */
.category-card.full-width-banner {
  grid-column: 1 / -1;  /* Occupe toutes les colonnes */
  min-height: 400px;
  max-height: 600px;
}

/* Image en mode "cover" pour remplir tout l'espace */
.category-card.full-width-banner img {
  object-fit: cover;
  object-position: center;
}

/* Version mobile */
@media (max-width: 760px) {
  .category-card.full-width-banner {
    min-height: 300px;
  }
}
```

---

## 📊 **Comparaison : Avant / Après**

### ❌ Avant
- Bannière dans une grille avec 2-4 colonnes
- Largeur limitée à environ 380-500px
- Image compressée sur les côtés

### ✅ Après
- Bannière occupe **100% de la largeur** disponible
- S'adapte automatiquement à la taille de l'écran
- Image en "cover" (remplit tout l'espace)
- Hauteur optimisée (400-600px)

---

## 🌐 **Résultat sur différentes tailles d'écran**

### 💻 Desktop (> 1920px)
- Largeur : 100% (max 1600px par la grille)
- Hauteur : 400-600px
- ✅ Bannière pleine largeur

### 💻 Desktop standard (1366-1920px)
- Largeur : 100% de l'écran
- Hauteur : 400-600px
- ✅ Parfait

### 📱 Tablette (768-1024px)
- Largeur : 100% de l'écran
- Hauteur : 400px
- ✅ Adapté

### 📱 Mobile (< 768px)
- Largeur : 100% de l'écran
- Hauteur : 300px
- ✅ Optimisé

---

## 🎯 **Pour remplacer votre image actuelle**

### Image actuelle
```
https://obrille.com/wp-content/uploads/2026/01/ChatGPT-Image-19-janv.-2026-19_06_20.png
```

### Pour la remplacer
1. Préparez votre nouvelle image (1920 x 500px)
2. Uploadez-la sur votre serveur
3. Remplacez l'URL dans `index.html` ligne 142

---

## 💡 **Conseils de design**

### ✅ À faire
- Utiliser des images haute qualité (1920px minimum)
- Ratio horizontal (16:5 ou 3:1)
- Texte lisible si présent sur l'image
- Optimiser le poids (< 500 Ko si possible)
- Format : JPG (photos) ou PNG (graphiques)

### ❌ À éviter
- Images trop petites (< 1920px de large)
- Ratio vertical ou carré
- Poids trop lourd (> 2 Mo)
- Texte trop petit sur l'image

---

## 📦 **Outils gratuits recommandés**

### Pour créer des bannières
1. **Canva** - https://www.canva.com/ (gratuit)
2. **Photopea** - https://www.photopea.com/ (Photoshop en ligne gratuit)
3. **GIMP** - https://www.gimp.org/ (gratuit, à télécharger)

### Pour optimiser le poids
1. **TinyPNG** - https://tinypng.com/ (compression PNG/JPG)
2. **Squoosh** - https://squoosh.app/ (Google)
3. **Compressor.io** - https://compressor.io/

### Pour générer avec AI
1. **DALL-E** (ChatGPT Plus)
2. **Midjourney** 
3. **Leonardo.ai** (gratuit avec limite)

**Prompt exemple :**
> "Create a wide horizontal fashion banner image, 1920x500px, elegant women clothing, modern style, professional photography, studio lighting --ar 3.84:1"

---

## 🚀 **Vérifier le résultat**

Actualisez la page : **http://localhost:8080**

La bannière "Style Event" devrait maintenant **prendre toute la largeur** de l'écran !

---

## ✅ **Résumé rapide**

| Élément | Valeur |
|---------|--------|
| **Largeur image** | 1920px minimum |
| **Hauteur image** | 500-600px |
| **Ratio** | 16:5 (3.2:1) |
| **Format** | JPG ou PNG |
| **Poids max** | 500 Ko recommandé |
| **Classe CSS** | `full-width-banner` |
| **Comportement** | Pleine largeur responsive |

---

**✨ La bannière est maintenant configurée pour prendre toute la largeur !**

Rechargez votre page pour voir le changement.
