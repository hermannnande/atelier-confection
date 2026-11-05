import test from 'node:test';
import assert from 'node:assert/strict';
import { orderMatchesSearch } from './orderSearch.js';

const commande = {
  numeroCommande: 'CMD016149',
  client: { nom: 'Cliente Test' },
  modele: { nom: 'Jupe Peniel' },
  supplements: [{ libelle: 'Aura de Femme', taille: '3XL', couleur: 'Rouge', montant: 15000 }],
};

test('la recherche trouve toujours le numéro, le client et le modèle principal', () => {
  assert.equal(orderMatchesSearch(commande, 'cmd016149'), true);
  assert.equal(orderMatchesSearch(commande, 'cliente'), true);
  assert.equal(orderMatchesSearch(commande, 'JUPE'), true);
  assert.equal(orderMatchesSearch(commande, ''), true);
});

test('la recherche trouve aussi une robe ajoutée comme article supplémentaire', () => {
  assert.equal(orderMatchesSearch(commande, 'aura de femme'), true);
  assert.equal(orderMatchesSearch(commande, 'Davichi'), false);
  assert.equal(orderMatchesSearch({ ...commande, supplements: [{ label: 'Robe Josy' }] }, 'josy'), true);
});

test('une commande sans article supplémentaire ni client ne bloque pas la recherche', () => {
  assert.equal(orderMatchesSearch({ numeroCommande: 'CMD1', modele: { nom: 'ROBE AMINA' } }, 'aura'), false);
  assert.equal(orderMatchesSearch({ numeroCommande: 'CMD1', modele: { nom: 'ROBE AMINA' }, supplements: null }, 'amina'), true);
});
