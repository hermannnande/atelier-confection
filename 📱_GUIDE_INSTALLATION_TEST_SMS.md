# 📱 GUIDE COMPLET : Installation & Test du Système SMS

## 🎯 Vue d'Ensemble

Ce système envoie **automatiquement** des SMS aux clients à chaque étape importante de leur commande.

---

## ⚙️ ÉTAPE 1 : Installation SMS8.io sur Android

### 1.1 Télécharger l'Application

1. Ouvrez **Google Play Store** sur votre téléphone Android
2. Recherchez **"SMS8.io"** ou **"SMS Gateway API"**
3. Téléchargez et installez l'application

### 1.2 Créer un Compte

1. Allez sur https://app.sms8.io/
2. Cliquez sur **"Sign up"**
3. Créez votre compte avec un email et mot de passe
4. Vérifiez votre email

### 1.3 Connecter votre Téléphone

1. Ouvrez l'app SMS8.io sur votre Android
2. Connectez-vous avec votre compte
3. **Autorisez toutes les permissions** :
   - ✅ Envoyer et voir les SMS
   - ✅ Contacts (optionnel)
   - ✅ Notifications
   - ✅ Exécution en arrière-plan

4. L'app vous affichera :
   - **Device ID** : `dev_xxxxxxxxxxxxx`
   - **Status** : Connected ✅

### 1.4 Récupérer vos Clés API

1. Connectez-vous au dashboard : https://app.sms8.io/
2. Allez dans **Settings** → **API Keys**
3. Copiez :
   - **API Key** : `sk_xxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Device ID** : `dev_yyyyyyyyyyyyyyyyyyyyyyyy`

---

## 🔑 ÉTAPE 2 : Configuration de l'Application

### 2.1 Variables d'Environnement Backend (Local)

Créez ou modifiez `backend/.env` :

```env
# Configuration Supabase (existante)
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=votre_service_key_ici
JWT_SECRET=votre_jwt_secret_ici
USE_SUPABASE=true

# ⚡ NOUVELLE CONFIGURATION SMS8.io
SMS8_API_KEY=sk_votre_api_key_ici
SMS8_DEVICE_ID=dev_votre_device_id_ici
SMS8_SENDER_PHONE=+225XXXXXXXXXX

# Activer les SMS (true = envoi réel, false = mode test)
SMS_ENABLED=false
```

**Important** :
- Commencez avec `SMS_ENABLED=false` pour tester sans envoyer de vrais SMS
- `SMS8_SENDER_PHONE` : votre numéro de téléphone au format international (+225...)

### 2.2 Variables Vercel (Production)

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet `atelier-confection`
3. **Settings** → **Environment Variables**
4. Ajoutez :

```
SMS8_API_KEY = sk_votre_api_key_ici
SMS8_DEVICE_ID = dev_votre_device_id_ici
SMS8_SENDER_PHONE = +225XXXXXXXXXX
SMS_ENABLED = false
```

5. **Redéployez** : Settings → Deployments → Redeploy

---

## 📊 ÉTAPE 3 : Initialiser la Base de Données

### 3.1 Exécuter la Migration SQL

1. Connectez-vous à Supabase : https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
2. Menu gauche → **SQL Editor**
3. Cliquez **"+ New query"**
4. Ouvrez le fichier `supabase/migrations/20260122000000_add_sms_notifications.sql`
5. **Copiez TOUT le contenu** et collez dans SQL Editor
6. Cliquez **▶️ Run**
7. Résultat attendu : `✅ Success. No rows returned`

### 3.2 Vérifier les Tables Créées

1. Menu gauche → **Table Editor**
2. Vous devriez voir 3 nouvelles tables :
   - ✅ `sms_templates` (5 templates par défaut)
   - ✅ `sms_historique` (vide pour l'instant)
   - ✅ `sms_config` (configuration automatique)

---

## 🧪 ÉTAPE 4 : Tester le Système (Mode TEST)

### 4.1 Démarrer l'Application (Local)

```powershell
# Terminal 1 : Backend
cd backend
npm run dev

