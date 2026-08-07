import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WHATSAPP_RETIRED,
  WhatsAppService,
} from '../services/whatsapp.service.js';

test('marque définitivement le canal WhatsApp NousUnique comme retiré', async () => {
  const status = await new WhatsAppService().getSystemStatus({ WHATSAPP_ENABLED: 'true' });
  assert.equal(WHATSAPP_RETIRED, true);
  assert.deepEqual(status, {
    enabled: false,
    configured: false,
    retired: true,
    provider: 'WaSenderAPI',
    session: 'NousUnique',
    countryCode: 'CI',
  });
});

test('ne contacte jamais WaSenderAPI même avec une ancienne configuration active', async () => {
  let networkCalls = 0;
  const service = new WhatsAppService();
  const result = await service.sendMessage('0701020304', 'Bonjour', {
    env: { WHATSAPP_ENABLED: 'true', WASENDER_API_KEY: 'ancienne-cle' },
    fetchImpl: async () => {
      networkCalls += 1;
      throw new Error('Le réseau ne doit pas être appelé');
    },
  });

  assert.deepEqual(result, { success: true, skipped: true, reason: 'WHATSAPP_RETIRED' });
  assert.equal(networkCalls, 0);
});

test('bloque aussi les notifications de commande au niveau central', async () => {
  const result = await new WhatsAppService().sendCommandeNotification(
    'commande_recue',
    { id: 'cmd-1', client: { contact: '0701020304' } },
    { env: { WHATSAPP_ENABLED: 'true', WASENDER_API_KEY: 'ancienne-cle' } },
  );
  assert.deepEqual(result, { success: true, skipped: true, reason: 'WHATSAPP_RETIRED' });
});
