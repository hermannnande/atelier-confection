# 🎉 APPLICATION LANCÉE - CONFIGURATION FINALE

## ✅ TON APPLICATION EST EN LIGNE !

- **Site Web** : https://atelier-confection.vercel.app
- **Login Admin** : admin@atelier.com / admin123
- **API** : https://atelier-confection.vercel.app/api

---

## 🔄 FLUX COMPLET DE TES COMMANDES

```
1. 📝 Client remplit formulaire → Google Sheets
2. 🤖 Script Apps Script détecte la nouvelle ligne
3. 📤 Script envoie les données vers ton API Vercel
4. 💾 API crée la commande avec statut "en_attente_validation"
5. 📞 La commande s'affiche dans la PAGE "APPEL"
6. 👤 L'appelant traite la commande :
   - ✅ CONFIRMER → Va dans "COMMANDES"
   - 🔥 URGENT → Va dans "COMMANDES" (prioritaire)
   - ⏸️ EN ATTENTE → Reste dans "APPEL"
   - ❌ ANNULER → Supprimée
```

---

## 🛠️ CONFIGURATION GOOGLE SHEETS

### **ÉTAPE 1 : Prépare ton Google Sheet**

Ton Google Sheet doit avoir ces **colonnes** (dans cet ordre) :

| Colonne | Nom | Exemple |
|---------|-----|---------|
| **A** | Timestamp | 2026-01-11 14:30:00 |
| **B** | Nom client | Nipié Jemima |
| **C** | Contact | 788714889 |
| **D** | Modèle | Robe Volante |
| **E** | Spécificité | Client pressé |
| **F** | Taille | 2XL |
| **G** | Couleur | Blanc |
| **H** | (vide) | |
| **I** | Prix | 11000 |
| **J-O** | (vide) | |
| **P** | Ville | Yaoundé |
| **Q** | Statut | ✅ ENVOYÉ APPEL |

---

### **ÉTAPE 2 : Installe le Script Apps Script**

#### **2.1 Ouvre Apps Script**

1. Ouvre ton **Google Sheet**
2. **Menu** : Extensions → Apps Script
3. Une nouvelle fenêtre s'ouvre

#### **2.2 Copie le Script**

Dans ton ordinateur, ouvre le fichier :
```
C:\Users\nande\Desktop\NOUS UNIQUE\google-sheets-appel-vercel.js
```

**Copie TOUT le contenu** (Ctrl+A puis Ctrl+C)

#### **2.3 Colle dans Apps Script**

1. Dans Apps Script, **supprime** le code par défaut
2. **Colle** le code copié (Ctrl+V)

#### **2.4 Configure ton Token**

Trouve la **ligne 6** :
```javascript
const API_TOKEN = 'TON_TOKEN_A_RECUPERER';
```

**Remplace** par ton token (reçu plus tôt) :
```javascript
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmNTZkYTA1OS0xM2ZlLTRjMDEtOWYyZi0wNDAyOTA4NjdmODMiLCJyb2xlIjoiYWRtaW5pc3RyYXRldXIiLCJpYXQiOjE3NjgxNTM0OTYsImV4cCI6MTc2ODc1ODI5Nn0.iSiFDKbC7bCnJIxP9I8J-JCeKonfVUBYCpI-t_27NE8';
```

⚠️ **IMPORTANT** : Ce token expire dans **7 jours**. Quand il expire, regénère-le avec :
```powershell
Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/auth/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@atelier.com","password":"admin123"}'
```

#### **2.5 Sauvegarde**

Clique sur **💾 Enregistrer** (ou Ctrl+S)

#### **2.6 Nomme le Projet**

En haut à gauche : "Projet sans titre" → Renomme en **"Atelier API Sync"**

---

### **ÉTAPE 3 : Teste l'Envoi Manuel**

#### **3.1 Retourne sur ton Google Sheet**

Ferme l'onglet Apps Script et **actualise** ton Google Sheet (F5)

#### **3.2 Nouveau Menu**

Tu devrais voir un **nouveau menu** : **📞 Appel API**

Si tu ne le vois pas :
- Actualise (F5)
- Attends 10 secondes
- Réactualise (F5)

#### **3.3 Teste l'Envoi**

1. **Sélectionne** une ligne de commande (par exemple ligne 3)
2. **Menu** : **📞 Appel API** → **📤 Envoyer ligne sélectionnée**
3. **Attends** 2-3 secondes
4. La colonne **Q** devrait afficher : **✅ ENVOYÉ APPEL** (fond vert)

#### **3.4 Vérifie dans l'App**

Va sur : **https://atelier-confection.vercel.app/appel**

**🎉 La commande devrait apparaître !**

---

### **ÉTAPE 4 : Active l'Envoi Automatique (Optionnel)**

Pour que **chaque nouvelle ligne** soit envoyée **automatiquement** :

#### **4.1 Retourne dans Apps Script**

Menu : Extensions → Apps Script

#### **4.2 Exécute la Fonction d'Installation**

1. En haut, dans le menu déroulant, sélectionne : **`installerTrigger`**
2. Clique sur **▶️ Exécuter**
3. **Autorise** l'accès Google (première fois seulement) :
   - Clique sur "Examiner les autorisations"
   - Sélectionne ton compte Google
   - Clique sur "Autoriser"
