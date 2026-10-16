import { normalizeSize } from './size-normalization.service.js';

const PENDING_STATUS = 'validee';
const PREPARATION_STATUS = 'en_stock';
export const STOCK_SYNCHRONIZATION_STATUSES = [PENDING_STATUS, PREPARATION_STATUS];
const DEFAULT_PAGE_SIZE = 1000;
const asText = (value, fallback = '') => String(value ?? fallback).trim();

const asQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
};

function modelDetails(source) {
  const modele = source?.modele;
  if (modele && typeof modele === 'object') {
    return {
      nom: asText(modele.nom || modele.sku, 'Modèle inconnu'),
      image: asText(modele.image || source?.image),
    };
  }
  return {
    nom: asText(modele, 'Modèle inconnu'),
    image: asText(source?.image),
  };
}

function normalizePart(value) {
  return asText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function asTimestamp(value) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function validationTimestamp(order) {
  const validationDates = Array.isArray(order?.historique)
    ? order.historique
      .filter((entry) => entry?.statut === PENDING_STATUS)
      .map((entry) => asTimestamp(entry?.date))
      .filter(Boolean)
    : [];

  if (validationDates.length > 0) return Math.max(...validationDates);
  return asTimestamp(order?.created_at ?? order?.createdAt);
}

function orderId(order) {
  const value = order?._id ?? order?.id;
  return value === undefined || value === null ? '' : String(value);
}

export function orderStockArticles(order) {
  const articles = [{
    modele: order?.modele,
    taille: order?.taille,
    couleur: order?.couleur,
  }];
  for (const supplement of (Array.isArray(order?.supplements) ? order.supplements : [])) {
    if (supplement?.articleCatalogue !== true) continue;
    articles.push({
      modele: { nom: supplement.libelle, image: supplement.image || '' },
      taille: supplement.taille,
      couleur: supplement.couleur,
      supplementId: supplement.id,
    });
  }
  return articles;
}

// Même repère que le suivi livreur : « principal », puis « supplement-1 », etc.
export function stockArticleKey(index) {
  return index === 0 ? 'principal' : `supplement-${index}`;
}

export function orderStockArticleKeys(order) {
  return orderStockArticles(order).map((_, index) => stockArticleKey(index));
}

// Une commande en Préparation Colis ne garde que les pièces qui lui étaient
// déjà réservées à son entrée, enregistrées dans l'historique. Envoyée sans
// pièce, ou avant cet enregistrement (un bilan du stock réajustera ces colis),
// elle n'absorbe pas les entrées destinées aux commandes validées.
function preparationHeldArticles(order) {
  const statusEntries = (Array.isArray(order?.historique) ? order.historique : [])
    .filter((entry) => entry?.statut);
  let entry = null;
  for (let index = statusEntries.length - 1; index >= 0; index -= 1) {
    if (statusEntries[index].statut !== PREPARATION_STATUS) break;
    entry = statusEntries[index];
  }
  return new Set(Array.isArray(entry?.reservationStock) ? entry.reservationStock : []);
}

export function comparePendingOrders(a, b) {
  return Number(Boolean(b?.urgence)) - Number(Boolean(a?.urgence))
    || validationTimestamp(a) - validationTimestamp(b)
    || orderId(a).localeCompare(orderId(b));
}

export function stockVariationKey(source) {
  const { nom } = modelDetails(source);
  return [nom, source?.couleur, normalizeSize(source?.taille)].map(normalizePart).join('::');
}

export async function fetchStockSynchronizationOrders(supabase, {
  country,
  select = 'id, modele, taille, couleur, supplements, statut, urgence, created_at, historique, atelier_pieces',
  pageSize = DEFAULT_PAGE_SIZE,
  signal,
} = {}) {
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from('commandes')
      .select(select)
      .eq('pays_code', country)
      .in('statut', STOCK_SYNCHRONIZATION_STATUSES)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    // Un délai dépassé arrête la lecture au lieu de la laisser pendre.
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) return { data: null, error };
    rows.push(...(data || []));
    if ((data || []).length < pageSize) break;
  }

  // New tracked pieces stay reserved during the short gap between assigning
  // the courier and debiting physical stock. Older deliveries are unchanged.
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from('commandes').select(select).eq('pays_code', country)
      .eq('statut', 'en_livraison').neq('atelier_pieces', '{}')
      .order('id', { ascending: true }).range(offset, offset + pageSize - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if ((data || []).length < pageSize) break;
  }
  return { data: rows, error: null };
}

