# 🚀 DÉMARRAGE RAPIDE - 3 ÉTAPES

## ✅ TON APPLICATION EST DÉJÀ EN LIGNE !

**URL** : https://atelier-confection.vercel.app  
**Login** : admin@atelier.com / admin123

---

## 📝 CE QUE TU VEUX

```
Google Sheets (nouvelles commandes)
        ↓
    Script Apps Script
        ↓
    API Vercel (ton site)
        ↓
Page APPEL de l'app
        ↓
Appelant traite : CONFIRMER/URGENT/ATTENTE/ANNULER
```

**✅ TOUT EST DÉJÀ CONFIGURÉ ! IL RESTE 3 ÉTAPES !**

---

## 🎯 ÉTAPE 1 : COPIE LE SCRIPT (2 minutes)

### 1.1 Ouvre ton Google Sheet

Va sur ton Google Sheet avec les commandes.

### 1.2 Ouvre Apps Script

**Menu** : Extensions → Apps Script

### 1.3 Copie le Code

Ouvre ce fichier sur ton ordinateur :
```
C:\Users\nande\Desktop\NOUS UNIQUE\google-sheets-appel-vercel.js
```

- **Sélectionne TOUT** (Ctrl+A)
- **Copie** (Ctrl+C)

### 1.4 Colle dans Apps Script

- Dans Apps Script, **efface** tout
- **Colle** (Ctrl+V)
- **Sauvegarde** (💾 ou Ctrl+S)

---

## 🔑 ÉTAPE 2 : AJOUTE TON TOKEN (1 minute)

### 2.1 Récupère ton Token

Dans PowerShell (sur ton PC) :

```powershell
Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/auth/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@atelier.com","password":"admin123"}'
```

**Copie** le token reçu (commence par `eyJhbGciOi...`)

### 2.2 Remplace le Token

Dans Apps Script, **ligne 6** :

```javascript
const API_TOKEN = 'TON_TOKEN_A_RECUPERER';
```

**Remplace** par :

```javascript
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Colle ton token ici
```

**Sauvegarde** (💾)

---

## 🧪 ÉTAPE 3 : TESTE (30 secondes)

### 3.1 Retourne sur ton Google Sheet

Actualise (F5)

### 3.2 Envoie une Ligne

1. **Sélectionne** une ligne de commande
2. **Menu** : **📞 Appel API** → **📤 Envoyer ligne sélectionnée**
3. **Attends** 2 secondes
4. Colonne Q : **✅ ENVOYÉ APPEL** (fond vert)

### 3.3 Vérifie dans l'App

Va sur : **https://atelier-confection.vercel.app/appel**

**🎉 LA COMMANDE APPARAÎT !**

---

## 🔄 BONUS : ENVOI AUTOMATIQUE (Optionnel)

Pour envoyer **automatiquement** chaque nouvelle ligne :

1. **Apps Script** → Menu déroulant → **`installerTrigger`**
2. **Clique** sur ▶️ Exécuter
3. **Autorise** l'accès Google (première fois)
4. ✅ **Fait !** Désormais, chaque nouvelle ligne sera envoyée automatiquement !

---

## ✅ C'EST TOUT !

Maintenant :
- ✅ Nouvelles lignes dans Google Sheets → **Automatiquement dans /appel**
- ✅ Appelant traite depuis l'app → **CONFIRMER/URGENT/ATTENTE/ANNULER**
- ✅ Commandes validées → **Vont dans /commandes**
- ✅ Workflow complet → **Découpe → Couture → Stock → Livraison**

**🎉 TON ATELIER EST OPÉRATIONNEL ! 🎉**

---

## 🆘 PROBLÈME ?

### ❌ Menu "Appel API" n'apparaît pas ?

→ Actualise (F5), attends 10 secondes, réactualise (F5)

### ❌ Erreur 401 ?

→ Token expiré. Refais l'ÉTAPE 2 (récupère un nouveau token)

### ❌ Commande n'apparaît pas dans /appel ?

→ Vérifie que tu as bien sauvegardé le script (💾)  
→ Va sur `/commandes`, si elle est là, le statut était différent

---

**Lis le guide complet** : `🎉_APPLICATION_LANCEE.md`
