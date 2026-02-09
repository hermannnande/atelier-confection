# 👥 ACCÈS PAR RÔLE - SYSTÈME COMPLET

## 🔐 **Matrice des Accès**

### 📊 **Vue d'ensemble**

| Fonctionnalité | Admin | Gestionnaire | Appelant | Styliste | Couturier | Livreur |
|----------------|-------|--------------|----------|----------|-----------|---------|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Commandes** |  |  |  |  |  |  |
| └ Voir liste | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| └ Créer nouvelle | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| └ Modifier | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| └ Voir détails | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Atelier Styliste** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Atelier Couturier** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Stock** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Livraisons** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Performances** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Utilisateurs** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔴 **1. ADMINISTRATEUR** (Accès Total)

### ✅ **Peut accéder à** :
- ✅ Dashboard complet
- ✅ **Commandes** :
  - Voir toutes les commandes
  - Créer nouvelle commande (avec matrice stock)
  - Modifier commandes
  - Annuler commandes
  - Mettre en urgence
- ✅ **Atelier Styliste** :
  - Voir commandes en découpe
  - Marquer découpe terminée
- ✅ **Atelier Couturier** :
  - Voir commandes en couture
  - Marquer couture terminée
- ✅ **Stock** :
  - Voir tout le stock
  - Ajouter articles (avec variations)
  - Gérer mouvements
  - Voir historique
- ✅ **Livraisons** :
  - Assigner livreurs
  - Voir toutes livraisons
  - Gérer retours
- ✅ **Performances** :
  - Voir stats appelants
  - Voir stats couturiers
  - Voir stats livreurs
  - Analytics globales
- ✅ **Utilisateurs** :
  - Créer utilisateurs
  - Modifier utilisateurs
  - Désactiver/Activer
  - Gérer rôles

### 🎯 **Accès rapides Dashboard** :
- 📦 Nouvelle Commande
- 📋 Voir Commandes
- 📊 Gérer le Stock
- 🚚 Livraisons
- 📈 Performances
- 👥 Utilisateurs

---

## 🟠 **2. GESTIONNAIRE** (Supervision)

### ✅ **Peut accéder à** :
- ✅ Dashboard complet
- ✅ **Commandes** : (même que Admin)
  - Voir, créer, modifier toutes commandes
  - **Matrice stock** pour créer commandes
- ✅ **Atelier Styliste** : (supervision)
  - Voir progression découpe
  - Marquer découpe (si besoin)
- ✅ **Atelier Couturier** : (supervision)
  - Voir progression couture
  - Marquer couture (si besoin)
- ✅ **Stock** : (même que Admin)
  - Gestion complète du stock
- ✅ **Livraisons** : (même que Admin)
  - Assigner livreurs
  - Gérer retours
- ✅ **Performances** : (même que Admin)
  - Analytics équipe
- ✅ **Utilisateurs** : (même que Admin)
  - Gérer l'équipe

### 🎯 **Accès rapides Dashboard** :
- 📦 Nouvelle Commande
- 📋 Voir Commandes
- 📊 Gérer le Stock
- 🚚 Livraisons
- 📈 Performances
- 👥 Utilisateurs

---

## 🟡 **3. APPELANT** (Création Commandes)

### ✅ **Peut accéder à** :
- ✅ Dashboard simplifié
- ✅ **Commandes** :
  - Voir ses commandes + toutes
  - **Créer nouvelle commande** (avec matrice stock) ⭐
  - Modifier commandes en attente
  - Ajouter notes
  - Mettre en urgence
- ❌ **Atelier** : Non
- ❌ **Stock** : Non (mais voit stock via matrice)
- ❌ **Livraisons** : Non
- ❌ **Performances** : Non
- ❌ **Utilisateurs** : Non

### 🎯 **Accès rapides Dashboard** :
- 📦 Nouvelle Commande
- 📋 Voir Commandes

### 💡 **Workflow Appelant** :
```
1. Reçoit appel client
   ↓
2. Va sur "Nouvelle Commande"
   ↓
3. Remplit infos client
   ↓
4. Sélectionne modèle
   ↓
5. Voit MATRICE STOCK (taille × couleur) ⭐
   ↓
6. Sélectionne variation exacte disponible
   ↓
7. Ajoute note si besoin
   ↓
8. Crée la commande
   ↓
9. ✅ Commande validée et envoyée à l'atelier !
```

---

## 🟢 **4. STYLISTE** (Découpe)

### ✅ **Peut accéder à** :
- ✅ Dashboard simplifié
- ✅ **Atelier Styliste** :
  - Voir commandes à découper
  - Marquer découpe terminée
  - Voir détails commande (taille, couleur, modèle)
- ✅ **Atelier Couturier** : (lecture seule)
  - Voir commandes en couture
  - Voir détails commande
- ✅ **Détails Commande** : (lecture seule)
  - Voir infos client
  - Voir modèle/taille/couleur
  - Voir notes appelant
- ❌ **Commandes** : Non (sauf détails)
- ❌ **Stock** : Non
- ❌ **Livraisons** : Non
- ❌ **Performances** : Non
- ❌ **Utilisateurs** : Non

### 🎯 **Accès rapides Dashboard** :
- ✂️ Atelier Styliste
- 👕 Atelier Couturier (lecture seule)

