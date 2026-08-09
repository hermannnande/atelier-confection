import { getSupabaseAdmin } from '../supabase/client.js';
import smsGatewayService from './sms-gateway.service.js';
import { readStoredCustomerSmsConfig } from './customer-sms-config.service.js';

export const CUSTOMER_SMS_EVENT_CODES = Object.freeze({
  COMMANDE_RECUE: 'commande_recue',
  COMMANDE_VALIDEE: 'commande_validee',
  LIVREUR_ASSIGNE: 'livreur_assigne',
  RETARD_J0: 'retard_j0',
  RETARD_J1: 'retard_j1',
  RETARD_J2: 'retard_j2',
});

const TEMPLATE_CONFIG_PREFIX = 'customer_sms_template_';
const LEGACY_TEMPLATE_CONFIG_PREFIX = 'whatsapp_template_';
const LOG_PREFIX = 'sms_customer_';
const LEGACY_LOG_PREFIX = 'whatsapp_';
const LEGACY_SMS_LOG_CODES = Object.freeze({
  [CUSTOMER_SMS_EVENT_CODES.COMMANDE_RECUE]: 'commande_recue',
  [CUSTOMER_SMS_EVENT_CODES.COMMANDE_VALIDEE]: 'attente_depot',
  [CUSTOMER_SMS_EVENT_CODES.LIVREUR_ASSIGNE]: 'en_livraison',
});

export const CUSTOMER_SMS_TEMPLATE_DEFINITIONS = Object.freeze({
  [CUSTOMER_SMS_EVENT_CODES.COMMANDE_RECUE]: {
    label: 'Commande reçue',
    description: 'Prévu dès l’enregistrement de la commande.',
    message: 'NousUnique : Bonjour {client}, votre commande #{numero_commande} ({modele}, {couleur}) a bien été reçue. Nous vous contacterons pour la confirmer.',
    variables: ['client', 'numero_commande', 'modele', 'couleur'],
  },
  [CUSTOMER_SMS_EVENT_CODES.COMMANDE_VALIDEE]: {
    label: 'Commande validée',
    description: 'Prévu lorsque la commande est confirmée par l’équipe.',
    message: 'NousUnique : Bonjour {client}, votre commande #{numero_commande} ({modele}, {couleur}) est confirmée et passe en préparation.',
    variables: ['client', 'numero_commande', 'modele', 'couleur'],
  },
  [CUSTOMER_SMS_EVENT_CODES.LIVREUR_ASSIGNE]: {
    label: 'Livreur assigné',
    description: 'Prévu lorsque la commande est confiée à un livreur.',
    message: 'NousUnique : votre commande #{numero_commande} est confiée à {livreur_nom}. Contact : {livreur_telephone}. Merci de rester joignable.',
    variables: ['client', 'numero_commande', 'modele', 'couleur', 'livreur_nom', 'livreur_telephone'],
  },
  [CUSTOMER_SMS_EVENT_CODES.RETARD_J0]: {
    label: 'Report du jour J',
    description: 'Prévu à 17h30 le jour de validation si la commande attend toujours.',
    message: 'NousUnique : Bonjour {client}, désolés, la commande #{numero_commande} ne sera pas finalisée aujourd’hui. Elle est prioritaire et reportée à demain.',
    variables: ['client', 'numero_commande', 'modele', 'couleur'],
  },
  [CUSTOMER_SMS_EVENT_CODES.RETARD_J1]: {
    label: 'Report J+1',
    description: 'Prévu à 17h30 le lendemain si la commande attend toujours.',
    message: 'NousUnique : Bonjour {client}, veuillez accepter nos excuses pour le retard de la commande #{numero_commande}. Sa finalisation est reportée à demain.',
    variables: ['client', 'numero_commande', 'modele', 'couleur'],
  },
  [CUSTOMER_SMS_EVENT_CODES.RETARD_J2]: {
    label: 'Report J+2',
    description: 'Dernier SMS automatique de retard, prévu à 17h30.',
    message: 'NousUnique : Bonjour {client}, nous sommes désolés du retard de la commande #{numero_commande}. Notre équipe la traite en priorité. Merci pour votre patience.',
    variables: ['client', 'numero_commande', 'modele', 'couleur'],
  },
});

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function formatCustomerSmsPhone(phone) {
  if (!phone) return null;
  let cleaned = String(phone).trim();
  if (cleaned.toLowerCase().startsWith('tel:')) cleaned = cleaned.slice(4);
  cleaned = cleaned.replace(/[\s\-().]/g, '').replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('225')) return `+${cleaned}`;
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return `+225${digits}`;
  if (digits.length === 9) return `+2250${digits}`;
  if (digits.length === 8) return `+225${digits}`;
  return digits ? `+225${digits}` : null;
}

