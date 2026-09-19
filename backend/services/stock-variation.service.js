import { equivalentSizes, normalizeSize } from './size-normalization.service.js';

// Recherche les anciennes et nouvelles écritures d'une même taille sans
// modifier les lignes historiques de stock.
export async function findStockVariation(supabase, {
  country, modele, taille, couleur, preferQuantity = 'quantite_principale',
}) {
  const sizes = equivalentSizes(taille);
  let query = supabase.from('stock')
    .select('*')
    .eq('pays_code', country)
    .eq('modele', modele)
    .eq('couleur', couleur);
  query = sizes.length === 1
    ? query.eq('taille', sizes[0])
    : query.in('taille', sizes);
  const { data, error } = await query;
  if (error) return { data: null, error, rows: [] };

  const rows = data || [];
  const canonical = normalizeSize(taille);
  const ranked = [...rows].sort((a, b) => (
    Number(Number(b[preferQuantity] || 0) > 0) - Number(Number(a[preferQuantity] || 0) > 0)
    || Number(b.taille === canonical) - Number(a.taille === canonical)
  ));
  return { data: ranked[0] || null, error: null, rows };
}
