# 🚀 CONFIGURATION GOOGLE SHEETS - GUIDE RAPIDE

## ✅ **Tu as réussi à te connecter !**

Tu as maintenant un **token JWT** qui commence par :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmNTZkYTA1OS0xM...
```

---

## 📝 **ÉTAPES RAPIDES**

### **1️⃣ Ouvre ton Google Sheet**

Va sur : https://docs.google.com/spreadsheets/d/1TBoG1toAFyUe0P-hpsbpWVsKjSyHmjjGtcYO7X6pA/

---

### **2️⃣ Ouvre Apps Script**

Dans Google Sheets :
- **Menu** : Extensions → Apps Script
- Une nouvelle fenêtre s'ouvre

---

### **3️⃣ Copie le Script**

1. **Ouvre** le fichier `google-sheets-appel-vercel.js` (dans ton projet)
2. **Sélectionne TOUT** le contenu (Ctrl+A)
3. **Copie** (Ctrl+C)
4. **Retourne** dans Apps Script
5. **Colle** le code (Ctrl+V) pour remplacer tout

---

### **4️⃣ Configure le Token**

Dans Apps Script, trouve la ligne 6 :
```javascript
const API_TOKEN = 'TON_TOKEN_A_RECUPERER';
```

**Remplace** par ton token complet :
```javascript
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmNTZkYTA1OS0xM2ZlLTRjMDEtOWYyZi0wNDAyOTA4Njd...';
```

⚠️ **IMPORTANT** : Copie le token **COMPLET** (pas tronqué) !

---

### **5️⃣ Sauvegarde**

- **Clique** sur l'icône 💾 (Disquette)
- Ou **Ctrl+S**
- Ferme l'onglet Apps Script

---

### **6️⃣ Teste l'Envoi**

1. **Retourne** sur ton Google Sheet
2. **Actualise** la page (F5)
3. Tu verras un **nouveau menu** : "📞 Appel API"
4. **Sélectionne** une ligne de commande (par exemple ligne 3)
5. **Menu** : 📞 Appel API → **📤 Envoyer ligne sélectionnée**
6. **Attends** 2-3 secondes
7. La colonne Q devrait afficher : **✅ ENVOYÉ APPEL** (fond vert)

---

### **7️⃣ Vérifie dans l'App**

Va sur : https://atelier-confection.vercel.app/appel

**🎉 Tu verras la commande !**

---

## 🔄 **Envoi Automatique (Optionnel)**

Pour envoyer automatiquement chaque nouvelle ligne :

1. **Apps Script** → Menu : **📞 Appel API** (dans le script)
2. Ajoute une fonction `installerTrigger()` (déjà dans le script)
3. **Exécute** cette fonction une fois
4. **Autorise** l'accès Google
5. ✅ Désormais, chaque nouvelle ligne sera envoyée automatiquement !

---

## 📋 **Colonnes Utilisées**

Le script lit ces colonnes de ton Sheet :
- **B** : Nom client
- **C** : Contact
- **D** : Modèle
- **E** : Spécificité (note)
- **F** : Taille
- **G** : Couleur
- **I** : Prix
- **P** : Ville
- **Q** : Statut (✅ ENVOYÉ APPEL)

---

## 🆘 **En Cas de Problème**

### ❌ Erreur 401 (Non autorisé)
→ Token expiré ou incorrect. Récupère un nouveau token.

### ❌ Erreur 500 (Serveur)
→ Vérifie que l'API Vercel est en ligne : https://atelier-confection.vercel.app/api/system/health

### ❌ Rien ne se passe
→ Vérifie que tu as bien sauvegardé le script (💾)
→ Actualise le Google Sheet (F5)

---

## ✅ **C'EST PRÊT !**

**Configure maintenant le script et teste l'envoi ! 🚀**
