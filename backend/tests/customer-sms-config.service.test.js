import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decryptCustomerSmsSecret,
  encryptCustomerSmsSecret,
  readStoredCustomerSmsConfig,
  saveStoredCustomerSmsConfig,
} from '../services/customer-sms-config.service.js';

const env = { SUPABASE_SERVICE_KEY: 'service-role-key-for-customer-sms-tests' };

test('chiffre la clé SMSEnvoie sans conserver sa valeur lisible', () => {
  const apiKey = 'sk_live_customer_sms_key_1234567890';
  const encrypted = encryptCustomerSmsSecret(apiKey, env);
  assert.ok(encrypted.startsWith('v1:'));
  assert.equal(encrypted.includes(apiKey), false);
  assert.equal(decryptCustomerSmsSecret(encrypted, env), apiKey);
});

test('enregistre puis relit SMSEnvoie sur SIM 2', async () => {
  let storedRows = [];
  const writeDb = {
    from() {
      return {
        async upsert(rows) {
          storedRows = rows;
          return { error: null };
        },
      };
    },
  };
  await saveStoredCustomerSmsConfig({
    apiKey: 'sk_live_customer_sms_key_1234567890',
    deviceId: 'f95525f8-e6c8-4657-9439-685230100ca0',
    simSlot: 1,
    enabled: true,
  }, writeDb, env);

  const readDb = {
    from() {
      return {
        select() { return this; },
        async in() { return { data: storedRows, error: null }; },
      };
    },
  };
  const stored = await readStoredCustomerSmsConfig(readDb, env);
  assert.deepEqual(stored, {
    enabled: true,
    provider: 'smsenvoie',
    apiKey: 'sk_live_customer_sms_key_1234567890',
    deviceId: 'f95525f8-e6c8-4657-9439-685230100ca0',
    simSlot: '1',
  });
  assert.equal(storedRows.find((row) => row.cle === 'smsenvoie_sim_slot').valeur, '1');
});
