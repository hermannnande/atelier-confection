// Commandes affichées dans Préparation Colis, triées par le serveur avec la même
// règle que la page : parmi les 1 500 commandes les plus récentes (urgences
// d'abord), celles en découpe, en couture ou en stock, sans livreur ni livraison.
import { fetchRowsUpTo } from './order-list.service.js';
import { fetchByIdsInParallel } from './delivery-list.service.js';

export const PREPARATION_STATUSES = ['en_decoupe', 'en_couture', 'en_stock'];
export const PREPARATION_ORDER_WINDOW = 1500;

export function preparationCandidates(rows = []) {
  return rows.filter((row) => PREPARATION_STATUSES.includes(row?.statut) && !row?.livreur_id);
}

export function withoutDeliveries(candidates = [], deliveredOrderIds = []) {
  const delivered = new Set(deliveredOrderIds.map(String));
  return candidates.filter((row) => !delivered.has(String(row.id)));
}

// Renvoie les lignes complètes des commandes à préparer, dans l'ordre de la liste.
export async function loadPreparationOrders(supabase, country) {
  const { data: latest, error } = await fetchRowsUpTo(
    () => supabase.from('commandes').select('id, statut, livreur_id').eq('pays_code', country)
      .order('urgence', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true }),
    PREPARATION_ORDER_WINDOW,
  );
  if (error) throw error;

  const candidates = preparationCandidates(latest || []);
  const deliveries = await fetchByIdsInParallel(
    (slice) => supabase.from('livraisons').select('commande_id').eq('pays_code', country).in('commande_id', slice),
    candidates.map((row) => row.id),
  );
  const ids = withoutDeliveries(candidates, deliveries.map((row) => row.commande_id)).map((row) => row.id);

  const rows = await fetchByIdsInParallel(
    (slice) => supabase.from('commandes').select('*').eq('pays_code', country).in('id', slice),
    ids,
  );
  const position = new Map(ids.map((id, index) => [id, index]));
  return rows.sort((a, b) => position.get(a.id) - position.get(b.id));
}
