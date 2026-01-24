// Routes API pour la gestion des SMS
import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import smsService from '../../services/sms.service.js';

const router = express.Router();
const supabase = getSupabaseAdmin();

// ========================================
// GET /api/sms/status
// Obtenir le statut du système SMS
// ========================================
router.get('/status', async (req, res) => {
  try {
    const status = await smsService.getSystemStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Erreur statut SMS:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération du statut',
      error: error.message 
    });
  }
});

// ========================================
// GET /api/sms/templates
// Récupérer tous les templates SMS
// ========================================
router.get('/templates', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sms_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur récupération templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des templates',
      error: error.message 
    });
  }
});

// ========================================
// GET /api/sms/templates/:code
// Récupérer un template spécifique
// ========================================
router.get('/templates/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const template = await smsService.getTemplate(code);
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Erreur récupération template:', error);
    res.status(404).json({ 
      success: false, 
      message: `Template ${req.params.code} introuvable`,
      error: error.message 
    });
  }
});

// ========================================
// PUT /api/sms/templates/:id
// Modifier un template SMS
// ========================================
router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, message, actif, description } = req.body;

    const { data, error } = await supabase
      .from('sms_templates')
      .update({
        nom,
        message,
        actif,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Template mis à jour avec succès',
      data 
    });
  } catch (error) {
    console.error('Erreur mise à jour template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour du template',
      error: error.message 
    });
  }
});

// ========================================
// GET /api/sms/historique
// Récupérer l'historique des SMS
// ========================================
router.get('/historique', async (req, res) => {
  try {
    const { limit = 50, offset = 0, statut, commande_id } = req.query;

    let query = supabase
      .from('sms_historique')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (statut) {
      query = query.eq('statut', statut);
    }

    if (commande_id) {
      query = query.eq('commande_id', commande_id);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ 
      success: true, 
      data,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de l\'historique',
      error: error.message 
    });
  }
});

// ========================================
// GET /api/sms/historique/commande/:id
// Récupérer l'historique SMS d'une commande
// ========================================
router.get('/historique/commande/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('sms_historique')
      .select('*')
      .eq('commande_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur récupération historique commande:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de l\'historique',
      error: error.message 
    });
  }
});

// ========================================
// POST /api/sms/send
// Envoyer un SMS manuel
// ========================================
router.post('/send', async (req, res) => {
  try {
    const { phone, message, commandeId } = req.body;
    const userId = req.user?.id;

    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Téléphone et message requis' 
      });
    }

    // Envoyer le SMS
    const result = await smsService.sendSMS(phone, message);
    const meta = {
      runtime: process.env.VERCEL ? 'vercel' : 'local',
      deviceId: String(smsService.deviceId ?? '0'),
      at: new Date().toISOString(),
    };

    const sms8Status = String(result.sms8_status || '').toLowerCase();
    const shouldBePending =
      !result.test_mode &&
      result.success &&
      sms8Status &&
      (sms8Status.includes('pending') || sms8Status.includes('queue') || sms8Status.includes('scheduled'));

    // Logger
    await smsService.logSMS({
      commandeId: commandeId || null,
      destinataireNom: 'Manuel',
      destinataireTelephone: smsService.formatPhoneNumber(phone),
      message: message,
      templateCode: 'manuel',
      statut: result.success ? (shouldBePending ? 'en_attente' : 'envoye') : 'echoue',
      responseApi: result.response ? { meta, sms8: result.response } : { meta, sms8: null },
      messageId: result.message_id,
      envoyePar: userId,
      estTest: !!result.test_mode
    });

    res.json({ 
      success: true, 
      message: 'SMS envoyé avec succès',
      data: result 
    });

  } catch (error) {
    console.error('Erreur envoi SMS:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'envoi du SMS',
      error: error.message 
    });
  }
});