export function buildCustomerSmsMessage(eventCode, commande = {}, extra = {}, templateOverride = null) {
  const definition = CUSTOMER_SMS_TEMPLATE_DEFINITIONS[eventCode];
  if (!definition) throw new Error(`Événement SMS client inconnu : ${eventCode}`);

  const livreurTelephone = formatCustomerSmsPhone(
    extra.livreur?.telephone || extra.livreurTelephone,
  );

  const values = {
    client: cleanText(commande.client?.nom || commande.clientNom, 'cher client'),
    numero_commande: cleanText(commande.numero_commande || commande.numeroCommande, 'non renseigné'),
    modele: cleanText(
      commande.modele?.nom || commande.modeleNom || commande.nom_modele || commande.produit?.nom || commande.name,
      'non renseigné',
    ),
    couleur: cleanText(commande.couleur || commande.color || commande.produit?.couleur, 'non renseignée'),
    livreur_nom: cleanText(extra.livreur?.nom || extra.livreurNom, 'votre livreur'),
    livreur_telephone: cleanText(livreurTelephone, 'non disponible'),
  };
  const template = cleanText(templateOverride, definition.message);
  return template.replace(/\{([a-z_]+)\}/g, (match, variable) => (
    Object.prototype.hasOwnProperty.call(values, variable) ? values[variable] : match
  )).trim();
}

export class CustomerSmsService {
  constructor(options = {}) {
    this.gateway = options.gateway || smsGatewayService;
  }

  getLogCode(eventCode) {
    return `${LOG_PREFIX}${eventCode}`;
  }

  getLegacyLogCode(eventCode) {
    return `${LEGACY_LOG_PREFIX}${eventCode}`;
  }

  getTemplateConfigKey(eventCode) {
    if (!CUSTOMER_SMS_TEMPLATE_DEFINITIONS[eventCode]) {
      throw new Error(`Événement SMS client inconnu : ${eventCode}`);
    }
    return `${TEMPLATE_CONFIG_PREFIX}${eventCode}`;
  }

  getLegacyTemplateConfigKey(eventCode) {
    return `${LEGACY_TEMPLATE_CONFIG_PREFIX}${eventCode}`;
  }

  async resolveConfiguration(env = process.env, db = null) {
    const environmentConfiguration = this.gateway.getConfiguration(env);
    if (environmentConfiguration.configured && env.CUSTOMER_SMS_ENABLED !== undefined) {
      return { configuration: environmentConfiguration, runtimeEnv: env };
    }

    try {
      const database = db || getSupabaseAdmin();
      const stored = await readStoredCustomerSmsConfig(database, env);
      const runtimeEnv = {
        ...env,
        CUSTOMER_SMS_ENABLED: env.CUSTOMER_SMS_ENABLED ?? (stored.enabled ? 'true' : 'false'),
        CUSTOMER_SMS_PROVIDER: env.CUSTOMER_SMS_PROVIDER || stored.provider,
        SMSENVOIE_API_KEY: env.SMSENVOIE_API_KEY || stored.apiKey,
        SMSENVOIE_DEVICE_ID: env.SMSENVOIE_DEVICE_ID || stored.deviceId,
        SMSENVOIE_SIM_SLOT: env.SMSENVOIE_SIM_SLOT ?? stored.simSlot,
      };
      return { configuration: this.gateway.getConfiguration(runtimeEnv), runtimeEnv };
    } catch (error) {
      if (env.SUPABASE_URL || env.SUPABASE_SERVICE_KEY) {
        console.error('Configuration SMS enregistrée indisponible:', error.message);
      }
      return { configuration: environmentConfiguration, runtimeEnv: env };
    }
  }

