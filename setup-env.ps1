# Configuration de l'environnement Backend
Write-Host "Configuration du backend..." -ForegroundColor Cyan

$backendEnv = @"
PORT=5000
MONGODB_URI=mongodb://localhost:27017/atelier-confection
JWT_SECRET=changez_moi_secret_key_production_2026_tres_securise
NODE_ENV=development
"@

Set-Content -Path "backend\.env" -Value $backendEnv -Force
Write-Host "✓ backend\.env créé" -ForegroundColor Green

# Configuration de l'environnement Frontend
Write-Host "Configuration du frontend..." -ForegroundColor Cyan

$frontendEnv = @"
VITE_API_URL=http://localhost:5000/api
"@

Set-Content -Path "frontend\.env" -Value $frontendEnv -Force
Write-Host "✓ frontend\.env créé" -ForegroundColor Green

Write-Host ""
Write-Host "Configuration terminée !" -ForegroundColor Green
Write-Host "Vous pouvez maintenant lancer l'application avec: npm run dev" -ForegroundColor Yellow




