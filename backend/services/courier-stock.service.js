import { randomUUID } from 'node:crypto';
import { normalizeSize } from './size-normalization.service.js';
import {
  buildStockSynchronization, comparePendingOrders, fetchStockSynchronizationOrders,
  orderStockArticles, stockVariationKey,
} from './stock-synchronization.service.js';

export class CourierStockError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}
const fail = (message, status) => { throw new CourierStockError(message, status); };
const quantity = value => Math.max(0, Number(value) || 0);
const custody = row => row?.adresse_livraison?.stockRetour;
const holding = article => ['disponible', 'en_transfert'].includes(article.statut);
const sameCountry = (row, country) => row?.pays_code === country;
const clone = value => JSON.parse(JSON.stringify(value));

export function snapshotArticles(order) {
  return orderStockArticles(order).map((article, index) => ({
    id: index === 0 ? 'principal' : `supplement-${index}`,
    modele: typeof article.modele === 'object' ? article.modele?.nom : article.modele,
    taille: normalizeSize(article.taille), couleur: article.couleur,
    image: article.modele?.image || '',
    prix: index === 0 ? Number(order.prix_base ?? order.prix ?? 0)
      : Number(order.supplements?.filter(s => s.articleCatalogue === true)[index - 1]?.montant || 0),
  }));
}

export async function readCountryRows(db, table, country, configure = q => q, select = '*') {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await configure(db.from(table).select(select).eq('pays_code', country))
      .order('id', { ascending: true }).range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}

async function readOne(db, table, id, country) {
  const { data, error } = await db.from(table).select('*').eq('id', id).eq('pays_code', country).maybeSingle();
  if (error) throw error;
  if (!data) fail('Élément introuvable dans ce pays', 404);
  return data;
}

// Comparaison atomique en base : deux clics ne peuvent pas utiliser la même pièce.
export async function compareAndSet(db, table, row, updates) {
  if (!row.updated_at) fail('Le suivi de cette ligne doit être actualisé avant de continuer');
  const { data, error } = await db.from(table).update(updates)
    .eq('id', row.id).eq('pays_code', row.pays_code).eq('updated_at', row.updated_at)
    .select('*').maybeSingle();
  if (error) throw error;
  if (!data) fail('Cette donnée vient de changer. Actualisez puis réessayez.');
  return data;
}

export function heldPieces(deliveries, country) {
  return deliveries.filter(row => sameCountry(row, country) && row.statut === 'retournee')
    .flatMap(row => (custody(row)?.articles || []).filter(holding).map(article => ({
      ...article, livraisonSourceId: row.id, livreurId: row.livreur_id,
      date: row.date_retour || row.updated_at,
    }))).sort((a, b) => String(a.date).localeCompare(String(b.date))
      || a.livraisonSourceId.localeCompare(b.livraisonSourceId) || a.id.localeCompare(b.id));
}

// Une proposition correspond à TOUTES les tenues de la carte, chez un seul livreur.
// Les propositions partagent un pool : aucune pièce n'est annoncée deux fois.
export function buildCourierOffers({ orders, stock, deliveries, couriers, country }) {
  const sync = buildStockSynchronization({ orders: courierSynchronizationOrders({ orders, stock, deliveries, country }), stock });
  const budgets = new Map(sync.variations.map(v => [v.key, Math.max(v.stockPhysique - v.reservePreparation, 0)]));
  const users = new Map(couriers.filter(u => sameCountry(u, country) && u.role === 'livreur' && u.actif !== false)
    .map(u => [u.id, u]));
  const pool = [];
  for (const piece of heldPieces(deliveries, country)) {
    const key = stockVariationKey(piece);
    if (piece.statut !== 'disponible' || !users.has(piece.livreurId) || !(budgets.get(key) > 0)) continue;
    pool.push(piece);
    budgets.set(key, budgets.get(key) - 1);
  }
  const offers = {};
  for (const order of orders.filter(o => sameCountry(o, country) && o.statut === 'validee').sort(comparePendingOrders)) {
    if (!sync.couvertureCommandes[order.id]?.couvertParStock) continue;
    for (const courierId of new Set(pool.map(p => p.livreurId))) {
      const chosen = selectMatchingPieces(snapshotArticles(order), pool, courierId);
      if (!chosen) continue;
      offers[order.id] = { livreurId: courierId, livreurNom: users.get(courierId).nom,
        articles: chosen.map(p => ({ livraisonSourceId: p.livraisonSourceId, articleId: p.id })) };
      for (const piece of chosen) pool.splice(pool.indexOf(piece), 1);
      break;
    }
  }
  return offers;
}