  async getSystemStatus(env = process.env, db = null) {
    const { configuration } = await this.resolveConfiguration(env, db);
    return configuration;
  }

  async getMessageTemplate(eventCode, db = getSupabaseAdmin()) {
    const definition = CUSTOMER_SMS_TEMPLATE_DEFINITIONS[eventCode];
    if (!definition) throw new Error(`Événement SMS client inconnu : ${eventCode}`);

    try {
      const keys = [this.getTemplateConfigKey(eventCode), this.getLegacyTemplateConfigKey(eventCode)];
      const { data, error } = await db.from('sms_config').select('cle, valeur').in('cle', keys);
      if (error) throw error;
      const stored = Object.fromEntries((data || []).map((row) => [row.cle, row.valeur]));
      return cleanText(
        stored[this.getTemplateConfigKey(eventCode)] || stored[this.getLegacyTemplateConfigKey(eventCode)],
        definition.message,
      );
    } catch (error) {
      console.error(`Modèle SMS client ${eventCode} indisponible:`, error.message);
      return definition.message;
    }
  }

  async getTemplates(db = getSupabaseAdmin()) {
    const eventCodes = Object.keys(CUSTOMER_SMS_TEMPLATE_DEFINITIONS);
    const keys = eventCodes.flatMap((code) => [
      this.getTemplateConfigKey(code),
      this.getLegacyTemplateConfigKey(code),
    ]);
    const { data, error } = await db.from('sms_config').select('cle, valeur').in('cle', keys);
    if (error) throw new Error(`Lecture des modèles SMS impossible : ${error.message}`);
    const stored = Object.fromEntries((data || []).map((row) => [row.cle, row.valeur]));

    return eventCodes.map((code) => {
      const definition = CUSTOMER_SMS_TEMPLATE_DEFINITIONS[code];
      const current = cleanText(stored[this.getTemplateConfigKey(code)]);
      const legacy = cleanText(stored[this.getLegacyTemplateConfigKey(code)]);
      return {
        code,
        label: definition.label,
        description: definition.description,
        variables: definition.variables,
        defaultMessage: definition.message,
        message: current || legacy || definition.message,
        customized: Boolean(current || legacy),
        migratedFromWhatsApp: !current && Boolean(legacy),
      };
    });
  }

  async saveTemplates(templates, db = getSupabaseAdmin()) {
    const entries = Object.entries(templates || {});
    if (entries.length === 0) throw new Error('Aucun modèle SMS fourni');
    const rows = entries.map(([eventCode, rawMessage]) => {
      const definition = CUSTOMER_SMS_TEMPLATE_DEFINITIONS[eventCode];
      if (!definition) throw new Error(`Événement SMS client inconnu : ${eventCode}`);
      const message = String(rawMessage || '').trim();
      if (message.length < 5 || message.length > 640) {
        throw new Error(`Le modèle « ${definition.label} » doit contenir entre 5 et 640 caractères`);
      }
      return {
        cle: this.getTemplateConfigKey(eventCode),
        valeur: message,
        description: `Message SMS client personnalisable : ${definition.label}`,
      };
    });
    const { error } = await db.from('sms_config').upsert(rows, { onConflict: 'cle' });
    if (error) throw new Error(`Enregistrement des modèles SMS impossible : ${error.message}`);
    return this.getTemplates(db);
  }

