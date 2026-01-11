# ⚡ AIDE-MÉMOIRE POUR SESSION SUIVANTE

## 🚀 STATUT ACTUEL : ✅ PROJET EN PRODUCTION

---

## 🔗 LIENS RAPIDES

| Ressource | URL | Identifiants |
|-----------|-----|--------------|
| **App Web** | https://atelier-confection.vercel.app | admin@atelier.com / admin123 |
| **GitHub** | https://github.com/hermannnande/atelier-confection.git | - |
| **Supabase** | https://rgvojiacsitztpdmruss.supabase.co | Dashboard Supabase |
| **Vercel** | https://vercel.com/dashboard | - |

---

## ✅ CE QUI FONCTIONNE PARFAITEMENT

### 1. 📞 Page APPEL (Star Feature)
- **URL** : `/appel`
- **Fonction** : Traiter les nouvelles commandes
- **Actions** : CONFIRMER → URGENT → EN ATTENTE → ANNULER
- **Bonus** : Contacts cliquables pour appeler directement (tel:)
- **Design** : Grid responsive + popup moderne

### 2. 🌐 Intégration Site Web
- **Fichier** : `formulaire-site-web.html`
- **API** : `POST /api/commandes/public` (Token: NOUSUNIQUE123)
- **Magie** : Envoi DOUBLE (API Vercel + Google Sheets)
- **Résultat** : Commandes apparaissent dans `/appel` automatiquement

### 3. 🎨 Bibliothèque Modèles
- **URL** : `/modeles`
- **Modèle actif** : "Robe Volante" (11 000 FCFA)
- **Liaison auto** : Commandes web récupèrent image + infos du modèle

### 4. 📦 Gestion Stock
- **Vue groupée** par modèle
- **Variations** : Tailles + Couleurs
- **Admin** peut modifier quantités et prix

### 5. 🚚 Workflow Complet
```
Site Web/Google Sheets
     ↓
📞 APPEL (validation)
     ↓
✅ COMMANDES
     ↓
✂️ STYLISTE (découpe)
     ↓
🧵 COUTURIER (couture)
     ↓
📦 STOCK
     ↓
🚚 LIVRAISON
```

---

## 🎯 TÂCHE EN COURS

### ⏳ Ajouter "Robe Volante" dans Supabase

**Script SQL prêt** : `AJOUTER_ROBE_VOLANTE_SIMPLE.sql`

**Étapes** :
1. Aller sur https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
2. Menu gauche : **SQL Editor**
3. Cliquer : **"+ New query"**
4. **Coller** ce script :

```sql
INSERT INTO public.modeles (nom, categorie, image, prix_base, actif)
VALUES (
  'Robe Volante',
  'Robe',
  'https://nousunique.com/wp-content/uploads/2025/12/Femme-en-robe-bleu-ciel-avec-talons-noirs-1.png',
  11000,
  true
)
ON CONFLICT (nom) DO UPDATE SET
  categorie = EXCLUDED.categorie,
  image = EXCLUDED.image,
  prix_base = EXCLUDED.prix_base,
  actif = EXCLUDED.actif,
  updated_at = NOW();
```

5. Cliquer : **▶️ Run**
6. **Résultat attendu** : `Success. 1 rows affected`

---

## 🛠️ COMMANDES RAPIDES

### Développement Local
```powershell
# Frontend (port 5173)
cd frontend
npm run dev

# Backend (port 5000)
cd backend
npm run dev
```

### Déployer sur Vercel
```powershell
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main
# Vercel redéploie auto en 2-3 min
```

### Tester API Publique
```powershell
$body = @{
    token = "NOUSUNIQUE123"
    client = "Test User"
    phone = "+225 0701234567"
    ville = "Abidjan"
    name = "Robe Volante"
    taille = "M"
    couleur = "Terracotta"
    price = "11000"
    source = "test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://atelier-confection.vercel.app/api/commandes/public" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

---

## 📁 FICHIERS IMPORTANTS

| Fichier | Description |
|---------|-------------|
| `formulaire-site-web.html` | Formulaire commande site web (envoi double) |
| `frontend/src/pages/Appel.jsx` | Page traitement commandes (contacts cliquables) |
| `backend/supabase/routes/commandes-public.js` | API publique (sans auth) |
| `supabase/migrations/20260111000000_add_modeles_table.sql` | Structure table modèles |
| `AJOUTER_ROBE_VOLANTE_SIMPLE.sql` | Script ajout Robe Volante |
| `vercel.json` | Config déploiement Vercel |
| `📚_SAUVEGARDE_COMPLETE_PROJET.md` | Documentation ultra-complète |

---

## 🔧 VARIABLES D'ENVIRONNEMENT

### Local (`.env`)
```env
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=votre_secret_jwt
USE_SUPABASE=true
PUBLIC_API_SECRET=NOUSUNIQUE123
```

### Vercel (Dashboard)
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
JWT_SECRET
VITE_API_URL=/api
PUBLIC_API_SECRET=NOUSUNIQUE123
```

---

## 🐛 SI PROBLÈME...

### Login ne marche pas
→ Vérifier variables Vercel (SUPABASE_SERVICE_KEY, JWT_SECRET)

### Commandes n'apparaissent pas dans /appel
→ Vérifier statut = `en_attente_validation` dans Supabase

### Formulaire site web échoue
→ Ouvrir Console (F12), vérifier token = `NOUSUNIQUE123`

### Erreur SQL "prix_de_base"
→ Colonne correcte : `prix_base` (pas `prix_de_base`)

---

## 💡 RAPPELS IMPORTANTS

1. **Token API publique** : `NOUSUNIQUE123`
2. **Colonne modèles** : `prix_base` (pas `prix_de_base`)
3. **Catégorie** : `Robe` (pas `Robes Femme`)
4. **Contacts cliquables** : Utilise `href="tel:+numéro"`
5. **Envoi double** : Formulaire envoie vers API + Google Sheets

---

## 🎯 PROCHAINES POSSIBILITÉS

Si le client demande :
- ✨ Notifications push nouvelles commandes
- 📊 Dashboard analytics avec graphiques
- 📄 Export PDF/Excel commandes
- 💬 Chat temps réel équipe
- 📱 Version mobile React Native
- 💰 Intégration mobile money

---

## 📞 RÉFÉRENCES RAPIDES

**Structure base de données Supabase** :
- `users` : Utilisateurs (6 rôles)
- `commandes` : Commandes (statuts multiples, historique)
- `modeles` : Bibliothèque (nom unique, prix_base, image)
- `stock` : Inventaire (variations taille/couleur)
- `livraisons` : Gestion livraisons

**Statuts commandes clés** :
- `en_attente_validation` → Nouvelles (page APPEL)
- `en_attente_paiement` → En attente client (page APPEL)
- `validee` → Confirmées (page COMMANDES)
- `confectionnee` → Prêtes (ajoutées au STOCK)

**Design système** :
- Gradients bleu/violet
- Glassmorphism
- Animations fluides
- Responsive mobile-first

---

## 🎉 EN RÉSUMÉ

✅ **Application complète et fonctionnelle**
✅ **Déployée sur Vercel en production**
✅ **Intégrations site web + Google Sheets OK**
✅ **Page Appel moderne avec contacts cliquables**
✅ **Système modèles avec liaison automatique**
✅ **Design professionnel 2026**

**Dernière action** : Ajouter "Robe Volante" dans Supabase avec le script SQL

---

**📚 Pour détails complets** → Voir `📚_SAUVEGARDE_COMPLETE_PROJET.md`

**🚀 Le projet est prêt et opérationnel !**