export function courierSynchronizationOrders({ orders, stock, deliveries, country }) {
  const applied = new Set(stock.flatMap(row => (row.mouvements || []).map(m => m.operation).filter(Boolean)));
  const inTransit = heldPieces(deliveries, country).filter(p => p.statut === 'en_transfert'
    && !applied.has(p.stockMovementOperation));
  // Une tenue en transfert est déjà prise pour une réattribution : elle reste réservée.
  return [...orders, ...inTransit.map(p => ({ id: `${p.operation}:${p.id}`, pays_code: country,
    statut: 'en_stock', modele: p.modele, couleur: p.couleur, taille: p.taille,
    historique: [{ statut: 'en_stock', reservationStock: ['principal'] }] }))];
}

export function selectMatchingPieces(articles, pieces, courierId) {
  const remaining = pieces.filter(p => p.livreurId === courierId && p.statut === 'disponible');
  const chosen = [];
  for (const article of articles) {
    const index = remaining.findIndex(p => stockVariationKey(p) === stockVariationKey(article));
    if (index < 0) return null;
    chosen.push(remaining.splice(index, 1)[0]);
  }
  return chosen;
}

export async function courierContext(db, country) {
  const [stock, deliveries, couriers, orderResult] = await Promise.all([
    readCountryRows(db, 'stock', country),
    readHeldDeliveries(db, country),
    readCountryRows(db, 'users', country, q => q.eq('role', 'livreur'), 'id, pays_code, nom, role, actif'),
    fetchStockSynchronizationOrders(db, { country,
      select: 'id, pays_code, modele, taille, couleur, supplements, statut, urgence, created_at, historique' }),
  ]);
  if (orderResult.error) throw orderResult.error;
  return { stock, deliveries, couriers, orders: orderResult.data || [], country };
}

function readHeldDeliveries(db, country) {
  return readCountryRows(db, 'livraisons', country,
    q => q.eq('statut', 'retournee').not('adresse_livraison->stockRetour', 'is', null),
    'id, pays_code, livreur_id, statut, date_retour, updated_at, adresse_livraison');
}

async function editCustody(db, deliveryId, country, edit) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await readOne(db, 'livraisons', deliveryId, country);
    const value = clone(custody(row) || { version: 1, articles: [] });
    edit(value, row);
    value.revision = randomUUID();
    try {
      return await compareAndSet(db, 'livraisons', row, {
        adresse_livraison: { ...row.adresse_livraison, stockRetour: value },
      });
    } catch (error) { if (!(error instanceof CourierStockError) || attempt === 4) throw error; }
  }
}

