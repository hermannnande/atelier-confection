import { createHash } from 'node:crypto';
import {
  buildStockSynchronization, orderStockArticles, preparationReservation, stockArticleKey, stockVariationKey,
} from './stock-synchronization.service.js';
import {
  compareAndSet, courierContext, courierSynchronizationOrders, heldPieces, readCountryRows,
} from './courier-stock.service.js';

// Vérification physique d'une variante : le stock compte les robes de l'étagère,
// celles déjà mises dans les colis de Préparation Colis (débitées seulement à
// l'affectation au livreur) et les tenues refusées gardées par les livreurs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARTICLE_KEY = /^(principal|supplement-[1-9][0-9]*)$/;
const MAX_SHELF = 10000;
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
const quantity = value => Math.max(0, Number(value) || 0);
const pieceId = piece => `${piece.commandeId}:${piece.articleKey}`;
const modelName = modele => (modele && typeof modele === 'object' ? modele.nom || modele.sku : modele) || '';
const shortDate = value => new Date(value).toLocaleString('fr-FR', {
  timeZone: 'Africa/Abidjan', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

// Pièces de cette variante retenues par des colis en préparation (même règle que la synchronisation).
export function preparationHolders(orders, key) {
  const holders = [];
  for (const order of orders) {
    if (order?.statut !== 'en_stock') continue;
    const { entry, held } = preparationReservation(order);
    orderStockArticles(order).forEach((article, index) => {
      const articleKey = stockArticleKey(index);
      if (held.has(articleKey) && stockVariationKey(index === 0 ? order : article) === key) {
        holders.push({ order, articleKey, article, depuis: entry?.date || null });
      }
    });
  }
  return holders;
}

// Affectations au livreur commencées mais pas finalisées : la tenue est partie
// avec le livreur sans que le stock soit encore débité. Elle est comptée
// automatiquement, pour que « Finaliser » puisse ensuite la débiter.
function unfinishedAssignments(deliveries, key) {
  return deliveries.flatMap((delivery) => {
    const operation = delivery.adresse_livraison?.stockAffectation;
    if (!operation || operation.etat === 'terminee') return [];
    return (delivery.adresse_livraison.articlesExpedies || [])
      .filter(article => !Object.hasOwn(operation.suivis || {}, article.id) && stockVariationKey(article) === key)
      .map(article => ({ delivery, article }));
  });
}

async function orderDetails(db, country, ids) {
  if (!ids.length) return new Map();
  const { data, error } = await db.from('commandes')
    .select('id, numero_commande, client, emballe_at').eq('pays_code', country).in('id', ids);
  if (error) throw error;
  return new Map((data || []).map(row => [row.id, row]));
}

export async function loadStockVerification(db, { country, key }) {
  if (typeof key !== 'string' || !key.includes('::') || key.length > 300) fail('Tenue introuvable.', 400);
  const [context, pendingDeliveries, lots] = await Promise.all([
    courierContext(db, country),
    readCountryRows(db, 'livraisons', country, q => q.eq('adresse_livraison->stockAffectation->>etat', 'nouvelle'),
      'id, pays_code, commande_id, livreur_id, date_assignation, adresse_livraison'),
    readCountryRows(db, 'atelier_lots', country, q => q.eq('variation_key', key), 'id, quantite, recues'),
  ]);
  const rows = context.stock.filter(row => stockVariationKey(row) === key);
  const holders = preparationHolders(context.orders, key);
  const enRoute = unfinishedAssignments(pendingDeliveries, key);
  const couriers = new Map(context.couriers.map(user => [user.id, user.nom]));
  // Une tenue « en_transfert » est la robe d'une affectation en cours, déjà comptée dans enRoute.
  const withCouriers = heldPieces(context.deliveries, country)
    .filter(piece => piece.statut === 'disponible' && stockVariationKey(piece) === key);
  const details = await orderDetails(db, country, [...new Set([
    ...holders.map(h => h.order.id), ...enRoute.map(item => item.delivery.commande_id),
  ].filter(Boolean))]);
  const sample = rows[0] || holders[0]?.article || holders[0]?.order;
  const [modele, couleur, taille] = sample
    ? [modelName(sample.modele), sample.couleur, sample.taille]
    : key.split('::');

  return {
    cle: key,
    modele,
    couleur,
    taille,
    stock: {
      total: rows.reduce((sum, row) => sum + quantity(row.quantite_principale), 0),
      lignes: rows.map(row => ({ id: row.id, couleur: row.couleur, taille: row.taille, quantite: quantity(row.quantite_principale) })),
    },
    colis: holders.map(({ order, articleKey, depuis }) => {
      const detail = details.get(order.id);
      return {
        commandeId: order.id,
        articleKey,
        numero: detail?.numero_commande || null,
        client: { nom: detail?.client?.nom || '', ville: detail?.client?.ville || '' },
        depuis,
        emballe: Boolean(detail?.emballe_at),
      };
    }).sort((a, b) => String(a.depuis).localeCompare(String(b.depuis))),
    livreurs: withCouriers.map(piece => ({ livreur: couriers.get(piece.livreurId) || 'Livreur', depuis: piece.date })),
    enRoute: enRoute.map(({ delivery }) => ({
      numero: details.get(delivery.commande_id)?.numero_commande || null,
      livreur: couriers.get(delivery.livreur_id) || 'Livreur',
      depuis: delivery.date_assignation || null,
    })),
    enCoursAtelier: lots.reduce((sum, lot) => sum + Math.max(quantity(lot.quantite) - quantity(lot.recues), 0), 0),
    minimum: holders.length + withCouriers.length + enRoute.length,
    revision: createHash('sha256').update(JSON.stringify({
      lignes: rows.map(row => `${row.id}@${row.updated_at}`).sort(),
      colis: holders.map(h => pieceId({ commandeId: h.order.id, articleKey: h.articleKey })).sort(),
      livreurs: withCouriers.map(piece => `${piece.livraisonSourceId}:${piece.id}`).sort(),
      enRoute: enRoute.map(({ delivery, article }) => `${delivery.id}:${article.id}`).sort(),
    })).digest('hex'),
  };
}

// Une correction manuelle ne peut plus faire descendre le stock sous les robes
// déjà mises dans des colis : c'est ce qui bloquait les variantes « à vérifier ».
export async function assertStockFloor(db, { country, row, nextQuantity }) {
  const key = stockVariationKey(row);
  const context = await courierContext(db, country);
  const rows = context.stock.filter(item => stockVariationKey(item) === key);
  const current = rows.reduce((sum, item) => sum + quantity(item.quantite_principale), 0);
  const stored = rows.find(item => item.id === row.id) || row;
  const next = current - quantity(stored.quantite_principale) + quantity(nextQuantity);
  if (next >= current) return;
  const holders = preparationHolders(context.orders, key);
  const synchronization = buildStockSynchronization({
    orders: courierSynchronizationOrders(context), stock: context.stock,
  });
  const floor = Math.max(holders.length, synchronization.variations.find(v => v.key === key)?.reservePreparation || 0);
  if (next >= floor) return;
  const details = await orderDetails(db, country, [...new Set(holders.map(h => h.order.id))]);
  const numbers = [...new Set(holders.map(h => details.get(h.order.id)?.numero_commande).filter(Boolean))];
  const enRoute = floor - holders.length;
  fail(`${holders.length} robe(s) de cette variante sont déjà dans des colis en préparation`
    + `${numbers.length ? ` (${numbers.join(', ')})` : ''}`
    + `${enRoute > 0 ? ` et ${enRoute} part(ent) avec un livreur (affectation à finaliser)` : ''}. `
    + `Le stock doit les compter : il ne peut pas descendre sous ${floor}. `
    + 'Si une robe manque vraiment, utilisez « Vérifier » sur cette variante pour indiquer le colis concerné.');
}

export function validateVerificationInput(input) {
  const colis = input?.colis;
  if (!UUID.test(input?.operationId) || typeof input.cle !== 'string' || typeof input.revision !== 'string'
    || !Number.isInteger(input.etagere) || input.etagere < 0 || input.etagere > MAX_SHELF
    || !Array.isArray(colis) || colis.length > 500
    || colis.some(c => !UUID.test(c?.commandeId) || !ARTICLE_KEY.test(c?.articleKey) || typeof c.present !== 'boolean')
    || new Set(colis.map(pieceId)).size !== colis.length) {
    fail('Vérification incomplète : rouvrez la fenêtre et recommencez.', 400);
  }
}

async function appliedVerification(db, country, key, operation) {
  const rows = (await readCountryRows(db, 'stock', country)).filter(row => stockVariationKey(row) === key);
  if (!rows.some(row => (row.mouvements || []).some(m => m.operation === operation))) return null;
  return { dejaEnregistree: true, stockApres: rows.reduce((sum, row) => sum + quantity(row.quantite_principale), 0) };
}

// La commande retourne parmi les commandes validées : couverte par le stock si
// une robe est libre, sinon proposée à l'atelier. La ligne « validée » reprend
// la validation d'origine (date et auteur) : priorité de la cliente, SMS de
// retard et statistiques des appelants restent inchangés.
async function returnToWaiting(db, { country, commandeId, articleKeys, label, userId, actorName, now, operation }) {
  const { data: order, error } = await db.from('commandes').select('*')
    .eq('id', commandeId).eq('pays_code', country).maybeSingle();
  if (error) throw error;
  if (!order || order.statut !== 'en_stock'
    || articleKeys.some(articleKey => !preparationReservation(order).held.has(articleKey))) {
    fail(order ? `La commande ${order.numero_commande} a changé. Rouvrez la vérification.`
      : 'Une commande a changé. Rouvrez la vérification.');
  }
  const historique = Array.isArray(order.historique) ? order.historique : [];
  const validation = [...historique].reverse().find(entry => entry?.statut === 'validee');
  const atelierPieces = { ...(order.atelier_pieces || {}) };
  const piecesAtelierAbsentes = {};
  // Une pièce reçue de l'atelier puis perdue doit pouvoir être confectionnée à nouveau.
  for (const articleKey of articleKeys) {
    if (atelierPieces[articleKey]?.etat === 'recue') {
      piecesAtelierAbsentes[articleKey] = atelierPieces[articleKey];
      delete atelierPieces[articleKey];
    }
  }
  const entries = [
    {
      action: 'Vérification du stock : robe absente du colis',
      utilisateur: userId,
      date: now,
      operation,
      articlesAbsents: articleKeys,
      ...(Object.keys(piecesAtelierAbsentes).length ? { piecesAtelierAbsentes } : {}),
      commentaire: `${label} introuvable dans le colis lors de la vérification du ${shortDate(now)}`
        + `${actorName ? ` par ${actorName}` : ''}. La commande repasse en attente de tenue.`,
    },
    {
      action: 'Remise en attente de tenue (date de validation conservée)',
      statut: 'validee',
      ...(validation?.utilisateur ? { utilisateur: validation.utilisateur } : {}),
      date: validation?.date || order.created_at,
      dateAction: now,
      verifiePar: userId,
      operation,
    },
  ];
  try {
    await compareAndSet(db, 'commandes', order, {
      statut: 'validee', atelier_pieces: atelierPieces, historique: [...historique, ...entries],
    });
  } catch (cause) {
    if (cause?.code === 'P0001') fail(cause.message);
    throw cause;
  }
  return order.numero_commande;
}

async function setVariationStock(db, { country, key, target, userId, now, operation, commentaire }) {
  const rows = (await readCountryRows(db, 'stock', country)).filter(row => stockVariationKey(row) === key);
  if (!rows.length) fail('Ligne de stock introuvable pour cette tenue. Ajoutez-la depuis la page Stock.');
  const before = rows.reduce((sum, row) => sum + quantity(row.quantite_principale), 0);
  let delta = target - before;
  const ordered = [...rows].sort((a, b) => quantity(b.quantite_principale) - quantity(a.quantite_principale));
  const changes = [];
  if (delta >= 0) changes.push([ordered[0], quantity(ordered[0].quantite_principale) + delta]);
  for (const row of ordered) {
    if (delta >= 0) break;
    const taken = Math.min(quantity(row.quantite_principale), -delta);
    if (taken) changes.push([row, quantity(row.quantite_principale) - taken]);
    delta += taken;
  }
  for (const [index, [row, next]] of changes.entries()) {
    const previous = quantity(row.quantite_principale);
    await compareAndSet(db, 'stock', row, {
      quantite_principale: next,
      mouvements: [...(row.mouvements || []), {
        type: 'ajustement',
        quantite: Math.abs(next - previous),
        ancienneQuantite: previous,
        nouvelleQuantite: next,
        variation: next - previous,
        source: 'Vérification physique',
        destination: 'Stock principal',
        utilisateur: userId,
        date: now,
        operation: index === 0 ? operation : `${operation}:${index}`,
        commentaire,
      }],
    });
  }
  return { before, after: target };
}

export async function applyStockVerification(db, { country, userId, actorName = '', input }) {
  validateVerificationInput(input);
  const key = input.cle;
  const operation = `verification:${input.operationId}`;
  const replay = await appliedVerification(db, country, key, operation);
  if (replay) return replay;

  const view = await loadStockVerification(db, { country, key });
  if (view.revision !== input.revision) {
    fail('Le stock ou les colis de cette tenue viennent de changer. Rouvrez la vérification et recomptez.');
  }
  const answers = new Map(input.colis.map(c => [pieceId(c), c.present]));
  if (answers.size !== view.colis.length || view.colis.some(c => !answers.has(pieceId(c)))) {
    fail('Indiquez pour chaque colis si la robe est présente.', 400);
  }

  const absent = view.colis.filter(c => answers.get(pieceId(c)) === false);
  const present = view.colis.length - absent.length;
  const target = input.etagere + present + view.livreurs.length + view.enRoute.length;
  const label = `${view.modele} ${view.couleur} ${view.taille}`;
  const now = new Date().toISOString();
  const byOrder = new Map();
  for (const item of absent) byOrder.set(item.commandeId, [...(byOrder.get(item.commandeId) || []), item.articleKey]);
  const colisRemisEnAttente = [];
  for (const [commandeId, articleKeys] of byOrder) {
    colisRemisEnAttente.push(await returnToWaiting(db, {
      country, commandeId, articleKeys, label, userId, actorName, now, operation,
    }));
  }
  const commentaire = `Vérification : ${input.etagere} sur l’étagère + ${present} dans les colis`
    + ` + ${view.livreurs.length} chez les livreurs`
    + `${view.enRoute.length ? ` + ${view.enRoute.length} en route (affectation à finaliser)` : ''}`
    + `${colisRemisEnAttente.length ? ` · remis en attente : ${colisRemisEnAttente.filter(Boolean).join(', ')}` : ''}`;
  const { before, after } = await setVariationStock(db, {
    country, key, target, userId, now, operation, commentaire,
  });
  return { stockAvant: before, stockApres: after, colisRemisEnAttente: colisRemisEnAttente.filter(Boolean) };
}
