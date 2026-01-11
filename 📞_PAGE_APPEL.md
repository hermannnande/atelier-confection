# 📞 PAGE APPEL - GESTION DES NOUVELLES COMMANDES

## ✨ **Système Complet**

```
Google Sheets
    ↓ (webhook/script)
📞 PAGE APPEL (statut: en_attente_validation)
    ↓
┌─────────────────────────────────────┐
│ [✅ CONFIRMER]  → COMMANDES         │
│ [🚨 URGENT]     → COMMANDES (urgent)│
│ [⏰ EN ATTENTE] → Reste dans APPEL  │
│ [❌ ANNULER]    → Supprimée         │
└─────────────────────────────────────┘
```

---

## 🎯 **Workflow**

### **1️⃣ Nouvelle Commande (Google Sheets)**

Quand une commande arrive de Google Sheets:
```javascript
POST /api/commandes
{
  "nomClient": "Nipié Jemima",
  "contactClient": "788714889",
  "ville": "Blanc",
  "modele": "Robe Volante",
  "taille": "2XL",
  "couleur": "Blanc",
  "prix": 11000,
  "statut": "en_attente_validation"  // 🔑 Important !
}
```

---

### **2️⃣ Page Appel (`/appel`)**

L'**appelant** voit toutes les commandes `en_attente_validation`:

```
┌──────────────────────────────────────────────┐
│ 📞 Appels à Traiter            En attente: 5 │
├──────────────────────────────────────────────┤
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ #789ABC  📞 En attente d'appel       │   │
│ │ 11 janv. 2026 14:30                  │   │
│ │                                      │   │
│ │ 👤 Nipié Jemima                      │   │
│ │ 📱 788714889                          │   │
│ │ 📍 Blanc                             │   │
│ │                                      │   │
│ │ 📦 Robe Volante - 2XL - Blanc       │   │
│ │ 💰 11000 F                           │   │
│ │                                      │   │
│ │ Actions:                             │   │
│ │ [✅ CONFIRMER]                       │   │
│ │ [🚨 URGENT]                          │   │
│ │ [⏰ EN ATTENTE]                      │   │
│ │ [❌ ANNULER]                         │   │
│ └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

---

### **3️⃣ Actions**

#### **✅ CONFIRMER**
```javascript
PUT /api/commandes/:id
{
  "statut": "confirmee"
}

→ Commande envoyée dans /commandes
→ Retirée de /appel
→ Toast: "Commande confirmée et envoyée aux commandes !"
```

#### **🚨 URGENT**
```javascript
PUT /api/commandes/:id
{
  "statut": "confirmee",
  "urgent": true
}

→ Commande envoyée dans /commandes avec flag URGENT
→ Retirée de /appel
→ Toast: "Commande marquée URGENTE et envoyée aux commandes !"
```

#### **⏰ EN ATTENTE**
```javascript
PUT /api/commandes/:id
{
  "statut": "en_attente_paiement"
}

→ Commande RESTE dans /appel
→ Badge change: "📞 En attente" → "⏰ Paiement attendu"
→ Toast: "Commande mise en attente"
```

#### **❌ ANNULER**
```javascript
PUT /api/commandes/:id
{
  "statut": "annulee"
}

→ Commande RETIRÉE de /appel
→ Supprimée de la liste (mais gardée en DB)
→ Toast: "Commande annulée"
→ Confirmation: "Êtes-vous sûr ?"
```

---

## 🔗 **Intégration Google Sheets**

### **Script Apps Script (Google Sheets)**

```javascript
// Script Google Sheets pour envoyer les nouvelles lignes
function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = e.range.getRow();
  
  // Récupérer les données de la ligne
  const data = {
    nomClient: sheet.getRange(row, 3).getValue(),      // Colonne C
    contactClient: sheet.getRange(row, 4).getValue(),  // Colonne D
    ville: sheet.getRange(row, 12).getValue(),         // Colonne L
    modele: sheet.getRange(row, 6).getValue(),         // Colonne F
    taille: sheet.getRange(row, 8).getValue(),         // Colonne H
    couleur: sheet.getRange(row, 11).getValue(),       // Colonne K
    prix: sheet.getRange(row, 13).getValue(),          // Colonne M
    statut: 'en_attente_validation',                   // 🔑 Important !
    note: 'Importé depuis Google Sheets'
  };
  
  // Envoyer à ton API
  const url = 'https://ton-api.com/api/commandes'; // ⚠️ À adapter
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer TON_TOKEN_ADMIN' // ⚠️ Token admin
    },
    payload: JSON.stringify(data)
  };
  
  try {
    UrlFetchApp.fetch(url, options);
    // Marquer comme envoyé
    sheet.getRange(row, 1).setValue('ENVOYÉ'); // Colonne A
  } catch (error) {
    Logger.log('Erreur: ' + error);
    sheet.getRange(row, 1).setValue('ERREUR'); // Colonne A
  }
}

