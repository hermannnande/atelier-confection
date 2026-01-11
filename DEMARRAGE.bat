@echo off
cls
echo.
echo ========================================================
echo.
echo       ATELIER DE CONFECTION - DEMARRAGE
echo.
echo ========================================================
echo.
echo  CHOISISSEZ VOTRE BASE DE DONNEES :
echo.
echo  [1] MongoDB (Local - Traditionnel)
echo  [2] Supabase Cloud (Moderne - Recommande)
echo  [3] Supabase Local (Avec Docker)
echo.
echo ========================================================
echo.
set /p choix="Votre choix (1, 2 ou 3) : "

if "%choix%"=="1" goto mongodb
if "%choix%"=="2" goto supabase_cloud
if "%choix%"=="3" goto supabase_local
goto fin

:mongodb
cls
echo.
echo ========================================================
echo    LANCEMENT AVEC MONGODB
echo ========================================================
echo.
echo [1/4] Demarrage de MongoDB...
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB deja demarre ou erreur
) else (
    echo MongoDB demarre avec succes
)
echo.

echo [2/4] Verification de la base de donnees...
if not exist "backend\.db-initialized" (
    echo Initialisation de la base de donnees...
    cd backend
    node scripts/seed.js
    if %errorlevel% equ 0 (
        echo. > .db-initialized
        echo Base de donnees initialisee
    )
    cd ..
) else (
    echo Base de donnees deja initialisee
)
echo.

echo [3/4] Installation des dependances...
if not exist "node_modules" (
    call npm run install-all
)
echo.

echo [4/4] Lancement de l'application...
echo.
echo ========================================================
echo   APPLICATION PRETE !
echo ========================================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo.
echo   Connexion: admin@atelier.com / password123
echo.
echo ========================================================
echo.
npm run dev
goto fin

:supabase_cloud
cls
echo.
echo ========================================================
echo    LANCEMENT AVEC SUPABASE CLOUD
echo ========================================================
echo.
echo Etapes a suivre :
echo.
echo 1. Creez un compte sur https://supabase.com
echo 2. Creez un nouveau projet
echo 3. Copiez vos credentials (URL, keys)
echo 4. Configurez backend/.env avec vos credentials
echo 5. Executez les migrations SQL dans Supabase Studio
echo.
echo Voir le guide complet : LANCEMENT_SUPABASE.md
echo.
echo ========================================================
echo.
echo Appuyez sur une touche pour ouvrir le guide...
pause >nul
start LANCEMENT_SUPABASE.md
goto fin

:supabase_local
cls
echo.
echo ========================================================
echo    LANCEMENT AVEC SUPABASE LOCAL
echo ========================================================
echo.
echo [1/3] Verification de Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Docker n'est pas installe ou pas demarre
    echo Installez Docker Desktop: https://www.docker.com/products/docker-desktop
    echo.
    pause
    goto fin
)
echo Docker OK
echo.

echo [2/3] Demarrage de Supabase...
supabase start
if %errorlevel% neq 0 (
    echo ERREUR: Impossible de demarrer Supabase
    echo Verifiez que Docker Desktop est demarre
    pause
    goto fin
)
echo.

echo [3/3] Lancement de l'application...
echo.
echo ========================================================
echo   APPLICATION PRETE !
echo ========================================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo   Supabase Studio: http://localhost:54323
echo.
echo   Connexion: admin@atelier.com / password123
echo.
echo ========================================================
echo.
npm run dev
goto fin

:fin
echo.
echo Programme termine.
pause



