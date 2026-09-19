import test from 'node:test';
import assert from 'node:assert/strict';
import { equivalentSizes, normalizeSize } from '../services/size-normalization.service.js';
import { findStockVariation } from '../services/stock-variation.service.js';

test('XXL et XXXL utilisent les tailles 2XL et 3XL', () => {
  assert.equal(normalizeSize('XXL'), '2XL');
  assert.equal(normalizeSize(' 2 xl '), '2XL');
  assert.equal(normalizeSize('XXXL'), '3XL');
  assert.equal(normalizeSize('3XL'), '3XL');
  assert.equal(normalizeSize('XL'), 'XL');
  assert.ok(equivalentSizes('XXL').includes('2XL'));
  assert.ok(equivalentSizes('3XL').includes('XXXL'));
});

test('retrouve un ancien stock XXL pour une commande 2XL', async () => {
  let searchedSizes;
  const supabase = {
    from(table) {
      assert.equal(table, 'stock');
      return {
        select() { return this; },
        eq() { return this; },
        in(field, values) {
          assert.equal(field, 'taille');
          searchedSizes = values;
          return this;
        },
        then(resolve) {
          return Promise.resolve({
            data: [
              { id: 'ancien', taille: 'XXL', quantite_principale: 2 },
              { id: 'nouveau', taille: '2XL', quantite_principale: 0 },
            ],
            error: null,
          }).then(resolve);
        },
      };
    },
  };

  const { data } = await findStockVariation(supabase, {
    country: 'CI', modele: 'DAVICHI', taille: '2XL', couleur: 'Blanc',
  });
  assert.ok(searchedSizes.includes('XXL'));
  assert.equal(data.id, 'ancien');
});
