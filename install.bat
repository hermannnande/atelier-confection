@echo off
echo ================================================
echo   ATELIER DE CONFECTION - INSTALLATION
echo ================================================
echo.

REM Vérifier Node.js
echo [1/5] Vérification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installé !
    echo Téléchargez-le depuis https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js installé
echo.

REM Vérifier MongoDB
echo [2/5] Vérification de MongoDB...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ATTENTION: MongoDB ne semble pas installé
    echo Téléchargez-le depuis https://www.mongodb.com/try/download/community
    echo.
    echo Voulez-vous continuer quand même ? (O/N)
    set /p continue=
    if /i not "%continue%"=="O" exit /b 1
)
echo ✓ MongoDB installé
echo.

REM Installation des dépendances
echo [3/5] Installation des dépendances...
echo Cela peut prendre quelques minutes...
call npm run install-all
if %errorlevel% neq 0 (
    echo ERREUR lors de l'installation des dépendances
    pause
    exit /b 1
)
echo ✓ Dépendances installées
echo.

REM Vérifier .env
echo [4/5] Configuration de l'environnement...
if not exist "backend\.env" (
    echo Création du fichier backend\.env...
    (
        echo PORT=5000
        echo MONGODB_URI=mongodb://localhost:27017/atelier-confection
        echo JWT_SECRET=changez_moi_secret_key_production_2026_tres_securise
        echo NODE_ENV=development
    ) > backend\.env
    echo ✓ Fichier .env créé
) else (
    echo ✓ Fichier .env existe déjà
)
echo.

REM Démarrer MongoDB
echo [5/5] Démarrage de MongoDB...
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB est déjà démarré ou nécessite des privilèges administrateur
) else (
    echo ✓ MongoDB démarré
)
echo.

echo ================================================
echo   INSTALLATION TERMINÉE !
echo ================================================
echo.
echo Prochaines étapes :
echo.
echo 1. Initialisez la base de données :
echo    cd backend
echo    node scripts/seed.js
echo    cd ..
echo.
echo 2. Lancez l'application :
echo    npm run dev
echo.
echo 3. Ouvrez votre navigateur :
echo    http://localhost:3000
echo.
echo 4. Connectez-vous avec :
echo    Email: admin@atelier.com
echo    Mot de passe: password123
echo.
echo ================================================
pause




