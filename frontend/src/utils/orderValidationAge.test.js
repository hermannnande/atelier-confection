import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
