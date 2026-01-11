import express from 'express';
import Stock from '../models/Stock.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Obtenir tout le stock
router.get('/', authenticate, async (req, res) => {
  try {
    const { modele, taille, couleur } = req.query;
    let query = {};

    if (modele) query.modele = new RegExp(modele, 'i');
    if (taille) query.taille = taille;
    if (couleur) query.couleur = couleur;

    const stock = await Stock.find(query)
      .sort({ modele: 1, taille: 1, couleur: 1 });

    // Calculer les totaux
    const totaux = {
      quantiteTotalePrincipale: stock.reduce((sum, item) => sum + item.quantitePrincipale, 0),
      quantiteTotaleEnLivraison: stock.reduce((sum, item) => sum + item.quantiteEnLivraison, 0),
      valeurTotale: stock.reduce((sum, item) => sum + (item.quantitePrincipale * item.prix), 0)
    };

    res.json({ stock, totaux });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Obtenir un article de stock spécifique
router.get('/:id', authenticate, async (req, res) => {
  try {
    const stockItem = await Stock.findById(req.params.id)
      .populate('mouvements.utilisateur', 'nom role')
      .populate('mouvements.commande', 'numeroCommande');

    if (!stockItem) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    res.json({ stockItem });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Ajouter un article au stock manuellement
router.post('/', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { modele, taille, couleur, quantite, prix, image } = req.body;

    let stockItem = await Stock.findOne({ modele, taille, couleur });

    if (stockItem) {
      stockItem.quantitePrincipale += quantite;
      stockItem.mouvements.push({
        type: 'entree',
        quantite,
        source: 'Ajout manuel',
        destination: 'Stock principal',
        utilisateur: req.userId,
        commentaire: 'Ajout manuel au stock'
      });
    } else {
      stockItem = new Stock({
        modele,
        taille,
        couleur,
        quantitePrincipale: quantite,
        prix,
        image,
        mouvements: [{
          type: 'entree',
          quantite,
          source: 'Création',
          destination: 'Stock principal',
          utilisateur: req.userId,
          commentaire: 'Création et ajout initial'
        }]
      });
    }

    await stockItem.save();

    res.status(201).json({ 
      message: 'Stock mis à jour avec succès', 
      stockItem 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
});

// PUT /api/stock/:id - Modifier quantité et prix directement (Admin/Gestionnaire)
router.put('/:id', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { quantite, prix } = req.body;
    const stockItem = await Stock.findById(req.params.id);

    if (!stockItem) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    if (quantite !== undefined) {
      stockItem.mouvements.push({
        type: 'ajustement',
        quantite: quantite,
        ancienneQuantite: stockItem.quantitePrincipale,
        source: 'Modification manuelle',
        destination: 'Stock principal',
        utilisateur: req.userId,
        date: new Date(),
        commentaire: 'Modification directe du stock'
      });
      stockItem.quantitePrincipale = quantite;
    }
    
    if (prix !== undefined) {
      stockItem.prix = prix;
    }

    await stockItem.save();

    res.json({ 
      message: 'Stock modifié avec succès',
      stockItem 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });
  }
});

// Ajuster le stock
router.put('/:id/ajuster', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { quantite, type, commentaire } = req.body; // type: 'entree' ou 'sortie'
    const stockItem = await Stock.findById(req.params.id);

    if (!stockItem) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    if (type === 'entree') {
      stockItem.quantitePrincipale += quantite;
    } else if (type === 'sortie') {
      if (stockItem.quantitePrincipale < quantite) {
        return res.status(400).json({ message: 'Stock insuffisant' });
      }
      stockItem.quantitePrincipale -= quantite;
    }

    stockItem.mouvements.push({
      type,
      quantite,
      source: type === 'sortie' ? 'Stock principal' : 'Ajustement',
      destination: type === 'entree' ? 'Stock principal' : 'Ajustement',
      utilisateur: req.userId,
      commentaire: commentaire || 'Ajustement manuel'
    });

    await stockItem.save();

    res.json({ message: 'Stock ajusté avec succès', stockItem });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'ajustement', error: error.message });
  }
});

// Obtenir les statistiques du stock
router.get('/stats/resume', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const stock = await Stock.find();

    const stats = {
      totalArticles: stock.length,
      quantiteTotalePrincipale: stock.reduce((sum, item) => sum + item.quantitePrincipale, 0),
      quantiteTotaleEnLivraison: stock.reduce((sum, item) => sum + item.quantiteEnLivraison, 0),
      valeurTotalePrincipale: stock.reduce((sum, item) => sum + (item.quantitePrincipale * item.prix), 0),
      valeurTotaleEnLivraison: stock.reduce((sum, item) => sum + (item.quantiteEnLivraison * item.prix), 0),
      articlesEnRupture: stock.filter(item => item.quantitePrincipale === 0).length,
      articlesFaibleStock: stock.filter(item => item.quantitePrincipale > 0 && item.quantitePrincipale < 5).length
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du calcul des statistiques', error: error.message });
  }
});

export default router;




