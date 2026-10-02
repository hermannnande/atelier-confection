import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignWithCourierStock, buildCourierOffers, compareAndSet, confirmCustody,
  courierSynchronizationOrders, heldPieces, moveStockOnce, recordRefusal, snapshotArticles,
} from '../services/courier-stock.service.js';
import { buildStockSynchronization } from '../services/stock-synchronization.service.js';

const copy = value => structuredClone(value);
const base = id => ({ id, pays_code: 'CI', updated_at: '2026-10-02T00:00:00.000Z' });
const order = (id = 'new', extra = {}) => ({ ...base(id), statut: 'validee',
  modele: { nom: 'DAVICHI' }, couleur: 'Vert Treillis', taille: '2XL', prix: 13500,
  created_at: '2026-10-02T01:00:00Z', historique: [], ...extra });
const stock = (id = 'stock', extra = {}) => ({ ...base(id), modele: 'DAVICHI', couleur: 'Vert Treillis',
  taille: 'XXL', quantite_principale: 1, quantite_en_livraison: 0, mouvements: [], ...extra });
const courier = (id = 'driver', extra = {}) => ({ ...base(id), role: 'livreur', actif: true, nom: 'Franck', ...extra });
const returned = (id = 'old-delivery', extra = {}) => ({ ...base(id), livreur_id: 'driver', commande_id: 'old',
  statut: 'retournee', date_retour: '2026-10-02T01:00:00Z', adresse_livraison: { ville: 'Abidjan', stockRetour: {
    version: 1, revision: 'first', articles: [{ ...snapshotArticles(order())[0], statut: 'disponible' }],
  } }, ...extra });
function context(extra = {}) {
  return { country: 'CI', orders: [order()], stock: [stock()], couriers: [courier()], deliveries: [returned()], ...extra };
}

// Simulation isolée des filtres atomiques et des erreurs réseau ; aucune base réelle.
class Database {
  constructor(ctx) {
    this.tables = { commandes: copy(ctx.orders), stock: copy(ctx.stock), users: copy(ctx.couriers), livraisons: copy(ctx.deliveries) };
    this.sequence = 1; this.fail = null;
  }
  from(table) { return new Query(this, table); }
}
class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.action = 'select'; }
  select() { return this; }
  eq(field, value) { this.filters.push(row => row[field] === value); return this; }
  in(field, values) { this.filters.push(row => values.includes(row[field])); return this; }
  not(field, operator, value) {
    assert.equal(operator, 'is'); assert.equal(value, null);
    this.filters.push(row => field.split('->').reduce((v, key) => v?.[key], row) != null);
    return this;
  }
  order() { return this; }
  range(start, end) { this.slice = [start, end + 1]; return this; }
  update(updates) { this.action = 'update'; this.updates = updates; return this; }
  insert(row) { this.action = 'insert'; this.updates = row; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
  async execute() {
    const failure = this.db.fail?.(this);
    if (failure && !failure.after) return { data: null, error: failure.error };
    const table = this.db.tables[this.table];
    let rows = table.filter(row => this.filters.every(filter => filter(row)));
    if (this.action === 'insert') {
      const row = { ...copy(this.updates), id: this.updates.id || `insert-${this.db.sequence}`, updated_at: `version-${this.db.sequence++}` };
      if (table.some(r => r.id === row.id)) return { data: null, error: { code: '23505', message: 'duplicate' } };
      table.push(row); rows = [row];
    } else if (this.action === 'update') {
      for (const row of rows) Object.assign(row, copy(this.updates), { updated_at: `version-${this.db.sequence++}` });
    }
    if (failure?.after) return { data: null, error: failure.error };
    if (this.slice) rows = rows.slice(...this.slice);
    return { data: copy(this.one ? rows[0] || null : rows), error: null };
  }
}
const assign = (db, extra = {}) => assignWithCourierStock(db, { commandeId: 'new', courierId: 'driver', country: 'CI', userId: 'admin', direct: true, ...extra });