// Chaque mouvement a un identifiant durable. Une reprise après erreur réseau
// reconnaît le mouvement déjà effectué au lieu de compter une deuxième pièce.
export async function moveStockOnce(db, { country, article, operation, commandeId, userId,
  action, commentaire, protectedQuantity = 0, required = true, debitEnLivraison = true }) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const matches = (await readCountryRows(db, 'stock', country))
      .filter(row => stockVariationKey(row) === stockVariationKey(article));
    if (matches.some(row => row.mouvements?.some(m => m.operation === operation))) return true;
    const total = matches.reduce((n, row) => n + quantity(row.quantite_principale), 0);
    const returning = action === 'retour';
    if (!returning && total <= protectedQuantity) {
      if (required) fail('La tenue n’est plus disponible. Actualisez la liste.');
      return false;
    }
    const row = matches.find(r => quantity(returning ? r.quantite_en_livraison : r.quantite_principale) > 0) || matches[0];
    const movement = { operation, type: returning ? 'retour' : 'transfert', quantite: 1,
      source: returning ? 'Stock en livraison' : 'Stock principal',
      destination: returning ? 'Stock principal' : 'Stock en livraison', commande: commandeId,
      utilisateur: userId, date: new Date().toISOString(), commentaire };
    if (!row) {
      const { error } = await db.from('stock').insert({ pays_code: country, modele: article.modele,
        taille: normalizeSize(article.taille), couleur: article.couleur, prix: article.prix || 0,
        image: article.image || null, quantite_principale: 1, quantite_en_livraison: 0, mouvements: [movement] });
      if (!error) return true;
      if (error.code === '23505') continue;
      throw error;
    }
    try {
      await compareAndSet(db, 'stock', row, {
        quantite_principale: quantity(row.quantite_principale) + (returning ? 1 : -1),
        quantite_en_livraison: returning ? Math.max(quantity(row.quantite_en_livraison) - (debitEnLivraison ? 1 : 0), 0)
          : quantity(row.quantite_en_livraison) + 1,
        mouvements: [...(row.mouvements || []), movement],
      });
      return true;
    } catch (error) { if (!(error instanceof CourierStockError) || attempt === 5) throw error; }
  }
  fail('Stock en cours de modification, réessayez.');
}

export async function recordRefusal(db, { delivery, order, country, userId, motif }) {
  if (delivery.statut === 'livree') fail('Cette livraison est déjà livrée', 400);
  let row = delivery;
  if (row.statut === 'retournee' && !custody(row)) fail('Ce refus est déjà enregistré', 400);
  if (row.statut === 'retournee' && !custody(row).articles.some(a => a.statut === 'retour_en_cours')) return row;
  if (row.statut !== 'retournee') {
    const articles = row.adresse_livraison?.articlesExpedies || snapshotArticles(order);
    const now = new Date().toISOString();
    row = await compareAndSet(db, 'livraisons', row, { statut: 'retournee', motif_refus: motif,
      date_livraison: now, date_retour: now, verifie_par_gestionnaire: true,
      gestionnaire_id: userId, commentaire_gestionnaire: 'Retour comptable au stock après refus — tenue chez le livreur',
      adresse_livraison: { ...row.adresse_livraison,
        stockRetour: { version: 1, revision: randomUUID(), articles: articles.map(a => ({ ...a, statut: 'retour_en_cours' })) } },
    });
  }
  const currentOrder = await readOne(db, 'commandes', order.id, country);
  if (currentOrder.statut !== 'refusee') {
    await compareAndSet(db, 'commandes', currentOrder, { statut: 'refusee', motif_refus: row.motif_refus,
      historique: [...(currentOrder.historique || []), { action: 'Livraison refusée — tenue disponible chez le livreur',
        statut: 'refusee', utilisateur: userId, date: row.date_retour, commentaire: row.motif_refus }] });
  }
  for (const article of custody(row).articles.filter(a => a.statut === 'retour_en_cours')) {
    await moveStockOnce(db, { country, article, operation: `refus:${row.id}:${article.id}`,
      commandeId: order.id, userId, action: 'retour', commentaire: 'Refus client — tenue conservée chez le livreur',
      debitEnLivraison: row.adresse_livraison?.stockAffectation?.suivis?.[article.id] !== false });
    row = await editCustody(db, row.id, country, value => {
      const item = value.articles.find(a => a.id === article.id);
      if (item.statut === 'retour_en_cours') item.statut = 'disponible';
    });
  }
  return row;
}

export async function confirmCustody(db, { delivery, country, userId, location }) {
  if (delivery.statut !== 'retournee') fail('Le refus doit d’abord être enregistré', 400);
  if (location !== 'atelier') fail('Emplacement invalide', 400);
  if (!custody(delivery)) {
    fail('Les anciens refus ne sont pas repris dans ce suivi.', 400);
  }
  return editCustody(db, delivery.id, country, value => {
    if (value.articles.some(a => ['en_transfert', 'retour_en_cours'].includes(a.statut))) {
      fail('Une opération est en cours sur ce colis. Finalisez-la d’abord.');
    }
    for (const article of value.articles.filter(a => a.statut === 'disponible')) {
      article.statut = 'atelier'; article.dateRetourAtelier = new Date().toISOString(); article.confirmePar = userId;
    }
    // Le refus a déjà crédité le stock : changer l'emplacement ne crée AUCUN mouvement de quantité.
  });
}

