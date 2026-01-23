# 🎯 ACTION IMMÉDIATE - CONFIGURATION SMS

## ✅ VOTRE CLÉ API SMS8.IO EST PRÊTE !

**Clé API** : `2f197221e62538a59c916a0c8d45b8acf2b949cb`

---

## 📱 ÉTAPE 1 : CONFIGURER BACKEND (1 minute)

### Ouvrez `backend/.env` et ajoutez :

```env
# Configuration SMS8.io
SMS8_API_KEY=2f197221e62538a59c916a0c8d45b8acf2b949cb
SMS8_DEVICE_ID=0
SMS8_SENDER_PHONE=+225XXXXXXXXXX
SMS_ENABLED=false
```

**Remplacez** `+225XXXXXXXXXX` par votre vrai numéro de téléphone.

**Laissez** `SMS_ENABLED=false` pour commencer en mode test.

---

## 🗄️ ÉTAPE 2 : EXÉCUTER MIGRATION SQL (2 minutes)

1. Allez sur : https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
2. Menu → **SQL Editor**
3. **+ New query**
4. Copiez TOUT le contenu de : `supabase/migrations/20260122000000_add_sms_notifications.sql`
5. Collez dans l'éditeur
6. Cliquez **▶️ Run**
7. Vérifiez : `✅ Success`

### Vérifier les tables :

8. Menu → **Table Editor**
9. Vous devriez voir :
   - ✅ `sms_templates` (5 lignes)
   - ✅ `sms_historique` (vide)
   - ✅ `sms_config` (6 lignes)

---

## 🚀 ÉTAPE 3 : DÉMARRER L'APPLICATION (1 minute)

```powershell
# Terminal 1 : Backend
cd backend
npm run dev

# Terminal 2 : Frontend
cd frontend
npm run dev
```

---

## 🧪 ÉTAPE 4 : TESTER (MODE TEST) (2 minutes)

1. Ouvrez : http://localhost:5173
2. Login : `admin@atelier.com` / `admin123`
3. Menu → **Notifications SMS**
4. **Onglet "Vue d'ensemble"**
5. Statut : ⚠️ **Mode Test** (normal)
6. Configuration : ✅ **Configuré**

### Test SMS (Mode Test) :

7. Section "Tester l'envoi SMS"
8. Entrez votre numéro : `+225 XXXXXXXXXX`
9. Cliquez **"Envoyer Test"**
10. **Résultat** :
    - ✅ Toast vert : "SMS de test envoyé !"
    - Console backend : `📱 [SMS TEST MODE]`
    - Onglet Historique : SMS avec badge "test"

**Aucun SMS réel n'est envoyé en mode test !**

---

## ✅ ÉTAPE 5 : ACTIVER L'ENVOI RÉEL (2 minutes)

### ⚠️ PRÉREQUIS :

- Votre téléphone Android avec l'app SMS8.io doit être **allumé et connecté**
- L'app doit afficher **"Connected" ✅**

### Activer :

1. **Fermez** le backend (Ctrl+C)
2. **Modifiez** `backend/.env` :
```env
SMS_ENABLED=true  # ← Changez false en true
```
3. **Sauvegardez**
4. **Redémarrez** le backend :
```powershell
cd backend
npm run dev
```

### Test SMS Réel :

5. Rechargez : http://localhost:5173/notifications-sms
6. Statut : ✅ **Activé** (plus "Mode Test")
7. Entrez **votre numéro** : `+225 XXXXXXXXXX`
8. Cliquez **"Envoyer Test"**
9. **Résultat attendu** :
   - ✅ Toast : "SMS de test envoyé !"
   - ✅ Console : `📱 Envoi SMS...` puis `✅ SMS envoyé`
   - ✅ **VOUS RECEVEZ LE SMS !** 🎉

---

## 🎯 ÉTAPE 6 : TESTER LE WORKFLOW COMPLET (5 minutes)

### Créer une commande test avec VOTRE numéro :

