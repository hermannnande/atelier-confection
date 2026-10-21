import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  applyStockVerification, assertStockFloor, loadStockVerification, preparationHolders,
} from '../services/stock-verification.service.js';
import { mergeDuplicateRow, planDuplicateMerges } from '../services/stock-duplicates.service.js';
import {
  buildStockSynchronization, comparePendingOrders, enrichStockWithSynchronization, stockVariationKey,
} from '../services/stock-synchronization.service.js';
import { getValidatedAt } from '../services/order-delay.service.js';
import { courierSynchronizationOrders } from '../services/courier-stock.service.js';

const copy = value => structuredClone(value);
const at = (row, field) => field.split(/->>?/).reduce((value, key) => value?.[key], row);

// Base simulée : filtres utilisés par les services, mises à jour atomiques sur updated_at.
class Database {
  constructor(tables) { this.tables = copy(tables); this.sequence = 1; }
  from(table) { return new Query(this, table); }
}
class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.action = 'select'; }
  select() { return this; }
  eq(field, value) { this.filters.push(row => at(row, field) === value); return this; }
  neq(field, value) { this.filters.push(row => field === 'atelier_pieces' ? Object.keys(row[field] || {}).length > 0 : row[field] !== value); return this; }
  in(field, values) { this.filters.push(row => values.includes(row[field])); return this; }
  not(field) { this.filters.push(row => at(row, field) != null); return this; }
  order() { return this; }
  range(start, end) { this.slice = [start, end + 1]; return this; }
  update(updates) { this.action = 'update'; this.updates = updates; return this; }
  delete() { this.action = 'delete'; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
  async execute() {
    const table = this.db.tables[this.table] ||= [];
    let rows = table.filter(row => this.filters.every(filter => filter(row)));
    if (this.action === 'update') for (const row of rows) Object.assign(row, copy(this.updates), { updated_at: `v${this.db.sequence++}` });
    if (this.action === 'delete') this.db.tables[this.table] = table.filter(row => !rows.includes(row));
    if (this.slice) rows = rows.slice(...this.slice);
    return { data: copy(this.one ? rows[0] || null : rows), error: null };
  }
}

const ID = { a: '0a000000-0000-4000-8000-000000000001', b: '0b000000-0000-4000-8000-000000000002',
  c: '0c000000-0000-4000-8000-000000000003', d: '0d000000-0000-4000-8000-000000000004' };
const VALIDATION = { statut: 'validee', action: 'Commande validée', utilisateur: 'appelant-1', date: '2026-10-06T09:00:00.000Z' };
const order = (id, extra = {}) => ({ id, pays_code: 'CI', numero_commande: `CMD-${id.slice(0, 2)}`, statut: 'validee',
  modele: { nom: 'Robe DAVICHI' }, couleur: 'Rose', taille: 'M', client: { nom: 'Awa', ville: 'Abidjan' },
  created_at: '2026-10-05T08:00:00.000Z', updated_at: 'v0', historique: [VALIDATION], atelier_pieces: {}, ...extra });
const inPreparation = (id, reservation = ['principal'], extra = {}) => order(id, { statut: 'en_stock',
  historique: [VALIDATION, { statut: 'en_stock', action: 'Commande modifiée', date: '2026-10-07T10:00:00.000Z', reservationStock: reservation }],
  ...extra });
const stockRow = (id, extra = {}) => ({ id, pays_code: 'CI', modele: 'Robe DAVICHI', couleur: 'Rose', taille: 'M',
  quantite_principale: 0, quantite_en_livraison: 0, mouvements: [], updated_at: 'v0', created_at: '2026-09-01T00:00:00.000Z', ...extra });
const refusedAtCourier = id => ({ id, pays_code: 'CI', livreur_id: 'driver', statut: 'retournee', date_retour: '2026-10-16T20:00:00.000Z',
  updated_at: 'v0', adresse_livraison: { stockRetour: { version: 1, articles: [
    { id: 'principal', modele: 'Robe DAVICHI', couleur: 'Rose', taille: 'M', statut: 'disponible' }] } } });
const KEY = stockVariationKey(stockRow('x'));
const tables = (extra = {}) => ({ commandes: [], stock: [], livraisons: [], atelier_lots: [],
  users: [{ id: 'driver', pays_code: 'CI', role: 'livreur', actif: true, nom: 'Kuyo' }], ...extra });
