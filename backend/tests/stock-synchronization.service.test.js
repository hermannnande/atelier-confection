import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStockSynchronization,
  enrichStockWithSynchronization,
} from '../services/stock-synchronization.service.js';

const davichi = (id, statut = 'validee', overrides = {}) => ({
  id,
  statut,
  modele: { nom: 'DAVICHI' },
  couleur: 'Bleu marine',
  taille: 'M',
  created_at: `2026-09-15T0${id}:00:00Z`,
  ...overrides,
});

const stockDavichi = (quantity = 2) => ({
  id: 'stock-1',
  modele: 'Davichi',
  couleur: 'BLEU MARINE',
  taille: 'm',
  quantitePrincipale: quantity,
  quantiteEnLivraison: 0,
});

test('une commande validée réserve le stock sans modifier la quantité physique', () => {
  const result = buildStockSynchronization({
    orders: [davichi('1')],
    stock: [stockDavichi(2)],
  });

  assert.equal(result.totals.stockPhysique, 2);
  assert.equal(result.totals.reserveCommandes, 1);
  assert.equal(result.totals.quantiteDisponible, 1);
  assert.equal(result.totals.aConfectionner, 0);
  assert.equal(result.uncoveredOrders.length, 0);
  assert.equal(result.couvertureCommandes['1'].couvertParStock, true);
});

test('seules les commandes qui dépassent le stock deviennent des besoins de confection', () => {
  const result = buildStockSynchronization({
    orders: [davichi('1'), davichi('2'), davichi('3')],
    stock: [stockDavichi(2)],
  });

  assert.equal(result.totals.commandesValidees, 3);
  assert.equal(result.totals.reserveCommandes, 2);
  assert.equal(result.totals.aConfectionner, 1);
  assert.deepEqual(result.uncoveredOrders.map((order) => order.id), ['3']);
});

test('les articles déjà en préparation colis ne comptent plus dans les réservations', () => {
  const result = buildStockSynchronization({
    orders: [davichi('1', 'en_stock'), davichi('2', 'validee')],
    stock: [stockDavichi(2)],
  });

  assert.equal(result.totals.reservePreparation, 0);
  assert.equal(result.totals.reserveCommandes, 1);
  assert.equal(result.totals.quantiteReservee, 1);
  assert.equal(result.totals.quantiteDisponible, 1);
  assert.equal(result.uncoveredOrders.length, 0);
});

test('une urgence est couverte avant une commande normale de la même variation', () => {
  const result = buildStockSynchronization({
    orders: [
      davichi('1'),
      davichi('2', 'validee', { urgence: true }),
    ],
    stock: [stockDavichi(1)],
  });

  assert.equal(result.couvertureCommandes['2'].couvertParStock, true);
  assert.equal(result.couvertureCommandes['1'].couvertParStock, false);
});

test('la synchronisation enrichit les lignes du stock avec réservé et disponible', () => {
  const stock = [stockDavichi(2)];
  const synchronization = buildStockSynchronization({
    orders: [davichi('1')],
    stock,
  });
  const [item] = enrichStockWithSynchronization(stock, synchronization);

  assert.equal(item.quantitePrincipale, 2);
  assert.equal(item.quantiteReservee, 1);
  assert.equal(item.quantiteDisponible, 1);
});

test('chaque tenue ajoutée à une commande réserve sa propre variation', () => {
  const commande = davichi('1', 'validee', {
    supplements: [{
      id: 'article-2',
      libelle: 'Chic Dress',
      taille: 'XL',
      couleur: 'Blanc',
      montant: 14_000,
      articleCatalogue: true,
    }],
  });
  const result = buildStockSynchronization({
    orders: [commande],
    stock: [stockDavichi(1)],
  });

  assert.equal(result.totals.reserveCommandes, 1);
  assert.equal(result.totals.aConfectionner, 1);
  assert.equal(result.uncoveredOrders[0].modele.nom, 'Chic Dress');
  assert.equal(result.couvertureCommandes['1'].couvertParStock, false);
});

test('les tenues supplémentaires ne restent pas réservées après l’envoi en préparation', () => {
  const result = buildStockSynchronization({
    orders: [davichi('1', 'en_stock', {
      supplements: [{
        id: 'article-2',
        libelle: 'Chic Dress',
        taille: 'XL',
        couleur: 'Blanc',
        montant: 14_000,
        articleCatalogue: true,
      }],
    })],
    stock: [stockDavichi(1)],
  });

  assert.equal(result.totals.reserveCommandes, 0);
  assert.equal(result.totals.aConfectionner, 0);
});

test('une commande XXL réserve le stock 2XL sans créer un besoin atelier', () => {
  const result = buildStockSynchronization({
    orders: [davichi('1', 'validee', { taille: 'XXL' })],
    stock: [stockDavichi(1), {
      id: 'stock-2', modele: 'DAVICHI', couleur: 'Bleu marine',
      taille: '2XL', quantitePrincipale: 1,
    }],
  });
  assert.equal(result.couvertureCommandes['1'].couvertParStock, true);
  assert.equal(result.totals.aConfectionner, 0);
  assert.equal(result.variations.find((v) => v.taille === '2XL').reserveCommandes, 1);
});