export function withWorkshopDispatchHolds(orders, stock) {
  const applied = new Set(stock.flatMap(s => (s.mouvements || []).map(m => m.operation).filter(Boolean)));
  const holds = orders.filter(o => o.statut === 'en_livraison' && Object.keys(o.atelier_pieces || {}).length)
    .flatMap(o => {
      const operation = [...(o.historique || [])].reverse().find(h => h.statut === 'en_livraison')?.operation;
      return orderStockArticles(o).flatMap((article, index) => {
        const key = stockArticleKey(index);
        if (o.atelier_pieces[key]?.etat !== 'expedition' || (operation && applied.has(`assignation:${operation}:${key}`))) return [];
        return [{ id: `atelier-expedition:${o.id}:${key}`, atelierSourceId: o.id, ...article,
          statut: 'en_stock', historique: [{ statut: 'en_stock', reservationStock: ['principal'] }] }];
      });
    });
  return [...orders, ...holds];
}

export function buildStockSynchronization({ orders = [], stock = [] } = {}) {
  const variationsByKey = new Map();
  const articleKeys = new Map();
  const workshopStates = new Map();

  const ensureVariation = (source) => {
    const key = stockVariationKey(source);
    if (!variationsByKey.has(key)) {
      const { nom, image } = modelDetails(source);
      variationsByKey.set(key, {
        key,
        modele: nom,
        image,
        couleur: asText(source?.couleur, 'Non précisée'),
        taille: asText(normalizeSize(source?.taille), 'Non précisée'),
        stockPhysique: 0,
        enLivraison: 0,
        reservePreparation: 0,
        commandesValidees: [],
      });
    }

    const variation = variationsByKey.get(key);
    const { image } = modelDetails(source);
    if (!variation.image && image) variation.image = image;
    return variation;
  };

  for (const item of stock) {
    const variation = ensureVariation(item);
    variation.stockPhysique += asQuantity(
      item?.quantitePrincipale ?? item?.quantite_principale ?? item?.quantite,
    );
    variation.enLivraison += asQuantity(
      item?.quantiteEnLivraison ?? item?.quantite_en_livraison,
    );
  }

  for (const order of withWorkshopDispatchHolds(orders, stock)) {
    if (order?.statut === PENDING_STATUS || order?.statut === PREPARATION_STATUS) {
      const id = orderId(order);
      const held = order.statut === PREPARATION_STATUS ? preparationHeldArticles(order) : null;
      orderStockArticles(order).forEach((article, index) => {
        const articleKey = stockArticleKey(index);
        if (held && !held.has(articleKey)) return;
        const itemOrder = index === 0 ? order : {
          ...order,
          _id: `${id}::${article.supplementId || index}`,
          id: `${id}::${article.supplementId || index}`,
          modele: article.modele,
          taille: article.taille,
          couleur: article.couleur,
          sourceOrderId: id,
          sourceArticleKey: articleKey,
        };
        const variation = ensureVariation(itemOrder);

        // Une commande validée attend encore son affectation. Une pièce déjà
        // affectée à un colis de Préparation Colis reste physiquement au stock
        // jusqu'au livreur, mais elle n'est plus libre pour un autre client.
        if (order.statut === PREPARATION_STATUS) {
          variation.reservePreparation += 1;
        } else {
          articleKeys.set(itemOrder, articleKey);
          workshopStates.set(itemOrder, order.atelier_pieces?.[articleKey]?.etat);
          variation.commandesValidees.push(itemOrder);
        }
      });
    }
  }

  const uncoveredOrders = [];
  const couvertureCommandes = {};
  const articlesReserves = {};

  const variations = Array.from(variationsByKey.values()).map((variation) => {
    // A received piece stays with its order, even when a newer urgent order arrives.
    // Work already started must never reappear in the cutting list.
    const pendingOrders = variation.commandesValidees.sort((a, b) =>
      Number(workshopStates.get(b) === 'recue') - Number(workshopStates.get(a) === 'recue')
      || comparePendingOrders(a, b));
    const startedOrders = pendingOrders.filter(o => workshopStates.get(o) === 'en_cours');
    const eligibleOrders = pendingOrders.filter(o => workshopStates.get(o) !== 'en_cours');
    const disponibleAvantCommandes = Math.max(
      variation.stockPhysique - variation.reservePreparation,
      0,
    );
    const reserveCommandes = Math.min(disponibleAvantCommandes, eligibleOrders.length);
    const coveredOrders = eligibleOrders.slice(0, reserveCommandes);
    const missingOrders = [...eligibleOrders.slice(reserveCommandes), ...startedOrders];
    const toProduce = missingOrders.filter(o => !['en_cours', 'recue'].includes(workshopStates.get(o)));
    const quantiteReservee = Math.min(
      variation.stockPhysique,
      variation.reservePreparation + reserveCommandes,
    );
    const quantiteDisponible = Math.max(variation.stockPhysique - quantiteReservee, 0);

    coveredOrders.forEach((order) => {
      const id = order.sourceOrderId || orderId(order);
      if (id) {
        const previous = couvertureCommandes[id];
        couvertureCommandes[id] = {
          couvertParStock: previous?.couvertParStock ?? true,
          stockPhysique: variation.stockPhysique,
          quantiteDisponible,
        };
        (articlesReserves[id] ||= []).push(articleKeys.get(order));
      }
    });

    missingOrders.forEach((order) => {
      const id = order.sourceOrderId || orderId(order);
      if (id) {
        couvertureCommandes[id] = {
          couvertParStock: false,
          stockPhysique: variation.stockPhysique,
          quantiteDisponible,
        };
      }
      if (toProduce.includes(order)) uncoveredOrders.push(order);
    });

    return {
      key: variation.key,
      modele: variation.modele,
      image: variation.image,
      couleur: variation.couleur,
      taille: variation.taille,
      stockPhysique: variation.stockPhysique,
      enLivraison: variation.enLivraison,
      reservePreparation: variation.reservePreparation,
      commandesValidees: pendingOrders.length,
      reserveCommandes,
      reserveAtelier: coveredOrders.filter(o => workshopStates.get(o) === 'recue').length,
      quantiteReservee,
      quantiteDisponible,
      aConfectionner: toProduce.length,
      enCours: startedOrders.length,
      aVerifier: missingOrders.filter(o => workshopStates.get(o) === 'recue').length,
      incoherencesPreparation: Math.max(
        variation.reservePreparation - variation.stockPhysique,
        0,
      ),
    };
  });

  const totals = variations.reduce((acc, variation) => ({
    stockPhysique: acc.stockPhysique + variation.stockPhysique,
    enLivraison: acc.enLivraison + variation.enLivraison,
    quantiteReservee: acc.quantiteReservee + variation.quantiteReservee,
    reserveCommandes: acc.reserveCommandes + variation.reserveCommandes,
    reservePreparation: acc.reservePreparation + variation.reservePreparation,
    quantiteDisponible: acc.quantiteDisponible + variation.quantiteDisponible,
    commandesValidees: acc.commandesValidees + variation.commandesValidees,
    aConfectionner: acc.aConfectionner + variation.aConfectionner,
    enCours: acc.enCours + variation.enCours,
    aVerifier: acc.aVerifier + variation.aVerifier,
  }), {
    stockPhysique: 0,
    enLivraison: 0,
    quantiteReservee: 0,
    reserveCommandes: 0,
    reservePreparation: 0,
    quantiteDisponible: 0,
    commandesValidees: 0,
    aConfectionner: 0,
    enCours: 0,
    aVerifier: 0,
  });

  return {
    variations,
    totals,
    uncoveredOrders,
    couvertureCommandes,
    // Pièces de chaque commande validée couvertes par le stock : elles la
    // suivent si elle est envoyée en Préparation Colis.
    articlesReserves,
  };
}