const answers = (view, absent = []) => view.colis.map(c => ({ commandeId: c.commandeId, articleKey: c.articleKey, present: !absent.includes(c.commandeId) }));
const verify = (db, view, extra = {}) => applyStockVerification(db, { country: 'CI', userId: 'admin', actorName: 'Hermann',
  input: { operationId: randomUUID(), cle: KEY, revision: view.revision, etagere: 0, colis: answers(view), ...extra } });
const variation = db => buildStockSynchronization({ orders: db.tables.commandes, stock: db.tables.stock })
  .variations.find(v => v.key === KEY);

test('la vérification liste les colis qui retiennent la robe et les tenues chez les livreurs', async () => {
  const db = new Database(tables({
    stock: [stockRow('s1')],
    commandes: [inPreparation(ID.a), inPreparation(ID.b), inPreparation(ID.c, []), order(ID.d),
      // Le supplément d'une autre commande compte pour sa propre variante.
      inPreparation('0e000000-0000-4000-8000-000000000005', ['supplement-1'], { modele: { nom: 'Jupe Peniel' },
        supplements: [{ id: 'x', articleCatalogue: true, libelle: 'Robe DAVICHI', taille: 'M', couleur: 'Rose', montant: 1 }] })],
    livraisons: [refusedAtCourier('r1')],
  }));
  const view = await loadStockVerification(db, { country: 'CI', key: KEY });
  assert.deepEqual(view.colis.map(c => `${c.numero}:${c.articleKey}`).sort(), ['CMD-0a:principal', 'CMD-0b:principal', 'CMD-0e:supplement-1']);
  assert.deepEqual(view.livreurs.map(l => l.livreur), ['Kuyo']);
  assert.equal(view.minimum, 4);
  assert.equal(view.stock.total, 0);
  assert.deepEqual(view.enRoute, []);
  assert.equal(preparationHolders(db.tables.commandes, KEY).length, 3);
});

test('une robe partie avec un livreur avant « Finaliser » est comptée sans bloquer la vérification', async () => {
  const db = new Database(tables({ stock: [stockRow('s1')], commandes: [inPreparation(ID.a), order(ID.d, { statut: 'en_livraison' })],
    livraisons: [{ id: 'l1', pays_code: 'CI', statut: 'en_cours', commande_id: ID.d, livreur_id: 'driver',
      date_assignation: '2026-10-21T13:48:00.000Z', updated_at: 'v0', adresse_livraison: {
        articlesExpedies: [{ id: 'principal', modele: 'Robe DAVICHI', couleur: 'Rose', taille: 'M' }],
        stockAffectation: { id: 'l1', etat: 'nouvelle', pieces: [] } } }] }));
  const view = await loadStockVerification(db, { country: 'CI', key: KEY });
  assert.deepEqual(view.enRoute, [{ numero: 'CMD-0d', livreur: 'Kuyo', depuis: '2026-10-21T13:48:00.000Z' }]);
  assert.equal(view.minimum, 2);
  const result = await verify(db, view);
  // Étagère 0 + 1 colis + 1 robe en route : « Finaliser » pourra ensuite la débiter.
  assert.equal(result.stockApres, 2);
  assert.match(db.tables.stock[0].mouvements[0].commentaire, /1 en route/);
});

test('une tenue reprise chez le livreur pour une commande atelier n’est retenue qu’une fois', () => {
  const atelierOrder = order(ID.d, { statut: 'en_livraison', atelier_pieces: { principal: { etat: 'expedition', lotId: 'lot-1' } },
    historique: [VALIDATION, { statut: 'en_livraison', action: 'Assigné au livreur', operation: 'op1', date: '2026-10-21T13:48:00.000Z' }] });
  const kuyo = refusedAtCourier('r1');
  Object.assign(kuyo.adresse_livraison.stockRetour.articles[0], { statut: 'en_transfert', operation: 'op1',
    commandeDestination: ID.d, stockMovementOperation: 'assignation:op1:principal' });
  const stock = [stockRow('s1', { quantite_principale: 1 })];
  const orders = courierSynchronizationOrders({ orders: [atelierOrder], stock, deliveries: [kuyo], country: 'CI' });
  const held = buildStockSynchronization({ orders, stock }).variations.find(v => v.key === KEY);
  assert.equal(held.reservePreparation, 1);
  assert.equal(held.incoherencesPreparation, 0);
});

