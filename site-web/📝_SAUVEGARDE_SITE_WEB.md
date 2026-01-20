# 📝 Sauvegarde Site Web E-commerce - Atelier Confection

**Date de sauvegarde** : 19 janvier 2026  
**Statut** : ✅ Site fonctionnel en local

---

## 🎯 Objectif du Site

Créer un **site e-commerce professionnel** pour permettre aux clients de passer des commandes qui apparaîtront automatiquement dans le système de gestion (page `/appel`) sans modifier le fonctionnement actuel.

---

## 📂 Structure du Site

```
site-web/
├── index.html              (Page d'accueil)
├── css/
│   └── style.css          (Styles professionnels)
├── js/
│   └── main.js            (Interactions)
├── images/                (Dossier pour images locales)
└── pages/                 (Pages futures)
```

---

## ✨ Fonctionnalités Actuelles

### 1. **Barre d'annonce** (Haut de page)
- Fond noir avec dégradé élégant
- Message : "⭐ -20% sur votre première commande"
- Icône SVG en blanc
- Animation slide-down au chargement

### 2. **Header avec menu** (Fixe)
- **Logo animé** : Change de couleur (Noir → Blanc → Or) en boucle
- **Menu centré** : Accueil, Produits, Collection, Contact
- **Icônes actions** : Recherche, Favoris, Panier
- **Animations d'entrée** :
  - Header descend du haut
  - Logo glisse depuis la gauche
  - Menu apparaît lien par lien
  - Icônes glissent depuis la droite
- **Scroll effect** : Fond blanc + ombre quand on scrolle

### 3. **Bannière Hero Vidéo** (Plein écran)
- Vidéo Adidas en lecture automatique
- Overlay quasi-transparent (vidéo bien visible)
- **Contenu** :
  - Tag "Collection Atelier"
  - Titre : "Elegance sur mesure pour chaque jour"
  - Sous-titre descriptif
  - **2 boutons animés** :
    - "Découvrir" (noir) → Bouge gauche-droite
    - "Voir la collection" (transparent) → Bouge droite-gauche
- **Animations** : Tous les éléments montent progressivement

### 4. **Section Catégories** (4 catégories)
- **Catégories** :
  1. Elegant
  2. Perle Rare
  3. Perle Unique
  4. Style Event

- **Design** :
  - Images grandes (550px × 380px minimum)
  - Bordures arrondies (20px)
  - Overlay noir avec dégradé
  - Bouton "Voir plus →" apparaît au hover
  - Effet zoom sur l'image au hover
  - Carte se lève au hover

- **Animations au scroll** :
  - Cartes 1 et 3 : Arrivent de la gauche
  - Cartes 2 et 4 : Arrivent de la droite
  - Délai de 150ms entre chaque carte
  - Intersection Observer pour déclenchement

### 5. **Bannière Promotionnelle** (Pleine largeur)
- Image : https://a.lovart.ai/artifacts/agent/H99LNgNEGUcbV0rK.png
- **Pleine largeur** (pas de padding, comme la vidéo hero)
- Hauteur : 850px
- Bouton "Découvrir" avec :
  - Style : Blanc avec bordure noire
  - Icône flèche →
  - Hover : Devient noir avec texte blanc
  - Animation : Glisse vers la droite

---

## 🎨 Design System

### **Couleurs principales** :
- Noir : `#000`
- Blanc : `#fff`
- Or : `#d4af37`
- Gris : `#666`, `#999`

### **Typographie** :
- Police : `Inter`, `Segoe UI`, `system-ui`
- Poids : 600, 700, 800, 900
- Tailles : Responsive avec `clamp()`

### **Animations** :
- Durée : 0.3s - 1s
- Timing : `ease`, `ease-in-out`, `cubic-bezier(0.4, 0, 0.2, 1)`
- Effets : slide, fade, scale, translate

### **Responsive** :
- Mobile : < 760px
- Tablette : 760px - 960px
- Desktop : > 960px

---

## 🔗 Intégration avec le Système Existant

