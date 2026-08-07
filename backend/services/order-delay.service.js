import customerSmsService, { CUSTOMER_SMS_EVENT_CODES } from './customer-sms.service.js';

export const DELAY_ELIGIBLE_STATUSES = Object.freeze([
  'validee',
  'en_decoupe',
  'en_couture',
  'en_stock',
]);

export function getValidatedAt(commande) {
  const historique = Array.isArray(commande?.historique) ? commande.historique : [];
  for (let index = historique.length - 1; index >= 0; index -= 1) {
    const event = historique[index];
    const isValidation = event?.statut === 'validee'
      || String(event?.action || '').toLowerCase().includes('valid');
    if (!isValidation || !event?.date) continue;

    const date = new Date(event.date);
    if (!Number.isNaN(date.getTime())) return date;
  }

  if (commande?.statut === 'validee') {
    const fallback = new Date(commande.updated_at || commande.created_at || '');
    if (!Number.isNaN(fallback.getTime())) return fallback;
  }
  return null;
}

function getCalendarDateNumber(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
}

export function getCalendarDayDifference(start, end = new Date(), timeZone = 'Africa/Abidjan') {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return null;
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) return null;
  return Math.floor((getCalendarDateNumber(end, timeZone) - getCalendarDateNumber(start, timeZone)) / 86400000);
}

export function getDelayEventCode(dayDifference) {
  const codes = {
    0: CUSTOMER_SMS_EVENT_CODES.RETARD_J0,
    1: CUSTOMER_SMS_EVENT_CODES.RETARD_J1,
    2: CUSTOMER_SMS_EVENT_CODES.RETARD_J2,
  };
  return codes[dayDifference] || null;
}

export async function processDelayedOrders(options = {}) {
  const db = options.db;
  if (!db) throw new Error('Client Supabase requis');

  const env = options.env || process.env;
  const now = options.now || new Date();
  const timeZone = env.CUSTOMER_SMS_TIME_ZONE || env.WHATSAPP_TIME_ZONE || 'Africa/Abidjan';
  const countryCode = (env.CUSTOMER_SMS_COUNTRY_CODE || env.WHATSAPP_COUNTRY_CODE || 'CI').trim().toUpperCase();
  const requestedLimit = Number.parseInt(
    env.CUSTOMER_SMS_DELAY_BATCH_LIMIT || env.WHATSAPP_DELAY_BATCH_LIMIT || '100',
    10,
  );
  const batchLimit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 100;
  const sender = options.sender || options.whatsapp || customerSmsService;

  const { data: commandes, error } = await db
    .from('commandes')
    .select('*')
    .eq('pays_code', countryCode)
    .in('statut', DELAY_ELIGIBLE_STATUSES)
    .order('updated_at', { ascending: true })
    .limit(batchLimit);

  if (error) throw new Error(`Récupération des commandes impossible : ${error.message}`);

  const stats = { processed: 0, sent: 0, skipped: 0, failed: 0 };
  const details = [];

  for (const commande of commandes || []) {
    stats.processed += 1;
    const validatedAt = getValidatedAt(commande);
    const dayDifference = validatedAt ? getCalendarDayDifference(validatedAt, now, timeZone) : null;
    const eventCode = getDelayEventCode(dayDifference);

    if (!eventCode || validatedAt > now) {
      stats.skipped += 1;
      continue;
    }

    try {
      const result = await sender.sendCommandeNotification(eventCode, commande, { env, db });
      if (result?.skipped) stats.skipped += 1;
      else stats.sent += 1;
    } catch (sendError) {
      stats.failed += 1;
      details.push({
        commandeId: commande.id,
        numeroCommande: commande.numero_commande,
        eventCode,
        error: sendError.message,
      });
    }
  }

  return {
    at: now.toISOString(),
    timeZone,
    countryCode,
    batchLimit,
    stats,
    details,
  };
}
