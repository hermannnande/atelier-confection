import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WHATSAPP_EVENT_CODES,
  WhatsAppService,
  buildWhatsAppMessage,
  formatWhatsAppPhone,
  parseWaSenderResponse,
} from '../services/whatsapp.service.js';

test('normalise un numéro ivoirien pour WhatsApp', () => {
  assert.equal(formatWhatsAppPhone('07 59 40 68 42'), '+2250759406842');
  assert.equal(formatWhatsAppPhone('2250759406842'), '+2250759406842');
  assert.equal(formatWhatsAppPhone('+2250759406842'), '+2250759406842');
});

test('construit le message de commande reçue', () => {
  const message = buildWhatsAppMessage(WHATSAPP_EVENT_CODES.COMMANDE_RECUE, {
    numero_commande: 'CMD-123',
    client: { nom: 'Awa' },
  });

  assert.match(message, /NousUnique/);
  assert.match(message, /Awa/);
  assert.match(message, /CMD-123/);
  assert.match(message, /bien été reçue/);
});

test('inclut le nom et le numéro du livreur', () => {
  const message = buildWhatsAppMessage(
    WHATSAPP_EVENT_CODES.LIVREUR_ASSIGNE,
    { numero_commande: 'CMD-456', client: { nom: 'Fatou' } },
    { livreur: { nom: 'Yao', telephone: '0701020304' } }
  );

  assert.match(message, /Yao/);
  assert.match(message, /0701020304/);
  assert.match(message, /en route vers vous/);
});

test('remplace les variables dans un message personnalisé', () => {
  const message = buildWhatsAppMessage(
    WHATSAPP_EVENT_CODES.LIVREUR_ASSIGNE,
    {
      numero_commande: 'CMD-789',
      client: { nom: 'Mariame' },
      modele: { nom: 'Robe Kayla' },
      couleur: 'Bleu roi',
    },
    { livreur: { nom: 'Koffi', telephone: '0506070809' } },
    'Bonjour {client}, votre {modele} {couleur}, commande {numero_commande}, livreur {livreur_nom} : {livreur_telephone}.',
  );

  assert.equal(
    message,
    'Bonjour Mariame, votre Robe Kayla Bleu roi, commande CMD-789, livreur Koffi : 0506070809.',
  );
});

test('prend aussi en charge les anciens champs plats pour le modèle et la couleur', () => {
  const message = buildWhatsAppMessage(
    WHATSAPP_EVENT_CODES.COMMANDE_RECUE,
    { modeleNom: 'Ensemble Grâce', color: 'Vert', clientNom: 'Aïcha' },
    {},
    '{client} - {modele} - {couleur}',
  );

  assert.equal(message, 'Aïcha - Ensemble Grâce - Vert');
});

test('charge un message personnalisé enregistré', async () => {
  const db = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          return { data: { valeur: 'Message personnalisé {client}' }, error: null };
        },
      };
    },
  };

  const template = await new WhatsAppService().getMessageTemplate(
    WHATSAPP_EVENT_CODES.COMMANDE_RECUE,
    db,
  );
  assert.equal(template, 'Message personnalisé {client}');
});

test('retourne tous les modèles avec les valeurs par défaut manquantes', async () => {
  const db = {
    from() {
      return {
        select() { return this; },
        async in() {
          return {
            data: [{
              cle: 'whatsapp_template_commande_recue',
              valeur: 'Bienvenue {client}',
            }],
            error: null,
          };
        },
      };
    },
  };

  const templates = await new WhatsAppService().getTemplates(db);
  assert.equal(templates.length, 6);
  assert.equal(templates.find((item) => item.code === 'commande_recue').message, 'Bienvenue {client}');
  assert.deepEqual(
    templates.find((item) => item.code === 'commande_recue').variables,
    ['client', 'numero_commande', 'modele', 'couleur'],
  );
  assert.match(templates.find((item) => item.code === 'commande_validee').message, /confirmée/);
});

