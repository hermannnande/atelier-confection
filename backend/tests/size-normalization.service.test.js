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

function stockClient(rows) {
  const searchedSizes = [];
  const supabase = {
    from(table) {
      assert.equal(table, 'stock');
      const filters = [];
      return {
        select() { return this; },
        eq(field, value) { filters.push((row) => row[field] === value); return this; },
        in(field, values) {
          assert.equal(field, 'taille');
          searchedSizes.push(...values);
          filters.push((row) => values.includes(row[field]));
          return this;
        },
        order() { return this; },
        range(start, end) {
          const found = rows.filter((row) => filters.every((filter) => filter(row)));
          return Promise.resolve({ data: found.slice(start, end + 1), error: null });
        },
        maybeSingle() {
          return Promise.resolve({ data: rows.find((row) => filters.every((filter) => filter(row))) || null, error: null });
        },
      };
    },
  };
  return { supabase, searchedSizes };
}

test('retrouve un ancien stock XXL pour une commande 2XL', async () => {
  const { supabase, searchedSizes } = stockClient([
    { id: 'ancien', pays_code: 'CI', modele: 'DAVICHI', taille: 'XXL', couleur: 'Blanc', quantite_principale: 2 },
    { id: 'nouveau', pays_code: 'CI', modele: 'DAVICHI', taille: '2XL', couleur: 'Blanc', quantite_principale: 0 },
  ]);

  const { data } = await findStockVariation(supabase, {
    country: 'CI', modele: 'DAVICHI', taille: '2XL', couleur: 'Blanc',
  });
  assert.ok(searchedSizes.includes('XXL'));
  assert.equal(data.id, 'ancien');
});

test('une couleur écrite avec une autre casse utilise la ligne qui contient réellement les pièces', async () => {
  const { supabase } = stockClient([
    { id: 'avec-pieces', pays_code: 'CI', modele: 'Robe DAVICHI', taille: 'XL', couleur: 'Bleu marine', quantite_principale: 2 },
    { id: 'sans-piece', pays_code: 'CI', modele: 'Robe DAVICHI', taille: 'XL', couleur: 'Bleu Marine', quantite_principale: 0 },
  ]);

  const { data, rows } = await findStockVariation(supabase, {
    country: 'CI', modele: 'Robe DAVICHI', taille: 'XL', couleur: 'Bleu Marine',
  });
  assert.equal(rows.length, 2);
  assert.equal(data.id, 'avec-pieces');
});

test('un retour choisit la ligne contenant la pièce en livraison', async () => {
  const { supabase } = stockClient([
    { id: 'principal', pays_code: 'CI', modele: 'Robe DAVICHI', taille: '3XL', couleur: 'Rose', quantite_principale: 1, quantite_en_livraison: 0 },
    { id: 'livraison', pays_code: 'CI', modele: 'Robe DAVICHI', taille: 'XXXL', couleur: 'rose', quantite_principale: 0, quantite_en_livraison: 1 },
  ]);

  const { data } = await findStockVariation(supabase, {
    country: 'CI', modele: 'Robe DAVICHI', taille: '3XL', couleur: 'Rose',
    preferQuantity: 'quantite_en_livraison',
  });
  assert.equal(data.id, 'livraison');
});

test('la recherche parcourt aussi les lignes au-delà de mille résultats', async () => {
  const unrelated = Array.from({ length: 1000 }, (_, index) => ({
    id: `autre-${index}`, pays_code: 'CI', modele: 'Autre modèle', taille: 'Standard', couleur: 'Blanc',
  }));
  const { supabase } = stockClient([
    ...unrelated,
    { id: 'cible', pays_code: 'CI', modele: 'Robe DAVICHI', taille: 'Standard', couleur: 'Blanc', quantite_principale: 1 },
  ]);
  const { data } = await findStockVariation(supabase, {
    country: 'CI', modele: 'Robe DAVICHI', taille: 'Standard', couleur: 'Blanc',
  });
  assert.equal(data.id, 'cible');
});
