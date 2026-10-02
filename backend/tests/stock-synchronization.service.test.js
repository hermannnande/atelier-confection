import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStockSynchronization,
  enrichStockWithSynchronization,
} from '../services/stock-synchronization.service.js';
import { groupPendingModels } from '../services/pending-models.service.js';

const davichi = (id, statut = 'validee', overrides = {}) => ({
  id,
  statut,
  modele: { nom: 'DAVICHI' },
  couleur: 'Bleu marine',
  taille: 'M',
  created_at: `2026-09-15T0${id}:00:00Z`,
  ...overrides,
});

// Colis envoyé en Préparation Colis avec les pièces qui lui étaient réservées.
const enPreparation = (id, reservationStock, overrides = {}) => davichi(id, 'en_stock', {
  historique: [
    { action: 'Commande validée', statut: 'validee', date: '2026-10-01T08:00:00Z' },
    {
      action: 'Commande modifiée',
      statut: 'en_stock',
      date: '2026-10-01T09:00:00Z',
      ...(reservationStock ? { reservationStock } : {}),
    },
  ],
  ...overrides,
});

// Envoi antérieur à l'enregistrement des pièces réservées.
const ancienEnvoi = (id) => enPreparation(id);

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

test('les articles déjà en préparation colis restent réservés jusqu’au livreur', () => {
  const result = buildStockSynchronization({
    orders: [enPreparation('1', ['principal']), davichi('2', 'validee')],
    stock: [stockDavichi(2)],
  });

  assert.equal(result.totals.reservePreparation, 1);
  assert.equal(result.totals.reserveCommandes, 1);
  assert.equal(result.totals.quantiteReservee, 2);
  assert.equal(result.totals.quantiteDisponible, 0);
  assert.equal(result.uncoveredOrders.length, 0);
});

test('une pièce affectée à un colis en préparation n’est pas proposée à un autre client', () => {
  const result = buildStockSynchronization({
    orders: [enPreparation('1', ['principal']), davichi('2', 'validee')],
    stock: [stockDavichi(1)],
  });

  assert.equal(result.totals.reservePreparation, 1);
  assert.equal(result.totals.reserveCommandes, 0);
  assert.equal(result.totals.quantiteDisponible, 0);
  assert.equal(result.couvertureCommandes['2'].couvertParStock, false);
  assert.deepEqual(result.uncoveredOrders.map((order) => order.id), ['2']);
});

test('un envoi direct sans pièce n’absorbe pas une nouvelle entrée en stock', () => {
  const result = buildStockSynchronization({
    orders: [enPreparation('1', []), davichi('2', 'validee')],
    stock: [stockDavichi(1)],
  });

  assert.equal(result.totals.reservePreparation, 0);
  assert.equal(result.couvertureCommandes['2'].couvertParStock, true);
  assert.equal(result.totals.aConfectionner, 0);
});

test('une entrée en stock diminue les modèles en attente malgré d’anciens colis', () => {
  const blancL = (id) => davichi(id, 'validee', { couleur: 'Blanc', taille: 'L' });
  const stockBlancL = (quantitePrincipale) => ({
    id: 'stock-blanc-l', modele: 'DAVICHI', couleur: 'Blanc', taille: 'L', quantitePrincipale,
  });
  const ancienColis = { ...ancienEnvoi('9'), couleur: 'Blanc', taille: 'L' };
  const orders = [blancL('1'), blancL('2'), blancL('3'), blancL('4'), ancienColis];

  const avant = buildStockSynchronization({ orders, stock: [] });
  const apres = buildStockSynchronization({ orders, stock: [stockBlancL(3)] });

  assert.equal(avant.totals.aConfectionner, 4);
  assert.equal(apres.totals.reservePreparation, 0);
  assert.equal(apres.totals.aConfectionner, 1);
});

test('une commande en Préparation Colis n’apparaît jamais dans Modèles en attente', () => {
  const result = buildStockSynchronization({
    orders: [enPreparation('1', []), ancienEnvoi('2'), davichi('3', 'validee')],
    stock: [],
  });
  const groupes = groupPendingModels(result.uncoveredOrders);

  assert.deepEqual(result.uncoveredOrders.map((order) => order.id), ['3']);
  assert.equal(groupes.length, 1);
  assert.equal(groupes[0].total, 1);
});

test('un colis envoyé avant l’enregistrement des pièces ne réserve plus de pièce', () => {
  const result = buildStockSynchronization({
    orders: [ancienEnvoi('1'), davichi('2', 'validee')],
    stock: [stockDavichi(1)],
  });

  assert.equal(result.totals.reservePreparation, 0);
  assert.equal(result.couvertureCommandes['2'].couvertParStock, true);
});

test('un statut de préparation posé sans trace ne réserve aucune pièce', () => {
  const result = buildStockSynchronization({
    orders: [
      davichi('1', 'en_stock', {
        historique: [{ action: 'Assigné au livreur', statut: 'en_livraison', date: '2026-10-01T09:00:00Z' }],
      }),
      davichi('2', 'validee'),
    ],
    stock: [stockDavichi(1)],
  });

  assert.equal(result.totals.reservePreparation, 0);
  assert.equal(result.couvertureCommandes['2'].couvertParStock, true);
});

test('une modification pendant la préparation conserve la pièce réservée à l’envoi', () => {
  const colis = enPreparation('1', ['principal']);
  colis.historique.push({ action: 'Commande modifiée', statut: 'en_stock', date: '2026-10-01T10:00:00Z' });
  const result = buildStockSynchronization({
    orders: [colis, davichi('2', 'validee')],
    stock: [stockDavichi(1)],
  });

  assert.equal(result.totals.reservePreparation, 1);
  assert.equal(result.couvertureCommandes['2'].couvertParStock, false);
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

test('les tenues supplémentaires restent réservées pendant la préparation', () => {
  const result = buildStockSynchronization({
    orders: [enPreparation('1', ['principal', 'supplement-1'], {
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

  assert.equal(result.totals.reservePreparation, 2);
  assert.equal(result.totals.reserveCommandes, 0);
  assert.equal(result.totals.quantiteReservee, 1);
  assert.equal(result.totals.quantiteDisponible, 0);
  assert.equal(result.totals.aConfectionner, 0);
});

test('seules les tenues réservées d’une commande multiarticle la suivent en préparation', () => {
  const supplements = [{
    id: 'article-2',
    libelle: 'Chic Dress',
    taille: 'XL',
    couleur: 'Blanc',
    montant: 14_000,
    articleCatalogue: true,
  }];
  const validee = buildStockSynchronization({
    orders: [davichi('1', 'validee', { supplements })],
    stock: [stockDavichi(1)],
  });
  assert.deepEqual(validee.articlesReserves['1'], ['principal']);

  const preparation = buildStockSynchronization({
    orders: [enPreparation('1', validee.articlesReserves['1'], { supplements })],
    stock: [stockDavichi(1), {
      id: 'stock-chic', modele: 'Chic Dress', couleur: 'Blanc', taille: 'XL', quantitePrincipale: 1,
    }],
  });
  assert.equal(preparation.totals.reservePreparation, 1);
  assert.equal(preparation.variations.find((v) => v.modele === 'Chic Dress').quantiteDisponible, 1);
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
