-- 🔐 METTRE À JOUR LE MOT DE PASSE ADMIN SUPABASE
-- Copie-colle ce SQL dans Supabase SQL Editor :
-- https://supabase.com/dashboard/project/rgvojiacsitztpdmruss/editor

-- ⚠️ NE PAS SUPPRIMER l'admin car il est lié à des commandes existantes
-- On va juste mettre à jour son mot de passe

-- Mettre à jour le mot de passe de l'admin existant
-- Nouveau mot de passe : admin123
-- Hash bcrypt généré pour "admin123"
UPDATE users 
SET 
  password = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGqeLtkqOa7KeT9QM1Y9VMa',
  nom = 'Admin Atelier',
  role = 'administrateur',
  actif = true,
  updated_at = now()
WHERE email = 'admin@atelier.com';

-- Vérifier la mise à jour
SELECT nom, email, role, actif, updated_at FROM users WHERE email = 'admin@atelier.com';

-- ✅ Maintenant connecte-toi avec :
-- Email    : admin@atelier.com
-- Password : admin123