async function claimPieces(db, refs, country, operation, commandeId, courierId) {
  for (const deliveryId of new Set(refs.map(r => r.livraisonSourceId))) {
    await editCustody(db, deliveryId, country, (value, row) => {
      if (row.livreur_id !== courierId || row.statut !== 'retournee') fail('Le colis n’est pas chez ce livreur');
      for (const ref of refs.filter(r => r.livraisonSourceId === deliveryId)) {
        const article = value.articles.find(a => a.id === ref.articleId);
        if (!article || article.statut !== 'disponible') fail('Cette tenue vient d’être utilisée par une autre commande');
        Object.assign(article, { statut: 'en_transfert', operation, commandeDestination: commandeId,
          stockMovementOperation: `assignation:${operation}:${ref.index === 0 ? 'principal' : `supplement-${ref.index}`}` });
      }
    });
  }
}

async function releaseClaims(db, refs, country, operation) {
  for (const deliveryId of new Set(refs.map(r => r.livraisonSourceId))) {
    await editCustody(db, deliveryId, country, value => {
      for (const article of value.articles.filter(a => a.operation === operation && a.statut === 'en_transfert')) {
        article.statut = 'disponible'; delete article.operation; delete article.commandeDestination; delete article.stockMovementOperation;
      }
    });
  }
}

async function finishAssignment(db, { delivery, order, country, userId }) {
  const operation = delivery.adresse_livraison.stockAffectation;
  if (operation.etat === 'terminee') return { delivery, order, resumed: true };
  const refs = operation.pieces || [];
  const articles = delivery.adresse_livraison.articlesExpedies;
  for (let index = 0; index < articles.length; index++) {
    const article = articles[index];
    if (Object.hasOwn(operation.suivis || {}, article.id)) continue;
    const context = await readHeldDeliveries(db, country);
    const protectedQuantity = heldPieces(context, country)
      .filter(p => stockVariationKey(p) === stockVariationKey(article) && p.operation !== operation.id).length;
    const moved = await moveStockOnce(db, { country, article, operation: `assignation:${operation.id}:${article.id}`,
      commandeId: order.id, userId, action: 'assigner', protectedQuantity,
      required: refs.some(r => r.index === index), commentaire: refs.some(r => r.index === index)
        ? 'Réattribution d’une tenue refusée, conservée chez le même livreur' : 'Assignation au livreur' });
    const fresh = await readOne(db, 'livraisons', delivery.id, country);
    operation.suivis = { ...fresh.adresse_livraison.stockAffectation.suivis, [article.id]: moved };
    await compareAndSet(db, 'livraisons', fresh, { adresse_livraison: {
      ...fresh.adresse_livraison, stockAffectation: { ...fresh.adresse_livraison.stockAffectation, suivis: operation.suivis },
    } });
  }
  for (const sourceId of new Set(refs.map(r => r.livraisonSourceId))) {
    await editCustody(db, sourceId, country, value => {
      for (const ref of refs.filter(r => r.livraisonSourceId === sourceId)) {
        const item = value.articles.find(a => a.id === ref.articleId);
        if (item?.operation !== operation.id) fail('Le suivi de la tenue a changé');
        Object.assign(item, { statut: 'reaffectee', livraisonDestination: delivery.id, dateReaffectation: new Date().toISOString() });
      }
    });
  }
  const fresh = await readOne(db, 'livraisons', delivery.id, country);
  const complete = await compareAndSet(db, 'livraisons', fresh, { adresse_livraison: {
    ...fresh.adresse_livraison, stockAffectation: { ...operation, etat: 'terminee' },
  } });
  return { delivery: complete, order, resumed: operation.etat !== 'nouvelle' };
}