// Installer un trigger
function createTrigger() {
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
}
```

### **Configuration du Trigger**

1. Dans Google Sheets: **Extensions** → **Apps Script**
2. Colle le script ci-dessus
3. Adapte les numéros de colonnes selon ton sheet
4. Ajoute ton URL API et token
5. **Exécuter** `createTrigger()` une fois
6. Autorise les permissions

---

## 📋 **Backend - Routes**

### **Récupérer Appels**
```javascript
GET /api/commandes?statut=en_attente_validation

Headers:
  Authorization: Bearer <token>

Response:
{
  "commandes": [
    {
      "id": "...",
      "numeroCommande": "CMD-2026-001",
      "nomClient": "Nipié Jemima",
      "contactClient": "788714889",
      "ville": "Blanc",
      "modele": "Robe Volante",
      "taille": "2XL",
      "couleur": "Blanc",
      "prix": 11000,
      "statut": "en_attente_validation",
      "created_at": "2026-01-11T..."
    },
    ...
  ]
}
```

### **Traiter un Appel**
```javascript
PUT /api/commandes/:id

Headers:
  Authorization: Bearer <token>

Body:
{
  "statut": "confirmee",  // ou "annulee", "en_attente_paiement"
  "urgent": true          // (optionnel, si urgent)
}

Response:
{
  "message": "Commande mise à jour",
  "commande": { ... }
}
```

---

## 🎨 **Interface Visuelle**

### **Header**
```
┌──────────────────────────────────────┐
│ 📞 Appels à Traiter                  │
│ Nouvelles commandes en attente       │
│                        En attente: 5 │
└──────────────────────────────────────┘
```

### **Instructions**
```
ℹ️ Actions disponibles:
✅ CONFIRMER   → Envoyée aux commandes
🚨 URGENT      → Priorité aux commandes
⏰ EN ATTENTE  → Reste dans appel
❌ ANNULER     → Supprimée
```

### **Card Commande**
```
┌────────────────────────────────────┐
│ #789ABC   📞 En attente d'appel    │
│ 11 janv. 2026 14:30                │
│                                    │
│ [Info Client]                      │
│ 👤 Nipié Jemima                    │
│ 📱 788714889                       │
│ 📍 Blanc                          │
│                                    │
│ [Détails Commande]                 │
│ 📦 Robe Volante                    │
│ 📏 2XL  🎨 Blanc                  │
│ 💰 11000 F                         │
│                                    │
│ [Actions]                          │
│ [✅ CONFIRMER]                     │
│ [🚨 URGENT]                        │
│ [⏰ EN ATTENTE]                    │
│ [❌ ANNULER]                       │
└────────────────────────────────────┘
```

---

## 🔐 **Permissions**

**Qui peut accéder à /appel ?**
- ✅ **Administrateur**
- ✅ **Gestionnaire**
- ✅ **Appelant**
- ❌ Autres rôles

---

## 📊 **États des Commandes**

```
en_attente_validation
    ↓
┌────────────┬───────────┬────────────┬──────────┐
│ CONFIRMER  │  URGENT   │ EN ATTENTE │ ANNULER  │
├────────────┼───────────┼────────────┼──────────┤
│confirmee   │confirmee  │en_attente_ │annulee   │
│            │+urgent    │paiement    │          │
└────────────┴───────────┴────────────┴──────────┘
    ↓             ↓            ↓            ↓
COMMANDES    COMMANDES     APPEL       SUPPRIMÉE
```

---

## 🎉 **C'EST PRÊT !**

### **Pour Tester:**

1. **Execute la migration:**
   ```sql
   -- Supabase SQL Editor
   supabase/migrations/20260111000001_add_appel_statuts.sql
   ```

2. **Crée une commande test:**
   ```javascript
   POST /api/commandes
   {
     "nomClient": "Test Client",
     "contactClient": "0612345678",
     "ville": "Abidjan",
     "modele": "Robe Test",
     "taille": "M",
     "couleur": "Blanc",
     "prix": 10000,
     "statut": "en_attente_validation"
   }
   ```

3. **Va sur `/appel`** → Tu verras la commande !

4. **Clique les boutons** → Teste chaque action

---

## 🚀 **Prochaines Étapes**

1. ✅ Migration SQL exécutée
2. ✅ Page Appel créée
3. ✅ Routes configurées
4. 🔄 **Configurer Google Sheets webhook**
5. 🔄 **Tester le flux complet**

**Ton système d'appel est maintenant opérationnel ! 📞✨**
