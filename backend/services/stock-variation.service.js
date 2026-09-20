import { equivalentSizes, normalizeSize } from './size-normalization.service.js';
import { stockVariationKey } from './stock-synchronization.service.js';

// La réservation et le mouvement physique doivent reconnaître exactement les
// mêmes variantes logiques, même si une ancienne couleur a une autre casse.
// Les lignes historiques restent séparées et leurs mouvements sont conservés.
export async function findStockVariation(supabase, {
  country, modele, taille, couleur, preferQuantity = 'quantite_principale',
}) {
  const sizes = equivalentSizes(taille);
  const targetKey = stockVariationKey({ modele, taille, couleur });
  const matches = [];
  const pageSize = 1000;

  // Une sélection légère évite de charger tous les historiques de mouvements.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('stock')
      .select('id, modele, taille, couleur, quantite_principale, quantite_en_livraison')
      .eq('pays_code', country)
      .in('taille', sizes)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) return { data: null, error, rows: [] };

    matches.push(...(data || []).filter((row) => stockVariationKey(row) === targetKey));
    if ((data || []).length < pageSize) break;
  }

  const canonical = normalizeSize(taille);
  const ranked = [...matches].sort((a, b) => (
    Number(Number(b[preferQuantity] || 0) > 0) - Number(Number(a[preferQuantity] || 0) > 0)
    || Number(b.taille === canonical) - Number(a.taille === canonical)
    || Number(b.modele === modele && b.couleur === couleur)
      - Number(a.modele === modele && a.couleur === couleur)
  ));
  if (!ranked.length) return { data: null, error: null, rows: [] };

  const { data, error } = await supabase.from('stock')
    .select('*')
    .eq('pays_code', country)
    .eq('id', ranked[0].id)
    .maybeSingle();
  return { data: data || null, error, rows: matches };
}
