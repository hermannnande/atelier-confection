import test from 'node:test';
import assert from 'node:assert/strict';
import {
  belongsToRayon,
  clearanceModelKeys,
  clearanceNameProblem,
  isClearanceModel,
  loadRetiredClearanceModelKeys,
  parseStockRayon,
  retiredClearanceModelKeys,
  shownInRayon,
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

test('un modèle de déstockage supprimé (inactif) est retiré de la page Déstockage', () => {
  const modeles = [
    { nom: 'JAMILA Déstockage', actif: false },
    { nom: 'Robe Volante Déstockage', actif: true },
    { nom: 'ROBE JOSY Déstockage' },
    { nom: 'ROBE AMINA', actif: false },
  ];
  const retires = retiredClearanceModelKeys(modeles);
  assert.deepEqual([...retires], [stockModelKey('JAMILA Déstockage')]);

  const clearanceKeys = clearanceModelKeys(modeles);
  const jamila = stockModelKey('jamila destockage');
  const volante = stockModelKey('Robe Volante Déstockage');
  assert.equal(shownInRayon(jamila, 'destockage', clearanceKeys, retires), false);
  assert.equal(shownInRayon(volante, 'destockage', clearanceKeys, retires), true);
});

test('un modèle de déstockage retiré reste du déstockage et reste dans le stock complet', () => {
  const modeles = [{ nom: 'JAMILA Déstockage', actif: false }, { nom: 'ROBE AMINA', actif: true }];
  const retires = retiredClearanceModelKeys(modeles);
  const clearanceKeys = clearanceModelKeys(modeles);
  const jamila = stockModelKey('JAMILA Déstockage');
  // Jamais dans le stock normal (pas de confection), toujours visible d'Appel et Commandes (sans rayon).
  assert.equal(clearanceKeys.has(jamila), true);
  assert.equal(shownInRayon(jamila, 'normal', clearanceKeys, retires), false);
  assert.equal(shownInRayon(jamila, null, clearanceKeys, retires), true);
  assert.equal(shownInRayon(stockModelKey('ROBE AMINA'), 'normal', clearanceKeys, retires), true);
  assert.equal(shownInRayon(jamila, 'destockage', clearanceKeys), true);
});

test('les modèles retirés sont lus parmi les modèles inactifs seulement', async () => {
  const appels = [];
  const db = {
    from(table) {
      appels.push(table);
      return {
        select(colonnes) { appels.push(colonnes); return this; },
        eq(colonne, valeur) {
          appels.push(`${colonne}=${valeur}`);
          return Promise.resolve({ data: [{ nom: 'Robe DAVICHI Déstockage', actif: false }, { nom: 'Robe X', actif: false }], error: null });
        },
      };
    },
  };
  const retires = await loadRetiredClearanceModelKeys(db);
  assert.deepEqual(appels, ['modeles', 'nom, actif', 'actif=false']);
  assert.deepEqual([...retires], [stockModelKey('Robe DAVICHI Déstockage')]);
});
