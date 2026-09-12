// Seules les commandes confirmées doivent déclencher une préparation.
// Les commandes "nouvelle" restent dans Commandes pour être traitées, mais ne
// deviennent un besoin atelier qu'après leur validation.
const TRACKED_STATUSES = new Set(['validee']);
const SIZE_ORDER = ['STANDARD', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', '5XL'];

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
    const taille = asText(order?.taille, 'Non précisée');
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
