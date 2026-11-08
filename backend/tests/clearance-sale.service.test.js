import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClearanceCatalog,
  ClearanceOrderError,
  clearanceDisplayName,
  countClearanceHolds,
  createClearanceOrder,
  MAX_PENDING_PER_PHONE,
  parseClearanceOrder,
} from '../services/clearance-sale.service.js';
import { clearanceModelKeys } from '../services/clearance-stock.service.js';

const MODELES = [
  { id: 'r', nom: 'DAVICHI ROYALE Déstockage', categorie: 'Déstockage', actif: true, prix_base: 15000, image: 'r.webp' },
  { id: 'j', nom: 'ROBE JOSY Déstockage', categorie: 'Déstockage', actif: true, prix_base: 12500, image: 'j.webp' },
  { id: 'n', nom: 'DAVICHI ROYALE', categorie: 'Robe', actif: true, prix_base: 15000, image: 'n.webp' },
];
const variation = (modele, couleur, taille, quantiteDisponible) => ({
  key: `${modele}::${couleur}::${taille}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
  couleur, taille, quantiteDisponible,
});
const VARIATIONS = [
  variation('DAVICHI ROYALE Déstockage', 'Beige', 'XL', 2),
  variation('DAVICHI ROYALE Déstockage', 'Beige', 'S', 1),
  variation('DAVICHI ROYALE Déstockage', 'Rose', 'S', 1),
  variation('DAVICHI ROYALE Déstockage', 'Noir', 'M', 0),
  variation('ROBE JOSY Déstockage', 'Bleu Turquoise', 'Standard', 8),
  variation('DAVICHI ROYALE', 'Blanc', 'M', 5),
];
const commande = (statut, modele, couleur, taille, contact = '0700000000', extra = {}) => ({
  id: `${modele}-${couleur}-${taille}-${statut}`, statut, modele: { nom: modele }, couleur, taille, client: { contact }, ...extra,
});

test('le nom affiché à la cliente ne contient pas « Déstockage »', () => {
  assert.equal(clearanceDisplayName('DAVICHI ROYALE Déstockage'), 'DAVICHI ROYALE');
  assert.equal(clearanceDisplayName('Robe Volante destockage'), 'Robe Volante');
  assert.equal(clearanceDisplayName('ROBE JOSY'), 'ROBE JOSY');
});

test('la page ne montre que les modèles de déstockage, avec couleur, taille et nombre de pièces', () => {
  const catalogue = buildClearanceCatalog({ modeles: MODELES, variations: VARIATIONS });
  assert.deepEqual(catalogue.map((m) => m.nomAffiche), ['DAVICHI ROYALE', 'ROBE JOSY']);
  const [royale, josy] = catalogue;
  assert.equal(royale.pieces, 4);
  assert.equal(royale.prix, 15000);
  assert.deepEqual(royale.couleurs, [
    { couleur: 'Beige', pieces: 3, tailles: [{ taille: 'S', quantite: 1 }, { taille: 'XL', quantite: 2 }] },
    { couleur: 'Rose', pieces: 1, tailles: [{ taille: 'S', quantite: 1 }] },
  ]);
  assert.deepEqual(josy.couleurs[0].tailles, [{ taille: 'Standard', quantite: 8 }]);
});

test('une pièce commandée quitte la page tout de suite, et disparaît quand il n’en reste plus', () => {
  const holds = countClearanceHolds([
    commande('en_attente_validation', 'DAVICHI ROYALE Déstockage', 'Beige', 'XL'),
    commande('en_attente_paiement', 'DAVICHI ROYALE Déstockage', 'Rose', 'S'),
  ]);
  const [royale] = buildClearanceCatalog({ modeles: MODELES, variations: VARIATIONS, holds });
  assert.equal(royale.pieces, 2);
  assert.deepEqual(royale.couleurs, [
    { couleur: 'Beige', pieces: 2, tailles: [{ taille: 'S', quantite: 1 }, { taille: 'XL', quantite: 1 }] },
  ]);
});

test('une commande avec un article de déstockage ajouté retient aussi cette pièce', () => {
  const holds = countClearanceHolds([commande('nouvelle', 'ROBE AMINA', 'Noir', 'M', '07', {
    supplements: [{ articleCatalogue: true, libelle: 'ROBE JOSY Déstockage', couleur: 'Bleu Turquoise', taille: 'Standard' }],
  })]);
  const josy = buildClearanceCatalog({ modeles: MODELES, variations: VARIATIONS, holds })[1];
  assert.equal(josy.pieces, 7);
});

test('un modèle désactivé ne s’affiche pas', () => {
  const modeles = [{ ...MODELES[0], actif: false }];
  assert.deepEqual(buildClearanceCatalog({ modeles, variations: VARIATIONS }), []);
});

test('le formulaire exige un téléphone valide, une couleur et une taille', () => {
  const ok = { phone: '+225 07 00 00 00 00', modele: 'A', couleur: 'Noir', taille: 'xl', client: ' Awa ', ville: 'Cocody', source: 'page' };
  assert.deepEqual(parseClearanceOrder(ok), { phone: '+2250700000000', modele: 'A', couleur: 'Noir', taille: 'xl', client: 'Awa', ville: 'Cocody', source: 'page' });
  assert.throws(() => parseClearanceOrder({ ...ok, phone: '12' }), (e) => e.code === 'TELEPHONE' && e.status === 400);
  assert.throws(() => parseClearanceOrder({ ...ok, couleur: '' }), (e) => e.code === 'CHAMPS');
});

// Base simulée : la commande créée reste « à appeler » et retire donc la pièce au passage suivant.
function fakeSale(variations = VARIATIONS) {
  const orders = [];
  let lectures = 0;
  const db = {
    from: () => ({
      insert: ([row]) => ({
        select: () => ({
          single: async () => {
            const data = { ...row, id: `id-${orders.length + 1}`, numero_commande: `CMD${orders.length + 1}` };
            orders.push(data);
            return { data, error: null };
          },
        }),
      }),
    }),
  };
  const load = async () => {
    lectures += 1;
    await new Promise((resolve) => setImmediate(resolve));
    return {
      catalogue: buildClearanceCatalog({ modeles: MODELES, variations, holds: countClearanceHolds(orders) }),
      holdOrders: orders,
      clearanceKeys: clearanceModelKeys(MODELES),
    };
  };
  return { db, load, orders, lectures: () => lectures };
}
const achat = (over = {}) => ({
  phone: '0701010101', modele: 'DAVICHI ROYALE Déstockage', couleur: 'Rose', taille: 'S', client: 'Awa', ville: 'Cocody', source: 'https://nousunique.com/destockage/', ...over,
});

test('une commande valide arrive à appeler, au nom du modèle de déstockage et au prix du modèle', async () => {
  const { db, load, orders } = fakeSale();
  const { commande: cree, doublon } = await createClearanceOrder(db, { country: 'CI', input: achat({ couleur: 'rose', taille: 's' }), load });
  assert.equal(doublon, false);
  assert.equal(orders.length, 1);
  assert.equal(cree.statut, 'en_attente_validation');
  assert.equal(cree.modele.nom, 'DAVICHI ROYALE Déstockage');
  assert.equal(cree.couleur, 'Rose');
  assert.equal(cree.prix, 15000);
  assert.equal(cree.prix_base, 15000);
  assert.deepEqual(cree.client, { nom: 'Awa', contact: '0701010101', ville: 'Cocody' });
  assert.match(cree.historique[0].action, /destockage/);
});

test('deux clientes en même temps sur la dernière pièce : une seule commande passe', async () => {
  const { db, load, orders } = fakeSale();
  const resultats = await Promise.allSettled([
    createClearanceOrder(db, { country: 'CI', input: achat({ phone: '0701010101' }), load }),
    createClearanceOrder(db, { country: 'CI', input: achat({ phone: '0702020202' }), load }),
  ]);
  assert.equal(orders.length, 1);
  assert.deepEqual(resultats.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
  const refus = resultats.find((r) => r.status === 'rejected').reason;
  assert.ok(refus instanceof ClearanceOrderError);
  assert.equal(refus.code, 'INDISPONIBLE');
  assert.equal(refus.status, 409);
});

test('un double envoi ne retire pas une deuxième pièce', async () => {
  const { db, load, orders } = fakeSale();
  await createClearanceOrder(db, { country: 'CI', input: achat({ couleur: 'Beige', taille: 'XL' }), load });
  const second = await createClearanceOrder(db, { country: 'CI', input: achat({ couleur: 'Beige', taille: 'XL', phone: '+225 0701010101'.replace(/ /g, '') }), load });
  assert.equal(second.doublon, true);
  assert.equal(orders.length, 1);
});

test('une combinaison qui n’existe pas est refusée, sans commande', async () => {
  const { db, load, orders } = fakeSale();
  await assert.rejects(createClearanceOrder(db, { country: 'CI', input: achat({ couleur: 'Vert' }), load }), (e) => e.code === 'INDISPONIBLE');
  await assert.rejects(createClearanceOrder(db, { country: 'CI', input: achat({ modele: 'DAVICHI ROYALE' }), load }), (e) => e.code === 'INDISPONIBLE');
  assert.equal(orders.length, 0);
});

test('un même numéro ne peut pas bloquer toutes les pièces', async () => {
  const beaucoup = Array.from({ length: 6 }, (_, i) => variation('ROBE JOSY Déstockage', `Couleur ${i}`, 'Standard', 1));
  const { db, load, orders } = fakeSale(beaucoup);
  for (let i = 0; i < MAX_PENDING_PER_PHONE; i += 1) {
    await createClearanceOrder(db, { country: 'CI', input: achat({ modele: 'ROBE JOSY Déstockage', couleur: `Couleur ${i}`, taille: 'Standard' }), load });
  }
  await assert.rejects(
    createClearanceOrder(db, { country: 'CI', input: achat({ modele: 'ROBE JOSY Déstockage', couleur: 'Couleur 5', taille: 'Standard' }), load }),
    (e) => e.code === 'LIMITE' && e.status === 429,
  );
  assert.equal(orders.length, MAX_PENDING_PER_PHONE);
});

test('après une erreur de lecture, les commandes suivantes passent', async () => {
  const { db, load, orders } = fakeSale();
  await assert.rejects(createClearanceOrder(db, { country: 'CI', input: achat(), load: async () => { throw new Error('fetch failed'); } }), /fetch failed/);
  await createClearanceOrder(db, { country: 'CI', input: achat(), load });
  assert.equal(orders.length, 1);
});
