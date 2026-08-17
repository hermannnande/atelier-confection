import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import customerSmsService from '../../services/customer-sms.service.js';
import { saveStoredCustomerSmsConfig } from '../../services/customer-sms-config.service.js';
import { processDelayedOrders } from '../../services/order-delay.service.js';

const router = express.Router();

function isCronAuthorized(req) {
  const vercelCron = req.headers['x-vercel-cron'];
  if (vercelCron === '1' || vercelCron === 1) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.query?.cron_secret || req.headers['x-cron-secret'];
  return String(provided || '') === String(secret);
}

router.get('/status', authenticate, authorize('administrateur'), async (req, res) => {
  const data = await customerSmsService.getSystemStatus(process.env, getSupabaseAdmin());
  res.json({ success: true, data });
});

router.post('/config', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const db = getSupabaseAdmin();
    await saveStoredCustomerSmsConfig({
      apiKey: req.body?.apiKey,
      deviceId: req.body?.deviceId,
      simSlot: req.body?.simSlot,
      enabled: req.body?.enabled !== false,
    }, db);
    const data = await customerSmsService.getSystemStatus(process.env, db);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Configuration SMSEnvoie:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/templates', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const data = await customerSmsService.getTemplates(getSupabaseAdmin());
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Lecture modèles SMS clients:', error.message);
    return res.status(500).json({ success: false, message: 'Impossible de charger les messages SMS' });
  }
});

router.put('/templates', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const templates = req.body?.templates;
    if (!templates || typeof templates !== 'object' || Array.isArray(templates)) {
      return res.status(400).json({ success: false, message: 'Modèles SMS invalides' });
    }
    const data = await customerSmsService.saveTemplates(templates, getSupabaseAdmin());
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Enregistrement modèles SMS clients:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/history', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const db = getSupabaseAdmin();
    const page = Math.max(1, Number.parseInt(String(req.query?.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(10, Number.parseInt(String(req.query?.limit || '25'), 10) || 25));
    const status = String(req.query?.status || '').trim();
    const eventCode = String(req.query?.eventCode || '').trim();
    const allowedStatuses = new Set(['envoye', 'echoue', 'en_attente']);

    let query = db
      .from('sms_historique')
      .select(
        'id, created_at, sent_at, numero_commande, destinataire_nom, destinataire_telephone, message, template_code, statut, message_id, erreur',
        { count: 'exact' },
      )
      .like('template_code', 'sms_customer_%')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (allowedStatuses.has(status)) query = query.eq('statut', status);
    if (eventCode) query = query.eq('template_code', customerSmsService.getLogCode(eventCode));

    const createCountQuery = (countStatus = null) => {
      let countQuery = db
        .from('sms_historique')
        .select('id', { count: 'exact', head: true })
        .like('template_code', 'sms_customer_%');
      if (countStatus) countQuery = countQuery.eq('statut', countStatus);
      return countQuery;
    };

    const [historyResult, totalResult, sentResult, failedResult] = await Promise.all([
      query,
      createCountQuery(),
      createCountQuery('envoye'),
      createCountQuery('echoue'),
    ]);
    if (historyResult.error) throw historyResult.error;
    if (totalResult.error) throw totalResult.error;
    if (sentResult.error) throw sentResult.error;
    if (failedResult.error) throw failedResult.error;

    return res.json({
      success: true,
      data: historyResult.data || [],
      pagination: {
        page,
        limit,
        total: historyResult.count || 0,
        pages: Math.max(1, Math.ceil((historyResult.count || 0) / limit)),
      },
      stats: {
        total: totalResult.count || 0,
        sent: sentResult.count || 0,
        failed: failedResult.count || 0,
      },
    });
  } catch (error) {
    console.error('Historique SMS clients:', error.message);
    return res.status(500).json({ success: false, message: 'Impossible de charger l’historique SMS' });
  }
});

async function ensureCustomerSmsReady(db) {
  const configuration = await customerSmsService.getSystemStatus(process.env, db);
  if (!configuration.ready) {
    const error = new Error(configuration.enabled ? 'SMS_PROVIDER_PENDING' : 'CUSTOMER_SMS_DISABLED');
    error.statusCode = 409;
    error.configuration = configuration;
    throw error;
  }
  return configuration;
}

router.get('/reports/preview', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const db = getSupabaseAdmin();
    await ensureCustomerSmsReady(db);
    const previewSender = {
      async sendCommandeNotification(eventCode, commande) {
        const alreadySent = await customerSmsService.hasAlreadySent(commande?.id, eventCode, db);
        return alreadySent
          ? { success: true, skipped: true, reason: 'ALREADY_SENT' }
          : { success: true, preview: true };
      },
    };
    const result = await processDelayedOrders({
      db,
      sender: previewSender,
      dayDifferences: [0],
    });
    return res.json({
      success: true,
      data: {
        eventCode: 'retard_j0',
        eligible: result.stats.sent,
        examined: result.stats.processed,
        at: result.at,
      },
    });
  } catch (error) {
    console.error('Aperçu manuel SMS report J:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      configuration: error.configuration,
    });
  }
});

// Un lot volontairement court laisse de la marge sous la limite SMSEnvoie
// de 10 requêtes par minute. Les doublons sont ignorés par le service SMS.
router.post('/reports/run-j0', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const db = getSupabaseAdmin();
    await ensureCustomerSmsReady(db);
    const result = await processDelayedOrders({
      db,
      sender: customerSmsService,
      dayDifferences: [0],
      maxSends: 5,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Envoi manuel SMS report J:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      configuration: error.configuration,
    });
  }
});

// Préparé pour 17h30 à J, J+1 et J+2. Tant que le fournisseur SMS
// n'est pas configuré, le cron répond "skipped" sans envoyer de message.
router.get('/cron/retards-commandes', async (req, res) => {
  try {
    if (!isCronAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized cron' });
    }
    const configuration = await customerSmsService.getSystemStatus(process.env, getSupabaseAdmin());
    if (!configuration.ready) {
      return res.json({
        success: true,
        skipped: true,
        reason: configuration.enabled ? 'SMS_PROVIDER_PENDING' : 'CUSTOMER_SMS_DISABLED',
        configuration,
      });
    }

    const result = await processDelayedOrders({
      db: getSupabaseAdmin(),
      sender: customerSmsService,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Cron SMS retards-commandes:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur cron SMS retards-commandes',
      error: error.message,
    });
  }
});

export default router;
