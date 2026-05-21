-- À exécuter UNE FOIS dans Supabase si des commandes ont été modifiées
-- par "Synchronisation automatique" (historique JSON).

UPDATE commandes c
SET
  statut = COALESCE(
    (
      SELECT entry->>'statut'
      FROM jsonb_array_elements(c.historique) WITH ORDINALITY AS t(entry, idx)
      WHERE entry->>'action' NOT LIKE '%Synchronisation automatique%'
      ORDER BY idx DESC
      LIMIT 1 OFFSET 1
    ),
    CASE WHEN c.statut IN ('en_livraison', 'livree') THEN 'en_stock' ELSE c.statut END
  ),
  livreur_id = CASE
    WHEN c.historique::text LIKE '%colis déjà assigné%' THEN NULL
    ELSE c.livreur_id
  END,
  historique = (
    SELECT COALESCE(jsonb_agg(entry ORDER BY idx), '[]'::jsonb)
    FROM jsonb_array_elements(c.historique) WITH ORDINALITY AS t(entry, idx)
    WHERE entry->>'action' NOT LIKE '%Synchronisation automatique%'
  ),
  updated_at = NOW()
WHERE c.historique::text LIKE '%Synchronisation automatique%';