export function enrichStockWithSynchronization(stock = [], synchronization) {
  const variationsByKey = new Map(
    (synchronization?.variations || []).map((variation) => [variation.key, {
      ...variation,
      remainingReserved: variation.quantiteReservee,
      remainingCommandReservations: variation.reserveCommandes,
      remainingPreparationReservations: Math.min(
        variation.reservePreparation,
        variation.stockPhysique,
      ),
    }]),
  );

  return stock.map((item) => {
    const variation = variationsByKey.get(stockVariationKey(item));
    const physical = asQuantity(
      item?.quantitePrincipale ?? item?.quantite_principale ?? item?.quantite,
    );
    const quantiteReservee = Math.min(physical, variation?.remainingReserved || 0);
    const quantiteReserveePreparation = Math.min(
      quantiteReservee,
      variation?.remainingPreparationReservations || 0,
    );
    const quantiteReserveeCommandes = Math.min(
      quantiteReservee - quantiteReserveePreparation,
      variation?.remainingCommandReservations || 0,
    );

    if (variation) {
      variation.remainingReserved -= quantiteReservee;
      variation.remainingPreparationReservations -= quantiteReserveePreparation;
      variation.remainingCommandReservations -= quantiteReserveeCommandes;
    }

    return {
      ...item,
      quantiteReservee,
      quantiteReserveeCommandes,
      quantiteReserveePreparation,
      quantiteDisponible: Math.max(physical - quantiteReservee, 0),
      aConfectionner: variation?.aConfectionner || 0,
    };
  });
}