test('proposition exacte, tailles XXL/2XL équivalentes, anciens refus exclus', () => {
  assert.equal(buildCourierOffers(context()).new.livreurNom, 'Franck');
  for (const extra of [{ taille: '3XL' }, { couleur: 'Blanc' }, { modele: { nom: 'Autre' } }]) {
    assert.deepEqual(buildCourierOffers(context({ orders: [order('new', extra)] })), {});
  }
  assert.deepEqual(buildCourierOffers(context({ deliveries: [returned('old', { adresse_livraison: { ville: 'Abidjan' } })] })), {});
});

test('ni autre pays ni livreur inactif ; une pièce proposée une seule fois', () => {
  assert.deepEqual(buildCourierOffers(context({ couriers: [courier('driver', { actif: false })] })), {});
  assert.deepEqual(buildCourierOffers(context({ deliveries: [returned('old', { pays_code: 'SN' })] })), {});
  const offers = buildCourierOffers(context({ orders: [order('b'), order('a')] }));
  assert.deepEqual(Object.keys(offers), ['a']);
});

test('la préparation réserve le stock ; colis multiarticle chez un seul livreur', () => {
  assert.deepEqual(buildCourierOffers(context({ orders: [order(), order('prep', { statut: 'en_stock' })] })), {});
  const multi = order('new', { supplements: [{ id: 's1', articleCatalogue: true, libelle: 'AICHA', taille: 'L', couleur: 'Blanc', montant: 10000 }] });
  const otherStock = stock('stock2', { modele: 'AICHA', taille: 'L', couleur: 'Blanc' });
  const otherPiece = returned('ret2', { adresse_livraison: { stockRetour: { articles: [{ ...snapshotArticles(multi)[1], statut: 'disponible' }] } } });
  assert.equal(buildCourierOffers(context({ orders: [multi], stock: [stock(), otherStock], deliveries: [returned(), otherPiece] })).new.articles.length, 2);
  otherPiece.livreur_id = 'driver2';
  assert.deepEqual(buildCourierOffers(context({ orders: [multi], stock: [stock(), otherStock], deliveries: [returned(), otherPiece], couriers: [courier(), courier('driver2')] })), {});
});

test('réattribution sans double stock et ancien historique conservé', async () => {
  const db = new Database(context());
  const result = await assign(db);
  assert.equal(result.delivery.statut, 'en_cours');
  assert.equal(db.tables.commandes[0].statut, 'en_livraison');
  assert.equal(db.tables.stock[0].quantite_principale, 0);
  assert.equal(db.tables.stock[0].quantite_en_livraison, 1);
  assert.equal(db.tables.livraisons[0].statut, 'retournee');
  assert.equal(db.tables.livraisons[0].adresse_livraison.stockRetour.articles[0].statut, 'reaffectee');
  assert.equal(db.tables.livraisons.length, 2);
  await assert.rejects(assign(db), /dirigée ailleurs/);
  assert.equal(db.tables.stock[0].mouvements.length, 1);
});

