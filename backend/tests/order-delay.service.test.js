import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELAY_ELIGIBLE_STATUSES,
  getCalendarDayDifference,
  getDelayEventCode,
  getValidatedAt,
  processDelayedOrders,
} from '../services/order-delay.service.js';

function createDatabase(commandes) {
  const calls = [];
  const query = {
    select(value) { calls.push(['select', value]); return this; },
    eq(key, value) { calls.push(['eq', key, value]); return this; },
    in(key, value) { calls.push(['in', key, value]); return this; },
    order(key, value) { calls.push(['order', key, value]); return this; },
    limit(value) { calls.push(['limit', value]); return Promise.resolve({ data: commandes, error: null }); },
  };
  return { db: { from: () => query }, calls };
}

function commande(id, validatedAt, statut = 'validee') {
  return {
    id,
    pays_code: 'CI',
    statut,
    numero_commande: `CMD-${id}`,
    client: { nom: 'Cliente', contact: '0701020304' },
    historique: [{ action: 'Commande validée', statut: 'validee', date: validatedAt }],
  };
}

test('retrouve la date de validation dans l’historique', () => {
  const date = getValidatedAt(commande('1', '2026-08-05T09:00:00.000Z'));
  assert.equal(date.toISOString(), '2026-08-05T09:00:00.000Z');
});

test('calcule les jours calendaires en heure d’Abidjan', () => {
  assert.equal(
    getCalendarDayDifference(
      new Date('2026-08-05T16:00:00.000Z'),
      new Date('2026-08-07T17:30:00.000Z')
    ),
    2
  );
});

test('ne prévoit des excuses que de J à J+2', () => {
  assert.equal(getDelayEventCode(0), 'retard_j0');
  assert.equal(getDelayEventCode(1), 'retard_j1');
  assert.equal(getDelayEventCode(2), 'retard_j2');
  assert.equal(getDelayEventCode(3), null);
});

test('traite J, J+1 et J+2 puis ignore J+3', async () => {
  const commandes = [
    commande('j0', '2026-08-07T09:00:00.000Z'),
    commande('j1', '2026-08-06T09:00:00.000Z'),
    commande('j2', '2026-08-05T09:00:00.000Z'),
    commande('j3', '2026-08-04T09:00:00.000Z'),
  ];
  const { db, calls } = createDatabase(commandes);
  const sent = [];
  const sender = {
    async sendCommandeNotification(eventCode, order) {
      sent.push([eventCode, order.id]);
      return { success: true };
    },
  };

  const result = await processDelayedOrders({
    db,
    sender,
    now: new Date('2026-08-07T17:30:00.000Z'),
    env: { CUSTOMER_SMS_COUNTRY_CODE: 'CI', CUSTOMER_SMS_TIME_ZONE: 'Africa/Abidjan' },
  });

  assert.deepEqual(sent, [
    ['retard_j0', 'j0'],
    ['retard_j1', 'j1'],
    ['retard_j2', 'j2'],
  ]);
  assert.deepEqual(result.stats, { processed: 4, sent: 3, skipped: 1, failed: 0 });
  assert.ok(calls.some((entry) => entry[0] === 'in' && entry[1] === 'statut'
    && entry[2] === DELAY_ELIGIBLE_STATUSES));
});
