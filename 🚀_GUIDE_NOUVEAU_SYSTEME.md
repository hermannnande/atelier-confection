# 🚀 GUIDE DE DÉMARRAGE - NOUVEAU SYSTÈME

## ⚡ **Action Immédiate Required**

### 📝 **Étape 1 : Exécuter la Migration SQL** (2 min)

1. Va sur **Supabase SQL Editor** :
   https://supabase.com/dashboard/project/rgvojiacsitztpdmruss/editor

2. Clique "**New Query**"

3. Copie/colle **TOUT** le fichier :
   ```
   supabase/migrations/20260111000000_add_modeles_table.sql
   ```

4. Clique "**Run**" ▶️

5. Tu devrais voir : ✅ **Success. No rows returned**

---

### 🎨 **Étape 2 : Créer Tes Premiers Modèles** (5 min)

1. Va sur **http://localhost:3000/modeles**

2. Clique "+ **Nouveau Modèle**"

3. **Exemple Modèle 1** :
   ```
   Nom: Robe Africaine
   Catégorie: Robe
   Description: Robe traditionnelle en wax
   Image URL: (optionnel ou colle une URL)
   Prix base: 10000 FCFA
   
   Tailles: Clique sur S, M, L, XL, XXL
   Couleurs: Clique sur Blanc, Rouge, Bleu, Terracotta, Violet
   
   → [Créer]
   ```

4. **Exemple Modèle 2** :
   ```
   Nom: Chemise Wax
   Catégorie: Chemise
   Prix base: 8000 FCFA
   Tailles: S, M, L, XL
   Couleurs: Blanc, Noir, Bleu, Multicolore
   
   → [Créer]
   ```

5. **Exemple Modèle 3** :
   ```
   Nom: Pantalon Classique
   Catégorie: Pantalon
   Prix base: 12000 FCFA
   Tailles: M, L, XL, XXL
   Couleurs: Noir, Gris, Beige, Marron
   
   → [Créer]
   ```

---

### 📦 **Étape 3 : Ajouter au Stock** (5 min)

1. Va sur **http://localhost:3000/stock**

2. Clique "+ **Ajouter au Stock**"

3. **Sélectionne** "Robe Africaine"

4. **Remplis la matrice** :

   ```
   Taille | Couleur     | Quantité | Prix
   ────────────────────────────────────────
   S      | Blanc       | 5        | 10000
   S      | Rouge       | 3        | 10000
   S      | Bleu        | 2        | 10000
   S      | Terracotta  | 0        | 10000  ← Skip (laisse 0)
   M      | Blanc       | 8        | 10000
   M      | Rouge       | 4        | 10000
   M      | Bleu        | 1        | 12000  ← Prix différent
   L      | Blanc       | 2        | 12000
   L      | Rouge       | 0        | 12000  ← Skip
   ...
   ```

5. Clique "**Ajouter au Stock**"

6. ✅ Toutes les variations (quantité > 0) sont ajoutées !

7. **Répète** pour "Chemise Wax" et "Pantalon Classique"

---

### 🛒 **Étape 4 : Créer une Commande** (2 min)

1. Va sur **http://localhost:3000/commandes/nouvelle**

2. **Infos client** :
   ```
   Nom: SERGE
   Contact: 0778004562
   Ville: ABOBO
   ```

3. **Sélectionne modèle** : Clique sur "Robe Africaine"

4. **ADMIRE LA MATRICE** 🎉 :
   ```
        Blanc  Rouge  Bleu  Terracotta
   S    [5]    [3]    [2]   [0]
        10k    10k    10k   —
   
   M    [8]    [4]    [1]   [0]
        10k    10k    12k   —
   
   L    [2]    [0]    [0]   [0]
        12k    —      —     —
   ```

5. **Clique** sur M × Blanc → Cellule devient **VERTE**

6. **Résumé** s'affiche :
   ```
   Modèle: Robe Africaine
   Taille: M • Couleur: Blanc
   Prix: 10000 FCFA
   ```

7. Clique "**Créer la commande**"

8. ✅ **Commande créée !**

---

## 🎯 **Navigation Mise à Jour**

### **Menu Administrateur** :
```
📊 Tableau de bord
🛒 Commandes
🎨 Bibliothèque Modèles  ← NOUVEAU !
📦 Stock                 ← Modernisé !
✂️ Atelier - Styliste
👕 Atelier - Couturier
🚚 Livraisons
📈 Performances
👥 Utilisateurs
```

---

## 🎊 **Workflow Global**

```
┌──────────────────────────────────────┐
│ 1️⃣ BIBLIOTHÈQUE MODÈLES              │
│ (Créer une fois)                     │
│                                      │
│ Admin/Gestionnaire crée les modèles  │
│ avec tailles/couleurs disponibles    │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ 2️⃣ STOCK (Variations)                │
│ (Ajouter quantités)                  │
│                                      │
│ Admin/Gestionnaire sélectionne       │
│ modèle et remplit matrice            │
│ quantité × taille × couleur          │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ 3️⃣ COMMANDES                         │
│ (Utiliser le stock)                  │
│                                      │
│ Appelant/Gestionnaire/Admin          │
│ sélectionne modèle puis variation    │
│ exacte dans la matrice interactive   │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ 4️⃣ PRODUCTION & LIVRAISON            │
│ (Workflow existant)                  │
│                                      │
│ Styliste → Couturier → Stock →       │
│ → Livraison → Client                 │
└──────────────────────────────────────┘
```

---

## ✨ **Avantages du Nouveau Système**

| Aspect | Avant | Après |
|--------|-------|-------|
| **Création modèle** | À chaque ajout stock | 1 fois dans bibliothèque |
| **Cohérence noms** | Risque typo | Toujours identique |
| **Ajout stock** | 1 variation à la fois | Toutes variations en batch |
| **Visibilité stock** | Liste plate | Matrice interactive |
| **Création commande** | Saisie libre | Sélection avec stock visible |
| **Erreurs** | Possibles (typo, dispo) | Impossibles (guidé) |
| **Temps** | 5 min par variation | 30 sec pour tout |
| **Design** | Standard | Ultra-premium 2026 |

---

## 🎉 **C'EST PRÊT !**

### **📝 TO-DO IMMÉDIAT** :

1. ✅ Exécuter migration SQL (2 min)
2. ✅ Aller sur `/modeles` et créer 3-5 modèles
3. ✅ Aller sur `/stock` et ajouter variations
4. ✅ Tester `/commandes/nouvelle` avec la matrice

---

## 🆘 **Besoin d'Aide ?**

Si tu as une erreur ou besoin d'assistance :
- Copie le message d'erreur exact
- Indique sur quelle page tu es
- Dis-moi ce que tu as fait

**Je suis là pour t'aider ! 🚀**
