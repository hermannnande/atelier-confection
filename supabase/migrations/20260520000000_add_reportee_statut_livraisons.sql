-- Migration : ajouter le statut 'reportee' aux livraisons
-- Date : 20 mai 2026
-- Objectif : permettre au livreur de marquer une commande "reportée au lendemain"
--           (le colis reste avec lui, pas de retour au stock)

-- 1. Supprimer l'ancienne contrainte CHECK
alter table public.livraisons
  drop constraint if exists livraisons_statut_check;

-- 2. Recréer la contrainte avec 'reportee' en plus
alter table public.livraisons
  add constraint livraisons_statut_check check (
    statut = any (
      array[
        'assignee'::text,
        'en_cours'::text,
        'livree'::text,
        'refusee'::text,
        'retournee'::text,
        'reportee'::text
      ]
    )
  );

-- 3. Vérification (à exécuter manuellement après)
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.livraisons'::regclass
--   and conname = 'livraisons_statut_check';
