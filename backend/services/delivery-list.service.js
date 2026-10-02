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
