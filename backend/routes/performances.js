import express from 'express';
import Commande from '../models/Commande.js';
import Livraison from '../models/Livraison.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Performances des appelants
router.get('/appelants', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const appelants = await User.find({ role: 'appelant', actif: true });
    
    const performances = await Promise.all(appelants.map(async (appelant) => {
      const commandes = await Commande.find({ appelant: appelant._id });
      
      const stats = {
        appelant: {
          id: appelant._id,
          nom: appelant.nom,
          email: appelant.email
        },
        totalCommandes: commandes.length,
        commandesValidees: commandes.filter(c => ['validee', 'en_decoupe', 'en_couture', 'en_stock', 'en_livraison', 'livree'].includes(c.statut)).length,
        commandesAnnulees: commandes.filter(c => c.statut === 'annulee').length,
        commandesEnAttente: commandes.filter(c => c.statut === 'en_attente_paiement').length,
        commandesUrgentes: commandes.filter(c => c.urgence).length,
        tauxValidation: commandes.length > 0 
          ? ((commandes.filter(c => c.statut !== 'annulee').length / commandes.length) * 100).toFixed(2)
          : 0,
        chiffreAffaires: commandes
          .filter(c => c.statut === 'livree')
          .reduce((sum, c) => sum + c.prix, 0)
      };
      
      return stats;
    }));

    performances.sort((a, b) => b.totalCommandes - a.totalCommandes);

    res.json({ performances });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

// Performances des couturiers
router.get('/couturiers', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const couturiers = await User.find({ role: 'couturier', actif: true });
    
    const performances = await Promise.all(couturiers.map(async (couturier) => {
      const commandes = await Commande.find({ couturier: couturier._id });
      
      const commandesTerminees = commandes.filter(c => 
        ['en_stock', 'en_livraison', 'livree'].includes(c.statut)
      );

      const commandesEnCours = commandes.filter(c => c.statut === 'en_couture');

      // Calculer le temps moyen de confection (si les dates sont disponibles)
      let tempsMoyenConfection = 0;
      if (commandesTerminees.length > 0) {
        const tempsTotal = commandesTerminees.reduce((sum, c) => {
          if (c.dateCouture && c.createdAt) {
            return sum + (new Date(c.dateCouture) - new Date(c.createdAt));
          }
          return sum;
        }, 0);
        tempsMoyenConfection = Math.round(tempsTotal / commandesTerminees.length / (1000 * 60 * 60 * 24)); // en jours
      }

      const stats = {
        couturier: {
          id: couturier._id,
          nom: couturier.nom,
          email: couturier.email
        },
        totalCommandesTraitees: commandesTerminees.length,
        commandesEnCours: commandesEnCours.length,
        tempsMoyenConfection: tempsMoyenConfection, // en jours
        productivite: commandesTerminees.length // Nombre de pièces terminées
      };
      
      return stats;
    }));

    performances.sort((a, b) => b.totalCommandesTraitees - a.totalCommandesTraitees);

    res.json({ performances });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

// Performances des stylistes
router.get('/stylistes', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const stylistes = await User.find({ role: 'styliste', actif: true });
    
    const performances = await Promise.all(stylistes.map(async (styliste) => {
      const commandes = await Commande.find({ styliste: styliste._id });
      
      const commandesDecoupees = commandes.filter(c => 
        ['en_couture', 'en_stock', 'en_livraison', 'livree'].includes(c.statut)
      );

      const commandesEnCours = commandes.filter(c => c.statut === 'en_decoupe');

      const stats = {
        styliste: {
          id: styliste._id,
          nom: styliste.nom,
          email: styliste.email
        },
        totalCommandesTraitees: commandesDecoupees.length,
        commandesEnCours: commandesEnCours.length,
        productivite: commandesDecoupees.length
      };
      
      return stats;
    }));

    performances.sort((a, b) => b.totalCommandesTraitees - a.totalCommandesTraitees);

    res.json({ performances });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

// Performances des livreurs
router.get('/livreurs', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const livreurs = await User.find({ role: 'livreur', actif: true });
    
    const performances = await Promise.all(livreurs.map(async (livreur) => {
      const livraisons = await Livraison.find({ livreur: livreur._id }).populate('commande');
      
      const livraisonsReussies = livraisons.filter(l => l.statut === 'livree');
      const livraisonsRefusees = livraisons.filter(l => l.statut === 'refusee');
      const livraisonsEnCours = livraisons.filter(l => ['assignee', 'en_cours'].includes(l.statut));

      const tauxReussite = livraisons.length > 0
        ? ((livraisonsReussies.length / livraisons.length) * 100).toFixed(2)
        : 0;

      const chiffreAffaires = livraisonsReussies.reduce((sum, l) => {
        return sum + (l.commande?.prix || 0);
      }, 0);

      const stats = {
        livreur: {
          id: livreur._id,
          nom: livreur.nom,
          telephone: livreur.telephone
        },
        totalLivraisons: livraisons.length,
        livraisonsReussies: livraisonsReussies.length,
        livraisonsRefusees: livraisonsRefusees.length,
        livraisonsEnCours: livraisonsEnCours.length,
        tauxReussite: tauxReussite,
        chiffreAffaires: chiffreAffaires
      };
      
      return stats;
    }));

    performances.sort((a, b) => b.livraisonsReussies - a.livraisonsReussies);

    res.json({ performances });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

// Vue d'ensemble des performances
router.get('/overview', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const totalCommandes = await Commande.countDocuments();
    const commandesLivrees = await Commande.countDocuments({ statut: 'livree' });
    const commandesEnCours = await Commande.countDocuments({ 
      statut: { $in: ['validee', 'en_decoupe', 'en_couture', 'en_stock', 'en_livraison'] } 
    });
    const commandesAnnulees = await Commande.countDocuments({ statut: 'annulee' });

    const commandes = await Commande.find({ statut: 'livree' });
    const chiffreAffairesTotal = commandes.reduce((sum, c) => sum + c.prix, 0);

    const tauxReussite = totalCommandes > 0
      ? ((commandesLivrees / totalCommandes) * 100).toFixed(2)
      : 0;

    const stats = {
      totalCommandes,
      commandesLivrees,
      commandesEnCours,
      commandesAnnulees,
      tauxReussite,
      chiffreAffairesTotal,
      totalUtilisateurs: await User.countDocuments({ actif: true }),
      appelants: await User.countDocuments({ role: 'appelant', actif: true }),
      stylistes: await User.countDocuments({ role: 'styliste', actif: true }),
      couturiers: await User.countDocuments({ role: 'couturier', actif: true }),
      livreurs: await User.countDocuments({ role: 'livreur', actif: true })
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

export default router;




