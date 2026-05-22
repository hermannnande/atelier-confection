-- ========================================================================
-- A EXÉCUTER UNE FOIS dans le SQL Editor de Supabase
-- (Atelier Confection → Préparation Colis → marquage "emballé" partagé)
-- ========================================================================
--
-- Ce script est SAFE :
--   * Il n'ajoute que deux colonnes nullables sur la table `commandes`
--   * Il ne modifie AUCUNE donnée existante
--   * Il peut être rejoué sans effet (IF NOT EXISTS)
--
-- Pour exécuter :
--   1. Ouvrir Supabase → onglet "SQL Editor"
--   2. Coller tout le contenu de ce fichier
--   3. Cliquer sur "Run"
--   4. Vérifier le message de succès en bas
-- ========================================================================

ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS emballe_at TIMESTAMPTZ NULL;

ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS emballe_par_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commandes_emballe_at
  ON commandes (emballe_at)
  WHERE emballe_at IS NOT NULL;

COMMENT ON COLUMN commandes.emballe_at IS 'Date du marquage "emballé" en Préparation Colis (NULL = non emballé)';
COMMENT ON COLUMN commandes.emballe_par_id IS 'Utilisateur ayant marqué le colis comme emballé';

-- Vérification (optionnel) : doit retourner les deux colonnes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'commandes'
  AND column_name IN ('emballe_at', 'emballe_par_id');
