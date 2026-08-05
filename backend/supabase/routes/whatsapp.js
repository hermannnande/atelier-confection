import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import whatsappService from '../../services/whatsapp.service.js';
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

router.get('/status', (req, res) => {
  res.json({ success: true, data: whatsappService.getSystemStatus() });
});

// Exécuté tous les jours à 17h30 (Africa/Abidjan = UTC).
// Un message unique est envoyé à J, J+1 et J+2 si la commande validée
// n'est pas encore assignée à un livreur ou terminée.
router.get('/cron/retards-commandes', async (req, res) => {
  try {
    if (!isCronAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized cron' });
    }

    const configuration = whatsappService.getConfiguration();
    if (!configuration.enabled) {
      return res.json({ success: true, skipped: true, reason: 'WHATSAPP_DISABLED' });
    }
    if (!configuration.configured) {
      return res.status(503).json({ success: false, message: 'Configuration WaSenderAPI manquante' });
    }

    const result = await processDelayedOrders({
      db: getSupabaseAdmin(),
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
