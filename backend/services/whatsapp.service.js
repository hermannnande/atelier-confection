import { getSupabaseAdmin } from '../supabase/client.js';
import { readStoredWhatsAppConfig } from './whatsapp-config.service.js';

const DEFAULT_API_URL = 'https://www.wasenderapi.com/api';
const PROVIDER_NAME = 'WaSenderAPI';
const SESSION_NAME = 'NousUnique';

export const WHATSAPP_EVENT_CODES = Object.freeze({
  COMMANDE_RECUE: 'commande_recue',
  COMMANDE_VALIDEE: 'commande_validee',
  LIVREUR_ASSIGNE: 'livreur_assigne',
  RETARD_J0: 'retard_j0',
  RETARD_J1: 'retard_j1',
  RETARD_J2: 'retard_j2',
});

const TEMPLATE_CONFIG_PREFIX = 'whatsapp_template_';

export const WHATSAPP_TEMPLATE_DEFINITIONS = Object.freeze({
  [WHATSAPP_EVENT_CODES.COMMANDE_RECUE]: {
    label: 'Commande reçue',
    description: 'Envoyé dès l’enregistrement de la commande.',
    message: 'NousUnique 🤍\nBonjour {client},\nVotre commande #{numero_commande} a bien été reçue. Notre équipe la vérifie et vous contactera rapidement pour sa validation.\nMerci pour votre confiance ✨',
    variables: ['client', 'numero_commande'],
  },
  [WHATSAPP_EVENT_CODES.COMMANDE_VALIDEE]: {
    label: 'Commande validée',
    description: 'Envoyé lorsque la commande est confirmée par l’équipe.',
    message: 'NousUnique 🤍\nBonjour {client},\nVotre commande #{numero_commande} est confirmée et validée. Nous lançons maintenant son traitement.\nMerci pour votre confiance ✨',
    variables: ['client', 'numero_commande'],
  },
  [WHATSAPP_EVENT_CODES.LIVREUR_ASSIGNE]: {
    label: 'Livreur assigné',
    description: 'Envoyé lorsque la commande est confiée à un livreur.',
    message: 'NousUnique 🤍\nBonjour {client},\nVotre commande #{numero_commande} a été confiée à {livreur_nom}, qui est en route vers vous.\nContact du livreur : {livreur_telephone}\nMerci de rester joignable.',
    variables: ['client', 'numero_commande', 'livreur_nom', 'livreur_telephone'],
  },
  [WHATSAPP_EVENT_CODES.RETARD_J0]: {
    label: 'Report du jour J',
    description: 'Envoyé à 17h30 le jour de validation si la commande est toujours en attente.',
    message: "NousUnique 🤍\nBonjour {client},\nNous sommes désolés : votre commande #{numero_commande}, prévue aujourd'hui, n'a pas pu être finalisée avant la fin de la journée. Elle est reportée à demain et reste suivie en priorité.\nMerci pour votre patience.",
    variables: ['client', 'numero_commande'],
  },
  [WHATSAPP_EVENT_CODES.RETARD_J1]: {
    label: 'Report J+1',
    description: 'Envoyé à 17h30 le lendemain si la commande est toujours en attente.',
    message: 'NousUnique 🤍\nBonjour {client},\nVeuillez accepter nos excuses pour ce délai supplémentaire concernant votre commande #{numero_commande}. Elle est toujours en traitement et sa finalisation est reportée à demain.\nMerci pour votre compréhension.',
    variables: ['client', 'numero_commande'],
  },
  [WHATSAPP_EVENT_CODES.RETARD_J2]: {
    label: 'Report J+2',
    description: 'Dernier message automatique de retard, envoyé à 17h30.',
    message: 'NousUnique 🤍\nBonjour {client},\nNous vous présentons à nouveau nos excuses pour le retard de votre commande #{numero_commande}. Notre équipe la traite en priorité et la reporte au lendemain.\nMerci sincèrement pour votre patience.',
    variables: ['client', 'numero_commande'],
  },
});

