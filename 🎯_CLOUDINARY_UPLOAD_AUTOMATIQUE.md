# 🎯 UPLOAD AUTOMATIQUE CLOUDINARY

## ✅ CE QUI A ÉTÉ FAIT

J'ai intégré l'**upload automatique vers Cloudinary** dans l'admin. Maintenant tu peux uploader tes images directement depuis le formulaire produit, sans copier-coller d'URLs !

---

## 🔑 ÉTAPE 1 : Créer l'Upload Preset (OBLIGATOIRE)

Avant d'utiliser l'upload automatique, tu DOIS créer un "Upload Preset" dans Cloudinary.

### 1️⃣ Va dans Settings Cloudinary
```
https://console.cloudinary.com/settings
```

### 2️⃣ Clique sur "Upload" (menu du haut)

### 3️⃣ Scroll jusqu'à "Upload presets"

### 4️⃣ Clique "Add upload preset"

### 5️⃣ Configure le preset
- **Preset name** : `atelier_unsigned`
- **Signing Mode** : **Unsigned** (IMPORTANT !)
- **Folder** : `atelier-products` (optionnel)
- Laisse le reste par défaut

### 6️⃣ Clique "Save"

---

## 🚀 COMMENT L'UTILISER

### Pour les Images Galerie (Portrait)

1. **Ouvre l'admin** : https://atelier-confection.vercel.app/site-web/admin/produits.html
2. **Clique "Nouveau Produit"**
3. Dans la section "Images Galerie Produit", clique sur le bouton :
   ```
   📤 Uploader Images (Cloudinary)
   ```
4. Un **widget Cloudinary** s'ouvre
5. **Sélectionne tes images** (max 5)
6. Elles s'**uploadent automatiquement**
7. Les **URLs sont ajoutées automatiquement** au produit

### Pour la Vignette 600×600

1. Dans la section "Vignette Boutique 600×600", clique sur :
   ```
   📤 Uploader Vignette 600×600 (Cloudinary)
   ```
2. Un **widget Cloudinary avec crop** s'ouvre
3. **Sélectionne ton image**
4. **Recadre-la** en carré (le widget force le ratio 1:1)
5. Clique **"Done"**
6. L'URL est **ajoutée automatiquement**

---

## ✨ AVANTAGES

✅ **Plus besoin** de copier-coller des URLs  
✅ **Upload direct** depuis ton PC  
✅ **Crop automatique** pour la vignette 600×600  
✅ **Stockage illimité** sur Cloudinary  
✅ **Images optimisées** automatiquement  

---

## 🔄 DÉPLOIEMENT

Les modifications sont prêtes ! Pour les mettre en ligne :

```bash
cd c:\Users\nande\Desktop\atelier-confection-git
git add .
git commit -m "Ajout upload automatique Cloudinary"
git push origin main
```

Vercel redéploiera automatiquement (1-2 minutes).

---

## 🐛 DÉPANNAGE

### "Widget Cloudinary non initialisé"
- Tu as oublié de créer l'upload preset `atelier_unsigned`
- Suis les étapes ci-dessus pour le créer

### "Upload failed"
- Vérifie que l'upload preset est bien en mode **"Unsigned"**
- Vérifie que ton compte Cloudinary est actif

### Les images ne s'ajoutent pas
- Recharge la page admin
- Vide le cache du navigateur (Ctrl+Shift+R)

---

## 📊 CONFIGURATION TECHNIQUE

### Fichiers modifiés
- `site-web/admin/produits.html` : Boutons upload ajoutés
- `site-web/admin/js/cloudinary-upload.js` : Widget Cloudinary
- `site-web/admin/js/products-manager.js` : Intégration des callbacks

### Cloudinary Settings
- **Cloud Name** : `devydnm2d`
- **Upload Preset** : `atelier_unsigned` (à créer)
- **Folders** :
  - Images galerie → `atelier-products/gallery`
  - Vignettes → `atelier-products/thumbnails`

---

## ✅ CHECKLIST

- [ ] Upload preset `atelier_unsigned` créé dans Cloudinary
- [ ] Mode "Unsigned" activé
- [ ] Modifications déployées sur Vercel
- [ ] Test d'upload d'image galerie
- [ ] Test d'upload de vignette 600×600
- [ ] Vérification que le produit s'affiche sur la boutique

---

**Une fois l'upload preset créé, tu pourras uploader tes images en 1 clic !** 🎉
