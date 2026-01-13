# 🔄 Migration: Champs de Paiement pour Livraisons

## 📝 Description

Cette migration ajoute les champs nécessaires pour suivre les paiements des livreurs dans la table `livraisons`.

---

## 🎯 Champs ajoutés

| Champ | Type | Default | Description |
|-------|------|---------|-------------|
| `paiement_recu` | BOOLEAN | FALSE | Indique si l'argent a été remis |
| `date_paiement` | TIMESTAMP | NULL | Date de réception du paiement |

---

## 🚀 Comment exécuter la migration

### **Option 1 : Via Supabase Dashboard** (Recommandé)

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (menu gauche)
4. Cliquez sur **+ New query**
5. Copiez-collez le contenu du fichier :
   ```
   supabase/migrations/20260113000000_add_paiement_fields_to_livraisons.sql
   ```
6. Cliquez sur **Run** ▶️
7. Vérifiez le succès ✅

---

### **Option 2 : Via Supabase CLI**

```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref VOTRE_PROJECT_REF

# Appliquer la migration
supabase db push
```

---

## ✅ Vérification

Après avoir exécuté la migration, vérifiez que les colonnes ont été ajoutées :

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'livraisons'
  AND column_name IN ('paiement_recu', 'date_paiement');
```

**Résultat attendu** :
```
column_name    | data_type                   | column_default
---------------+-----------------------------+----------------
paiement_recu  | boolean                     | false
date_paiement  | timestamp with time zone    | NULL
```

---

## 📊 Impact

- ✅ **Aucune donnée existante n'est affectée**
- ✅ Toutes les livraisons existantes auront `paiement_recu = FALSE`
- ✅ Un index est créé pour optimiser les requêtes
- ✅ Compatible avec MongoDB (utilise déjà ces champs)

---

## 🔧 Rollback (Si besoin)

Pour annuler cette migration :

```sql
-- Supprimer l'index
DROP INDEX IF EXISTS idx_livraisons_paiement_recu;

-- Supprimer les colonnes
ALTER TABLE livraisons DROP COLUMN IF EXISTS paiement_recu;
ALTER TABLE livraisons DROP COLUMN IF EXISTS date_paiement;
```

---

## 📝 Fichiers modifiés

1. ✅ `supabase/migrations/20260113000000_add_paiement_fields_to_livraisons.sql`
2. ✅ `backend/supabase/map.js` - Mapping des champs
3. ✅ `frontend/src/pages/CaisseLivreurs.jsx` - Interface utilisateur
4. ✅ `backend/routes/livraisons.js` - Endpoint MongoDB
5. ✅ `backend/supabase/routes/livraisons.js` - Endpoint Supabase

---

## 🎉 Résultat final

Après cette migration, la page **Caisse Livreurs** pourra :
- ✅ Marquer l'argent comme remis
- ✅ Séparer l'argent remis de l'argent à remettre
- ✅ Éviter que l'ancien argent s'additionne aux nouveaux colis
- ✅ Afficher un badge "PAYÉ" sur les livraisons payées

