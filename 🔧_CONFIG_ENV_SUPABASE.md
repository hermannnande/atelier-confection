# 🔧 CONFIGURATION .ENV POUR SUPABASE

## ⚠️ IMPORTANT : Backend utilise MongoDB au lieu de Supabase

Votre backend démarre avec **MongoDB** mais vous utilisez **Supabase + Vercel** !

---

## 🚀 SOLUTION RAPIDE (2 minutes)

### **Créez manuellement : `backend/.env`**

```env
# Port du serveur
PORT=5000
NODE_ENV=development

# ✅ SUPABASE (Votre base de données)
USE_SUPABASE=true
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=VOTRE_SERVICE_KEY_ICI
JWT_SECRET=VOTRE_JWT_SECRET_ICI

# 📱 SMS8.io (pour les SMS)
SMS8_API_KEY=VOTRE_SMS8_API_KEY_ICI
SMS8_DEVICE_ID=VOTRE_SMS8_DEVICE_ID_ICI
SMS8_SENDER_PHONE=+225XXXXXXXXXX
SMS_ENABLED=false

# 💬 WhatsApp via la session WaSenderAPI "NousUnique"
WHATSAPP_ENABLED=false
WASENDER_API_KEY=VOTRE_CLE_PRIVEE_WASENDER
WASENDER_API_URL=https://www.wasenderapi.com/api
WASENDER_TIMEOUT_MS=15000
WHATSAPP_COUNTRY_CODE=CI
WHATSAPP_TIME_ZONE=Africa/Abidjan
WHATSAPP_DELAY_BATCH_LIMIT=100
```

---

## 🔑 OÙ TROUVER LES CLÉS ?

### **1. SUPABASE_SERVICE_KEY + JWT_SECRET**

1. **Ouvrez** : https://supabase.com/dashboard
2. **Votre projet** → **Settings** → **API**
3. **Copiez** :
   - `service_role` (secret) → `SUPABASE_SERVICE_KEY`
   - `JWT Secret` → `JWT_SECRET`

### **2. SMS8.io (optionnel pour l'instant)**

Si vous n'avez pas encore configuré SMS8.io :
- Laissez les valeurs par défaut
- `SMS_ENABLED=false` désactive l'envoi

### **3. WaSenderAPI / WhatsApp**

- La clé privée provient de la session **NousUnique** dans WaSenderAPI.
- `WHATSAPP_ENABLED=true` active les messages WhatsApp transactionnels.
- Si l’accès aux variables Vercel n’est pas disponible, un administrateur peut enregistrer la clé via `POST /api/whatsapp/config` : elle est chiffrée avec la clé serveur Supabase avant d’être stockée et n’est jamais renvoyée par l’API.
- Les variables Vercel restent prioritaires lorsqu’elles sont définies.
- La page `/whatsapp-nousunique` permet aux administrateurs de personnaliser séparément les six messages automatiques et de consulter l’historique des envois, échecs et erreurs.
- Variables utilisables dans les messages : `{client}`, `{numero_commande}`, `{modele}`, `{couleur}`, `{livreur_nom}` et `{livreur_telephone}` selon le scénario.
- Le cron Vercel appelle `/api/whatsapp/cron/retards-commandes` chaque jour à **17h30**.
- Les excuses sont envoyées une seule fois à J, J+1 et J+2, puis s'arrêtent.

---

## ✅ APRÈS AVOIR CRÉÉ LE FICHIER

**Redémarrez le backend** :
```bash
# Arrêtez avec Ctrl+C dans le terminal backend
# Puis relancez :
cd backend
npm run dev
```

**Vous devriez voir** :
```
🟢 Mode base de données: Supabase
✅ Supabase connecté !
🚀 Serveur lancé sur le port 5000
```

---

## 📁 STRUCTURE COMPLÈTE

```
atelier-confection/
├── backend/
│   ├── .env          ← Créez ce fichier !
│   ├── server.js
│   └── ...
├── frontend/
│   └── ...
└── ...
```

---

## 🎯 QUICK COPY-PASTE

**Windows PowerShell** :
```powershell
cd backend
notepad .env
```

**Puis copiez-collez** le template ci-dessus et remplacez :
- `VOTRE_SERVICE_KEY_ICI`
- `VOTRE_JWT_SECRET_ICI`

**Sauvegardez** et **redémarrez** le backend !

---

## 🚀 ENSUITE

Une fois configuré :
1. ✅ Backend avec Supabase
2. ✅ Frontend sur http://localhost:3000
3. ✅ Login : `admin@atelier.com` / `password123`
4. ✅ Toutes vos données sont dans Supabase

---

**🎊 Configuration Supabase prête en 2 minutes ! 🚀**
















