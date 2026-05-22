-- Migration: ajout du marquage "emballé" partagé entre utilisateurs
-- Date: 2026-05-22
--
-- Cette migration est NON DESTRUCTIVE :
--   * elle ajoute uniquement deux colonnes nullables sur la table `commandes`
--   * elle ne modifie AUCUNE donnée existante
--   * elle peut être rejouée sans effet (IF NOT EXISTS)

-- Timestamp du marquage "emballé" (NULL = non emballé)
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS emballe_at TIMESTAMPTZ NULL;

-- Utilisateur ayant effectué le marquage (pour audit)
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS emballe_par_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;

-- Index léger pour retrouver rapidement les colis emballés
CREATE INDEX IF NOT EXISTS idx_commandes_emballe_at
  ON commandes (emballe_at)
  WHERE emballe_at IS NOT NULL;

COMMENT ON COLUMN commandes.emballe_at IS 'Date du marquage "emballé" en Préparation Colis (NULL = non emballé)';
COMMENT ON COLUMN commandes.emballe_par_id IS 'Utilisateur ayant marqué le colis comme emballé';
