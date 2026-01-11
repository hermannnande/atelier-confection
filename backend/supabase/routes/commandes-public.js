import express from 'express';
import { getSupabaseAdmin } from '../client.js';

const router = express.Router();

/**
 * 📞 ROUTE PUBLIQUE (sans auth) pour recevoir les commandes du site web
 * POST /api/commandes/public
 */
router.post('/public', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Validation du token secret (sécurité basique)
    const { token, client, phone, ville, sku, name, taille, couleur, price, source } = req.body;
    
    if (token !== 'NOUSUNIQUE123') {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }

    // Validation des champs requis
    if (!client || !phone || !name || !taille || !couleur || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Champs manquants (client, phone, name, taille, couleur, price requis)' 
      });
    }

    // 🔍 Chercher si le modèle existe dans la bibliothèque
    const { data: modeleExistant } = await supabase
      .from('modeles')
      .select('*')
      .eq('nom', name.trim())
      .eq('actif', true)
      .single();

    // 📦 Préparer l'objet modèle (avec infos de la bibliothèque si disponibles)
    const modeleData = modeleExistant 
      ? {
          id: modeleExistant.id,
          nom: modeleExistant.nom,
          sku: sku || modeleExistant.nom,
          image: modeleExistant.image || '',
          categorie: modeleExistant.categorie || 'Général',
          description: `Commandé depuis ${source || 'le site web'}`
        }
      : {
          nom: name.trim(),
          sku: sku || name,
          description: `Commandé depuis ${source || 'le site web'}`
        };

    // Préparer les données de la commande
    const commandeData = {
      client: {
        nom: client.trim(),
        contact: phone.trim(),
        ville: (ville || 'Non spécifié').trim()
      },
      modele: modeleData,
      taille: taille.trim(),
      couleur: couleur.trim(),
      prix: Number(price) || 0,
      statut: 'en_attente_validation', // ✅ Statut pour la page APPEL
      urgence: false,
      appelant_id: null, // Commande web, pas d'appelant
      note_appelant: `Commande web reçue le ${new Date().toLocaleString('fr-FR')}. Source: ${source || 'site web'}${modeleExistant ? ' (Modèle: ' + modeleExistant.nom + ')' : ''}`,
      historique: [
        {
          action: 'Commande reçue depuis le site web',
          statut: 'en_attente_validation',
          utilisateur: null,
          date: now
        }
      ],
      created_at: now,
      updated_at: now
    };

    // Insérer dans Supabase
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
