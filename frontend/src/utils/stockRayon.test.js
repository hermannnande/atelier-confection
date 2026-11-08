import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIE_DESTOCKAGE, isModeleDestockage } from './stockRayon.js';

test('un modèle de déstockage est reconnu à sa catégorie, sans tenir compte des accents', () => {
  assert.equal(isModeleDestockage({ categorie: CATEGORIE_DESTOCKAGE }), true);
  assert.equal(isModeleDestockage({ categorie: 'destockage' }), true);
});

test('les autres modèles restent des modèles de stock normal', () => {
  assert.equal(isModeleDestockage({ categorie: 'Robe' }), false);
  assert.equal(isModeleDestockage({ categorie: null }), false);
  assert.equal(isModeleDestockage({}), false);
  assert.equal(isModeleDestockage(null), false);
});
