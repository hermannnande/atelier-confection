import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogSupplement,
  getOrderBasePrice,
  getOrderTotal,
  normalizeOrderSupplements,
} from './orderSupplements.js';

test('une tenue ajoutée depuis le catalogue garde la marque qui la fait suivre dans le stock', () => {
  const article = catalogSupplement(
    { nom: 'KAYLA', image: 'kayla.webp' },
    { id: 'modele-1', taille: 'XXL', couleur: 'Noir', montant: 13_000 },
  );

  assert.deepEqual(normalizeOrderSupplements([article]), [{
    id: 'modele-1',
    libelle: 'KAYLA',
    taille: '2XL',
    couleur: 'Noir',
    montant: 13_000,
    articleCatalogue: true,
    image: 'kayla.webp',
  }]);
});

test('le total affiché change avec les étiquettes ajoutées', () => {
  const supplements = normalizeOrderSupplements([
    { id: '1', libelle: 'Deuxième robe', montant: 13_500 },
    { id: '2', libelle: 'Ceinture', montant: 1_500 },
  ]);

  assert.equal(getOrderTotal(13_500, supplements), 28_500);
});

test('calcule le prix de base compatible avec une ancienne commande', () => {
  assert.equal(
    getOrderBasePrice({
      prix: 18_000,
      supplements: [{ id: '1', libelle: 'Surplus', montant: 3_000 }],
    }),
    15_000,
  );
});