// ========================================
// POST /api/sms/send-notification
// Envoyer une notification basée sur un template
// ========================================
router.post('/send-notification', async (req, res) => {
  try {
    const { templateCode, commandeId } = req.body;
    const userId = req.user?.id;

    if (!templateCode || !commandeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Template code et commande ID requis' 
      });
    }

    // Récupérer la commande
    const { data: commande, error: commandeError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', commandeId)
      .single();

    if (commandeError || !commande) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commande introuvable' 
      });
    }

    // Envoyer la notification
    const result = await smsService.sendCommandeNotification(
      templateCode, 
      commande, 
      userId
    );

    res.json({ 
      success: true, 
      message: 'Notification envoyée avec succès',
      data: result 
    });

  } catch (error) {
    console.error('Erreur envoi notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'envoi de la notification',
      error: error.message 
    });
  }
});

// ========================================
// PUT /api/sms/config/:key
// Mettre à jour une configuration
// ========================================
router.put('/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { valeur } = req.body;

    const { data, error } = await supabase
      .from('sms_config')
      .update({ 
        valeur, 
        updated_at: new Date().toISOString() 
      })
      .eq('cle', key)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Configuration mise à jour',
      data 
    });

  } catch (error) {
    console.error('Erreur mise à jour config:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour de la configuration',
      error: error.message 
    });
  }
});

// ========================================
// POST /api/sms/test
// Tester l'envoi d'un SMS
// ========================================
router.post('/test', async (req, res) => {
  try {
    const { phone } = req.body;
    const userId = req.user?.id;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Numéro de téléphone requis' 
      });
    }

    const testMessage = `🧪 Test SMS - Atelier Confection\n` +
                       `Ce message confirme que votre système SMS fonctionne correctement.\n` +
                       `Envoyé le ${new Date().toLocaleString('fr-FR')}`;

    const result = await smsService.sendSMS(phone, testMessage);
    const meta = {
      runtime: process.env.VERCEL ? 'vercel' : 'local',
      deviceId: String(smsService.deviceId ?? '0'),
      at: new Date().toISOString(),
    };

    const sms8Status = String(result.sms8_status || '').toLowerCase();
    const shouldBePending =
      !result.test_mode &&
      result.success &&
      sms8Status &&
      (sms8Status.includes('pending') || sms8Status.includes('queue') || sms8Status.includes('scheduled'));

    // Logger le SMS de test dans l'historique
    await smsService.logSMS({
      commandeId: null,
      numeroCommande: null,
      destinataireNom: 'Test',
      destinataireTelephone: smsService.formatPhoneNumber(phone),
      message: testMessage,
      templateCode: 'test',
      statut: result.success ? (shouldBePending ? 'en_attente' : 'envoye') : 'echoue',
      responseApi: result.response ? { meta, sms8: result.response } : { meta, sms8: null },
      messageId: result.message_id,
      envoyePar: userId,
      // est_test = vrai seulement si le backend est en "test mode" (SMS_ENABLED=false)
      estTest: !!result.test_mode
    });

    res.json({ 
      success: true, 
      message: 'SMS de test envoyé',
      data: result 
    });

  } catch (error) {
    console.error('Erreur test SMS:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du test',
      error: error.message 
    });
  }
});

// ========================================
// GET /api/sms/stats
// Statistiques des SMS
// ========================================
router.get('/stats', async (req, res) => {
  try {
    // Total SMS envoyés
    const { count: totalEnvoyes } = await supabase
      .from('sms_historique')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'envoye');

    // Total SMS échoués
    const { count: totalEchoues } = await supabase
      .from('sms_historique')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'echoue');

    // SMS du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: smsAujourdhui } = await supabase
      .from('sms_historique')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'envoye')
      .gte('created_at', today.toISOString());

    // Répartition par template
    const { data: parTemplate } = await supabase
      .from('sms_historique')
      .select('template_code, statut')
      .eq('statut', 'envoye');

    const repartition = {};
    parTemplate?.forEach(sms => {
      if (sms.template_code) {
        repartition[sms.template_code] = (repartition[sms.template_code] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        totalEnvoyes: totalEnvoyes || 0,
        totalEchoues: totalEchoues || 0,
        smsAujourdhui: smsAujourdhui || 0,
        tauxReussite: totalEnvoyes > 0 
          ? Math.round((totalEnvoyes / (totalEnvoyes + totalEchoues)) * 100) 
          : 0,
        repartitionParTemplate: repartition
      }
    });

  } catch (error) {
    console.error('Erreur stats SMS:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message 
    });
  }
});

export default router;



