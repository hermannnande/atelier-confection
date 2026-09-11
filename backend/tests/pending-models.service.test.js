import test from 'node:test';
import assert from 'node:assert/strict';
import { adminRecentThreshold, groupPendingModels } from '../services/pending-models.service.js';

test('regroupe les commandes par modèle, couleur et taille', () => {
  const orders = [
    { id: '1', statut: 'validee', modele: { nom: 'DAVICHI', image: 'davichi.jpg' }, couleur: 'Blanc', taille: 'L' },
    { id: '2', statut: 'nouvelle', modele: { nom: 'KAYLA' }, couleur: 'Blanc', taille: 'L' },
    { id: '3', statut: 'validee', modele: { nom: 'DAVICHI' }, couleur: 'Bleu ciel', taille: '2XL' },
    { id: '4', statut: 'en_decoupe', modele: { nom: 'DAVICHI' }, couleur: 'Blanc', taille: 'L' },
  ];

  const [davichi] = groupPendingModels(orders);
  assert.equal(davichi.total, 2);
  assert.equal(davichi.image, 'davichi.jpg');
  assert.deepEqual(
    davichi.variations.map(({ couleur, taille, quantite }) => ({ couleur, taille, quantite })),
    [
      { couleur: 'Blanc', taille: 'L', quantite: 1 },
      { couleur: 'Bleu ciel', taille: '2XL', quantite: 1 },
    ],
  );
  assert.equal(groupPendingModels(orders).some((groupe) => groupe.nom === 'KAYLA'), false);
});

test('signale seulement les commandes postérieures à la dernière vue globale', () => {
  const orders = [
    { statut: 'validee', modele: 'DAVICHI', couleur: 'Blanc', taille: 'L', created_at: '2026-09-10T08:00:00Z' },
    { statut: 'validee', modele: 'DAVICHI', couleur: 'Blanc', taille: 'L', created_at: '2026-09-10T10:00:00Z' },
  ];

  const [davichi] = groupPendingModels(orders, { recentAfter: '2026-09-10T09:00:00Z' });
  assert.equal(davichi.nouveau, 1);
  assert.equal(davichi.variations[0].nouveau, 1);
});

test('la fenêtre récente de l’administrateur dure 24 heures', () => {
  assert.equal(
    adminRecentThreshold(new Date('2026-09-10T12:00:00Z')),
    new Date('2026-09-09T12:00:00Z').getTime(),
  );
});
