import test from 'node:test';
import assert from 'node:assert/strict';
import smsEnvoieAdapter, {
  getSmsEnvoieConfiguration,
  parseSmsEnvoieResponse,
} from '../services/smsenvoie.adapter.js';

const env = {
  SMSENVOIE_API_KEY: 'sk_test_non_secret',
  SMSENVOIE_DEVICE_ID: 'device-nousunique',
  SMSENVOIE_SIM_SLOT: '1',
};

test('configure SIM 2 avec le slot API 1', () => {
  const config = getSmsEnvoieConfiguration(env);
  assert.equal(config.simSlot, 1);
  assert.equal(smsEnvoieAdapter.isConfigured(env), true);
  assert.deepEqual(smsEnvoieAdapter.getPublicConfiguration(env), {
    providerLabel: 'SMSEnvoie',
    deviceId: 'device-nousunique',
    simSlot: 1,
    simLabel: 'SIM 2',
  });
});

test('envoie par l’appareil imposé et SIM 2 sans exposer la clé dans le body', async () => {
  let request;
  const result = await smsEnvoieAdapter.sendMessage(
    { to: '+2250701020304', message: 'Votre commande est confirmée.' },
    {
      env,
      fetchImpl: async (url, options) => {
        request = { url, options };
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              ok: true,
              campaign_id: 'campaign-1',
              total: 1,
              skipped_optout: 0,
              invalid: 0,
              status: 'queued',
            });
          },
        };
      },
    },
  );

  assert.equal(request.url, 'https://smsenvoie.com/api/v1/sms');
  assert.equal(request.options.headers.Authorization, 'Bearer sk_test_non_secret');
  assert.deepEqual(JSON.parse(request.options.body), {
    to: '+2250701020304',
    message: 'Votre commande est confirmée.',
    device_id: 'device-nousunique',
    sim_slot: 1,
    priority: 0,
  });
  assert.equal(request.options.body.includes('sk_test_non_secret'), false);
  assert.equal(result.pending, true);
  assert.equal(result.campaignId, 'campaign-1');
});

test('interprète les réponses et codes d’erreur SMSEnvoie', () => {
  assert.deepEqual(parseSmsEnvoieResponse({
    ok: false,
    error: 'Quota SMS épuisé',
    code: 'quota_exceeded',
  }), {
    success: false,
    campaignId: null,
    total: 0,
    skippedOptout: 0,
    invalid: 0,
    status: null,
    error: 'Quota SMS épuisé',
    code: 'quota_exceeded',
  });
});