test('robes présentes : stock = étagère + colis + livreurs, enregistré une seule fois', async () => {
  const db = new Database(tables({ stock: [stockRow('s1')], commandes: [inPreparation(ID.a), inPreparation(ID.b), order(ID.d)],
    livraisons: [refusedAtCourier('r1')] }));
  assert.equal(variation(db).incoherencesPreparation, 2);
  const view = await loadStockVerification(db, { country: 'CI', key: KEY });
  const input = { operationId: randomUUID(), cle: KEY, revision: view.revision, etagere: 1, colis: answers(view) };
  const result = await applyStockVerification(db, { country: 'CI', userId: 'admin', input });
  assert.deepEqual(result, { stockAvant: 0, stockApres: 4, colisRemisEnAttente: [] });
  const [movement] = db.tables.stock[0].mouvements;
  assert.equal(movement.source, 'Vérification physique');
  assert.equal(movement.operation, `verification:${input.operationId}`);
  assert.deepEqual([movement.ancienneQuantite, movement.nouvelleQuantite], [0, 4]);
  assert.equal(variation(db).incoherencesPreparation, 0);
  // Un deuxième envoi (réseau coupé, double clic) ne compte rien de plus.
  const replay = await applyStockVerification(db, { country: 'CI', userId: 'admin', input });
  assert.equal(replay.dejaEnregistree, true);
  assert.equal(db.tables.stock[0].quantite_principale, 4);
  assert.equal(db.tables.stock[0].mouvements.length, 1);
});

test('robe absente : la commande repasse en attente avec sa validation d’origine', async () => {
  const later = order(ID.d, { historique: [{ ...VALIDATION, date: '2026-10-10T09:00:00.000Z' }] });
  const db = new Database(tables({ stock: [stockRow('s1')], commandes: [inPreparation(ID.a),
    inPreparation(ID.b, ['principal'], { atelier_pieces: { principal: { etat: 'recue', lotId: 'lot-1' } } }), later] }));
  const view = await loadStockVerification(db, { country: 'CI', key: KEY });
  const result = await verify(db, view, { colis: answers(view, [ID.b]) });
  assert.deepEqual(result, { stockAvant: 0, stockApres: 1, colisRemisEnAttente: ['CMD-0b'] });

  const returned = db.tables.commandes.find(o => o.id === ID.b);
  assert.equal(returned.statut, 'validee');
  assert.deepEqual(returned.atelier_pieces, {});
  const [note, status] = returned.historique.slice(-2);
  assert.equal(note.statut, undefined);
  assert.equal(note.utilisateur, 'admin');
  assert.match(note.commentaire, /Robe DAVICHI Rose M introuvable dans le colis.*par Hermann/);
  assert.deepEqual(note.piecesAtelierAbsentes, { principal: { etat: 'recue', lotId: 'lot-1' } });
  assert.doesNotMatch(note.action, /valid/i);
  assert.equal(status.statut, 'validee');
  assert.equal(status.utilisateur, VALIDATION.utilisateur);
  assert.equal(status.date, VALIDATION.date);
  assert.equal(status.verifiePar, 'admin');
  // SMS de retard et priorité calculés depuis la validation d'origine.
  assert.equal(getValidatedAt(returned).toISOString(), VALIDATION.date);
  assert.ok(comparePendingOrders(returned, later) < 0);
  // Robe à refaire : plus de colis bloqué, la commande redevient un besoin atelier.
  const after = variation(db);
  assert.equal(after.incoherencesPreparation, 0);
  assert.equal(after.aConfectionner, 2);
});

test('liste changée, réponse manquante ou saisie invalide : rien n’est modifié', async () => {
  const db = new Database(tables({ stock: [stockRow('s1')], commandes: [inPreparation(ID.a), inPreparation(ID.b)] }));
  const view = await loadStockVerification(db, { country: 'CI', key: KEY });
  await assert.rejects(verify(db, view, { colis: answers(view).slice(1) }), /Indiquez pour chaque colis/);
  await assert.rejects(verify(db, view, { etagere: -1 }), /Vérification incomplète/);
  db.tables.stock[0].updated_at = 'changed-elsewhere';
  await assert.rejects(verify(db, view, { colis: answers(view, [ID.a]) }), /viennent de changer/);
  assert.equal(db.tables.stock[0].quantite_principale, 0);
  assert.deepEqual(db.tables.commandes.map(o => o.statut), ['en_stock', 'en_stock']);
});

