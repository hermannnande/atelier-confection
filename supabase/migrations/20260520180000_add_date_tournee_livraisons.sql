-- Migration : ajouter la colonne date_tournee aux livraisons
-- Objectif : permettre de regrouper les livraisons en "tournées" journalières.
--   - date_assignation : date de l'assignation initiale (immuable, historique)
--   - date_tournee     : date à laquelle le colis fait partie de la tournée du livreur.
--                        Par défaut = date_assignation à la création.
--                        Mise à jour à NOW() quand un colis "reportee" est repris,
--                        afin qu'il bascule dans la carte du jour courant.

ALTER TABLE public.livraisons
  ADD COLUMN IF NOT EXISTS date_tournee timestamptz;

-- Initialiser pour les livraisons existantes
UPDATE public.livraisons
SET date_tournee = COALESCE(date_assignation, created_at, NOW())
WHERE date_tournee IS NULL;

-- Index pour les requêtes par tournée
CREATE INDEX IF NOT EXISTS idx_livraisons_livreur_date_tournee
  ON public.livraisons (livreur_id, date_tournee DESC);

-- Trigger pour initialiser date_tournee automatiquement à la création
-- si elle n'est pas fournie explicitement
CREATE OR REPLACE FUNCTION public.set_livraison_date_tournee()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date_tournee IS NULL THEN
    NEW.date_tournee := COALESCE(NEW.date_assignation, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_livraison_date_tournee ON public.livraisons;
CREATE TRIGGER trg_set_livraison_date_tournee
  BEFORE INSERT ON public.livraisons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_livraison_date_tournee();
