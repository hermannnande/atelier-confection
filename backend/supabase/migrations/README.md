# Migrations Supabase

Ce dossier contient les scripts SQL de migration pour la base de données Supabase.

## Comment exécuter les migrations

### Option 1 : Via l'interface Supabase Dashboard

1. Connectez-vous à [https://supabase.com](https://supabase.com)
2. Ouvrez votre projet
3. Allez dans **SQL Editor** (icône de code SQL dans la barre latérale)
4. Copiez le contenu du fichier de migration
5. Collez-le dans l'éditeur SQL
6. Cliquez sur **Run** pour exécuter

### Option 2 : Via la CLI Supabase

```bash
# Installer la CLI si nécessaire
npm install -g supabase

# Se connecter à votre projet
supabase link --project-ref your-project-ref

# Exécuter une migration spécifique
supabase db execute < backend/supabase/migrations/add_paiement_fields.sql
```

### Option 3 : Manuellement via psql

```bash
psql -h your-db-host -U postgres -d postgres -f backend/supabase/migrations/add_paiement_fields.sql
```

## Migrations disponibles

### add_paiement_fields.sql
**Date:** 2026-01-12  
**Description:** Ajoute les champs de suivi des paiements dans la table `livraisons`

**Champs ajoutés:**
- `paiement_recu` (BOOLEAN) - Indique si le paiement a été confirmé par le gestionnaire
- `date_paiement` (TIMESTAMP) - Date de confirmation du paiement

**Impact:** Cette migration est nécessaire pour que la fonctionnalité "Caisse Livreurs" fonctionne correctement.

## Vérification après migration

Pour vérifier que la migration s'est bien exécutée :

```sql
-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'livraisons'
AND column_name IN ('paiement_recu', 'date_paiement');
```

Le résultat devrait afficher :
```
column_name    | data_type                   | is_nullable | column_default
---------------+-----------------------------+-------------+---------------
paiement_recu  | boolean                     | YES         | false
date_paiement  | timestamp with time zone    | YES         | NULL
```

