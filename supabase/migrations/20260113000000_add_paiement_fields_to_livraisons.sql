-- Migration: Ajouter les champs de suivi des paiements dans la table livraisons
-- Date: 2026-01-13

-- Ajouter le champ paiement_recu (booléen)
ALTER TABLE livraisons 
ADD COLUMN IF NOT EXISTS paiement_recu BOOLEAN DEFAULT FALSE;

-- Ajouter le champ date_paiement (timestamp)
ALTER TABLE livraisons 
ADD COLUMN IF NOT EXISTS date_paiement TIMESTAMP WITH TIME ZONE;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_livraisons_paiement_recu ON livraisons(paiement_recu);

-- Commentaires pour documentation
COMMENT ON COLUMN livraisons.paiement_recu IS 'Indique si le gestionnaire a confirmé la réception de l''argent du livreur';
COMMENT ON COLUMN livraisons.date_paiement IS 'Date de confirmation de réception du paiement par le gestionnaire';