test('refuse un modèle WhatsApp inconnu', async () => {
  await assert.rejects(
    () => new WhatsAppService().saveTemplates({ evenement_inconnu: 'Un message valide' }, {}),
    /Événement WhatsApp inconnu/,
  );
});

test('reconnaît une réponse WaSenderAPI acceptée', () => {
  assert.deepEqual(parseWaSenderResponse({
    success: true,
    data: { msgId: 123, status: 'sent' },
  }), {
    success: true,
    messageId: '123',
    status: 'sent',
    error: null,
  });
});

test('rejette une réponse WaSenderAPI sans identifiant', () => {
  const result = parseWaSenderResponse({ success: true, message: 'incomplète' });
  assert.equal(result.success, false);
  assert.equal(result.error, 'incomplète');
});

test('prépare la requête WaSenderAPI sans effectuer de réseau réel', async () => {
  const service = new WhatsAppService();
  let captured;
  const result = await service.sendMessage('0701020304', 'Bonjour', {
    env: {
      WHATSAPP_ENABLED: 'true',
      WASENDER_API_KEY: 'cle-test',
      WASENDER_API_URL: 'https://www.wasenderapi.com/api',
    },
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: { msgId: 'wa-1', status: 'sent' } }),
      };
    },
  });

  assert.equal(result.success, true);
  assert.equal(captured.url, 'https://www.wasenderapi.com/api/send-message');
  assert.equal(captured.options.headers.Authorization, 'Bearer cle-test');
  assert.deepEqual(JSON.parse(captured.options.body), { to: '+2250701020304', text: 'Bonjour' });
});

test('espace de 5,5 secondes deux messages WhatsApp rapprochés', async () => {
  let currentTime = 0;
  const waits = [];
  const sendTimes = [];
  const service = new WhatsAppService({
    now: () => currentTime,
    sleep: async (delayMs) => {
      waits.push(delayMs);
      currentTime += delayMs;
    },
  });
  const config = {
    enabled: true,
    configured: true,
    apiKey: 'cle-espacement',
    apiUrl: 'https://www.wasenderapi.com/api',
    timeoutMs: 15000,
    minSendIntervalMs: 5500,
    rateLimitRetries: 2,
  };
  let messageId = 0;
  const fetchImpl = async () => {
    sendTimes.push(currentTime);
    messageId += 1;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        success: true,
        data: { msgId: `wa-${messageId}`, status: 'sent' },
      }),
    };
  };

  await Promise.all([
    service.sendMessage('0701020304', 'Premier message', { config, fetchImpl }),
    service.sendMessage('0701020305', 'Deuxième message', { config, fetchImpl }),
  ]);

  assert.deepEqual(sendTimes, [0, 5500]);
  assert.deepEqual(waits, [5500]);
});

test('retente automatiquement après une limitation WaSenderAPI', async () => {
  let currentTime = 0;
  const waits = [];
  const service = new WhatsAppService({
    now: () => currentTime,
    sleep: async (delayMs) => {
      waits.push(delayMs);
      currentTime += delayMs;
    },
  });
  const config = {
    enabled: true,
    configured: true,
    apiKey: 'cle-retry',
    apiUrl: 'https://www.wasenderapi.com/api',
    timeoutMs: 15000,
    minSendIntervalMs: 5500,
    rateLimitRetries: 2,
  };
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return {
        ok: false,
        status: 429,
        headers: { get: () => null },
        text: async () => JSON.stringify({
          success: false,
          message: 'You have account protection enabled',
          retry_after: 5,
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        success: true,
        data: { msgId: 'wa-retry', status: 'sent' },
      }),
    };
  };

  const result = await service.sendMessage('0701020304', 'Bonjour', { config, fetchImpl });

  assert.equal(result.success, true);
  assert.equal(result.messageId, 'wa-retry');
  assert.equal(calls, 2);
  assert.deepEqual(waits, [5500]);
});