---

## 🔵 **5. COUTURIER** (Couture)

### ✅ **Peut accéder à** :
- ✅ Dashboard simplifié
- ✅ **Atelier Couturier** :
  - Voir commandes en couture (après découpe)
  - Marquer couture terminée
  - Voir détails commande
- ✅ **Détails Commande** : (lecture seule)
- ❌ **Commandes** : Non
- ❌ **Stock** : Non
- ❌ **Livraisons** : Non
- ❌ **Performances** : Non
- ❌ **Utilisateurs** : Non

### 🎯 **Accès rapides Dashboard** :
- 👕 Atelier Couturier

---

## 🟣 **6. LIVREUR** (Livraisons)

### ✅ **Peut accéder à** :
- ✅ Dashboard simplifié
- ✅ **Livraisons** :
  - Voir ses livraisons assignées
  - Marquer "Livrée" ou "Refusée"
  - Voir détails commande
  - Voir infos client (nom, contact, ville)
- ✅ **Détails Commande** : (lecture seule)
- ❌ **Commandes** : Non
- ❌ **Stock** : Non
- ❌ **Atelier** : Non
- ❌ **Performances** : Non
- ❌ **Utilisateurs** : Non

### 🎯 **Accès rapides Dashboard** :
- 🚚 Mes Livraisons

---

## 🎯 **FOCUS : Création de Commande avec Matrice**

### **Qui peut créer des commandes ?**
✅ **Administrateur**  
✅ **Gestionnaire**  
✅ **Appelant**  

### **Comment ça marche ?**

#### **1. Accès**
```
Dashboard → "Nouvelle Commande"
ou
Menu → Commandes → "+ Nouvelle"
```

#### **2. Formulaire**
```
┌─────────────────────────────────────┐
│ 📝 Informations Client             │
│ - Nom                               │
│ - Contact                           │
│ - Ville                             │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 🔍 Sélectionner un Modèle           │
│ [Recherche]                         │
│                                     │
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │Robe A│ │Robe B│ │Robe C│         │
│ │18 un.│ │5 un. │ │12 un.│         │
│ └──────┘ └──────┘ └──────┘         │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 📊 MATRICE TAILLE × COULEUR ⭐      │
│                                     │
│      Blanc  Rouge  Bleu             │
│ S    [5]    [3]    [0]  ← Rupture  │
│      10k    10k    —                │
│                                     │
│ M    [8]    [4]    [1]              │
│      10k    10k    12k              │
│                                     │
│ L    [2]    [0]    [3]              │
│      12k    —      14k              │
│                                     │
│ Légende:                            │
│ 🟦 Disponible  🟢 Sélectionné       │
│ ⚪ Rupture                           │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ ✅ Résumé                           │
│ Modèle: Robe A                      │
│ Taille: M • Couleur: Blanc          │
│ Prix: 10000 FCFA                    │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 📝 Options                          │
│ ☑ Urgence                           │
│ Note: ...                           │
└─────────────────────────────────────┘
        ↓
   [Créer la commande]
```

---

## 🎨 **Sidebar Navigation par Rôle**

### **Administrateur voit** :
```
📊 Tableau de bord
🛒 Commandes
✂️ Atelier - Styliste
👕 Atelier - Couturier
📦 Stock
🚚 Livraisons
📈 Performances
👥 Utilisateurs
```

### **Gestionnaire voit** :
```
📊 Tableau de bord
🛒 Commandes
✂️ Atelier - Styliste
👕 Atelier - Couturier
📦 Stock
🚚 Livraisons
📈 Performances
👥 Utilisateurs
```

### **Appelant voit** :
```
📊 Tableau de bord
🛒 Commandes
```

### **Styliste voit** :
```
📊 Tableau de bord
✂️ Atelier - Styliste
👕 Atelier - Couturier
```

### **Couturier voit** :
```
📊 Tableau de bord
👕 Atelier - Couturier
```

### **Livreur voit** :
```
📊 Tableau de bord
🚚 Livraisons
```

---

## 🔑 **Comptes de Test**

| Rôle | Email | Mot de passe | Accès Commandes | Matrice Stock |
|------|-------|--------------|-----------------|---------------|
| Admin | admin@atelier.com | admin123 | ✅ Oui | ✅ Oui |
| Gestionnaire | gestionnaire@atelier.com | admin123 | ✅ Oui | ✅ Oui |
| Appelant | appelant@atelier.com | admin123 | ✅ Oui | ✅ Oui |
| Styliste | styliste@atelier.com | admin123 | ❌ Non | ❌ Non |
| Couturier | couturier@atelier.com | admin123 | ❌ Non | ❌ Non |
| Livreur | livreur@atelier.com | admin123 | ❌ Non | ❌ Non |

---

## ✅ **RÉSUMÉ**

✅ **Admin** = Accès TOTAL (supervision + gestion)  
✅ **Gestionnaire** = Accès TOTAL (même que Admin)  
✅ **Appelant** = **Créer commandes avec MATRICE STOCK** ⭐  
✅ **Styliste** = Découpe uniquement  
✅ **Couturier** = Couture uniquement  
✅ **Livreur** = Livraisons uniquement  

**L'Administrateur a maintenant accès complet à tout, y compris la création de commandes avec la matrice de stock ! 🎉**
