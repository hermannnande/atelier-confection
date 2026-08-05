import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import whatsappService from '../../services/whatsapp.service.js';
import { saveStoredWhatsAppConfig } from '../../services/whatsapp-config.service.js';
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

router.get('/status', async (req, res) => {
  const data = await whatsappService.getSystemStatus(process.env, getSupabaseAdmin());
  res.json({ success: true, data });
});

// Permet à un administrateur de configurer WaSender sans exposer la clé
// dans GitHub ou dans une variable publique. La clé est chiffrée avant stockage.
router.post('/config', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const apiKey = String(req.body?.apiKey || '').trim();
    if (apiKey.length < 20 || apiKey.length > 500 || /\s/.test(apiKey)) {
      return res.status(400).json({
        success: false,
        message: 'Clé WaSenderAPI invalide',
      });
    }

    const db = getSupabaseAdmin();
    await saveStoredWhatsAppConfig({
      apiKey,
      enabled: req.body?.enabled !== false,
    }, db);

    const data = await whatsappService.getSystemStatus(process.env, db);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Configuration WhatsApp:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Impossible d’enregistrer la configuration WhatsApp',
    });
  }
});

router.get('/templates', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const data = await whatsappService.getTemplates(getSupabaseAdmin());
    return res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Lecture modèles WhatsApp:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Impossible de charger les messages automatiques',
    });
  }
});

router.put('/templates', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const templates = req.body?.templates;
    if (!templates || typeof templates !== 'object' || Array.isArray(templates)) {
      return res.status(400).json({ success: false, message: 'Modèles WhatsApp invalides' });
    }

    const data = await whatsappService.saveTemplates(templates, getSupabaseAdmin());
    return res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Enregistrement modèles WhatsApp:', error.message);
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
      .like('template_code', 'whatsapp_%')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (allowedStatuses.has(status)) query = query.eq('statut', status);
    if (eventCode) query = query.eq('template_code', whatsappService.getLogCode(eventCode));

    const createCountQuery = (countStatus = null) => {
      let countQuery = db
        .from('sms_historique')
        .select('id', { count: 'exact', head: true })
        .like('template_code', 'whatsapp_%');
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
    console.error('❌ Historique WhatsApp:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Impossible de charger l’historique WhatsApp',
    });
  }
});

// Exécuté tous les jours à 17h30 (Africa/Abidjan = UTC).
// Un message unique est envoyé à J, J+1 et J+2 si la commande validée
// n'est pas encore assignée à un livreur ou terminée.
router.get('/cron/retards-commandes', async (req, res) => {
  try {
    if (!isCronAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized cron' });
    }

    const db = getSupabaseAdmin();
    const configuration = await whatsappService.resolveConfiguration(process.env, db);
    if (!configuration.enabled) {
      return res.json({ success: true, skipped: true, reason: 'WHATSAPP_DISABLED' });
    }
    if (!configuration.configured) {
      return res.status(503).json({ success: false, message: 'Configuration WaSenderAPI manquante' });
    }

    const result = await processDelayedOrders({
      db,
      whatsapp: whatsappService,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Cron WhatsApp retards-commandes:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur cron WhatsApp retards-commandes',
      error: error.message,
    });
  }
});

export default router;
