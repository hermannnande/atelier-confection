import express from 'express';
import Livraison from '../models/Livraison.js';
import Commande from '../models/Commande.js';
import Stock from '../models/Stock.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Obtenir toutes les livraisons
router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'livreur') {
      query.livreur = req.userId;
    }

    const livraisons = await Livraison.find(query)
      .populate('commande')
      .populate('livreur', 'nom telephone')
      .populate('gestionnaire', 'nom')
      .sort({ dateAssignation: -1 });

    res.json({ livraisons });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Assigner une commande à un livreur
router.post('/assigner', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { commandeId, livreurId, instructions } = req.body;

    const commande = await Commande.findById(commandeId);
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    if (commande.statut !== 'en_stock') {
      return res.status(400).json({ message: 'La commande doit être en stock pour être assignée' });
    }

    // Vérifier le stock
    const stockItem = await Stock.findOne({
      modele: commande.modele.nom,
      taille: commande.taille,
      couleur: commande.couleur
    });

    if (!stockItem || stockItem.quantitePrincipale < 1) {
      return res.status(400).json({ message: 'Stock insuffisant' });
    }

    // Créer la livraison
    const livraison = new Livraison({
      commande: commandeId,
      livreur: livreurId,
      adresseLivraison: {
        ville: commande.client.ville,
        details: ''
      },
      instructions: instructions || commande.noteAppelant
    });

    await livraison.save();

    // Mettre à jour la commande
    commande.statut = 'en_livraison';
    commande.livreur = livreurId;
    commande.historique.push({
      action: 'Assigné au livreur',
      statut: 'en_livraison',
      utilisateur: req.userId,
      date: new Date()
    });
    await commande.save();

    // Transférer du stock principal au stock en livraison
    stockItem.quantitePrincipale -= 1;
    stockItem.quantiteEnLivraison += 1;
    stockItem.mouvements.push({
      type: 'transfert',
      quantite: 1,
      source: 'Stock principal',
      destination: 'Stock en livraison',
      commande: commandeId,
      utilisateur: req.userId,
      commentaire: 'Assignation au livreur'
    });
    await stockItem.save();

    await livraison.populate('commande livreur', 'nom telephone');

    res.status(201).json({ 
      message: 'Livraison assignée avec succès', 
      livraison 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'assignation', error: error.message });
  }
});

// Marquer livraison comme livrée (livreur)
router.post('/:id/livree', authenticate, authorize('livreur', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const livraison = await Livraison.findById(req.params.id).populate('commande');
    
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }

    livraison.statut = 'livree';
    livraison.dateLivraison = new Date();
    await livraison.save();

    // Mettre à jour la commande
    const commande = await Commande.findById(livraison.commande._id);
    commande.statut = 'livree';
    commande.dateLivraison = new Date();
    commande.historique.push({
      action: 'Livraison effectuée',
      statut: 'livree',
      utilisateur: req.userId,
      date: new Date()
    });
    await commande.save();

    // Réduire le stock en livraison
    const stockItem = await Stock.findOne({
      modele: commande.modele.nom,
      taille: commande.taille,
      couleur: commande.couleur
    });

    if (stockItem) {
      stockItem.quantiteEnLivraison -= 1;
      stockItem.mouvements.push({
        type: 'sortie',
        quantite: 1,
        source: 'Stock en livraison',
        destination: 'Client',
        commande: commande._id,
        utilisateur: req.userId,
        commentaire: 'Livraison réussie'
      });
      await stockItem.save();
    }

    res.json({ message: 'Livraison confirmée', livraison });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Marquer livraison comme refusée (livreur)
router.post('/:id/refusee', authenticate, authorize('livreur', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { motifRefus } = req.body;
    const livraison = await Livraison.findById(req.params.id).populate('commande');
    
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }

    livraison.statut = 'refusee';
    livraison.motifRefus = motifRefus;
    livraison.dateLivraison = new Date();
    await livraison.save();

    // Mettre à jour la commande
    const commande = await Commande.findById(livraison.commande._id);
    commande.statut = 'refusee';
    commande.motifRefus = motifRefus;
    commande.historique.push({
      action: 'Livraison refusée par le client',
      statut: 'refusee',
      utilisateur: req.userId,
      date: new Date(),
      commentaire: motifRefus
    });
    await commande.save();

    res.json({ message: 'Refus enregistré', livraison });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Confirmer retour de colis (gestionnaire)
router.post('/:id/confirmer-retour', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { commentaire } = req.body;
    const livraison = await Livraison.findById(req.params.id).populate('commande');
    
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }

    if (livraison.statut !== 'refusee') {
      return res.status(400).json({ message: 'Seules les livraisons refusées peuvent être retournées' });
    }

    livraison.statut = 'retournee';
    livraison.dateRetour = new Date();
    livraison.verifieParGestionnaire = true;
    livraison.gestionnaire = req.userId;
    livraison.commentaireGestionnaire = commentaire;
    await livraison.save();

    // Retourner le stock en livraison au stock principal
    const commande = livraison.commande;
    const stockItem = await Stock.findOne({
      modele: commande.modele.nom,
      taille: commande.taille,
      couleur: commande.couleur
    });

    if (stockItem) {
      stockItem.quantiteEnLivraison -= 1;
      stockItem.quantitePrincipale += 1;
      stockItem.mouvements.push({
        type: 'retour',
        quantite: 1,
        source: 'Stock en livraison',
        destination: 'Stock principal',
        commande: commande._id,
        utilisateur: req.userId,
        commentaire: `Retour après refus: ${commentaire || 'Aucun commentaire'}`
      });
      await stockItem.save();
    }

    res.json({ message: 'Retour confirmé et stock mis à jour', livraison });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

export default router;




