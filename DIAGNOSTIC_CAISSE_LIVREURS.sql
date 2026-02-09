-- 🔍 SCRIPT DE DIAGNOSTIC - Caisse Livreurs
-- Exécutez ce script dans Supabase SQL Editor pour voir ce qui se passe

-- ========================================
-- 1. Vérifier que la table sessions_caisse existe
-- ========================================
SELECT 'Table sessions_caisse :' as check_name, 
       CASE WHEN EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_name = 'sessions_caisse'
       ) THEN '✅ EXISTE' ELSE '❌ N''EXISTE PAS' END as status;

-- ========================================
-- 2. Vérifier que la colonne session_caisse_id existe dans livraisons
-- ========================================
SELECT 'Colonne session_caisse_id :' as check_name,
       CASE WHEN EXISTS (
         SELECT FROM information_schema.columns 
         WHERE table_name = 'livraisons' 
         AND column_name = 'session_caisse_id'
       ) THEN '✅ EXISTE' ELSE '❌ N''EXISTE PAS' END as status;

-- ========================================
-- 3. Compter les livraisons par statut
-- ========================================
SELECT 'Livraisons par statut :' as info,
       statut,
       COUNT(*) as nombre
FROM livraisons
GROUP BY statut
ORDER BY nombre DESC;

-- ========================================
-- 4. Voir les livreurs et leurs IDs
-- ========================================
SELECT 'Liste des livreurs :' as info,
       id,
       nom,
       email,
       role
FROM users
WHERE role = 'livreur'
ORDER BY nom;

-- ========================================
-- 5. Voir les livraisons "livree" sans session
-- ========================================
SELECT 'Livraisons LIVREE sans session :' as info,
       l.id,
       l.statut,
       l.livreur_id,
       u.nom as livreur_nom,
       l.session_caisse_id,
       c.numero_commande,
       c.prix
FROM livraisons l
LEFT JOIN users u ON l.livreur_id = u.id
LEFT JOIN commandes c ON l.commande_id = c.id
WHERE l.statut = 'livree'
  AND l.session_caisse_id IS NULL
ORDER BY l.created_at DESC;

-- ========================================
-- 6. Voir toutes les livraisons (peu importe le statut)
-- ========================================
SELECT 'Toutes les livraisons :' as info,
       l.id,
       l.statut,
       l.livreur_id,
       u.nom as livreur_nom,
       l.session_caisse_id,
       c.numero_commande,
       c.prix,
       l.created_at
FROM livraisons l
LEFT JOIN users u ON l.livreur_id = u.id
LEFT JOIN commandes c ON l.commande_id = c.id
ORDER BY l.created_at DESC
LIMIT 10;

-- ========================================
-- 7. Vérifier les sessions existantes
-- ========================================
SELECT 'Sessions existantes :' as info,
       s.id,
       s.statut,
       s.livreur_id,
       u.nom as livreur_nom,
       s.montant_total,
       s.nombre_livraisons,
       s.date_debut,
       s.date_cloture
FROM sessions_caisse s
LEFT JOIN users u ON s.livreur_id = u.id
ORDER BY s.created_at DESC;
























