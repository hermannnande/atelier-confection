import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatOrderValidationDate,
  getOrderValidatedAt,
  getOrderValidationAgeInDays,
  isValidatedForAtLeastDays,
} from './orderValidationAge.js';

const now = new Date('2026-09-01T10:00:00.000Z');

test('une commande validée depuis cinq jours devient prioritaire', () => {
  const commande = {
    statut: 'validee',
    historique: [{ statut: 'validee', date: '2026-08-27T23:30:00.000Z' }],
  };

  assert.equal(getOrderValidationAgeInDays(commande, now), 5);
  assert.equal(isValidatedForAtLeastDays(commande, 5, now), true);
});

test('une commande validée depuis quatre jours ne devient pas prioritaire', () => {
  const commande = {
    statut: 'validee',
    historique: [{ action: 'Commande validée', date: '2026-08-28T08:00:00.000Z' }],
  };

  assert.equal(getOrderValidationAgeInDays(commande, now), 4);
  assert.equal(isValidatedForAtLeastDays(commande, 5, now), false);
});

test('la couleur automatique disparaît quand le statut change', () => {
  const commande = {
    statut: 'en_decoupe',
    historique: [{ statut: 'validee', date: '2026-08-20T08:00:00.000Z' }],
  };

  assert.equal(isValidatedForAtLeastDays(commande, 5, now), false);
});

test('utilise la date de création si l’historique de validation manque', () => {
  const commande = { statut: 'validee', createdAt: '2026-08-25T08:00:00.000Z' };

  assert.equal(getOrderValidatedAt(commande).toISOString(), '2026-08-25T08:00:00.000Z');
  assert.equal(isValidatedForAtLeastDays(commande, 5, now), true);
});

test('une modification après la validation ne change pas la date de validation', () => {
  const commande = {
    statut: 'validee',
    historique: [
      { action: 'Commande créée', statut: 'nouvelle', date: '2026-08-20T08:00:00.000Z' },
      { action: 'Commande validée', statut: 'validee', date: '2026-08-21T09:15:00.000Z' },
      { action: 'Commande modifiée', statut: 'validee', date: '2026-08-30T16:00:00.000Z' },
    ],
  };

  assert.equal(getOrderValidatedAt(commande).toISOString(), '2026-08-21T09:15:00.000Z');
  assert.equal(isValidatedForAtLeastDays(commande, 5, now), true);
});

test('une commande remise en attente puis revalidée prend la nouvelle validation', () => {
  const commande = {
    statut: 'validee',
    historique: [
      { action: 'Commande validée', statut: 'validee', date: '2026-08-10T08:00:00.000Z' },
      { action: 'Mise en attente', statut: 'en_attente', date: '2026-08-11T08:00:00.000Z' },
      { action: 'Commande validée', statut: 'validee', date: '2026-08-31T10:30:00.000Z' },
    ],
  };

  assert.equal(getOrderValidatedAt(commande).toISOString(), '2026-08-31T10:30:00.000Z');
});

test('la date de validation s’affiche en heure d’Abidjan, avec l’année si besoin', () => {
  assert.equal(formatOrderValidationDate(new Date('2026-08-31T10:30:00.000Z'), now), '31/08 à 10:30');
  assert.equal(formatOrderValidationDate(new Date('2025-12-31T23:05:00.000Z'), now), '31/12/2025 à 23:05');
  assert.equal(formatOrderValidationDate(null, now), '');
});
