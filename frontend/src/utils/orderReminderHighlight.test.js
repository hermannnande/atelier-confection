import test from 'node:test';
import assert from 'node:assert/strict';
import { isConfirmedAfterReminder } from './orderReminderHighlight.js';

test('met en évidence une commande validée après un rappel', () => {
  const commande = {
    statut: 'validee',
    historique: [
      { statut: 'a_rappeler' },
      { statut: 'validee', action: 'Commande confirmée après rappel client' },
    ],
  };

  assert.equal(isConfirmedAfterReminder(commande), true);
});

test('ne colore pas une commande validée qui ne vient pas des rappels', () => {
  const commande = {
    statut: 'validee',
    historique: [{ statut: 'validee', action: 'Commande validée' }],
  };

  assert.equal(isConfirmedAfterReminder(commande), false);
});

test('retire la couleur quand la commande quitte le statut validé', () => {
  const commande = {
    statut: 'en_decoupe',
    historique: [
      { statut: 'a_rappeler' },
      { statut: 'validee' },
      { statut: 'en_decoupe' },
    ],
  };

  assert.equal(isConfirmedAfterReminder(commande), false);
});
