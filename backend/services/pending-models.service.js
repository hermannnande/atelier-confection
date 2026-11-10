// Seules les commandes confirmées doivent déclencher une préparation.
// Les commandes "nouvelle" restent dans Commandes pour être traitées, mais ne
// deviennent un besoin atelier qu'après leur validation.
import { normalizeSize } from './size-normalization.service.js';
import {
  buildStockSynchronization,
  fetchStockLots,
  fetchStockSynchronizationOrders,
  stockVariationKey,
} from './stock-synchronization.service.js';
import { loadClearanceModelKeys } from './clearance-stock.service.js';

// Seules les colonnes utilisées par le calcul : l'historique donne la date de
// validation et les pièces déjà réservées en Préparation Colis.
const SUMMARY_ORDER_COLUMNS = 'id, modele, taille, couleur, supplements, statut, urgence, created_at, historique, atelier_pieces';
const SUMMARY_STOCK_COLUMNS = 'id, modele, taille, couleur, quantite_principale, quantite_en_livraison, image, mouvements, seuil_minimal';

const TRACKED_STATUSES = new Set(['validee']);
const SIZE_ORDER = ['STANDARD', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

const asText = (value, fallback = '') => String(value ?? fallback).trim();

function modelDetails(order) {
  const modele = order?.modele;
  if (modele && typeof modele === 'object') {
    return {
      nom: asText(modele.nom || modele.sku, 'Modèle inconnu'),
      image: asText(modele.image),
    };
  }
  return { nom: asText(modele, 'Modèle inconnu'), image: '' };
}

function asTimestamp(value) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

// Une commande devient réellement un besoin atelier au moment de sa validation,
// qui peut être bien postérieure à sa création.
function orderPendingAt(order) {
  const validationDates = Array.isArray(order?.historique)
    ? order.historique
      .filter((entry) => entry?.statut === 'validee')
      .map((entry) => asTimestamp(entry?.date))
      .filter(Boolean)
    : [];

  if (validationDates.length > 0) return Math.max(...validationDates);
  return asTimestamp(order?.created_at ?? order?.createdAt);
}

function compareSizes(a, b) {
  const normalizedA = asText(a).toUpperCase();
  const normalizedB = asText(b).toUpperCase();
  const rankA = SIZE_ORDER.indexOf(normalizedA);
  const rankB = SIZE_ORDER.indexOf(normalizedB);
  if (rankA !== -1 || rankB !== -1) {
    if (rankA === -1) return 1;
    if (rankB === -1) return -1;
    return rankA - rankB;
  }
  return normalizedA.localeCompare(normalizedB, 'fr', { numeric: true });
}

export function recentVisibilityThreshold(now = new Date()) {
  return new Date(now).getTime() - (60 * 60 * 1000);
}

export function groupPendingModels(orders = [], { recentAfter = null } = {}) {
  const recentThreshold = recentAfter ? new Date(recentAfter).getTime() : Number.POSITIVE_INFINITY;
  const groups = new Map();

  for (const order of orders) {
    if (!TRACKED_STATUSES.has(order?.statut)) continue;

    const { nom, image } = modelDetails(order);
    const modelKey = nom.toLocaleLowerCase('fr');
    const taille = asText(normalizeSize(order?.taille), 'Non précisée');
    const couleur = asText(order?.couleur, 'Non précisée');
    const variationKey = `${couleur.toLocaleLowerCase('fr')}::${taille.toLocaleLowerCase('fr')}`;
    const pendingAt = orderPendingAt(order);
    const isNew = pendingAt > recentThreshold;

    if (!groups.has(modelKey)) {
      groups.set(modelKey, {
        id: modelKey,
        nom,
        image,
        total: 0,
        urgentes: 0,
        nouveau: 0,
        derniereArrivee: null,
        variations: new Map(),
      });
    }

    const group = groups.get(modelKey);
    if (!group.image && image) group.image = image;
    group.total += 1;
    if (order.urgence) group.urgentes += 1;
    if (isNew) group.nouveau += 1;
    if (pendingAt && (!group.derniereArrivee || pendingAt > asTimestamp(group.derniereArrivee))) {
      group.derniereArrivee = new Date(pendingAt).toISOString();
    }

    if (!group.variations.has(variationKey)) {
      group.variations.set(variationKey, {
        id: variationKey,
        couleur,
        taille,
        quantite: 0,
        urgentes: 0,
        nouveau: 0,
      });
    }

    const variation = group.variations.get(variationKey);
    variation.key = stockVariationKey(order);
    (variation.pieces ||= []).push({ commandeId: order.sourceOrderId || order.id || order._id,
      articleKey: order.sourceArticleKey || 'principal', urgence: Boolean(order.urgence) });
    variation.quantite += 1;
    if (order.urgence) variation.urgentes += 1;
    if (isNew) variation.nouveau += 1;
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      variations: Array.from(group.variations.values()).sort((a, b) => (
        a.couleur.localeCompare(b.couleur, 'fr', { numeric: true }) || compareSizes(a.taille, b.taille)
      )),
    }))
    .sort((a, b) => (
      Number(b.nouveau > 0) - Number(a.nouveau > 0) ||
      b.urgentes - a.urgentes ||
      a.nom.localeCompare(b.nom, 'fr', { numeric: true })
    ));
}

