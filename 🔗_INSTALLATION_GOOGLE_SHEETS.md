# 🚀 INSTALLATION AUTOMATIQUE - GOOGLE SHEETS → PAGE APPEL

## ✅ CE QUI VA SE PASSER

```
1. Tu ajoutes une nouvelle ligne dans Google Sheets
2. Le script détecte automatiquement la nouvelle ligne
3. Le script envoie vers l'API
4. La commande apparaît dans la PAGE "APPEL" de l'app
5. AUCUNE ACTION MANUELLE REQUISE ! ✨
```

---

## 📝 INSTALLATION (3 MINUTES)

### **ÉTAPE 1 : Copie le Script (1 min)**

#### 1.1 Ouvre ton Google Sheet

Va sur ton Google Sheet avec les commandes.

#### 1.2 Ouvre Apps Script

**Menu** : Extensions → Apps Script

#### 1.3 Copie le Code

Ouvre ce fichier sur ton ordinateur :
```
C:\Users\nande\Desktop\NOUS UNIQUE\google-sheets-appel-auto.js
```

- **Sélectionne TOUT** (Ctrl+A)
- **Copie** (Ctrl+C)

#### 1.4 Colle dans Apps Script

- Dans Apps Script, **efface** tout le code par défaut
- **Colle** le nouveau code (Ctrl+V)
- **Sauvegarde** (💾 ou Ctrl+S)
- Nomme le projet : **"Atelier Auto Sync"**

---

### **ÉTAPE 2 : Configure le Token (1 min)**

#### 2.1 Récupère ton Token

Dans PowerShell (sur ton PC) :

```powershell
$response = Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/auth/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@atelier.com","password":"admin123"}'
Write-Host "TOKEN :"
Write-Host $response.token
```

**Copie** le token affiché.

#### 2.2 Remplace dans le Script

Dans Apps Script, **ligne 6** :

```javascript
const API_TOKEN = 'TON_TOKEN_ICI';
```

**Remplace** par ton token :

```javascript
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Colle ton token ici
```

**Sauvegarde** (💾)

---

### **ÉTAPE 3 : Active le Trigger Automatique (1 min)**

#### 3.1 Exécute l'Installation

Dans Apps Script :

1. Dans le **menu déroulant** en haut (où il y a le nom des fonctions)
2. **Sélectionne** : `installerTriggerAutomatique`
3. **Clique** sur le bouton **▶️ Exécuter**

#### 3.2 Autorise l'Accès Google (Première fois seulement)

Une popup apparaît :

1. Clique sur **"Examiner les autorisations"**
2. Sélectionne ton **compte Google**
3. Clique sur **"Paramètres avancés"** (en bas)
4. Clique sur **"Accéder à Atelier Auto Sync (non sécurisé)"**
5. Clique sur **"Autoriser"**

⚠️ C'est normal ! Google affiche cet avertissement pour tous les scripts personnels.

#### 3.3 Vérifie l'Installation

Tu devrais voir :
- **Message** : "Exécution terminée"
- **Toast** dans ton Google Sheet : "✅ Trigger installé !"

---

## 🧪 TEST AUTOMATIQUE

### Test 1 : Ajoute une Nouvelle Ligne

1. **Retourne** sur ton Google Sheet
2. **Ajoute** une nouvelle ligne avec :
   - Colonne B : Nom client
   - Colonne C : Contact
   - Colonne D : Modèle
   - Colonne F : Taille
   - Colonne G : Couleur
   - Colonne I : Prix
   - Colonne P : Ville

3. **Attends** 5-10 secondes

4. **Observe** la colonne Q : Elle devrait afficher **✅ ENVOYÉ APPEL** (fond vert)

### Test 2 : Vérifie dans l'App

Va sur : **https://atelier-confection.vercel.app/appel**

**🎉 LA COMMANDE APPARAÎT AUTOMATIQUEMENT !**

---

## 🔍 VÉRIFIER QUE LE TRIGGER EST ACTIF

Dans Apps Script :

1. **Menu de gauche** : Clique sur l'icône **⏰ Déclencheurs** (icône horloge)
2. Tu devrais voir une ligne :
   - **Fonction** : `onChange`
   - **Événement** : `En cas de modification`

✅ **C'est bon !** Le trigger est actif !

---

## 📊 COLONNES UTILISÉES

Le script lit ces colonnes de ton Sheet :

| Colonne | Nom | Exemple |
|---------|-----|---------|
| **B** | Nom client | Nipié Jemima |
| **C** | Contact | 788714889 |
| **D** | Modèle | Robe Volante |
| **E** | Spécificité | Client pressé |
| **F** | Taille | 2XL |
| **G** | Couleur | Blanc |
| **I** | Prix | 11000 |
| **P** | Ville | Yaoundé |
| **Q** | Statut | ✅ ENVOYÉ APPEL |

⚠️ **Si tes colonnes sont différentes**, modifie les numéros dans le script (lignes 8-17).

---

## 🎯 WORKFLOW COMPLET

```
📝 Nouvelle ligne dans Google Sheets
        ↓ (Automatique - 5 secondes)
🤖 Script détecte et envoie vers API
        ↓
💾 Commande créée avec statut "en_attente_validation"
        ↓
📞 Commande apparaît dans PAGE "/appel"
        ↓
👤 Appelant traite :
   ✅ CONFIRMER → Va dans "/commandes"
   🔥 URGENT → Va dans "/commandes" (prioritaire)
   ⏸️ EN ATTENTE → Reste dans "/appel"
   ❌ ANNULER → Supprimée
```

---

## 🆘 DÉPANNAGE

### ❌ Colonne Q reste vide après 10 secondes

**Solution** :
1. Apps Script → Menu déroulant → Sélectionne `testerConnexion`
2. Clique sur ▶️ Exécuter
3. Si erreur 401 : Token expiré, regénère-le (ÉTAPE 2)
4. Si erreur 500 : Vérifie que l'API fonctionne

### ❌ Message "Trigger installé" n'apparaît pas

**Solution** :
1. Vérifie que tu as bien **sauvegardé** le script (💾)
2. Réexécute `installerTriggerAutomatique`
3. Vérifie dans **⏰ Déclencheurs** que le trigger existe

### ❌ Erreur "Authorization required"

**Solution** :
1. Réexécute `installerTriggerAutomatique`
2. Autorise à nouveau l'accès Google

### ❌ Commande n'apparaît pas dans /appel

**Solution** :
1. Vérifie que la colonne Q affiche "✅ ENVOYÉ APPEL"
2. Si oui, va sur `/commandes` → Si elle est là, le statut était différent
3. Si non, vérifie le token (ÉTAPE 2)

---

## 🔄 RENOUVELER LE TOKEN (Tous les 7 jours)

Le token expire après **7 jours**. Pour le renouveler :

1. **PowerShell** :
```powershell
$response = Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/auth/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@atelier.com","password":"admin123"}'
Write-Host $response.token
```

2. **Apps Script** → Ligne 6 → Remplace le token
3. **Sauvegarde** (💾)

---

## ✅ C'EST PRÊT !

Maintenant :
- ✅ Chaque **nouvelle ligne** dans Google Sheets → **Automatiquement** envoyée vers l'API
- ✅ La commande apparaît dans la **PAGE "APPEL"** de l'app
- ✅ L'appelant traite : **CONFIRMER/URGENT/ATTENTE/ANNULER**
- ✅ **AUCUNE ACTION MANUELLE** requise ! 🎉

**🚀 TON SYSTÈME EST 100% AUTOMATIQUE ! 🚀**