test('une correction manuelle ne descend plus sous les robes déjà dans des colis', async () => {
  const db = new Database(tables({ stock: [stockRow('s1', { quantite_principale: 3 })], commandes: [inPreparation(ID.a), inPreparation(ID.b)] }));
  const row = db.tables.stock[0];
  await assert.rejects(assertStockFloor(db, { country: 'CI', row, nextQuantity: 1 }),
    error => error.status === 409 && /CMD-0a, CMD-0b/.test(error.message) && /sous 2/.test(error.message));
  await assertStockFloor(db, { country: 'CI', row, nextQuantity: 2 });
  // Remonter un stock déjà trop bas reste toujours possible.
  row.quantite_principale = 0;
  await assertStockFloor(db, { country: 'CI', row, nextQuantity: 1 });
});

test('la page Stock voit les colis réels et les robes chez les livreurs une seule fois par variante', () => {
  const stock = [stockRow('s1'), stockRow('s2', { couleur: 'rose' })];
  const synchronization = buildStockSynchronization({ orders: [inPreparation(ID.a), inPreparation(ID.b)], stock });
  const [first, second] = enrichStockWithSynchronization(stock, synchronization, { livreurs: new Map([[KEY, 1]]) });
  assert.deepEqual([first.quantiteReservee, first.colisPreparation, first.chezLivreurs, first.stockAVerifier, first.cle], [0, 2, 1, true, KEY]);
  assert.deepEqual([second.colisPreparation, second.chezLivreurs, second.stockAVerifier], [0, 0, false]);
});

test('fusion des doublons : ligne gardée, quantités, mouvements et reprise après coupure', async () => {
  const xxxl = stockRow('xxxl', { taille: 'XXXL', mouvements: [{}, {}, {}] });
  const big = stockRow('3xl', { taille: '3XL', mouvements: [{}] });
  assert.equal(planDuplicateMerges([xxxl, big]).merges[0].keeper.id, '3xl');
  const lot = { pays_code: 'CI', article: { modele: 'Robe DAVICHI', taille: 'XXXL', couleur: 'Rose' } };
  assert.equal(planDuplicateMerges([xxxl, big], [lot]).merges[0].keeper.id, 'xxxl');
  assert.equal(planDuplicateMerges([xxxl, big], [lot, { ...lot, article: { ...lot.article, taille: '3XL' } }]).skipped.length, 1);
  const lower = stockRow('lower', { couleur: 'rose', mouvements: [{}, {}] });
  assert.equal(planDuplicateMerges([stockRow('upper', { mouvements: [{}] }), lower]).merges[0].keeper.id, 'lower');

  const keeper = stockRow('keep', { quantite_principale: 1, mouvements: [{ type: 'entree', date: '2026-10-01T00:00:00.000Z', operation: 'k1' }] });
  const duplicate = stockRow('dup', { couleur: 'rose', quantite_principale: 2, quantite_en_livraison: 1,
    mouvements: [{ type: 'entree', date: '2026-09-30T00:00:00.000Z', operation: 'd1' }] });
  const db = new Database(tables({ stock: [keeper, duplicate] }));
  // Coupure simulée juste après la première étape : la ligne en double est déjà vidée.
  db.tables.stock[1] = { ...duplicate, quantite_principale: 0, quantite_en_livraison: 0, mouvements: [...duplicate.mouvements,
    { operation: 'fusion-sortie:dup', type: 'fusion', quantite: 0, quantitePrincipale: 2, quantiteEnLivraison: 1 }] };
  const result = await mergeDuplicateRow(db, { keeperId: 'keep', duplicateId: 'dup', country: 'CI' });
  assert.equal(result.etat, 'fusionnee');
  assert.equal(db.tables.stock.length, 1);
  const [merged] = db.tables.stock;
  assert.deepEqual([merged.quantite_principale, merged.quantite_en_livraison], [3, 1]);
  assert.deepEqual(merged.mouvements.map(m => m.operation), ['d1', 'k1', 'fusion:dup']);
  assert.equal(merged.mouvements[0].ligneOrigine, 'rose / M');
  assert.equal(merged.mouvements.at(-1).source, 'Fusion des lignes en double');
  assert.equal((await mergeDuplicateRow(db, { keeperId: 'keep', duplicateId: 'dup', country: 'CI' })).etat, 'deja-fusionnee');
  assert.equal(db.tables.stock[0].quantite_principale, 3);
});
