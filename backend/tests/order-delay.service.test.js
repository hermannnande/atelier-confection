import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELAY_ELIGIBLE_STATUSES,
  getCalendarDayDifference,
  getDelayEventCode,
  getDelayWindowStart,
  getValidatedAt,
  processDelayedOrders,
} from '../services/order-delay.service.js';

function createDatabase(commandes) {
  const calls = [];
  const query = {
    select(value) { calls.push(['select', value]); return this; },
    eq(key, value) { calls.push(['eq', key, value]); return this; },
    in(key, value) { calls.push(['in', key, value]); return this; },
    gte(key, value) { calls.push(['gte', key, value]); return this; },
    lte(key, value) { calls.push(['lte', key, value]); return this; },
    order(key, value) { calls.push(['order', key, value]); return this; },
    range(from, to) {
      calls.push(['range', from, to]);
      return Promise.resolve({ data: commandes.slice(from, to + 1), error: null });
    },
  };
  return { db: { from: () => query }, calls };
}

function commande(id, validatedAt, statut = 'validee') {
  return {
    id,
    pays_code: 'CI',
    statut,
    numero_commande: `CMD-${id}`,
    updated_at: validatedAt,
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

test('limite la requête aux trois jours civils concernés', () => {
  assert.equal(
    getDelayWindowStart(
      new Date('2026-08-07T17:30:00.000Z'),
      'Africa/Abidjan',
    ).toISOString(),
    '2026-08-05T00:00:00.000Z',
  );
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
  assert.ok(calls.some((entry) => entry[0] === 'gte' && entry[1] === 'updated_at'
    && entry[2] === '2026-08-05T00:00:00.000Z'));
  assert.equal(calls.some((entry) => entry[0] === 'limit'), false);
});

test('pagine toutes les commandes concernées au-delà de 100', async () => {
  const commandes = Array.from({ length: 205 }, (_, index) => (
    commande(String(index + 1), '2026-08-07T09:00:00.000Z')
  ));
  const { db, calls } = createDatabase(commandes);
  const sentIds = [];
  const sender = {
    async sendCommandeNotification(eventCode, order) {
      assert.equal(eventCode, 'retard_j0');
      sentIds.push(order.id);
      return { success: true };
    },
  };

  const result = await processDelayedOrders({
    db,
    sender,
    now: new Date('2026-08-07T17:30:00.000Z'),
    env: {
      CUSTOMER_SMS_COUNTRY_CODE: 'CI',
      CUSTOMER_SMS_TIME_ZONE: 'Africa/Abidjan',
      CUSTOMER_SMS_DELAY_PAGE_SIZE: '50',
    },
  });

  assert.equal(sentIds.length, 205);
  assert.equal(new Set(sentIds).size, 205);
  assert.deepEqual(result.stats, { processed: 205, sent: 205, skipped: 0, failed: 0 });
  assert.equal(result.pages, 5);
  assert.deepEqual(
    calls.filter((entry) => entry[0] === 'range'),
    [
      ['range', 0, 49],
      ['range', 50, 99],
      ['range', 100, 149],
      ['range', 150, 199],
      ['range', 200, 249],
    ],
  );
});

test('cible uniquement le report J et limite un lot manuel', async () => {
  const commandes = [
    ...Array.from({ length: 7 }, (_, index) => commande(`j0-${index}`, '2026-08-07T09:00:00.000Z')),
    commande('j1', '2026-08-06T09:00:00.000Z'),
  ];
  const { db } = createDatabase(commandes);
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
    dayDifferences: [0],
    maxSends: 5,
    now: new Date('2026-08-07T17:30:00.000Z'),
    env: { CUSTOMER_SMS_COUNTRY_CODE: 'CI', CUSTOMER_SMS_TIME_ZONE: 'Africa/Abidjan' },
  });

  assert.equal(sent.length, 5);
  assert.ok(sent.every(([eventCode]) => eventCode === 'retard_j0'));
  assert.equal(result.maxSends, 5);
  assert.deepEqual(result.requestedDays, [0]);
});