4. Attends 5 secondes
5. Tu verras : **"Exécution terminée"**

#### **4.3 Vérifie le Trigger**

Dans Apps Script :
- Menu de gauche : **⏰ Déclencheurs** (icône horloge)
- Tu devrais voir : **`onFormSubmit`** → **Depuis une feuille de calcul** → **Lors de l'envoi du formulaire**

✅ **C'est installé !** Désormais, chaque nouvelle ligne sera envoyée **automatiquement** !

---

## 🧪 **TEST COMPLET**

### **Test 1 : Envoi Manuel**

1. Sélectionne une ligne dans Google Sheets
2. Menu : **📞 Appel API** → **📤 Envoyer ligne sélectionnée**
3. Vérifie colonne Q : **✅ ENVOYÉ APPEL**
4. Va sur : https://atelier-confection.vercel.app/appel
5. **La commande apparaît ! ✅**

### **Test 2 : Actions dans /appel**

Dans la page `/appel` :

1. **Clique sur ✅ CONFIRMER**
   - La commande disparaît de `/appel`
   - Va sur `/commandes` → **Elle est là ! ✅**

2. **Clique sur 🔥 URGENT**
   - La commande disparaît de `/appel`
   - Va sur `/commandes` → **Elle est là avec badge URGENT ! 🔥**

3. **Clique sur ⏸️ EN ATTENTE**
   - La commande **reste** dans `/appel` (changement de statut)

4. **Clique sur ❌ ANNULER**
   - La commande disparaît de `/appel` (annulée)

### **Test 3 : Envoi Automatique (si trigger installé)**

1. **Ajoute une nouvelle ligne** dans Google Sheets (manuellement ou via Google Forms)
2. **Attends 5 secondes**
3. Colonne Q : **✅ ENVOYÉ APPEL** (automatique)
4. Va sur : https://atelier-confection.vercel.app/appel
5. **La commande apparaît automatiquement ! 🎉**

---

## 🔧 **DÉPANNAGE**

### ❌ Erreur 401 (Non autorisé)

**Cause** : Token expiré ou incorrect

**Solution** :
1. Régénère un nouveau token :
```powershell
Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/auth/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@atelier.com","password":"admin123"}'
```
2. Copie le nouveau token
3. Apps Script → Ligne 6 → Remplace `API_TOKEN`
4. Sauvegarde (💾)

### ❌ Erreur 500 (Serveur)

**Cause** : API Vercel a un problème

**Solution** :
1. Vérifie que l'API fonctionne : https://atelier-confection.vercel.app/api/system/health
2. Si erreur, vérifie les logs Vercel

### ❌ Menu "Appel API" n'apparaît pas

**Cause** : Script pas chargé

**Solution** :
1. Actualise le Google Sheet (F5)
2. Attends 10 secondes
3. Réactualise (F5)
4. Si toujours pas là : Apps Script → Vérifie que tu as bien sauvegardé (💾)

### ❌ Colonne Q reste vide

**Cause** : Script pas exécuté

**Solution** :
1. Apps Script → Menu : **📞 Appel API** → **⚙️ Tester la connexion API**
2. Si erreur : Vérifie le token (ligne 6)

### ❌ Commande n'apparaît pas dans /appel

**Cause** : Statut incorrect ou token sans droits admin

**Solution** :
1. Vérifie que le script envoie bien `statut: 'en_attente_validation'` (ligne 69)
2. Vérifie que le token est bien celui de l'admin (ligne 6)
3. Va sur `/commandes` → Si la commande est là, le statut était différent

---

## 📊 **MAPPING DES COLONNES**

Le script lit ces colonnes de ton Sheet :

```javascript
const COLONNES = {
  NOM_CLIENT: 2,      // B - Nom client
  CONTACT: 3,         // C - Contact
  MODELE: 4,          // D - Modèle
  SPECIFICITE: 5,     // E - Spécificité (note)
  TAILLE: 6,          // F - Taille
  COULEUR: 7,         // G - Couleur
  PRIX: 9,            // I - Prix
  VILLE: 16,          // P - Ville
  STATUT_SHEET: 17    // Q - Statut ("✅ ENVOYÉ APPEL")
};
```

⚠️ **Si tes colonnes sont différentes**, modifie ces numéros dans Apps Script (ligne 25-33).

---

## ✅ **C'EST PRÊT !**

Maintenant :
1. ✅ Ton application est **en ligne** sur Vercel
2. ✅ Les commandes de **Google Sheets** arrivent dans la **page APPEL**
3. ✅ L'appelant peut **traiter** les commandes
4. ✅ Les commandes validées vont dans **COMMANDES**
5. ✅ Le workflow continue : **Découpe → Couture → Stock → Livraison**

**🎉 TON ATELIER EST 100% OPÉRATIONNEL ! 🎉**

---

## 📞 **PROCHAINES ÉTAPES**

1. **Teste** l'envoi manuel (Menu → Envoyer ligne sélectionnée)
2. **Vérifie** dans `/appel`
3. **Installe** le trigger automatique (`installerTrigger`)
4. **Forme** tes appelants à utiliser la page `/appel`
5. **Profite** ! 🚀
