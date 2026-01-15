-- 🔍 VÉRIFICATION DES PERMISSIONS ET RÔLES
-- À exécuter dans Supabase SQL Editor pour vérifier que tout est OK

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1️⃣ VÉRIFIER QUE LES UTILISATEURS EXISTENT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
  id,
  nom,
  email,
  role,
  actif,
  created_at
FROM users
WHERE role IN ('appelant', 'gestionnaire', 'administrateur')
ORDER BY role, nom;

-- ✅ Vous devez voir au moins 3 utilisateurs actifs


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2️⃣ VÉRIFIER LES CONTRAINTES DE RÔLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND conname LIKE '%role%';

-- ✅ Vous devez voir la contrainte qui autorise: 
--    'administrateur', 'gestionnaire', 'appelant', 'styliste', 'couturier', 'livreur'


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3️⃣ VÉRIFIER LE TRIGGER DE GÉNÉRATION DU NUMÉRO DE COMMANDE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
  tgname as trigger_name,
  tgtype,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'commandes'::regclass
  AND tgname = 'generate_numero_commande_trigger';

-- ✅ Vous devez voir le trigger 'generate_numero_commande_trigger'


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4️⃣ TESTER LA CRÉATION D'UNE COMMANDE (AVEC UN APPELANT)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- D'abord, récupérer l'ID d'un appelant
DO $$
DECLARE
  v_appelant_id uuid;
  v_commande_id uuid;
BEGIN
  -- Récupérer l'ID d'un appelant actif
  SELECT id INTO v_appelant_id
  FROM users
  WHERE role = 'appelant' AND actif = true
  LIMIT 1;

  IF v_appelant_id IS NULL THEN
    RAISE EXCEPTION 'Aucun appelant actif trouvé. Créez-en un d''abord !';
  END IF;

  -- Créer une commande de test
  INSERT INTO commandes (
    numero_commande,
    client,
    modele,
    taille,
    couleur,
    prix,
    urgence,
    note_appelant,
    appelant_id,
    statut,
    historique
  ) VALUES (
    NULL, -- Le trigger va générer le numéro automatiquement
    jsonb_build_object(
      'nom', 'Client Test Permissions',
      'contact', '0712345678',
      'ville', 'Ville Test'
    ),
    jsonb_build_object(
      'nom', 'Robe Test',
      'image', '',
      'description', 'Test de permissions'
    ),
    'M',
    'Rouge',
    15000,
    false,
    'Test de création par appelant',
    v_appelant_id,
    'nouvelle',
    jsonb_build_array(
      jsonb_build_object(
        'action', 'Commande créée (test SQL)',
        'statut', 'nouvelle',
        'utilisateur', v_appelant_id,
        'date', now()
      )
    )
  )
  RETURNING id INTO v_commande_id;

  RAISE NOTICE 'Commande de test créée avec succès ! ID: %', v_commande_id;
END $$;

-- ✅ Si ça fonctionne, vous verrez "Commande de test créée avec succès !"
-- ✅ Le numéro de commande doit être généré automatiquement (ex: CMD000001)


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5️⃣ VÉRIFIER QUE LA COMMANDE A ÉTÉ CRÉÉE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
  id,
  numero_commande,
  client->>'nom' as client_nom,
  modele->>'nom' as modele_nom,
  taille,
  couleur,
  prix,
  statut,
  urgence,
  note_appelant,
  created_at
FROM commandes
WHERE client->>'nom' = 'Client Test Permissions'
ORDER BY created_at DESC
LIMIT 1;

-- ✅ Vous devez voir votre commande de test avec un numero_commande généré


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6️⃣ NETTOYER (SUPPRIMER LA COMMANDE DE TEST)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DELETE FROM commandes
WHERE client->>'nom' = 'Client Test Permissions';

-- ✅ Commande de test supprimée


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🎯 RÉSUMÉ DES VÉRIFICATIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 'Vérifications terminées !' as message;

-- Si tous les tests passent :
-- ✅ Les utilisateurs appelant/gestionnaire existent
-- ✅ Les contraintes de rôle sont correctes
-- ✅ Le trigger génère bien les numéros de commande
-- ✅ Les commandes peuvent être créées avec les bons rôles

-- Si vous avez des erreurs :
-- 1. Vérifiez que les utilisateurs existent (étape 1)
-- 2. Exécutez le fichier CREER_UTILISATEURS.sql si nécessaire
-- 3. Vérifiez que le trigger existe (étape 3)
-- 4. Réexécutez les migrations Supabase si nécessaire

