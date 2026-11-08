import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { resolveCountryPublic } from '../middleware/country.js';
import customerSmsService, { CUSTOMER_SMS_EVENT_CODES } from '../../services/customer-sms.service.js';
import { createSharedSnapshot } from '../../services/shared-snapshot.service.js';
import {
  ClearanceOrderError, createClearanceOrder, loadClearanceCatalog, parseClearanceOrder,
} from '../../services/clearance-sale.service.js';

const router = express.Router();

// Lecture partagée : la publicité peut amener beaucoup de visites en même temps.
const readCatalog = createSharedSnapshot({
  maxAgeMs: 8000,
  staleIfErrorMs: 120000,
  load: async (country) => (await loadClearanceCatalog(getSupabaseAdmin(), country)).catalogue,
});

const ORDER_WINDOW_MS = 10 * 60 * 1000;
const MAX_ORDERS_PER_WINDOW = 8;
const attemptsByIp = new Map();
function tooManyOrders(ip, now = Date.now()) {
  for (const [key, times] of attemptsByIp) {
    if (times.at(-1) < now - ORDER_WINDOW_MS) attemptsByIp.delete(key);
  }
  const recent = (attemptsByIp.get(ip) || []).filter((time) => time >= now - ORDER_WINDOW_MS);
  recent.push(now);
  attemptsByIp.set(ip, recent);
  return recent.length > MAX_ORDERS_PER_WINDOW;
}

// GET /api/destockage/disponibilites : modèles, couleurs, tailles et nombre de pièces libres.
router.get('/disponibilites', resolveCountryPublic, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const snapshot = await readCatalog(req.country);
    return res.json({ success: true, modeles: snapshot.value, stale: snapshot.stale });
  } catch (error) {
    console.error('Déstockage : lecture des disponibilités impossible :', error?.message || error);
    return res.status(503).json({ success: false, message: 'Les pièces ne peuvent pas être affichées. Réessayez dans un instant.' });
  }
});

// POST /api/destockage/commandes : la commande arrive dans Appel, comme celles des autres pages.
router.post('/commandes', resolveCountryPublic, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    if (tooManyOrders(req.ip)) {
      return res.status(429).json({ success: false, code: 'LIMITE', message: 'Trop de commandes en peu de temps. Réessayez dans quelques minutes.' });
    }
    const input = parseClearanceOrder(req.body);
    const { commande, doublon } = await createClearanceOrder(getSupabaseAdmin(), { country: req.country, input });
    readCatalog.invalidate(req.country);

    if (!doublon) {
      console.log('✅ Commande déstockage créée:', commande.numero_commande);
      try {
        await customerSmsService.sendCommandeNotification(CUSTOMER_SMS_EVENT_CODES.COMMANDE_RECUE, commande, { userId: null });
      } catch (smsError) {
        console.error('Erreur SMS client commande reçue (non bloquant):', smsError.message);
      }
    }
    return res.status(doublon ? 200 : 201).json({ success: true, numeroCommande: commande.numero_commande });
  } catch (error) {
    if (error instanceof ClearanceOrderError) {
      if (error.code === 'INDISPONIBLE') readCatalog.invalidate(req.country);
      return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
    console.error('Déstockage : commande non enregistrée :', error?.message || error);
    return res.status(500).json({ success: false, message: 'La commande n’a pas pu être enregistrée. Réessayez.' });
  }
});

export default router;