### **Comment ça fonctionnera** :
1. Client visite le site e-commerce
2. Client sélectionne un produit (catégorie)
3. Client remplit le formulaire de commande
4. La commande est envoyée via l'API : `POST /api/commandes`
5. **La commande apparaît automatiquement** sur `/appel` dans le système de gestion
6. Les appelants traitent la commande normalement

### **API à utiliser** :
```javascript
// Endpoint existant (déjà fonctionnel)
POST /api/commandes
{
  "client": {
    "nom": "...",
    "contact": "...",
    "ville": "..."
  },
  "modele": {
    "nom": "...",
    "image": "...",
    "description": "..."
  },
  "taille": "L",
  "couleur": "Noir",
  "prix": 15000,
  "urgence": false,
  "noteAppelant": "Commande depuis le site web"
}
```

---

## 🚀 Lancement Local

### **Serveur actuel** :
```bash
cd C:\Users\nande\Desktop\atelier-confection\site-web
npx http-server -p 5175
```

**URL locale** : http://127.0.0.1:5175

### **Arrêter le serveur** :
Ctrl + C dans le terminal

---

## 📋 Prochaines Étapes

### **À faire** :
1. [ ] Créer les pages de catégories (Elegant, Perle Rare, etc.)
2. [ ] Ajouter une grille de produits pour chaque catégorie
3. [ ] Créer les pages détails produit
4. [ ] Ajouter un système de panier
5. [ ] Créer le formulaire de commande
6. [ ] Intégrer l'API pour envoyer les commandes
7. [ ] Créer la page de confirmation
8. [ ] Ajouter un footer
9. [ ] Optimiser pour SEO
10. [ ] Tester et déployer

---

## 📸 Captures d'Écran / Ressources

### **Images utilisées** :
- **Vidéo hero** : https://brand.assets.adidas.com/video/upload/.../dropset_4_power_training.mp4
- **Catégorie Elegant** : https://obrille.com/wp-content/uploads/2026/01/ChatGPT-Image-19-janv.-2026-18_33_27.png
- **Catégorie Perle Rare** : https://obrille.com/wp-content/uploads/2026/01/B2.png
- **Catégorie Perle Unique** : https://obrille.com/wp-content/uploads/2026/01/ChatGPT-Image-19-janv.-2026-18_52_59.png
- **Catégorie Style Event** : https://obrille.com/wp-content/uploads/2026/01/ChatGPT-Image-19-janv.-2026-19_06_20.png
- **Bannière promo** : https://a.lovart.ai/artifacts/agent/H99LNgNEGUcbV0rK.png

---

## 🎯 Points Forts du Design

### **UI/UX Professionnelle** :
- ✅ Animations fluides et naturelles
- ✅ Effets de hover élégants
- ✅ Responsive design (mobile-first)
- ✅ Performance optimisée (lazy loading)
- ✅ Accessibilité (aria-labels)
- ✅ Design noir et blanc épuré

### **Animations Signature** :
- Logo qui change de couleur en boucle
- Boutons qui flottent en sens opposé
- Catégories qui arrivent de gauche/droite au scroll
- Zoom sur images au hover
- Transitions fluides partout

---

## 🔧 Technologies Utilisées

- **HTML5** : Structure sémantique
- **CSS3** : Animations, Grid, Flexbox
- **JavaScript Vanilla** : Intersection Observer, Scroll effects
- **Lazy Loading** : Optimisation des images
- **SVG** : Icônes vectorielles

---

## 📝 Notes Importantes

1. **Pas de framework** : Site en HTML/CSS/JS pur pour performance maximale
2. **Aucun impact** sur le système existant (dossier séparé)
3. **API existante** : Utilise les endpoints déjà fonctionnels
4. **Design cohérent** : Noir et blanc, élégant, professionnel

---

## 🎉 Statut Actuel

✅ **Étape 1 terminée** : Page d'accueil avec bannière vidéo, catégories et bannière promo  
⏳ **Prochaine étape** : Créer les pages de catégories avec grille de produits

---

**Dernière mise à jour** : 19 janvier 2026 20:30  
**Développeur** : Atelier Confection Team