export function formatWhatsAppPhone(phone) {
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

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function buildWhatsAppMessage(eventCode, commande = {}, extra = {}, templateOverride = null) {
  const definition = WHATSAPP_TEMPLATE_DEFINITIONS[eventCode];
  if (!definition) throw new Error(`Événement WhatsApp inconnu : ${eventCode}`);

  const client = cleanText(commande.client?.nom || commande.clientNom, 'cher client');
  const numeroCommande = cleanText(commande.numero_commande || commande.numeroCommande, 'non renseigné');
  const livreurNom = cleanText(extra.livreur?.nom || extra.livreurNom, 'votre livreur');
  const livreurTelephone = cleanText(extra.livreur?.telephone || extra.livreurTelephone, 'non disponible');
  const values = {
    client,
    numero_commande: numeroCommande,
    livreur_nom: livreurNom,
    livreur_telephone: livreurTelephone,
  };
  const template = cleanText(templateOverride, definition.message);

  return template.replace(/\{([a-z_]+)\}/g, (match, variable) => (
    Object.prototype.hasOwnProperty.call(values, variable) ? values[variable] : match
  )).trim();
}

export function parseWaSenderResponse(payload = {}) {
  const data = payload?.data || {};
  const status = String(data.status || '').toLowerCase();
  const success = payload?.success === true
    && data.msgId !== undefined
    && data.msgId !== null
    && !['error', 'failed'].includes(status);

  return {
    success,
    messageId: data.msgId !== undefined && data.msgId !== null ? String(data.msgId) : null,
    status: status || null,
    error: success
      ? null
      : payload?.message || payload?.error?.message || payload?.error || 'WaSenderAPI a refusé le message',
  };
}

class WhatsAppService {
  getConfiguration(env = process.env) {
    return {
      enabled: env.WHATSAPP_ENABLED === 'true',
      configured: Boolean(env.WASENDER_API_KEY?.trim()),
      apiKey: env.WASENDER_API_KEY?.trim() || '',
      apiUrl: (env.WASENDER_API_URL || DEFAULT_API_URL).trim().replace(/\/+$/, ''),
      timeoutMs: Number.parseInt(env.WASENDER_TIMEOUT_MS || '15000', 10) || 15000,
      countryCode: (env.WHATSAPP_COUNTRY_CODE || 'CI').trim().toUpperCase(),
      provider: PROVIDER_NAME,
      session: SESSION_NAME,
    };
  }

  async resolveConfiguration(env = process.env, db = null) {
    const config = this.getConfiguration(env);
    const enabledExplicitlyConfigured = env.WHATSAPP_ENABLED !== undefined;

    if (config.configured && enabledExplicitlyConfigured) return config;

    try {
      const stored = await readStoredWhatsAppConfig(db || getSupabaseAdmin(), env);
      return {
        ...config,
        enabled: config.configured && enabledExplicitlyConfigured
          ? config.enabled
          : stored.enabled,
        configured: config.configured || Boolean(stored.apiKey),
        apiKey: config.apiKey || stored.apiKey,
      };
    } catch (error) {
      console.error('⚠️ Configuration WhatsApp enregistrée indisponible:', error.message);
      return config;
    }
  }

  async getSystemStatus(env = process.env, db = null) {
    const config = await this.resolveConfiguration(env, db);
    return {
      enabled: config.enabled,
      configured: config.configured,
      provider: config.provider,
      session: config.session,
      countryCode: config.countryCode,
    };
  }

  getLogCode(eventCode) {
    return `whatsapp_${eventCode}`;
  }

  getTemplateConfigKey(eventCode) {
    if (!WHATSAPP_TEMPLATE_DEFINITIONS[eventCode]) {
      throw new Error(`Événement WhatsApp inconnu : ${eventCode}`);
    }
    return `${TEMPLATE_CONFIG_PREFIX}${eventCode}`;
  }

  async getMessageTemplate(eventCode, db = getSupabaseAdmin()) {
    const definition = WHATSAPP_TEMPLATE_DEFINITIONS[eventCode];
    if (!definition) throw new Error(`Événement WhatsApp inconnu : ${eventCode}`);

    try {
      const { data, error } = await db
        .from('sms_config')
        .select('valeur')
        .eq('cle', this.getTemplateConfigKey(eventCode))
        .maybeSingle();

      if (error) throw error;
      return cleanText(data?.valeur, definition.message);
    } catch (error) {
      console.error(`⚠️ Modèle WhatsApp ${eventCode} indisponible:`, error.message);
      return definition.message;
    }
  }

  async getTemplates(db = getSupabaseAdmin()) {
    const eventCodes = Object.keys(WHATSAPP_TEMPLATE_DEFINITIONS);
    const configKeys = eventCodes.map((code) => this.getTemplateConfigKey(code));
    const { data, error } = await db
      .from('sms_config')
      .select('cle, valeur')
      .in('cle', configKeys);

    if (error) throw new Error(`Lecture des modèles WhatsApp impossible : ${error.message}`);
    const stored = Object.fromEntries((data || []).map((row) => [row.cle, row.valeur]));

    return eventCodes.map((code) => {
      const definition = WHATSAPP_TEMPLATE_DEFINITIONS[code];
      return {
        code,
        label: definition.label,
        description: definition.description,
        variables: definition.variables,
        defaultMessage: definition.message,
        message: cleanText(stored[this.getTemplateConfigKey(code)], definition.message),
        customized: Boolean(cleanText(stored[this.getTemplateConfigKey(code)])),
      };
    });
  }

  async saveTemplates(templates, db = getSupabaseAdmin()) {
    const entries = Object.entries(templates || {});
    if (entries.length === 0) throw new Error('Aucun modèle WhatsApp fourni');

    const rows = entries.map(([eventCode, rawMessage]) => {
      const definition = WHATSAPP_TEMPLATE_DEFINITIONS[eventCode];
      if (!definition) throw new Error(`Événement WhatsApp inconnu : ${eventCode}`);

      const message = String(rawMessage || '').trim();
      if (message.length < 5 || message.length > 2000) {
        throw new Error(`Le modèle « ${definition.label} » doit contenir entre 5 et 2000 caractères`);
      }

      return {
        cle: this.getTemplateConfigKey(eventCode),
        valeur: message,
        description: `Message WhatsApp personnalisable : ${definition.label}`,
      };
    });

    const { error } = await db.from('sms_config').upsert(rows, { onConflict: 'cle' });
    if (error) throw new Error(`Enregistrement des modèles WhatsApp impossible : ${error.message}`);
    return this.getTemplates(db);
  }

  async hasAlreadySent(commandeId, eventCode, db = getSupabaseAdmin()) {
    if (!commandeId || !eventCode) return false;
    const { data, error } = await db
      .from('sms_historique')
      .select('id')
      .eq('commande_id', commandeId)
      .eq('template_code', this.getLogCode(eventCode))
      .in('statut', ['envoye', 'en_attente'])
      .limit(1);

    if (error) {
      console.error('⚠️ Vérification anti-doublon WhatsApp impossible:', error.message);
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
          channel: 'whatsapp',
          provider: PROVIDER_NAME,
          session: SESSION_NAME,
          runtime: process.env.VERCEL ? 'vercel' : 'local',
          response: data.response || null,
        },
        message_id: data.messageId || null,
        erreur: data.erreur || null,
        envoye_par: data.userId || null,
        est_test: false,
        sent_at: data.statut === 'envoye' ? new Date().toISOString() : null,
      });

      if (error) console.error('⚠️ Journal WhatsApp non enregistré:', error.message);
    } catch (error) {
      console.error('⚠️ Journal WhatsApp non enregistré:', error.message);
    }
  }

  async sendMessage(phone, message, options = {}) {
    const env = options.env || process.env;
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const config = options.config || await this.resolveConfiguration(env, options.db);

    if (!config.enabled) return { success: true, skipped: true, reason: 'WHATSAPP_DISABLED' };
    if (!config.configured) throw new Error('Configuration WaSenderAPI manquante');
    if (typeof fetchImpl !== 'function') throw new Error('Client HTTP indisponible');

    const formattedPhone = formatWhatsAppPhone(phone);
    if (!formattedPhone || !/^\+[1-9]\d{9,14}$/.test(formattedPhone)) {
      throw new Error(`Numéro WhatsApp invalide : ${phone || 'vide'}`);
    }
    if (!String(message || '').trim()) throw new Error('Message WhatsApp vide');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetchImpl(`${config.apiUrl}/send-message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: formattedPhone, text: String(message).trim() }),
        signal: controller.signal,
      });

      const rawText = await response.text();
      let payload;
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { success: false, error: `Réponse non-JSON (${response.status})` };
      }

      const parsed = parseWaSenderResponse(payload);
      if (!response.ok || !parsed.success) {
        throw new Error(parsed.error || `Erreur WaSenderAPI ${response.status}`);
      }

      return {
        success: true,
        phone: formattedPhone,
        messageId: parsed.messageId,
        providerStatus: parsed.status,
        response: payload,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendCommandeNotification(eventCode, commande, options = {}) {
    const env = options.env || process.env;
    const db = options.db || getSupabaseAdmin();
    const config = await this.resolveConfiguration(env, db);
    if (!config.enabled) return { success: true, skipped: true, reason: 'WHATSAPP_DISABLED' };

    const commandeId = commande?.id || null;
    if (commandeId && await this.hasAlreadySent(commandeId, eventCode, db)) {
      return { success: true, skipped: true, reason: 'ALREADY_SENT' };
    }

    const phone = commande?.client?.contact || commande?.clientPhone;
    const formattedPhone = formatWhatsAppPhone(phone);
    const template = await this.getMessageTemplate(eventCode, db);
    const message = buildWhatsAppMessage(eventCode, commande, options, template);

    try {
      const result = await this.sendMessage(phone, message, {
        env,
        db,
        config,
        fetchImpl: options.fetchImpl,
      });

      await this.logNotification({
        paysCode: commande?.pays_code || commande?.paysCode || config.countryCode,
        commandeId,
        numeroCommande: commande?.numero_commande || commande?.numeroCommande,
        destinataireNom: commande?.client?.nom || commande?.clientNom || 'Client',
        destinataireTelephone: formattedPhone,
        message,
        eventCode,
        statut: 'envoye',
        response: result.response,
        messageId: result.messageId,
        userId: options.userId,
      }, db);

      console.log(`💬 WhatsApp ${eventCode} accepté par WaSenderAPI`);
      return result;
    } catch (error) {
      await this.logNotification({
        paysCode: commande?.pays_code || commande?.paysCode || config.countryCode,
        commandeId,
        numeroCommande: commande?.numero_commande || commande?.numeroCommande,
        destinataireNom: commande?.client?.nom || commande?.clientNom || 'Client',
        destinataireTelephone: formattedPhone,
        message,
        eventCode,
        statut: 'echoue',
        erreur: error.message,
        userId: options.userId,
      }, db);
      throw error;
    }
  }
}

const whatsappService = new WhatsAppService();
export { WhatsAppService };
export default whatsappService;
