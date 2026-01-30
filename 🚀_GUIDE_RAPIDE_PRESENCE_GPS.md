# 🚀 GUIDE RAPIDE - SYSTÈME DE PRÉSENCE GPS

## ✅ DÉMARRAGE EN 10 MINUTES

---

## ÉTAPE 1 : Migration SQL (2 minutes)

### 📝 Actions
1. Ouvrir **Supabase Dashboard** : https://supabase.com/dashboard
2. Votre projet → **SQL Editor** → **New Query**
3. Copier le contenu du fichier : `supabase/migrations/20260130_add_attendance_system.sql`
4. Coller dans l'éditeur
5. Cliquer **Run** ▶️

### ✅ Résultat attendu
```
Success. Tables créées : attendances, store_config
```

---

## ÉTAPE 2 : Obtenir Vos Coordonnées GPS (2 minutes)

### 🌍 Google Maps
1. Ouvrir : https://www.google.com/maps
2. Rechercher votre atelier
3. Clic-droit sur l'emplacement exact
4. Copier les coordonnées (ex: `5.353859, -3.868327`)

**Noter :**
- Latitude : `________`
- Longitude : `________`

---

## ÉTAPE 3 : Configuration GPS (3 minutes)

### 📝 Modifier le Script

1. Ouvrir : `backend/scripts/setup-attendance.js`
2. Lignes 37-38, remplacer par vos coordonnées :
   ```javascript
   latitude: 5.353859,   // ← VOTRE LATITUDE
   longitude: -3.868327, // ← VOTRE LONGITUDE
   ```
3. Optionnel - Ligne 40-43 (paramètres) :
   ```javascript
   rayon_tolerance: 50,      // Rayon en mètres
   heure_ouverture: '08:30', // Heure d'ouverture
   heure_fermeture: '17:30', // Heure de fermeture
   tolerance_retard: 15      // Minutes de tolérance
   ```

### 🚀 Exécuter

```bash
cd backend
node scripts/setup-attendance.js
```

### ✅ Résultat attendu
```
╔══════════════════════════════════════════════════╗
║      ✅ CONFIGURATION RÉUSSIE !                  ║
╚══════════════════════════════════════════════════╝
```

---

## ÉTAPE 4 : Déployer (3 minutes)

```bash
git add .
git commit -m "feat: Système de présence GPS"
git push origin main
```

Attendre 2-3 minutes que **Vercel** déploie automatiquement.

---

## ÉTAPE 5 : Tester (2 minutes)

### 🧪 Test Simulation (Chrome)

1. Ouvrir votre app : `https://votre-app.vercel.app`
2. Se connecter (appelant, styliste, couturier, ou gestionnaire)
3. **F12** → **...** → **More tools** → **Sensors**
4. **Location** → **Custom location** → Entrer vos coordonnées
5. Menu → **Pointage GPS**
6. Cliquer **Marquer ma présence**

### ✅ Résultat attendu
```
✅ Présence enregistrée à 08:15
Badge : PRÉSENT (vert)
Distance : 12m
```

---

## 📊 UTILISATION QUOTIDIENNE

### Pour les Employés

**Matin** :
- Menu → **Pointage GPS**
- Cliquer **Marquer ma présence**
- ✅ Confirmé !

**Soir** :
- Menu → **Pointage GPS**
- Cliquer **Marquer mon départ**
- ✅ Confirmé !

### Pour Admin/Gestionnaire

- Menu → **Historique Présences**
- Voir les présences du jour
- Consulter les statistiques

---

## 🐛 PROBLÈMES COURANTS

### "Configuration du magasin non trouvée"
```bash
cd backend
node scripts/setup-attendance.js
```

### "Géolocalisation non autorisée"
- Chrome : Cliquer 🔒 → Localisation → Autoriser
- Mobile : Paramètres → App → Autorisations → Localisation

### Pointage toujours refusé
- Vérifier les coordonnées GPS dans la DB (Supabase)
- Augmenter le rayon de tolérance (50m → 100m)
- Vérifier que le GPS du téléphone est activé

---

## 📞 RÔLES CONCERNÉS

| Rôle | Pointer ? | Voir Historique ? |
|------|-----------|-------------------|
| **Gestionnaire** | ✅ Oui | ✅ Oui |
| **Appelant** | ✅ Oui | ❌ Non |
| **Styliste** | ✅ Oui | ❌ Non |
| **Couturier** | ✅ Oui | ❌ Non |
| **Admin** | ❌ Non | ✅ Oui |
| **Livreur** | ❌ Non | ❌ Non |

---

## ✨ FONCTIONNALITÉS

### ✅ Ce qui fonctionne

- ✅ Pointage arrivée avec GPS
- ✅ Pointage départ avec GPS
- ✅ Validation automatique (rayon 50m)
- ✅ Détection de retard (tolérance 15 min)
- ✅ Refus si hors zone + réessai possible
- ✅ Badge statut : ABSENT/PRÉSENT/RETARD/PARTI
- ✅ Historique complet pour admin/gestionnaire
- ✅ Statistiques sur 30 jours
- ✅ Design moderne et responsive

---

## 🎯 CHECKLIST COMPLÈTE

- [ ] Migration SQL exécutée sur Supabase
- [ ] Tables créées (attendances, store_config)
- [ ] Coordonnées GPS obtenues (Google Maps)
- [ ] Script setup-attendance.js modifié
- [ ] Script exécuté avec succès
- [ ] Code committé et pushé sur GitHub
- [ ] Vercel a redéployé (vérifier dashboard)
- [ ] Test simulation Chrome réussi
- [ ] Test sur mobile réussi
- [ ] Employés formés à l'utilisation

---

## 📱 ACCÈS RAPIDE

### Pages Créées

- **`/presence`** : Pointage GPS (employés)
- **`/historique-presences`** : Historique complet (admin/gestionnaire)

### API Routes

- **POST** `/api/attendance/mark-arrival` : Pointer arrivée
- **POST** `/api/attendance/mark-departure` : Pointer départ
- **GET** `/api/attendance/my-attendance-today` : Mon pointage du jour
- **GET** `/api/attendance/history` : Historique (admin)
- **GET** `/api/attendance/statistics` : Statistiques (admin)
- **GET** `/api/attendance/store-config` : Configuration atelier
- **PUT** `/api/attendance/store-config` : Modifier config (admin)

---

## 🔧 CONFIGURATION RAPIDE

### Changer le Rayon de Tolérance

**SQL** (Supabase) :
```sql
UPDATE store_config 
SET rayon_tolerance = 100 
WHERE id = 1;
```

### Changer les Horaires

```sql
UPDATE store_config 
SET 
  heure_ouverture = '07:30',
  heure_fermeture = '19:00',
  tolerance_retard = 20
WHERE id = 1;
```

---

## 📚 DOCUMENTATION COMPLÈTE

Pour plus de détails, consulter :
- 📄 **`📍_SYSTEME_PRESENCE_GPS.md`** : Documentation complète

---

## 🎉 C'EST TOUT !

Votre système de présence GPS est **opérationnel** !

Les employés peuvent **pointer** dès maintenant. 🚀

---

**Créé le 30 Janvier 2026**

