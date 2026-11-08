import test from 'node:test';
import assert from 'node:assert/strict';
import {
  belongsToRayon,
  clearanceModelKeys,
  clearanceNameProblem,
  isClearanceModel,
  parseStockRayon,
  stockModelKey,
} from '../services/clearance-stock.service.js';
import { buildStockSynchronization, sumVariationTotals } from '../services/stock-synchronization.service.js';

const validee = (id, modele, couleur = 'Noir', taille = 'M') => ({
  id, modele: { nom: modele }, couleur, taille, statut: 'validee', created_at: '2026-11-01T10:00:00Z', historique: [],
});
const piece = (modele, quantite, couleur = 'Noir', taille = 'M') => ({ modele, couleur, taille, quantite_principale: quantite });

test('une tenue de déstockage est reconnue à la fin de son nom, sans tenir compte des accents', () => {
  assert.equal(isClearanceModel({ nom: 'ROBE AMINA Déstockage' }), true);
  assert.equal(isClearanceModel({ nom: 'Robe Volante destockage ' }), true);
  assert.equal(isClearanceModel({ nom: 'ROBE AMINA', categorie: 'Robe' }), false);
  assert.equal(isClearanceModel({}), false);
  assert.deepEqual([...clearanceModelKeys([{ nom: 'Robe Été Déstockage' }, { nom: 'ROBE AMINA' }])], ['robe ete destockage']);
});

test('sans pièce, une commande de déstockage ne part pas à l’atelier ; une tenue normale, si', () => {
  const sansConfection = clearanceModelKeys([{ nom: 'Lot Déstockage' }]);
  const sync = buildStockSynchronization({
    orders: [validee('a', 'Lot Déstockage'), validee('b', 'Lot Déstockage'), validee('c', 'ROBE AMINA')],
    stock: [piece('Lot Déstockage', 1)],
    sansConfection,
  });
  assert.deepEqual(sync.uncoveredOrders.map((order) => order.id), ['c']);
  const solde = sync.variations.find((variation) => variation.modele === 'Lot Déstockage');
  assert.equal(solde.aConfectionner, 0);
  assert.equal(solde.reserveCommandes, 1);
  assert.equal(sync.couvertureCommandes.a.couvertParStock, true);
  assert.equal(sync.couvertureCommandes.b.couvertParStock, false);
  assert.equal(sync.totals.aConfectionner, 1);
});

test('sans liste de déstockage, le calcul du stock ne change pas', () => {
  const orders = [validee('a', 'ROBE AMINA'), validee('b', 'ROBE AMINA')];
  const stock = [piece('ROBE AMINA', 1)];
  assert.deepEqual(
    buildStockSynchronization({ orders, stock }),
    buildStockSynchronization({ orders, stock, sansConfection: new Set() }),
  );
});

test('les totaux d’un rayon additionnent seulement ses variations', () => {
  const sansConfection = clearanceModelKeys([{ nom: 'Lot Déstockage' }]);
  const sync = buildStockSynchronization({
    orders: [validee('a', 'Lot Déstockage')],
    stock: [piece('Lot Déstockage', 3), piece('ROBE AMINA', 5)],
    sansConfection,
  });
  const inRayon = (rayon) => sync.variations.filter((v) => belongsToRayon(v.key.split('::')[0], rayon, sansConfection));
  assert.equal(sumVariationTotals(inRayon('destockage')).stockPhysique, 3);
  assert.equal(sumVariationTotals(inRayon('destockage')).quantiteReservee, 1);
  assert.equal(sumVariationTotals(inRayon('normal')).stockPhysique, 5);
  assert.deepEqual(sumVariationTotals(inRayon(null)), sync.totals);
});

test('seuls les rayons connus sont acceptés', () => {
  assert.equal(parseStockRayon('normal'), 'normal');
  assert.equal(parseStockRayon('destockage'), 'destockage');
  assert.equal(parseStockRayon('autre'), null);
  assert.equal(parseStockRayon(undefined), null);
});

test('un modèle de déstockage ne peut pas reprendre un nom déjà présent dans le stock', () => {
  assert.match(clearanceNameProblem({ stockNames: ['Vieille Robe Déstockage'], nom: 'VIEILLE ROBE DESTOCKAGE' }), /Du stock existe/);
  assert.equal(clearanceNameProblem({ modeles: [{ id: '1', nom: 'ROBE AMINA' }], stockNames: ['ROBE AMINA'], nom: 'ROBE AMINA Déstockage' }), null);
});

test('un modèle normal ne peut pas reprendre le nom d’un modèle de déstockage', () => {
  const modeles = [{ id: '1', nom: 'Lot Déstockage' }];
  assert.match(clearanceNameProblem({ modeles, nom: 'LOT DESTOCKAGE' }), /Lot Déstockage/);
});

test('les règles existantes entre modèles normaux ne changent pas', () => {
  const modeles = [{ id: '1', nom: 'ROBE AMINA' }];
  assert.equal(clearanceNameProblem({ modeles, stockNames: ['ROBE AMINA'], nom: 'Robe Amina' }), null);
  assert.equal(clearanceNameProblem({ modeles, stockNames: ['ROBE AMINA'], nom: 'ROBE AMINA 2', actuel: modeles[0] }), null);
});

test('un modèle qui a déjà du stock ne change plus de type', () => {
  const normal = { id: '1', nom: 'ROBE AMINA' };
  const solde = { id: '2', nom: 'Lot Déstockage' };
  const modeles = [normal, solde];
  assert.match(clearanceNameProblem({ modeles, stockNames: ['ROBE AMINA'], nom: 'ROBE AMINA Déstockage', actuel: normal }), /changer de type/);
  assert.match(clearanceNameProblem({ modeles, stockNames: ['Lot Déstockage'], nom: 'Lot', actuel: solde }), /changer de type/);
  assert.equal(clearanceNameProblem({ modeles, nom: 'Lot', actuel: solde }), null);
});

test('un modèle de déstockage garde son nom dès qu’il a du stock, mais reste modifiable', () => {
  const solde = { id: '2', nom: 'Lot Déstockage' };
  assert.match(clearanceNameProblem({ modeles: [solde], stockNames: ['Lot Déstockage'], nom: 'Autre Déstockage', actuel: solde }), /son nom/);
  assert.equal(clearanceNameProblem({ modeles: [solde], stockNames: ['Lot Déstockage'], nom: 'Lot Déstockage', actuel: solde }), null);
  assert.equal(stockModelKey('Lot-Déstockage'), stockModelKey('lot destockage'));
});
