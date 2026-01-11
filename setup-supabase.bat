@echo off
cls
echo.
echo ========================================
echo   CONFIGURATION SUPABASE
echo ========================================
echo.
echo Collez vos infos Supabase (Settings ^> API):
echo.
echo ========================================
echo.
echo IMPORTANT: Recuperez vos cles secretes
echo.
echo 1. Allez sur:
echo    Supabase Dashboard ^> Settings ^> API
echo.
echo 2. Copiez:
echo    - Project URL
echo    - anon key (public)
echo    - service_role key (SECRET - backend)
echo    - JWT Secret
echo.
echo ========================================
echo.
echo Voulez-vous configurer maintenant ? (O/N)
set /p choix=
if /i not "%choix%"=="O" goto fin

echo.
echo Collez votre SUPABASE_URL (ex: https://xxxx.supabase.co):
set /p supabase_url=

echo.
echo Verification de l'URL...
echo %supabase_url% | findstr /I "supabase.com/dashboard" >nul && (
  echo.
  echo ❌ ERREUR: vous avez colle une URL du dashboard Supabase.
  echo ✅ Il faut le **Project URL** qui finit par .supabase.co
  echo Exemple: https://rgvojiacsitztpdmruss.supabase.co
  goto fin
)
echo %supabase_url% | findstr /I ".supabase.co" >nul || (
  echo.
  echo ❌ ERREUR: SUPABASE_URL doit contenir .supabase.co
  echo Exemple: https://rgvojiacsitztpdmruss.supabase.co
  goto fin
)

echo.
echo Collez votre SUPABASE_ANON_KEY (anon public key):
set /p anon_key=

echo.
echo Collez votre SERVICE_ROLE_KEY:
set /p service_key=

echo.
echo Verification de la SERVICE_ROLE_KEY...
echo %service_key% | findstr /I "sb_publishable_" >nul && (
  echo.
  echo ❌ ERREUR: ceci ressemble a une publishable key (sb_publishable_...)
  echo ✅ Il faut la cle **service_role** (SECRET) dans Settings ^> API
  goto fin
)

echo.
echo Collez votre JWT_SECRET:
set /p jwt_secret=

echo.
echo Creation de backend\.env...
(
    echo PORT=5000
    echo NODE_ENV=development
    echo.
    echo # Supabase Configuration
    echo SUPABASE_URL=%supabase_url%
    echo SUPABASE_ANON_KEY=%anon_key%
    echo SUPABASE_SERVICE_KEY=%service_key%
    echo.
    echo # JWT Secret
    echo JWT_SECRET=%jwt_secret%
) > backend\.env

echo Creation de frontend\.env...
(
    echo VITE_API_URL=http://localhost:5000/api
    echo VITE_SUPABASE_URL=%supabase_url%
    echo VITE_SUPABASE_ANON_KEY=%anon_key%
) > frontend\.env

echo.
echo ========================================
echo   CONFIGURATION TERMINEE !
echo ========================================
echo.
echo PROCHAINES ETAPES:
echo.
echo 1. Executez les migrations SQL dans Supabase Studio
echo    Supabase Dashboard ^> SQL Editor
echo.
echo 2. Installez les dependances:
echo    npm run install-all
echo.
echo 3. Lancez l'application:
echo    npm run dev
echo.
echo Voir CONFIGURATION_SUPABASE.md pour les details
echo.

echo Test de connexion Supabase (optionnel)...
cd backend
node scripts\check-supabase.js
cd ..

:fin
pause