export async function assignWithCourierStock(db, { commandeId, courierId, country, userId,
  direct = false, instructions, resumeDeliveryId }) {
  const order = await readOne(db, 'commandes', commandeId, country);
  const courier = await readOne(db, 'users', courierId, country);
  if (courier.role !== 'livreur' || courier.actif === false) fail('Livreur indisponible', 400);
  if (resumeDeliveryId) {
    const delivery = await readOne(db, 'livraisons', resumeDeliveryId, country);
    if (delivery.commande_id !== commandeId || delivery.livreur_id !== courierId
      || !delivery.adresse_livraison?.stockAffectation || delivery.statut !== 'en_cours' || order.statut !== 'en_livraison') {
      fail('Cette affectation ne peut pas être reprise', 400);
    }
    return { ...(await finishAssignment(db, { delivery, order, country, userId })), courier };
  }
  if (order.statut !== (direct ? 'validee' : 'en_stock')) fail('Cette commande a déjà été dirigée ailleurs', 400);
  const context = await courierContext(db, country);
  const articles = snapshotArticles(order);
  let pieces;
  if (direct) {
    const offer = buildCourierOffers(context)[order.id];
    if (!offer || offer.livreurId !== courierId) fail('Cette tenue n’est plus disponible chez ce livreur. Actualisez.');
    pieces = offer.articles.map((ref, index) => ({ ...ref, index }));
  } else {
    // En préparation, utiliser les pièces chez le livreur choisi quand tout le colis correspond.
    const matching = selectMatchingPieces(articles, heldPieces(context.deliveries, country), courierId);
    pieces = (matching || []).map((p, index) => ({ livraisonSourceId: p.livraisonSourceId, articleId: p.id, index }));
  }
  const operation = randomUUID();
  const now = new Date().toISOString();
  const updatedOrder = await compareAndSet(db, 'commandes', order, { statut: 'en_livraison', livreur_id: courierId,
    historique: [...(order.historique || []), { action: direct ? 'Réattribuée : tenue disponible chez le livreur' : 'Assigné au livreur',
      statut: 'en_livraison', utilisateur: userId, date: now, operation, livreur: courierId }] });
  let delivery;
  let insertionUncertain = false;
  try {
    await claimPieces(db, pieces, country, operation, order.id, courierId);
    const payload = { id: operation, pays_code: country, commande_id: commandeId, livreur_id: courierId,
      statut: 'en_cours', date_assignation: now, date_tournee: now,
      instructions: instructions || order.note_appelant,
      adresse_livraison: { ville: order.client?.ville, details: '', articlesExpedies: articles,
        stockAffectation: { id: operation, etat: 'nouvelle', pieces } } };
    const result = await db.from('livraisons').insert(payload).select('*').single();
    if (result.error) {
      // Une réponse réseau perdue ne doit pas annuler une insertion réussie.
      const check = await db.from('livraisons').select('*').eq('id', operation).eq('pays_code', country).maybeSingle();
      if (check.error) { insertionUncertain = true; throw check.error; }
      if (!check.data) throw result.error;
      delivery = check.data;
    } else delivery = result.data;
  } catch (error) {
    if (insertionUncertain) {
      error.message = 'Vérification réseau nécessaire : la commande et la tenue restent bloquées pour éviter une double affectation.';
      throw error;
    }
    // Aucune sortie de stock n'a commencé : libérer les pièces et restaurer la commande.
    await releaseClaims(db, pieces, country, operation);
    await compareAndSet(db, 'commandes', updatedOrder, { statut: order.statut, livreur_id: order.livreur_id,
      historique: order.historique || [] });
    throw error;
  }
  try {
    return { ...(await finishAssignment(db, { delivery, order: updatedOrder, country, userId })), courier, resumed: false };
  } catch (error) {
    // La livraison et les pièces restent liées durablement, sans redevenir disponibles.
    // Le bouton de finalisation dans Caisse Livreurs reprend les mouvements idempotents.
    error.message = `Affectation enregistrée. Finalisez-la dans Caisse Livreurs : ${error.message}`;
    throw error;
  }
}
