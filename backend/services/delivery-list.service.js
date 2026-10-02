// Lecture rapide des listes : plusieurs requêtes à la fois au lieu d'une après l'autre,
// et seulement les informations de commande affichées par les pages Livreurs,
// Livraisons, Comptabilité et Préparation Colis.

// Champs de commande lus par ces pages (numéro, client, modèle, taille, couleur,
// prix, articles ajoutés, urgence) et historique pour les tournées reportées.
export const DELIVERY_ORDER_COLUMNS = 'id, numero_commande, client, modele, taille, couleur, prix, supplements, urgence, statut, historique';

// Même règle que l'interface (deliveryRouteHistory) : seuls les reports de
// livraison servent à retracer les anciennes tournées d'un colis.
export function isDeliveryReportEvent(event) {
  if (!event) return false;
  if (event.statut === 'reportee') return true;
  const action = String(event.action || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  return action.includes('livraison reportee');
}

export function keepDeliveryReportEvents(order) {
  if (!order) return order;
  const historique = Array.isArray(order.historique) ? order.historique : [];
  return { ...order, historique: historique.filter(isDeliveryReportEvent) };
}

// ?depuis=<date ISO> (ouverture de la page Livreurs) : seulement les tournées à partir
// de cette date. La date est réécrite au format ISO avant d'entrer dans le filtre.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export function parseDeliveryWindowStart(value) {
  if (value === undefined || value === '') return { since: null };
  const date = typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { since: null, error: 'Date de début invalide' };
  return { since: date.toISOString() };
}

// Même jour de tournée que l'interface : date de tournée, sinon date d'assignation.
export function deliveryWindowFilter(since) {
  return `date_tournee.gte."${since}",and(date_tournee.is.null,date_assignation.gte."${since}")`;
}

// Même calcul que la page : prix de la commande de chaque livraison livrée non payée.
export function amountDue(unpaidDeliveries = [], orders = []) {
  const prix = new Map(orders.map((order) => [order.id, Number(order.prix) || 0]));
  return unpaidDeliveries.reduce((sum, row) => sum + (prix.get(row.commande_id) || 0), 0);
}

// Totaux « colis dehors » et « argent dû » sur toutes les livraisons, quand la liste
// envoyée à la page Livreurs est limitée aux tournées récentes.
export async function loadDeliveryTotals(supabase, country, own = (query) => query) {
  const livraisons = (columns, options) => own(supabase.from('livraisons').select(columns, options).eq('pays_code', country));
  const unpaid = (query) => query.eq('statut', 'livree').not('paiement_recu', 'is', true);
  const [dehors, nonPayees] = await Promise.all([
    livraisons('id', { count: 'exact', head: true }).in('statut', ['en_cours', 'reportee']),
    unpaid(livraisons('id', { count: 'exact', head: true })),
  ]);
  if (dehors.error || nonPayees.error) throw dehors.error || nonPayees.error;
  const { data: rows, error } = await readPagesInParallel(
    (from, to) => unpaid(livraisons('commande_id')).order('id', { ascending: true }).range(from, to),
    nonPayees.count,
  );
  if (error) throw error;
  const ids = [...new Set(rows.map((row) => row.commande_id).filter(Boolean))];
  const orders = await fetchByIdsInParallel((slice) => supabase.from('commandes').select('id, prix').in('id', slice), ids);
  return { colisDehors: dehors.count || 0, argentDu: amountDue(rows, orders) };
}

// Lit des identifiants par morceaux, plusieurs morceaux à la fois, dans l'ordre.
// Sans onError, une erreur interrompt la lecture ; avec onError, le morceau est ignoré.
export async function fetchByIdsInParallel(readChunk, ids = [], { chunkSize = 150, concurrency = 6, onError } = {}) {
  const chunks = [];
  for (let offset = 0; offset < ids.length; offset += chunkSize) chunks.push(ids.slice(offset, offset + chunkSize));
  const rows = [];
  for (let first = 0; first < chunks.length; first += concurrency) {
    const batch = await Promise.all(chunks.slice(first, first + concurrency).map((slice) => readChunk(slice)));
    batch.forEach(({ data, error }, index) => {
      if (error) {
        if (!onError) throw error;
        onError(error, (first + index) * chunkSize, chunks[first + index].length);
        return;
      }
      rows.push(...(Array.isArray(data) ? data : []));
    });
  }
  return rows;
}

// Lit toutes les pages d'une liste déjà comptée, plusieurs pages à la fois.
// Si la liste a grandi depuis le comptage, la suite est lue jusqu'à une page incomplète.
export async function readPagesInParallel(readPage, total, { pageSize = 1000, concurrency = 4 } = {}) {
  const pages = Math.max(1, Math.ceil((Number(total) || 0) / pageSize));
  const rows = [];
  for (let first = 0; first < pages; first += concurrency) {
    const count = Math.min(concurrency, pages - first);
    const batch = await Promise.all(Array.from({ length: count }, (_, index) => {
      const from = (first + index) * pageSize;
      return readPage(from, from + pageSize - 1);
    }));
    for (const { data, error } of batch) {
      if (error) return { data: null, error };
      rows.push(...(data || []));
    }
  }
  for (let from = pages * pageSize; rows.length === from; from += pageSize) {
    const { data, error } = await readPage(from, from + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if ((data || []).length < pageSize) break;
  }
  return { data: rows, error: null };
}
