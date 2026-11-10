import test from 'node:test';
import assert from 'node:assert/strict';
import { sameStockLabel, summarizeStockVariations } from './stockVariation.js';

test('les anciennes couleurs et noms avec une autre casse correspondent', () => {
  assert.equal(sameStockLabel('Bleu Marine', 'Bleu marine'), true);
  assert.equal(sameStockLabel('ROBE AICHA', 'Robe Aïcha'), true);
  assert.equal(sameStockLabel('Vert Treillis', 'Bleu marine'), false);
});

test('l’aperçu regroupe les lignes historiques sans perdre quantité ni réservation', () => {
  const [variation] = summarizeStockVariations([
    { taille: 'XXL', couleur: 'Bleu Marine', quantitePrincipale: 2, quantiteReservee: 1, quantiteDisponible: 1 },
    { taille: '2XL', couleur: 'Bleu marine', quantitePrincipale: 1, quantiteReservee: 1, quantiteDisponible: 0 },
  ]);
  assert.equal(summarizeStockVariations([
    { taille: 'XXL', couleur: 'Bleu Marine' },
    { taille: '2XL', couleur: 'Bleu marine' },
  ]).length, 1);
  assert.equal(variation.taille, '2XL');
  assert.equal(variation.quantitePrincipale, 3);
  assert.equal(variation.quantiteReservee, 2);
  assert.equal(variation.quantiteDisponible, 1);
});

test('l’aperçu garde le besoin de couture quel que soit l’ordre des lignes en double', () => {
  const [variation] = summarizeStockVariations([
    { taille: 'L', couleur: 'Blanc', seuilMinimal: 5, aCoudrePourStock: 0, enCoursPourStock: 0 },
    { taille: 'L', couleur: 'BLANC', seuilMinimal: 5, aCoudrePourStock: 2, enCoursPourStock: 1 },
  ]);
  assert.equal(variation.seuilMinimal, 5);
  assert.equal(variation.aCoudrePourStock, 2);
  assert.equal(variation.enCoursPourStock, 1);
});