# Terminal 2 : Frontend
cd frontend
npm run dev
```

Vérifiez dans la console backend :
```
🟣 Mode base de données: Supabase (PostgreSQL)
🚀 Serveur démarré sur le port 5000
```

### 4.2 Accéder à la Page SMS

1. Ouvrez l'app : http://localhost:5173
2. Connectez-vous : `admin@atelier.com` / `admin123`
3. Menu → **Notifications SMS**

### 4.3 Vérifier le Statut

Dans l'onglet **"Vue d'ensemble"** :
- État : ⚠️ **Mode Test** (normal car SMS_ENABLED=false)
- Configuration : ✅ **Configuré**
- API Key : `sk_xxxxxxx...`
- Téléphone : `+225XXXXXXXXXX`

### 4.4 Tester l'Envoi (Mode Test)

1. Dans l'onglet **"Vue d'ensemble"**
2. Section **"Tester l'envoi SMS"**
3. Entrez votre numéro : `+225 0700000000`
4. Cliquez **"Envoyer Test"**
5. Résultat attendu :
   - ✅ Toast : "SMS de test envoyé !"
   - Console backend : `📱 [SMS TEST MODE]`
   - Onglet Historique : SMS apparaît avec badge "test"

**Aucun SMS réel n'est envoyé en mode test !**

---

## 🚀 ÉTAPE 5 : Activer l'Envoi Réel de SMS

### 5.1 Prérequis

1. ✅ Votre téléphone Android est allumé
2. ✅ L'app SMS8.io est ouverte et connectée
3. ✅ Votre téléphone a une connexion Internet
4. ✅ Vous avez un forfait SMS suffisant

### 5.2 Activer en Local

Modifiez `backend/.env` :

```env
SMS_ENABLED=true
```

Redémarrez le backend :

```powershell
cd backend
# Ctrl+C pour arrêter
npm run dev
```

### 5.3 Activer en Production (Vercel)

1. Vercel Dashboard → Settings → Environment Variables
2. Trouvez `SMS_ENABLED`
3. Changez la valeur : `true`
4. Cliquez **"Save"**
5. Redéployez : Deployments → Redeploy

---

## 📲 ÉTAPE 6 : Tester l'Envoi Réel

### 6.1 Test SMS Simple

1. Page **Notifications SMS** → Onglet **"Vue d'ensemble"**
2. Entrez votre numéro de téléphone
3. Cliquez **"Envoyer Test"**
4. **Vérifications** :
   - ✅ Toast : "SMS de test envoyé !"
   - ✅ Console backend : `📱 Envoi SMS à +225...` puis `✅ SMS envoyé avec succès`
   - ✅ Votre téléphone **reçoit le SMS** ! 🎉

### 6.2 Test Automatique : Commande Validée

1. Allez dans **Appel** (`/appel`)
2. Trouvez une commande avec statut "En attente validation"
3. Cliquez **"Traiter la commande"**
4. Choisissez **"CONFIRMER"**
5. **Résultat attendu** :
   - Commande passe en statut "validée"
   - Le client **reçoit un SMS** :
   
   ```
   Bonjour [Nom Client],
   Votre commande #CMD000001 a été validée ! 
   Modèle: Robe Volante
   Nous démarrons la confection de votre tenue.
   - Atelier Confection
   ```

6. Vérifiez dans **Notifications SMS** → **Historique** :
   - SMS apparaît avec badge "envoye" ✅

### 6.3 Test Workflow Complet

**Créez une commande test** :

```powershell
$body = @{
    token = "NOUSUNIQUE123"
    client = "Votre Nom"
    phone = "+225 VOTRE_NUMERO"
    ville = "Abidjan"
    name = "Robe Volante"
    taille = "M"
    couleur = "Terracotta"
    price = "11000"
    source = "test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/commandes/public" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

**Suivez le workflow** :

| Étape | Action | SMS Envoyé |
|-------|--------|------------|
| 1. Appel | Confirmer la commande | ✅ "Commande validée" |
| 2. Styliste | Envoyer en couture | ✅ "En cours de confection" |
| 3. Couturier | Terminer couture | ✅ "Confection terminée" |
| 4. Gestionnaire | Assigner au livreur | ✅ "Livraison dans 24h" |

**Vous recevrez 4 SMS automatiquement ! 📱📱📱📱**

---

## ⚙️ ÉTAPE 7 : Configuration Avancée

### 7.1 Désactiver un Type de SMS

Page **Notifications SMS** → Onglet **"Configuration"** :

- Toggle OFF pour désactiver un type de notification
- Par exemple, désactiver "LIVREE" si vous ne voulez pas de SMS après livraison

### 7.2 Modifier les Templates

1. Onglet **"Templates"**
2. Cliquez sur l'icône **✏️ Edit** d'un template
3. Modifiez le message
4. Utilisez les variables :
   - `{client}` : Nom du client
   - `{numero}` : Numéro de commande
   - `{modele}` : Nom du modèle
   - `{taille}` : Taille
   - `{couleur}` : Couleur
   - `{telephone}` : Téléphone du client
   - `{ville}` : Ville

5. Cliquez **"Enregistrer"**
6. Les prochains SMS utiliseront le nouveau template !

### 7.3 Voir l'Historique

Onglet **"Historique"** :
- Tous les SMS envoyés (ou échoués)
- Filtre par statut
- Voir le message exact envoyé
- Date et heure d'envoi

### 7.4 Statistiques

Onglet **"Vue d'ensemble"** :
- Total SMS envoyés
- Total échecs
- SMS aujourd'hui
- Taux de réussite (%)

---

## 🐛 DÉPANNAGE

### Problème 1 : SMS non reçu

**Vérifications** :
1. ✅ `SMS_ENABLED=true` dans `.env`
2. ✅ App SMS8.io ouverte sur Android
3. ✅ Android connecté à Internet
4. ✅ API Key et Device ID corrects
5. ✅ Numéro au format international (+225...)

**Solution** :
- Vérifiez les logs backend : `📱 Envoi SMS...` puis `✅ Envoyé`
- Vérifiez dans l'app SMS8.io : onglet "Messages"
- Vérifiez l'historique dans la page Notifications SMS

### Problème 2 : Erreur "Invalid API Key"

**Cause** : API Key incorrecte

**Solution** :
1. Reconnectez-vous à https://app.sms8.io/
2. Vérifiez l'API Key dans Settings → API Keys
3. Copiez la bonne clé dans `.env`
4. Redémarrez le backend

### Problème 3 : Erreur "Device not found"

**Cause** : Device ID incorrect ou téléphone déconnecté

**Solution** :
1. Ouvrez l'app SMS8.io sur Android
2. Vérifiez que le status est "Connected" ✅
3. Copiez le Device ID affiché
4. Mettez à jour `SMS8_DEVICE_ID` dans `.env`

### Problème 4 : SMS en double

**Cause** : Configuration d'auto-send activée plusieurs fois

**Solution** :
- Vérifiez dans **Notifications SMS** → **Configuration**
- Un seul toggle doit être ON par type de notification

### Problème 5 : Téléphone éteint

**Comportement** :
- SMS8.io met les SMS en file d'attente
- Dès que le téléphone se rallume, les SMS sont envoyés
- Ou SMS8.io bascule sur leur gateway cloud (peut être payant)

---

## 💡 BONNES PRATIQUES

### 1. Mode Test en Développement

Toujours utiliser `SMS_ENABLED=false` en développement local pour éviter d'envoyer des SMS par erreur.

### 2. Vérifier le Forfait SMS

- SMS8.io utilise votre forfait mobile
- Vérifiez que vous avez assez de SMS dans votre forfait
- Ou souscrivez à un forfait SMS illimité

### 3. Téléphone Dédié (Recommandé)

Pour la production, utilisez un téléphone Android dédié :
- Toujours branché sur chargeur
- Toujours connecté au WiFi
- App SMS8.io toujours ouverte en arrière-plan

### 4. Sauvegarder les Templates

Avant de modifier un template :
- Copiez l'ancien message quelque part
- Testez le nouveau message
- Si problème, restaurez l'ancien

### 5. Surveiller l'Historique

Consultez régulièrement l'historique pour :
- Vérifier que les SMS sont bien envoyés
- Détecter les échecs
- Voir le nombre de SMS par jour

---

## 📊 MÉTRIQUES DE SUCCÈS

Après installation réussie, vous devriez avoir :

✅ **Configuration**
- API Key configurée
- Device ID configuré
- Téléphone connecté

✅ **Templates**
- 5 templates actifs
- Messages personnalisés

✅ **Envoi Automatique**
- SMS "Commande validée" ✅
- SMS "En cours de confection" ✅
- SMS "Confection terminée" ✅
- SMS "Livraison 24h" ✅

✅ **Historique**
- Tous les SMS loggés
- Taux de réussite > 95%

---

## 🎯 CHECKLIST FINALE

Avant de passer en production :

- [ ] SMS8.io installé et configuré
- [ ] API Key et Device ID ajoutés
- [ ] Migration SQL exécutée
- [ ] Test SMS simple réussi
- [ ] Test workflow complet réussi
- [ ] Templates personnalisés
- [ ] Variables Vercel configurées
- [ ] Mode test désactivé (`SMS_ENABLED=true`)
- [ ] Téléphone dédié configuré
- [ ] Forfait SMS vérifié

---

## 📞 SUPPORT

### Documentation Officielle
- SMS8.io : https://docs.sms8.io/
- Support : support@sms8.io

### Fichiers du Projet
- Configuration : `📱_CONFIGURATION_SMS8IO.md`
- Migration SQL : `supabase/migrations/20260122000000_add_sms_notifications.sql`
- Service backend : `backend/services/sms.service.js`
- Routes API : `backend/supabase/routes/sms.js`
- Page Admin : `frontend/src/pages/NotificationsSMS.jsx`

---

**🎉 FÉLICITATIONS ! Votre système de notifications SMS est opérationnel ! 📱✨**

Vos clients seront maintenant rassurés à chaque étape de leur commande ! 🎊