// Pièces à coudre pour revenir au seuil minimal, sans lien avec une commande.
export function groupStockNeeds(variations = []) {
  const groups = new Map();
  for (const variation of variations) {
    if (!(variation.aCoudrePourStock > 0)) continue;
    const id = variation.key.split('::')[0];
    if (!groups.has(id)) groups.set(id, { id, nom: variation.modele, image: variation.image, total: 0, variations: [] });
    const group = groups.get(id);
    if (!group.image && variation.image) group.image = variation.image;
    group.total += variation.aCoudrePourStock;
    group.variations.push({
      id: variation.key,
      key: variation.key,
      couleur: variation.couleur,
      taille: variation.taille,
      quantite: variation.aCoudrePourStock,
      seuil: variation.seuilMinimal,
      disponible: variation.quantiteDisponible,
      enCours: variation.enCoursPourStock,
      aVerifier: variation.incoherencesPreparation > 0,
    });
  }
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      variations: group.variations.sort((a, b) => (
        a.couleur.localeCompare(b.couleur, 'fr', { numeric: true }) || compareSizes(a.taille, b.taille)
      )),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
}

function summaryReadError(message, cause) {
  const error = new Error(message);
  error.cause = cause;
  // Base injoignable ou trop lente : la même lecture peut être retentée.
  error.status = /abort|timeout|fetch failed/i.test(String(cause?.message || '')) ? 503 : 500;
  return error;
}

// Besoins atelier = commandes validées qui restent après déduction du stock
// libre (le stock réservé aux colis en préparation est déjà retiré).
export async function loadPendingModelsSummary(supabase, { country, now = new Date(), signal } = {}) {
  let stockQuery = supabase
    .from('stock')
    .select(SUMMARY_STOCK_COLUMNS)
    .eq('pays_code', country);
  if (signal) stockQuery = stockQuery.abortSignal(signal);

  const [ordersResult, stockResult, clearance, stockLots] = await Promise.all([
    fetchStockSynchronizationOrders(supabase, { country, select: SUMMARY_ORDER_COLUMNS, signal }),
    stockQuery,
    loadClearanceModelKeys(supabase, { signal }).then((keys) => ({ keys }), (error) => ({ error })),
    fetchStockLots(supabase, { country, signal }).then((rows) => ({ rows }), (error) => ({ error })),
  ]);

  if (ordersResult.error) {
    throw summaryReadError('Erreur lors du chargement des modèles en attente', ordersResult.error);
  }
  if (stockResult.error) {
    throw summaryReadError('Erreur lors du chargement du stock', stockResult.error);
  }
  if (clearance.error) {
    throw summaryReadError('Erreur lors du chargement des modèles', clearance.error);
  }
  if (stockLots.error) {
    throw summaryReadError('Erreur lors du chargement des lots pour le stock', stockLots.error);
  }

  const synchronization = buildStockSynchronization({
    orders: ordersResult.data || [],
    stock: stockResult.data || [],
    sansConfection: clearance.keys,
    lotsPourStock: stockLots.rows,
  });
  const groupes = groupPendingModels(
    synchronization.uncoveredOrders,
    { recentAfter: recentVisibilityThreshold(now) },
  );
  for (const groupe of groupes) for (const variation of groupe.variations) {
    variation.aVerifier = synchronization.variations.some(v => v.key === variation.key && v.incoherencesPreparation > 0);
  }

  return {
    groupes,
    totalCommandes: synchronization.totals.aConfectionner,
    totalValidees: synchronization.totals.commandesValidees,
    totalCouvertesStock: synchronization.totals.reserveCommandes,
    totalModeles: groupes.length,
    totalEnCours: synchronization.totals.enCours,
    totalAVerifier: synchronization.totals.aVerifier,
    besoinsStock: groupStockNeeds(synchronization.variations),
    totalPourStock: synchronization.totals.aCoudrePourStock,
    recentWindowMinutes: 60,
  };
}
