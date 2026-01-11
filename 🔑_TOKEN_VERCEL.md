# 🔑 RÉCUPÉRER TON TOKEN DEPUIS VERCEL

## 📋 **Étapes Rapides**

### **Option 1 : Via le Navigateur (Plus Simple)**

1. Va sur **https://atelier-confection.vercel.app**
2. Connecte-toi avec `admin@atelier.com` / `admin123`
3. Appuie sur **F12** (ouvre la Console)
4. Va dans l'onglet **"Application"** (Chrome) ou **"Stockage"** (Firefox)
5. Dans la sidebar gauche → **Local Storage** → **https://atelier-confection.vercel.app**
6. Cherche la clé **"token"**
7. **Copie la valeur** (long texte qui commence par `eyJhbGciOiJIUzI...`)

---

### **Option 2 : Via Terminal (Plus Rapide)**

Dans PowerShell :

```powershell
curl.exe -X POST https://atelier-confection.vercel.app/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"admin@atelier.com\",\"password\":\"admin123\"}'
```

Tu recevras :
```json
{"message":"Connexion réussie","token":"eyJhbGciOiJIUzI...","user":{...}}
```

**Copie le token !**

---

## 📝 **Ensuite, Dans Google Sheets**

1. **Ouvre** ton Google Sheet
2. **Menu** : Extensions → Apps Script
3. **Copie** le contenu du fichier : `google-sheets-appel-vercel.js`
4. **Modifie** ces 2 lignes :

```javascript
const API_URL = 'https://atelier-confection.vercel.app/api/commandes'; // ✅ Déjà bon
const API_TOKEN = 'COLLE_TON_TOKEN_ICI'; // ⚠️ Colle le token récupéré
```

5. **Sauvegarde** (💾)
6. **Retourne** sur le Google Sheet
7. **Menu** : 📞 Appel API → 📤 Envoyer ligne sélectionnée

---

## ✅ **Vérification**

Après l'envoi :
- Colonne Q : **✅ ENVOYÉ APPEL** (fond vert)
- Va sur https://atelier-confection.vercel.app/appel
- **Tu verras la commande !** 🎉

---

## 🎯 **Résumé**

1. ✅ Récupère le token (F12 ou curl)
2. ✅ Copie `google-sheets-appel-vercel.js` dans Apps Script
3. ✅ Remplace `API_TOKEN` avec ton token
4. ✅ Sauvegarde
5. ✅ Envoie une ligne test
6. ✅ Vérifie dans `/appel`

**Fais-le maintenant ! 🚀**
