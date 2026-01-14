-- Migration: Créer le système de sessions pour la caisse livreurs
-- Date: 2026-01-14

-- Créer la table sessions_caisse
CREATE TABLE IF NOT EXISTS sessions_caisse (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  livreur_id UUID NOT NULL,
  statut TEXT NOT NULL DEFAULT 'ouverte',
  montant_total NUMERIC NOT NULL DEFAULT 0,
  nombre_livraisons INTEGER NOT NULL DEFAULT 0,
  date_debut TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_cloture TIMESTAMP WITH TIME ZONE,
  gestionnaire_id UUID,
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT sessions_caisse_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_caisse_livreur_id_fkey FOREIGN KEY (livreur_id) REFERENCES users (id),
  CONSTRAINT sessions_caisse_gestionnaire_id_fkey FOREIGN KEY (gestionnaire_id) REFERENCES users (id),
  CONSTRAINT sessions_caisse_statut_check CHECK (
    statut = ANY (ARRAY['ouverte'::TEXT, 'cloturee'::TEXT])
  )
);

-- Ajouter le champ session_caisse_id à la table livraisons
ALTER TABLE livraisons 
ADD COLUMN IF NOT EXISTS session_caisse_id UUID;

-- Ajouter la contrainte de clé étrangère
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'livraisons_session_caisse_id_fkey'
  ) THEN
    ALTER TABLE livraisons 
    ADD CONSTRAINT livraisons_session_caisse_id_fkey 
    FOREIGN KEY (session_caisse_id) REFERENCES sessions_caisse (id);
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sessions_caisse_livreur ON sessions_caisse(livreur_id, statut);
CREATE INDEX IF NOT EXISTS idx_sessions_caisse_date_cloture ON sessions_caisse(date_cloture);
CREATE INDEX IF NOT EXISTS idx_livraisons_session_caisse ON livraisons(session_caisse_id);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_sessions_caisse_updated_at ON sessions_caisse;
CREATE TRIGGER update_sessions_caisse_updated_at 
BEFORE UPDATE ON sessions_caisse
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Activer Row Level Security
ALTER TABLE sessions_caisse ENABLE ROW LEVEL SECURITY;

-- Politique RLS (accès via service_role uniquement)
DROP POLICY IF EXISTS "service_role_only" ON sessions_caisse;
CREATE POLICY "service_role_only" ON sessions_caisse
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Commentaires pour documentation
COMMENT ON TABLE sessions_caisse IS 'Sessions de caisse pour grouper les livraisons d''un livreur';
COMMENT ON COLUMN sessions_caisse.statut IS 'Statut de la session: ouverte (en cours) ou cloturee (argent remis)';
COMMENT ON COLUMN sessions_caisse.montant_total IS 'Montant total de la session (somme des prix des commandes)';
COMMENT ON COLUMN sessions_caisse.nombre_livraisons IS 'Nombre de livraisons dans cette session';
COMMENT ON COLUMN livraisons.session_caisse_id IS 'Lien vers la session de caisse à laquelle appartient cette livraison';

