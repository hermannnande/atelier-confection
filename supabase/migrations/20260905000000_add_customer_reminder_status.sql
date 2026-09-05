-- File dédiée pour les commandes que l'équipe doit faire confirmer une seconde fois.
ALTER TABLE public.commandes DROP CONSTRAINT IF EXISTS commandes_statut_check;

ALTER TABLE public.commandes ADD CONSTRAINT commandes_statut_check CHECK (
  statut = ANY (
    ARRAY[
      'en_attente_validation'::text,
      'nouvelle'::text,
      'confirmee'::text,
      'validee'::text,
      'a_rappeler'::text,
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
