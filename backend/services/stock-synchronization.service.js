import { normalizeSize } from './size-normalization.service.js';

const PENDING_STATUS = 'validee';
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

function comparePendingOrders(a, b) {
  return Number(Boolean(b?.urgence)) - Number(Boolean(a?.urgence))
    || validationTimestamp(a) - validationTimestamp(b)
    || orderId(a).localeCompare(orderId(b));
}

export function stockVariationKey(source) {
  const { nom } = modelDetails(source);
  return [nom, source?.couleur, normalizeSize(source?.taille)].map(normalizePart).join('::');
}

export function buildStockSynchronization({ orders = [], stock = [] } = {}) {
  const variationsByKey = new Map();

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

  for (const order of orders) {
    // Une commande déjà envoyée en Préparation colis n'est plus une
    // réservation du stock. Seules les commandes encore validées et visibles
    // dans « Commandes » participent au calcul des réservations.
    if (order?.statut === PENDING_STATUS) {
      orderStockArticles(order).forEach((article, index) => {
        const id = orderId(order);
        const itemOrder = index === 0 ? order : {
          ...order,
          _id: `${id}::${article.supplementId || index}`,
          id: `${id}::${article.supplementId || index}`,
          modele: article.modele,
          taille: article.taille,
          couleur: article.couleur,
          sourceOrderId: id,
        };
        ensureVariation(itemOrder).commandesValidees.push(itemOrder);
      });
    }
  }

  const uncoveredOrders = [];
  const couvertureCommandes = {};

  const variations = Array.from(variationsByKey.values()).map((variation) => {
    const pendingOrders = variation.commandesValidees.sort(comparePendingOrders);
    const disponibleAvantCommandes = Math.max(
      variation.stockPhysique - variation.reservePreparation,
      0,
    );
    const reserveCommandes = Math.min(disponibleAvantCommandes, pendingOrders.length);
    const coveredOrders = pendingOrders.slice(0, reserveCommandes);
    const missingOrders = pendingOrders.slice(reserveCommandes);
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
      uncoveredOrders.push(order);
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
      quantiteReservee,
      quantiteDisponible,
      aConfectionner: missingOrders.length,
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
  }), {
    stockPhysique: 0,
    enLivraison: 0,
    quantiteReservee: 0,
    reserveCommandes: 0,
    reservePreparation: 0,
    quantiteDisponible: 0,
    commandesValidees: 0,
    aConfectionner: 0,
  });

  return {
    variations,
    totals,
    uncoveredOrders,
    couvertureCommandes,
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