test('deux affectations concurrentes ne peuvent pas utiliser la même tenue', async () => {
  const db = new Database(context());
  const results = await Promise.allSettled([assign(db), assign(db)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(db.tables.livraisons.length, 2);
  assert.equal(db.tables.stock[0].quantite_principale, 0);
});

test('échec avant création : commande et tenue restaurées', async () => {
  const db = new Database(context());
  db.fail = q => q.table === 'livraisons' && q.action === 'insert' ? { error: new Error('Insertion refusée') } : null;
  await assert.rejects(assign(db), /Insertion refusée/);
  assert.equal(db.tables.commandes[0].statut, 'validee');
  assert.equal(db.tables.livraisons[0].adresse_livraison.stockRetour.articles[0].statut, 'disponible');
  assert.equal(db.tables.stock[0].quantite_principale, 1);
});

test('réponse stock perdue : reprise idempotente, aucune double sortie', async () => {
  const db = new Database(context()); let once = true;
  db.fail = q => q.table === 'stock' && q.action === 'update' && once
    ? (once = false, { after: true, error: new Error('Connexion interrompue') }) : null;
  await assert.rejects(assign(db), /Finalisez-la/);
  const delivery = db.tables.livraisons[1];
  assert.equal(delivery.adresse_livraison.stockAffectation.etat, 'nouvelle');
  const result = await assign(db, { resumeDeliveryId: delivery.id });
  assert.equal(result.delivery.adresse_livraison.stockAffectation.etat, 'terminee');
  assert.equal(db.tables.stock[0].mouvements.length, 1);
  assert.equal(db.tables.stock[0].quantite_principale, 0);
});

test('pièce en transfert indisponible dans Appel, sans réserver deux fois après mouvement', () => {
  const c = context({ orders: [] });
  Object.assign(c.deliveries[0].adresse_livraison.stockRetour.articles[0], {
    statut: 'en_transfert', operation: 'op', stockMovementOperation: 'assignation:op:principal',
  });
  const first = buildStockSynchronization({ stock: c.stock, orders: courierSynchronizationOrders(c) });
  assert.equal(first.totals.quantiteDisponible, 0);
  c.stock[0].quantite_principale = 0;
  c.stock[0].mouvements = [{ operation: 'assignation:op:principal' }];
  assert.equal(courierSynchronizationOrders(c).length, 0);
});

test('retour physique atelier ne recrédite pas le stock ; aucun ancien refus modifié', async () => {
  const db = new Database(context());
  await confirmCustody(db, { delivery: copy(db.tables.livraisons[0]), country: 'CI', userId: 'admin', location: 'atelier' });
  assert.equal(db.tables.stock[0].quantite_principale, 1);
  assert.equal(db.tables.stock[0].mouvements.length, 0);
  assert.equal(heldPieces(db.tables.livraisons, 'CI').length, 0);
  const legacy = returned('legacy', { adresse_livraison: { ville: 'Abidjan' } });
  await assert.rejects(confirmCustody(db, { delivery: legacy, country: 'CI', location: 'atelier' }), /anciens refus/);
  assert.equal(legacy.adresse_livraison.stockRetour, undefined);
});

test('envoi habituel toujours possible sans stock, refus crée exactement une tenue', async () => {
  const db = new Database(context({ orders: [order('new', { statut: 'en_stock' })], stock: [], deliveries: [] }));
  const assigned = await assign(db, { direct: false });
  assert.equal(db.tables.stock.length, 0);
  const refused = await recordRefusal(db, { delivery: assigned.delivery, order: db.tables.commandes[0], country: 'CI', userId: 'driver', motif: 'Refus client' });
  assert.equal(db.tables.stock[0].quantite_principale, 1);
  assert.equal(refused.adresse_livraison.stockRetour.articles[0].statut, 'disponible');
  await recordRefusal(db, { delivery: refused, order: db.tables.commandes[0], country: 'CI', userId: 'driver' });
  assert.equal(db.tables.stock[0].quantite_principale, 1);
});

test('un autre livreur ne consomme pas la tenue conservée chez son collègue', async () => {
  const db = new Database(context({ orders: [order('new', { statut: 'en_stock' })], couriers: [courier(), courier('driver2')] }));
  await assign(db, { direct: false, courierId: 'driver2' });
  assert.equal(db.tables.stock[0].quantite_principale, 1);
  assert.equal(db.tables.livraisons[0].adresse_livraison.stockRetour.articles[0].statut, 'disponible');
});

test('refus multiarticle et reprise après erreur : chaque retour compté une fois', async () => {
  const multi = order('new', { statut: 'en_livraison', supplements: [{ articleCatalogue: true, libelle: 'AICHA', taille: 'L', couleur: 'Blanc' }] });
  const delivery = { ...base('delivery'), statut: 'en_cours', commande_id: 'new', livreur_id: 'driver', adresse_livraison: {} };
  const db = new Database(context({ orders: [multi], deliveries: [delivery], stock: [] }));
  let fail = true;
  db.fail = q => q.table === 'stock' && q.action === 'insert' && q.updates.modele === 'AICHA' && fail
    ? (fail = false, { error: new Error('Erreur réseau') }) : null;
  await assert.rejects(recordRefusal(db, { delivery, order: multi, country: 'CI', userId: 'driver' }), /Erreur réseau/);
  const result = await recordRefusal(db, { delivery: copy(db.tables.livraisons[0]), order: multi, country: 'CI', userId: 'driver' });
  assert.equal(db.tables.stock.reduce((n, row) => n + row.quantite_principale, 0), 2);
  assert.equal(result.adresse_livraison.stockRetour.articles.filter(a => a.statut === 'disponible').length, 2);
});

test('stock concurrent : la comparaison atomique refuse une ancienne version', async () => {
  const db = new Database(context());
  const stale = copy(db.tables.stock[0]);
  await compareAndSet(db, 'stock', stale, { quantite_principale: 2 });
  await assert.rejects(compareAndSet(db, 'stock', stale, { quantite_principale: 0 }), /vient de changer/);
  assert.equal(db.tables.stock[0].quantite_principale, 2);
  await moveStockOnce(db, { country: 'CI', article: snapshotArticles(order())[0], operation: 'return', commandeId: 'new', action: 'retour' });
  assert.equal(db.tables.stock[0].quantite_principale, 3);
});

test('stock réservé chez un livreur puis réattribué et refusé à nouveau : cycle sans perte', async () => {
  const db = new Database(context());
  const result = await assign(db);
  const refused = await recordRefusal(db, { delivery: result.delivery, order: db.tables.commandes[0], country: 'CI', userId: 'driver' });
  assert.equal(db.tables.stock[0].quantite_principale, 1);
  assert.equal(db.tables.stock[0].quantite_en_livraison, 0);
  assert.equal(heldPieces(db.tables.livraisons, 'CI').length, 1);
  assert.equal(refused.adresse_livraison.stockRetour.articles[0].statut, 'disponible');
  assert.equal(db.tables.livraisons[0].adresse_livraison.stockRetour.articles[0].statut, 'reaffectee');
});

test('refus d’un envoi non déclaré ne réduit pas le stock en livraison d’un autre colis', async () => {
  const db = new Database(context({ orders: [order('new', { statut: 'en_stock' })], deliveries: [],
    stock: [stock('stock', { quantite_principale: 0, quantite_en_livraison: 3 })] }));
  const result = await assign(db, { direct: false });
  assert.equal(result.delivery.adresse_livraison.stockAffectation.suivis.principal, false);
  await recordRefusal(db, { delivery: result.delivery, order: db.tables.commandes[0], country: 'CI', userId: 'driver' });
  assert.equal(db.tables.stock[0].quantite_en_livraison, 3);
  assert.equal(db.tables.stock[0].quantite_principale, 1);
});

test('deux refus concurrents ne créditent pas deux pièces', async () => {
  const db = new Database(context({ orders: [order('new', { statut: 'en_stock' })], deliveries: [] }));
  const result = await assign(db, { direct: false });
  const options = { delivery: result.delivery, order: db.tables.commandes[0], country: 'CI', userId: 'driver' };
  const attempts = await Promise.allSettled([recordRefusal(db, options), recordRefusal(db, options)]);
  assert.equal(attempts.filter(a => a.status === 'fulfilled').length, 1);
  assert.equal(db.tables.stock[0].quantite_principale, 1);
  assert.equal(db.tables.stock[0].quantite_en_livraison, 0);
});

test('retour atelier et réattribution simultanés : une seule issue pour la tenue', async () => {
  const db = new Database(context());
  const results = await Promise.allSettled([assign(db), confirmCustody(db, {
    delivery: copy(db.tables.livraisons[0]), country: 'CI', userId: 'admin', location: 'atelier',
  })]);
  const piece = db.tables.livraisons[0].adresse_livraison.stockRetour.articles[0];
  assert.ok(['atelier', 'reaffectee'].includes(piece.statut));
  if (piece.statut === 'atelier') {
    assert.equal(db.tables.commandes[0].statut, 'validee');
    assert.equal(db.tables.stock[0].quantite_principale, 1);
  } else assert.equal(db.tables.stock[0].quantite_principale, 0);
  assert.equal(results.filter(a => a.status === 'fulfilled').length, 1);
});
