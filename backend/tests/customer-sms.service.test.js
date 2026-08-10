import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOMER_SMS_EVENT_CODES,
  CustomerSmsService,
  buildCustomerSmsMessage,
  formatCustomerSmsDisplayPhone,
  formatCustomerSmsPhone,
  makeCustomerSmsCarrierSafe,
} from '../services/customer-sms.service.js';
import { SmsGatewayService } from '../services/sms-gateway.service.js';

test('normalise les numéros ivoiriens pour le futur fournisseur SMS', () => {
  assert.equal(formatCustomerSmsPhone('07 59 40 68 42'), '+2250759406842');
  assert.equal(formatCustomerSmsPhone('2250759406842'), '+2250759406842');
});

test('espace le contact affiché dans le corps du SMS', () => {
  assert.equal(formatCustomerSmsDisplayPhone('+2250759406842'), '07 59 40 68 42');
  assert.equal(formatCustomerSmsDisplayPhone('0506070809'), '05 06 07 08 09');
});

test('prépare les six messages SMS et remplace modèle, couleur et livreur', () => {
  const message = buildCustomerSmsMessage(
    CUSTOMER_SMS_EVENT_CODES.LIVREUR_ASSIGNE,
    {
      numero_commande: 'CMD-789',
      client: { nom: 'Mariame' },
      modele: { nom: 'Robe Kayla' },
      couleur: 'Bleu roi',
    },
    { livreur: { nom: 'Koffi', telephone: '0506070809' } },
    '{client}: {modele} {couleur}, commande {numero_commande}, livreur {livreur_nom}: {livreur_telephone}.',
  );
  assert.equal(message, 'Mariame Robe Kayla Bleu roi, commande, livreur Koffi 05 06 07 08 09.');
});

test('conserve un contact livreur déjà au format international', () => {
  const message = buildCustomerSmsMessage(
    CUSTOMER_SMS_EVENT_CODES.LIVREUR_ASSIGNE,
    { numero_commande: 'CMD-790', client: { nom: 'Awa' } },
    { livreur: { nom: 'Koffi', telephone: '+2250701020304' } },
    'Livreur {livreur_nom}: {livreur_telephone}.',
  );
  assert.equal(message, 'Livreur Koffi 07 01 02 03 04.');
});

test('retire les codes de commande des anciens modèles personnalisés', () => {
  assert.equal(
    makeCustomerSmsCarrierSafe('NousUnique : votre commande #CMD-009887 est prête.', 'CMD-009887'),
    'NousUnique votre commande est prête.',
  );
  assert.equal(
    makeCustomerSmsCarrierSafe('Votre commande ORD-123456 est confirmée.'),
    'Votre commande est confirmée.',
  );
});

test('n’envoie rien tant que la plateforme SMS n’est pas choisie', async () => {
  const gateway = new SmsGatewayService();
  const service = new CustomerSmsService({ gateway });
  const result = await service.sendCommandeNotification(
    CUSTOMER_SMS_EVENT_CODES.COMMANDE_RECUE,
    { id: 'cmd-1', client: { contact: '0701020304' } },
    { env: { CUSTOMER_SMS_ENABLED: 'true' } },
  );
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'SMS_PROVIDER_PENDING');
  assert.equal(result.awaitingProvider, true);
});

test('le point d’intégration appelle un adaptateur une fois configuré', async () => {
  const sent = [];
  const gateway = new SmsGatewayService({
    adapters: {
      futur_sms: {
        isConfigured: (env) => Boolean(env.FUTUR_SMS_KEY),
        async sendMessage(payload) {
          sent.push(payload);
          return { success: true, messageId: 'sms-1' };
        },
      },
    },
  });
  const configuration = gateway.getConfiguration({
    CUSTOMER_SMS_ENABLED: 'true',
    CUSTOMER_SMS_PROVIDER: 'futur_sms',
    FUTUR_SMS_KEY: 'clé-test',
  });
  const result = await gateway.sendMessage(
    { to: '+2250701020304', message: 'Bonjour' },
    { env: { CUSTOMER_SMS_ENABLED: 'true', CUSTOMER_SMS_PROVIDER: 'futur_sms', FUTUR_SMS_KEY: 'clé-test' }, configuration },
  );
  assert.equal(configuration.ready, true);
  assert.equal(result.messageId, 'sms-1');
  assert.deepEqual(sent, [{ to: '+2250701020304', message: 'Bonjour' }]);
});

test('reprend un ancien texte WhatsApp comme brouillon SMS sans le renvoyer', async () => {
  const db = {
    from() {
      return {
        select() { return this; },
        async in() {
          return {
            data: [{ cle: 'whatsapp_template_commande_recue', valeur: 'Ancien texte {client}' }],
            error: null,
          };
        },
      };
    },
  };
  const templates = await new CustomerSmsService().getTemplates(db);
  const received = templates.find((item) => item.code === CUSTOMER_SMS_EVENT_CODES.COMMANDE_RECUE);
  assert.equal(templates.length, 6);
  assert.equal(received.message, 'Ancien texte {client}');
  assert.equal(received.migratedFromWhatsApp, true);
});
