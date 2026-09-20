import test from 'node:test';
import assert from 'node:assert/strict';
import { moveOrderSupplementStock } from '../services/order-supplement-stock.service.js';

const commande = {
  id: 'commande-1',
  supplements: [{
    id: 'article-2',
    libelle: 'Chic Dress',
    taille: 'XL',
    couleur: 'Blanc',
    montant: 14_000,
    articleCatalogue: true,
  }],
};

function emptyStockClient() {
  const inserted = [];
  const client = {
    from(table) {
      assert.equal(table, 'stock');
      return {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        order() { return this; },
        range() { return Promise.resolve({ data: [], error: null }); },
        async insert(row) {
          inserted.push(row);
          return { error: null };
        },
      };
    },
  };
  return { client, inserted };
}

test('un article sans stock ne bloque pas son assignation', async () => {
  const { client, inserted } = emptyStockClient();
  await moveOrderSupplementStock({
    supabase: client, commande, country: 'CI', userId: 'u1', action: 'assigner',
  });
  assert.equal(inserted.length, 0);
});

test('un article refusé sans ligne de stock crée sa variation en stock', async () => {
  const { client, inserted } = emptyStockClient();
  await moveOrderSupplementStock({
    supabase: client, commande, country: 'CI', userId: 'u1', action: 'refusee',
  });
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].modele, 'Chic Dress');
  assert.equal(inserted[0].taille, 'XL');
  assert.equal(inserted[0].couleur, 'Blanc');
  assert.equal(inserted[0].quantite_principale, 1);
});
