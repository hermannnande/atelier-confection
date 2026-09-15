import express from 'express';
import Stock from '../models/Stock.js';
import Commande from '../models/Commande.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  buildStockSynchronization,
  enrichStockWithSynchronization,
} from '../services/stock-synchronization.service.js';

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

// Vue du stock physique avec les réservations des commandes encore validées.
router.get('/suivi-commandes', authenticate, async (req, res) => {
  try {
    const [stock, orders] = await Promise.all([
      Stock.find().sort({ modele: 1, taille: 1, couleur: 1 }).lean(),
      Commande.find({ statut: 'validee' }).lean(),
    ]);
    const synchronization = buildStockSynchronization({ orders, stock });
    const valeurTotale = stock.reduce(
      (sum, item) => sum + ((item.quantitePrincipale || 0) * (Number(item.prix) || 0)),
      0,
    );

    return res.json({
      stock: enrichStockWithSynchronization(stock, synchronization),
      variations: synchronization.variations,
      couvertureCommandes: synchronization.couvertureCommandes,
      totaux: { ...synchronization.totals, valeurTotale },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la synchronisation du stock', error: error.message });
  }
});

// Obtenir un article de stock spécifique
router.get('/historique', authenticate, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const stock = await Stock.find()
      .populate('mouvements.utilisateur', 'nom role')
      .lean();
    const mouvements = stock
      .flatMap((item) => (item.mouvements || []).map((movement, index) => ({
        ...movement,
        id: `${item._id}-${index}`,
        stockId: item._id,
        modele: item.modele,
        taille: item.taille,
        couleur: item.couleur,
        utilisateurNom: movement.utilisateur?.nom || 'Système',
      })))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return res.json({ mouvements });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors du chargement de l'historique", error: error.message });
  }
});

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
router.post('/', authenticate, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
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
router.put('/:id', authenticate, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { quantite, prix } = req.body;
    const stockItem = await Stock.findById(req.params.id);

    if (req.user.role === 'gestionnaire_stock' && prix !== undefined) {
      return res.status(403).json({ message: 'Ce rôle peut modifier les quantités, mais pas les prix' });
    }

    if (!stockItem) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    if (quantite !== undefined) {
      const newQuantity = Number(quantite);
      if (!Number.isFinite(newQuantity) || newQuantity < 0) {
        return res.status(400).json({ message: 'La quantité doit être un nombre positif ou nul' });
      }
      const oldQuantity = stockItem.quantitePrincipale;
      if (newQuantity !== oldQuantity) {
        stockItem.mouvements.push({
          type: 'ajustement',
          quantite: Math.abs(newQuantity - oldQuantity),
          ancienneQuantite: oldQuantity,
          nouvelleQuantite: newQuantity,
          variation: newQuantity - oldQuantity,
          source: 'Modification manuelle',
          destination: 'Stock principal',
          utilisateur: req.userId,
          date: new Date(),
          commentaire: 'Modification directe du stock'
        });
      }
      stockItem.quantitePrincipale = newQuantity;
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
router.put('/:id/ajuster', authenticate, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { quantite, type, commentaire } = req.body; // type: 'entree' ou 'sortie'
    const stockItem = await Stock.findById(req.params.id);
    const quantity = Number(quantite);

    if (!['entree', 'sortie'].includes(type) || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: "Choisissez une entrée ou une sortie avec une quantité positive" });
    }

    if (!stockItem) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    if (type === 'entree') {
      stockItem.quantitePrincipale += quantity;
    } else if (type === 'sortie') {
      if (stockItem.quantitePrincipale < quantity) {
        return res.status(400).json({ message: 'Stock insuffisant' });
      }
      stockItem.quantitePrincipale -= quantity;
    }

    stockItem.mouvements.push({
      type,
      quantite: quantity,
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
router.get('/stats/resume', authenticate, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
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


