# Configuration Supabase pour Atelier de Confection

## Étapes d'installation

### 1. Initialiser Supabase
```bash
supabase init
```

### 2. Démarrer Supabase localement
```bash
supabase start
```

### 3. Créer les tables
```bash
supabase db push
```

## Configuration

Une fois Supabase démarré, vous obtiendrez :
- API URL: http://localhost:54321
- API Key (anon): votre_clé_publique
- API Key (service_role): votre_clé_privée
- Database URL: postgresql://postgres:postgres@localhost:54322/postgres

## Variables d'environnement

Ajoutez dans `backend/.env`:
```
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=votre_service_role_key
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

## Structure des tables

Les migrations SQL sont dans `supabase/migrations/`



