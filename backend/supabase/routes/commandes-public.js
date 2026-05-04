import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { resolveCountryPublic } from '../middleware/country.js';
import smsService from '../../services/sms.service.js';

const router = express.Router();

/**
 * ROUTE PUBLIQUE (sans auth) pour recevoir les commandes du site web et Google Sheets.
 * POST /api/commandes/public
 *
 * Multi-pays : le pays est lu via le middleware resolveCountryPublic depuis :
 *   - body.country  (recommande, ex: "CI", "BF", "FR")
 *   - query.country (ex: ?country=BF)
 *   - header X-Country
 *   - sinon fallback 'CI' (retrocompatibilite avec les integrations existantes)
 */
router.post('/public', resolveCountryPublic, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { token, client, phone, ville, sku, name, taille, couleur, price, image, category, source, note } = req.body;
    
    if (token !== 'NOUSUNIQUE123') {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }

    if (!phone || !name || !taille || !couleur || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Champs manquants (phone, name, taille, couleur, price requis)' 
      });
    }

    const { data: modeleExistant } = await supabase
      .from('modeles')
      .select('*')
      .eq('nom', name.trim())
      .eq('actif', true)
      .single();

    let ecommerceImage = image || '';

    if (!modeleExistant && !ecommerceImage) {
      try {
        const { data: ecommProduct } = await supabase
          .from('ecommerce_products')
          .select('images, thumbnail')
          .eq('name', name.trim())
          .eq('active', true)
          .single();
        if (ecommProduct) {
          ecommerceImage = ecommProduct.thumbnail
            || (Array.isArray(ecommProduct.images) && ecommProduct.images[0])
            || '';
        }
      } catch (_) { /* table may not exist */ }
    }

    const modeleData = modeleExistant 
      ? {
          id: modeleExistant.id,
          nom: modeleExistant.nom,
          sku: sku || modeleExistant.nom,
          image: modeleExistant.image || ecommerceImage,
          categorie: modeleExistant.categorie || category || 'Général',
          description: `Commandé depuis ${source || 'le site web'}`
        }
      : {
          nom: name.trim(),
          sku: sku || name,
          image: ecommerceImage,
          categorie: category || 'E-commerce',
          description: `Commandé depuis ${source || 'le site web'}`
        };

    const commandeData = {
      pays_code: req.country, // Multi-pays : 'CI' par defaut, sinon body.country (BF, FR...)
      client: {
        nom: (client && client.trim()) || '🔍 Client à identifier',
        contact: phone.trim(),
        ville: (ville || 'Non spécifié').trim()
      },
      modele: modeleData,
      taille: taille.trim(),
      couleur: couleur.trim(),
      prix: Number(price) || 0,
      statut: 'en_attente_validation',
      urgence: false,
      appelant_id: null,
      note_appelant: note ? String(note).trim() : '',
      historique: [
        {
          action: `Commande reçue depuis ${source || 'le site web'} (pays: ${req.country})`,
          statut: 'en_attente_validation',
          utilisateur: null,
          date: now
        }
      ],
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('commandes')
      .insert([commandeData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création de la commande',
        error: error.message 
      });
    }

    console.log('✅ Commande web créée:', data.numero_commande);

    try {
      const autoSendEnabled = await smsService.isAutoSendEnabled('commande_recue');
      if (autoSendEnabled) {
        await smsService.sendCommandeNotification('commande_recue', data, null);
        console.log('✅ SMS "Commande reçue" envoyé au client');
      }
    } catch (smsError) {
      console.error('⚠️ Erreur envoi SMS (non bloquant):', smsError.message);
    }
    
    res.status(201).json({
      success: true,
      message: 'Commande enregistrée avec succès !',
      numeroCommande: data.numero_commande,
      commande: data
    });

  } catch (error) {
    console.error('❌ Erreur route publique:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

export default router;