```powershell
$body = @{
    token = "NOUSUNIQUE123"
    client = "Test SMS"
    phone = "+225 VOTRE_NUMERO"
    ville = "Abidjan"
    name = "Robe Volante"
    taille = "M"
    couleur = "Terracotta"
    price = "11000"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/commandes/public" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Suivez le workflow :

**1. PAGE APPEL** (`/appel`) :
- Trouvez votre commande
- Cliquez "Traiter" → "CONFIRMER"
- ✅ **SMS 1 REÇU** : "Votre commande a été validée !"

**2. STYLISTE** (`/atelier/styliste`) :
- "Commencer découpe"
- "Envoyer en couture"
- ✅ **SMS 2 REÇU** : "En cours de confection"

**3. COUTURIER** (`/atelier/couturier`) :
- "Terminer couture"
- ✅ **SMS 3 REÇU** : "Confection terminée !"

**4. LIVRAISON** (`/preparation-colis`) :
- Assigner à un livreur
- ✅ **SMS 4 REÇU** : "Livraison dans 24h"

### 🎉 VOUS AVEZ REÇU 4 SMS AUTOMATIQUEMENT !

---

## 🚀 ÉTAPE 7 : DÉPLOYER SUR VERCEL (3 minutes)

### Ajouter les variables :

1. https://vercel.com/dashboard
2. Projet : `atelier-confection`
3. **Settings** → **Environment Variables**

**Ajoutez** :
```
SMS8_API_KEY = 2f197221e62538a59c916a0c8d45b8acf2b949cb
SMS8_DEVICE_ID = 0
SMS8_SENDER_PHONE = +225XXXXXXXXXX
SMS_ENABLED = false
```

4. **Save** chaque variable

### Déployer :

```powershell
cd C:\Users\MSI\Desktop\atelier-confection

git add .
git commit -m "feat: système SMS avec clé API configurée"
git push origin main
```

5. Attendez 2-3 minutes
6. Testez sur : https://atelier-confection.vercel.app/notifications-sms

### Pour activer en production :

7. Vercel → Environment Variables
8. `SMS_ENABLED` → `true`
9. **Save** → **Redeploy**

---

## 📋 CONFIGURATION SIMPLIFIÉE

Selon la documentation SMS8.io que vous avez fournie, **seule la clé API est requise** !

### Variables nécessaires :
```env
SMS8_API_KEY=2f197221e62538a59c916a0c8d45b8acf2b949cb
SMS8_DEVICE_ID=0  # 0 = appareil principal
SMS_ENABLED=false  # false = test, true = réel
```

### Optionnel :
```env
SMS8_SENDER_PHONE=+225XXXXXXXXXX  # Pour référence
```

---

## ✅ CHECKLIST

- [ ] `backend/.env` configuré avec la clé API
- [ ] Migration SQL exécutée dans Supabase
- [ ] Tables créées (sms_templates, sms_historique, sms_config)
- [ ] Backend démarré (`npm run dev`)
- [ ] Frontend démarré (`npm run dev`)
- [ ] Test en mode test réussi ✅
- [ ] `SMS_ENABLED=true` activé
- [ ] Test SMS réel réussi (SMS reçu) ✅
- [ ] Workflow complet testé (4 SMS reçus) ✅
- [ ] Variables ajoutées sur Vercel
- [ ] Déployé en production

---

## 🎉 RÉSUMÉ

**Votre clé API** : `2f197221e62538a59c916a0c8d45b8acf2b949cb`

**API Endpoint** : `https://app.sms8.io/services/send.php`

**Format requête** :
```
POST https://app.sms8.io/services/send.php
Content-Type: application/x-www-form-urlencoded

key=2f197221e62538a59c916a0c8d45b8acf2b949cb
&number=+225XXXXXXXXXX
&message=Votre message ici
&devices=0
```

**Code adapté** : ✅ Déjà fait !
- `backend/services/sms.service.js` mis à jour
- Utilise la vraie API SMS8.io
- Format URLSearchParams correct

---

## 🚀 PRÊT À TESTER !

1. Configurez `backend/.env`
2. Exécutez la migration SQL
3. Démarrez l'app
4. Testez en mode test
5. Activez l'envoi réel
6. Recevez vos SMS ! 📱✨

**Tout est prêt !** Suivez les étapes ci-dessus ! 🎊
