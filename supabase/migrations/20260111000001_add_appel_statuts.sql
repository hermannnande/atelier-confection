-- Ajouter le statut 'en_attente_validation' et 'confirmee' aux commandes

ALTER TABLE public.commandes DROP CONSTRAINT IF EXISTS commandes_statut_check;

ALTER TABLE public.commandes ADD CONSTRAINT commandes_statut_check CHECK (
  statut = ANY (
    ARRAY[
      'en_attente_validation'::text,
      'nouvelle'::text,
      'confirmee'::text,
      'validee'::text,
      'en_attente_paiement'::text,
      'en_decoupe'::text,
      'en_couture'::text,
      'en_stock'::text,
      'en_livraison'::text,
      'livree'::text,
      'refusee'::text,
      'annulee'::text
    ]
  )
);

-- Mettre à jour les commandes existantes 'nouvelle' → 'en_attente_validation'
-- (si vous voulez les traiter comme des appels)
-- UPDATE public.commandes SET statut = 'en_attente_validation' WHERE statut = 'nouvelle';
