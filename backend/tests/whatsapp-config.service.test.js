import test from 'node:test';
import assert from 'node:assert/strict';

import {
  decryptWhatsAppSecret,
  encryptWhatsAppSecret,
  readStoredWhatsAppConfig,
  saveStoredWhatsAppConfig,
} from '../services/whatsapp-config.service.js';
import { WhatsAppService } from '../services/whatsapp.service.js';

const env = { SUPABASE_SERVICE_KEY: 'service-role-key-for-tests-only' };

test('chiffre et déchiffre la clé WaSender sans conserver le texte clair', () => {
  const apiKey = 'wasender-test-key-1234567890';
  const encrypted = encryptWhatsAppSecret(apiKey, env);

  assert.ok(encrypted.startsWith('v1:'));
  assert.equal(encrypted.includes(apiKey), false);
  assert.equal(decryptWhatsAppSecret(encrypted, env), apiKey);
});

test('enregistre puis relit une configuration WhatsApp chiffrée', async () => {
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

  await saveStoredWhatsAppConfig({
    apiKey: 'wasender-test-key-1234567890',
    enabled: true,
  }, writeDb, env);

  const readDb = {
    from() {
      return {
        select() {
          return {
            async in() {
              return { data: storedRows, error: null };
            },
          };
        },
      };
    },
  };

  const stored = await readStoredWhatsAppConfig(readDb, env);
  assert.deepEqual(stored, {
    enabled: true,
    apiKey: 'wasender-test-key-1234567890',
  });
});

test('ignore une ancienne configuration chiffrée car WhatsApp est retiré', async () => {
  const encrypted = encryptWhatsAppSecret('wasender-test-key-1234567890', env);
  const db = {
    from() {
      return {
        select() {
          return {
            async in() {
              return {
                data: [
                  { cle: 'wasender_api_key_encrypted', valeur: encrypted },
                  { cle: 'whatsapp_enabled', valeur: 'true' },
                ],
                error: null,
              };
            },
          };
        },
      };
    },
  };

  const status = await new WhatsAppService().getSystemStatus({
    ...env,
    WHATSAPP_ENABLED: 'false',
  }, db);
  assert.deepEqual(status, {
    enabled: false,
    configured: false,
    retired: true,
    provider: 'WaSenderAPI',
    session: 'NousUnique',
    countryCode: 'CI',
  });
});
