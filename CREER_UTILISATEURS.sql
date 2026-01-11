-- 👤 CRÉER LES UTILISATEURS DE TEST
-- Copie-colle ce SQL dans Supabase Studio (SQL Editor)
-- https://supabase.com/dashboard/project/rgvojiacsitztpdmruss/editor

-- 🔐 Tous les mots de passe sont hashés avec bcrypt

-- 1️⃣ ADMINISTRATEUR
INSERT INTO users (nom, email, password, role, telephone, actif)
VALUES (
  'Admin Atelier',
  'admin@atelier.com',
  '$2a$10$Yw31MgAlnNpsDT.f5Qu2wOqPoc2gDcne7.MES7MhEp/At1W8Ose.W',
  'administrateur',
  '0612345678',
  true
)
ON CONFLICT (email) DO UPDATE SET
  nom = EXCLUDED.nom,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  telephone = EXCLUDED.telephone,
  actif = EXCLUDED.actif,
  updated_at = now();

-- 2️⃣ GESTIONNAIRE
INSERT INTO users (nom, email, password, role, telephone, actif)
VALUES (
  'Marie Dubois',
  'gestionnaire@atelier.com',
  '$2a$10$Yw31MgAlnNpsDT.f5Qu2wOqPoc2gDcne7.MES7MhEp/At1W8Ose.W',
  'gestionnaire',
  '0612345679',
  true
)
ON CONFLICT (email) DO UPDATE SET
  nom = EXCLUDED.nom,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  telephone = EXCLUDED.telephone,
  actif = EXCLUDED.actif,
  updated_at = now();

-- 3️⃣ APPELANT
INSERT INTO users (nom, email, password, role, telephone, actif)
VALUES (
  'Jean Martin',
  'appelant@atelier.com',
  '$2a$10$Yw31MgAlnNpsDT.f5Qu2wOqPoc2gDcne7.MES7MhEp/At1W8Ose.W',
  'appelant',
  '0612345680',
  true
)
ON CONFLICT (email) DO UPDATE SET
  nom = EXCLUDED.nom,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  telephone = EXCLUDED.telephone,
  actif = EXCLUDED.actif,
  updated_at = now();

-- 4️⃣ STYLISTE
INSERT INTO users (nom, email, password, role, telephone, actif)
VALUES (
  'Sophie Laurent',
  'styliste@atelier.com',
  '$2a$10$Yw31MgAlnNpsDT.f5Qu2wOqPoc2gDcne7.MES7MhEp/At1W8Ose.W',
  'styliste',
  '0612345681',
  true
)
ON CONFLICT (email) DO UPDATE SET
  nom = EXCLUDED.nom,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  telephone = EXCLUDED.telephone,
  actif = EXCLUDED.actif,
  updated_at = now();

-- 5️⃣ COUTURIER
INSERT INTO users (nom, email, password, role, telephone, actif)
VALUES (
  'Pierre Moreau',
  'couturier@atelier.com',
  '$2a$10$Yw31MgAlnNpsDT.f5Qu2wOqPoc2gDcne7.MES7MhEp/At1W8Ose.W',
  'couturier',
  '0612345682',
  true
)
ON CONFLICT (email) DO UPDATE SET
  nom = EXCLUDED.nom,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  telephone = EXCLUDED.telephone,
  actif = EXCLUDED.actif,
  updated_at = now();

-- 6️⃣ LIVREUR
INSERT INTO users (nom, email, password, role, telephone, actif)
VALUES (
  'Thomas Bernard',
  'livreur@atelier.com',
  '$2a$10$Yw31MgAlnNpsDT.f5Qu2wOqPoc2gDcne7.MES7MhEp/At1W8Ose.W',
  'livreur',
  '0612345683',
  true
)
ON CONFLICT (email) DO UPDATE SET
  nom = EXCLUDED.nom,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  telephone = EXCLUDED.telephone,
  actif = EXCLUDED.actif,
  updated_at = now();

-- ✅ TERMINÉ !
-- Tous les utilisateurs ont le mot de passe : admin123
SELECT 'Utilisateurs créés avec succès !' as message;
SELECT nom, email, role FROM users ORDER BY created_at;
