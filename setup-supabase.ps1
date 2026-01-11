# Configuration automatique de Supabase
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURATION SUPABASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Collez votre SUPABASE_URL (ex: https://xxxx.supabase.co) :" -ForegroundColor Green
$SUPABASE_URL = Read-Host

Write-Host ""
Write-Host "Collez votre SUPABASE_ANON_KEY (clé publique anon) :" -ForegroundColor Green
$ANON_KEY = Read-Host

Write-Host "IMPORTANT: Vous avez besoin de 2 clés supplémentaires:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SERVICE_ROLE_KEY (secrète)" -ForegroundColor Yellow
Write-Host "2. JWT_SECRET" -ForegroundColor Yellow
Write-Host ""
Write-Host "Allez dans Supabase Dashboard > Settings > API pour récupérer les clés" -ForegroundColor Cyan
Write-Host ""

# Demander la service role key
Write-Host "Collez votre SERVICE_ROLE_KEY (SECRÈTE, pour le backend) :" -ForegroundColor Green
$SERVICE_KEY = Read-Host

# Demander le JWT secret
Write-Host ""
Write-Host "Collez votre JWT_SECRET (JWT Settings dans Supabase) :" -ForegroundColor Green
$JWT_SECRET = Read-Host

# Créer backend/.env
Write-Host ""
Write-Host "Création de backend/.env..." -ForegroundColor Cyan

$backendEnv = @"
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_KEY=$SERVICE_KEY

# JWT Secret
JWT_SECRET=$JWT_SECRET
"@

Set-Content -Path "backend\.env" -Value $backendEnv -Force
Write-Host "✓ backend\.env créé" -ForegroundColor Green

# Créer frontend/.env
Write-Host "Création de frontend\.env..." -ForegroundColor Cyan

$frontendEnv = @"
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
"@

Set-Content -Path "frontend\.env" -Value $frontendEnv -Force
Write-Host "✓ frontend\.env créé" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  CONFIGURATION TERMINÉE !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "PROCHAINES ÉTAPES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Exécutez les migrations SQL dans Supabase Studio:" -ForegroundColor White
Write-Host "   Supabase Dashboard > SQL Editor" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Copiez et exécutez:" -ForegroundColor White
Write-Host "   - supabase/migrations/20260110000000_initial_schema.sql" -ForegroundColor Gray
Write-Host "   - supabase/migrations/20260110000001_seed_data.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Installez les dépendances:" -ForegroundColor White
Write-Host "   npm run install-all" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Lancez l'application:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Voir CONFIGURATION_SUPABASE.md pour plus de détails" -ForegroundColor Cyan
Write-Host ""


