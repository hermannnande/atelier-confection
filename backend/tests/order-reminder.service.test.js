import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_REMINDER_STATUS,
  assertCanConfirmOrderReminder,
  assertCanSendOrderToReminder,
} from '../services/order-reminder.service.js';

test('une commande nouvelle ou validée peut être envoyée en rappel', () => {
  assert.equal(assertCanSendOrderToReminder('nouvelle'), ORDER_REMINDER_STATUS);
  assert.equal(assertCanSendOrderToReminder('validee'), ORDER_REMINDER_STATUS);
});

test('une commande déjà envoyée ailleurs ne peut pas être envoyée en rappel', () => {
  assert.throws(
    () => assertCanSendOrderToReminder('en_decoupe'),
    /nouvelles ou validées/,
  );
});

test('seule une commande en rappel peut être confirmée de nouveau', () => {
  assert.equal(assertCanConfirmOrderReminder(ORDER_REMINDER_STATUS), 'validee');
  assert.throws(
    () => assertCanConfirmOrderReminder('validee'),
    /pas en attente de rappel/,
  );
});
