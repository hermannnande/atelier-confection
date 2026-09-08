-- Articles et suppléments ajoutés pendant l'appel client.
-- `prix` reste le total final utilisé partout dans l'application.
ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS prix_base numeric,
  ADD COLUMN IF NOT EXISTS supplements jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.commandes
SET prix_base = prix
WHERE prix_base IS NULL;

COMMENT ON COLUMN public.commandes.prix_base IS
  'Prix de la tenue principale avant les articles ou suppléments ajoutés pendant l appel';

COMMENT ON COLUMN public.commandes.supplements IS
  'Liste JSON des articles ou suppléments: id, libelle et montant';
