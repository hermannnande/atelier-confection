# 📱 DÉMARRAGE RAPIDE - Notifications SMS

## ⚡ Installation en 5 Minutes

---

### 1️⃣ Téléchargez SMS8.io sur votre Android (2 min)

1. Google Play Store → Cherchez **"SMS8.io"**
2. Installez l'application
3. Créez un compte sur https://app.sms8.io/
4. Connectez votre téléphone dans l'app
5. Autorisez toutes les permissions

---

### 2️⃣ Récupérez vos Clés (1 min)

Sur https://app.sms8.io/ → Settings → API Keys :

- **API Key** : `sk_xxxxxxxxxxxxx`
- **Device ID** : `dev_yyyyyyyyyy`

---

### 3️⃣ Configurez l'Application (1 min)

Créez `backend/.env` (ou ajoutez ces lignes) :

```env
SMS8_API_KEY=sk_xxxxxxxxxxxxx
SMS8_DEVICE_ID=dev_yyyyyyyyyy
SMS8_SENDER_PHONE=+225XXXXXXXXXX
SMS_ENABLED=false
```

---

### 4️⃣ Initialisez la Base de Données (1 min)

1. Ouvrez Supabase : https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
2. Menu → **SQL Editor**
3. Copiez le contenu de `supabase/migrations/20260122000000_add_sms_notifications.sql`
4. Collez et cliquez **▶️ Run**

---

### 5️⃣ Démarrez et Testez (30 sec)

```powershell
# Démarrer
cd backend && npm run dev
cd frontend && npm run dev

# Ouvrir
http://localhost:5173

# Login
admin@atelier.com / admin123

# Aller dans
Menu → Notifications SMS

# Tester
Entrez votre numéro → Cliquez "Envoyer Test"
```

---

## ✅ C'EST TOUT !

**Mode test activé** : Les SMS sont simulés (aucun envoi réel)

**Pour activer l'envoi réel** :
```env
SMS_ENABLED=true
```

---

## 📚 Guides Complets

- **Configuration détaillée** : `📱_CONFIGURATION_SMS8IO.md`
- **Installation complète** : `📱_GUIDE_INSTALLATION_TEST_SMS.md`
- **Résumé technique** : `📱_SYSTEME_SMS_RESUME.md`

---

## 🎯 Workflow Automatique

```
Appelant confirme    → 📱 SMS "Commande validée"
Couturier démarre    → 📱 SMS "En cours de confection"
Couture terminée     → 📱 SMS "Confection terminée"
Livreur assigné      → 📱 SMS "Livraison dans 24h"
```

**4 SMS envoyés automatiquement à chaque commande ! 🎉**

---

## ⚠️ Important

- Votre téléphone Android doit rester allumé
- L'app SMS8.io doit être active
- Vérifiez votre forfait SMS

---

**🚀 Bon envoi de SMS ! 📱**



