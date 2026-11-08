import test from 'node:test';
import assert from 'node:assert/strict';
import { isModeleDestockage, nomDestockage, nomSansDestockage } from './stockRayon.js';

test('un modèle de déstockage est reconnu à la fin de son nom, sans tenir compte des accents', () => {
  assert.equal(isModeleDestockage({ nom: 'DAVICHI ROYALE Déstockage' }), true);
  assert.equal(isModeleDestockage({ nom: 'Robe Volante destockage ' }), true);
});

test('les autres modèles restent des modèles de stock normal', () => {
  assert.equal(isModeleDestockage({ nom: 'DAVICHI ROYALE', categorie: 'Robe' }), false);
  assert.equal(isModeleDestockage({ nom: null }), false);
  assert.equal(isModeleDestockage({}), false);
  assert.equal(isModeleDestockage(null), false);
});

test('le mot Déstockage est ajouté une seule fois et se retire pour la modification', () => {
  assert.equal(nomDestockage('ROBE AMINA'), 'ROBE AMINA Déstockage');
  assert.equal(nomDestockage('ROBE AMINA Déstockage'), 'ROBE AMINA Déstockage');
  assert.equal(nomSansDestockage('ROBE AMINA Déstockage'), 'ROBE AMINA');
  assert.equal(nomSansDestockage('ROBE AMINA'), 'ROBE AMINA');
});