  async hasAlreadySent(commandeId, eventCode, db = getSupabaseAdmin()) {
    if (!commandeId || !eventCode) return false;
    const logCodes = [this.getLogCode(eventCode), this.getLegacyLogCode(eventCode)];
    if (LEGACY_SMS_LOG_CODES[eventCode]) logCodes.push(LEGACY_SMS_LOG_CODES[eventCode]);
    const { data, error } = await db
      .from('sms_historique')
      .select('id')
      .eq('commande_id', commandeId)
      .in('template_code', logCodes)
      .in('statut', ['envoye', 'en_attente'])
      .limit(1);
    if (error) {
      console.error('Vérification anti-doublon SMS client impossible:', error.message);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  }

  async logNotification(data, db = getSupabaseAdmin()) {
    try {
      const { error } = await db.from('sms_historique').insert({
        pays_code: data.paysCode || 'CI',
        commande_id: data.commandeId || null,
        numero_commande: data.numeroCommande || null,
        destinataire_nom: data.destinataireNom || 'Client',
        destinataire_telephone: data.destinataireTelephone || '',
        message: data.message || '',
        template_code: this.getLogCode(data.eventCode),
        statut: data.statut,
        response_api: {
          channel: 'sms',
          provider: data.provider || null,
          response: data.response || null,
        },
        message_id: data.messageId || null,
        erreur: data.erreur || null,
        envoye_par: data.userId || null,
        est_test: false,
        sent_at: data.statut === 'envoye' ? new Date().toISOString() : null,
      });
      if (error) console.error('Journal SMS client non enregistré:', error.message);
    } catch (error) {
      console.error('Journal SMS client non enregistré:', error.message);
    }
  }

  async sendCommandeNotification(eventCode, commande, options = {}) {
    const env = options.env || process.env;
    const { configuration, runtimeEnv } = await this.resolveConfiguration(env, options.db);
    if (!configuration.ready) {
      const result = await this.gateway.sendMessage({}, { env: runtimeEnv, configuration });
      return { ...result, channel: 'sms', awaitingProvider: configuration.awaitingProvider };
    }

    const db = options.db || getSupabaseAdmin();
    const commandeId = commande?.id || null;
    if (commandeId && await this.hasAlreadySent(commandeId, eventCode, db)) {
      return { success: true, skipped: true, reason: 'ALREADY_SENT' };
    }

    const phone = commande?.client?.contact || commande?.clientPhone;
    const formattedPhone = formatCustomerSmsPhone(phone);
    if (!formattedPhone || !/^\+[1-9]\d{9,14}$/.test(formattedPhone)) {
      throw new Error(`Numéro SMS invalide : ${phone || 'vide'}`);
    }
    const template = await this.getMessageTemplate(eventCode, db);
    const message = buildCustomerSmsMessage(eventCode, commande, options, template);

    try {
      const result = await this.gateway.sendMessage({
        to: formattedPhone,
        message,
        metadata: { eventCode, commandeId },
      }, { ...options, env: runtimeEnv, configuration });
      if (result?.skipped) return result;

      await this.logNotification({
        paysCode: commande?.pays_code || commande?.paysCode || 'CI',
        commandeId,
        numeroCommande: commande?.numero_commande || commande?.numeroCommande,
        destinataireNom: commande?.client?.nom || commande?.clientNom || 'Client',
        destinataireTelephone: formattedPhone,
        message,
        eventCode,
        statut: result.pending ? 'en_attente' : 'envoye',
        provider: configuration.provider,
        response: result.response || null,
        messageId: result.messageId || result.message_id || result.campaignId || null,
        userId: options.userId || null,
      }, db);
      return { ...result, phone: formattedPhone, message };
    } catch (error) {
      await this.logNotification({
        paysCode: commande?.pays_code || commande?.paysCode || 'CI',
        commandeId,
        numeroCommande: commande?.numero_commande || commande?.numeroCommande,
        destinataireNom: commande?.client?.nom || commande?.clientNom || 'Client',
        destinataireTelephone: formattedPhone,
        message,
        eventCode,
        statut: 'echoue',
        provider: configuration.provider,
        erreur: error.message,
        userId: options.userId || null,
      }, db);
      throw error;
    }
  }
}

const customerSmsService = new CustomerSmsService();
export default customerSmsService;
