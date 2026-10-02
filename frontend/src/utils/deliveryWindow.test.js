import test from 'node:test';
import assert from 'node:assert/strict';
import { getDeliveryRouteDayKey } from './deliveryRouteHistory.js';
import { deliveryLoadStart, deliveryWindowStart, needsFullDeliveryHistory } from './deliveryWindow.js';

test('la fenêtre commence à minuit il y a 60 jours, la lecture 7 jours plus tôt', () => {
  const maintenant = new Date(2026, 9, 2, 15, 30);
  const debut = deliveryWindowStart(maintenant);
  assert.equal(getDeliveryRouteDayKey(debut), '2026-08-03');
  assert.deepEqual([debut.getHours(), debut.getMinutes(), debut.getSeconds(), debut.getMilliseconds()], [0, 0, 0, 0]);
  assert.equal(getDeliveryRouteDayKey(deliveryLoadStart(maintenant)), '2026-07-27');
});

test('« Tout » et les dates avant la fenêtre chargent tout l’historique', () => {
  assert.equal(needsFullDeliveryHistory('all', '', '2026-08-03'), true);
  assert.equal(needsFullDeliveryHistory('custom', '2026-08-02', '2026-08-03'), true);
  assert.equal(needsFullDeliveryHistory('custom', '2026-08-03', '2026-08-03'), false);
  assert.equal(needsFullDeliveryHistory('custom', '', '2026-08-03'), false);
  for (const filtre of ['today', 'yesterday', 'week']) {
    assert.equal(needsFullDeliveryHistory(filtre, '', '2026-08-03'), false);
  }
});
