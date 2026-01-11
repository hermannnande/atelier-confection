@echo off
echo ================================================
echo   ATELIER DE CONFECTION - DEMARRAGE
echo ================================================
echo.

REM Vérifier MongoDB
echo Démarrage de MongoDB...
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB est déjà démarré ou nécessite des privilèges admin
) else (
    echo ✓ MongoDB démarré
)
echo.

REM Vérifier si la DB est initialisée
if not exist "backend\.db-initialized" (
    echo ================================================
    echo   PREMIÈRE UTILISATION
    echo ================================================
    echo.
    echo La base de données n'a pas encore été initialisée.
    echo.
    echo Voulez-vous créer les comptes utilisateurs maintenant ? (O/N)
    set /p init=
    if /i "%init%"=="O" (
        echo.
        echo Initialisation de la base de données...
        cd backend
        node scripts/seed.js
        if %errorlevel% equ 0 (
            echo. > .db-initialized
            echo ✓ Base de données initialisée
        ) else (
            echo ✗ Erreur lors de l'initialisation
        )
        cd ..
    )
    echo.
)

echo ================================================
echo   LANCEMENT DE L'APPLICATION
echo ================================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arrêter
echo ================================================
echo.

REM Lancer l'application
npm run dev




