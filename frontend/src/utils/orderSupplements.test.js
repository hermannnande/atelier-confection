import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrderBasePrice,
  getOrderTotal,
  normalizeOrderSupplements,
} from './orderSupplements.js';

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
