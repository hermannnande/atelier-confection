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
