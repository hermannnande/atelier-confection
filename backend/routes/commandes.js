import express from 'express';
import Commande from '../models/Commande.js';
import Stock from '../models/Stock.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Obtenir toutes les commandes (avec filtres selon le rôle)
router.get('/', authenticate, async (req, res) => {
  try {
    const { statut, urgence } = req.query;
    let query = {};

    // Filtrer selon le rôle
    if (req.user.role === 'appelant') {
      // Les appelants voient toutes les commandes en attente (pour traiter les appels)
      // Ne pas filtrer par appelant_id
    } else if (req.user.role === 'styliste') {
      query.statut = { $in: ['validee', 'en_decoupe'] };
    } else if (req.user.role === 'couturier') {
      query.statut = { $in: ['en_couture'] };
    } else if (req.user.role === 'livreur') {
      query.livreur = req.userId;
      query.statut = { $in: ['en_livraison'] };
    }

    // Filtres supplémentaires
    if (statut) {
      const parts = String(statut)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      query.statut = parts.length > 1 ? { $in: parts } : parts[0];
    }
    if (urgence !== undefined) query.urgence = urgence === 'true';

    const commandes = await Commande.find(query)
      .populate('appelant', 'nom email')
      .populate('styliste', 'nom')
      .populate('couturier', 'nom')
      .populate('livreur', 'nom')
      .sort({ urgence: -1, createdAt: -1 });

    res.json({ commandes });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Créer une nouvelle commande
router.post('/', authenticate, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    // Support payload Google Sheets (plat) + payload normal
    const body = req.body || {};
    const client =
      body.client ||
      (body.nomClient || body.contactClient || body.ville
        ? { nom: body.nomClient, contact: body.contactClient, ville: body.ville }
        : undefined);

    const modele =
      body.modele && typeof body.modele === 'object'
        ? body.modele
        : body.modele
          ? { nom: body.modele, image: body.image, description: body.description }
          : undefined;

    const urgenceFlag = body.urgence ?? body.urgent;
    const noteAppelant = body.noteAppelant ?? body.note ?? body.specificite;

    const commandeData = {
      ...body,
      client: client ?? body.client,
      modele: modele ?? body.modele,
      noteAppelant,
      urgence: !!urgenceFlag,
      appelant: req.userId,
      historique: [{
        action: 'Commande créée',
        statut: 'nouvelle',
        utilisateur: req.userId,
        date: new Date()
      }]
    };

    const commande = new Commande(commandeData);
    await commande.save();
    await commande.populate('appelant', 'nom email');

    res.status(201).json({ 
      message: 'Commande créée avec succès', 
      commande 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
});

// Obtenir une commande spécifique
router.get('/:id', authenticate, async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id)
      .populate('appelant', 'nom email telephone')
      .populate('styliste', 'nom')
      .populate('couturier', 'nom')
      .populate('livreur', 'nom telephone')
      .populate('historique.utilisateur', 'nom role');

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    res.json({ commande });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Modifier une commande
router.put('/:id', authenticate, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Les appelants peuvent modifier toutes les commandes en attente (pour traiter les appels)
    // Ne pas restreindre par appelant_id

    const { client, modele, taille, couleur, prix, urgence, urgent, noteAppelant, note, statut } = req.body;
    
    if (client) commande.client = { ...commande.client, ...client };
    if (modele) commande.modele = { ...commande.modele, ...modele };
    if (taille) commande.taille = taille;
    if (couleur) commande.couleur = couleur;
    if (prix) commande.prix = prix;
    if (urgence !== undefined || urgent !== undefined) commande.urgence = !!(urgence ?? urgent);
    if (noteAppelant !== undefined || note !== undefined) commande.noteAppelant = noteAppelant ?? note;
    if (statut !== undefined) commande.statut = statut;

    commande.historique.push({
      action: 'Commande modifiée',
      statut: commande.statut,
      utilisateur: req.userId,
      date: new Date(),
      commentaire: 'Modification des détails de la commande'
    });

    await commande.save();
    await commande.populate('appelant styliste couturier livreur', 'nom');

    res.json({ message: 'Commande modifiée avec succès', commande });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });
  }
});

// Valider une commande (appelant)
router.post('/:id/valider', authenticate, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    commande.statut = 'validee';
    commande.historique.push({
      action: 'Commande validée',
      statut: 'validee',
      utilisateur: req.userId,
      date: new Date()
    });

    await commande.save();

    res.json({ message: 'Commande validée avec succès', commande });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la validation', error: error.message });
  }
});

// Marquer commande en découpe (styliste)
router.post('/:id/decoupe', authenticate, authorize('styliste', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    commande.statut = 'en_decoupe';
    commande.styliste = req.userId;
    commande.dateDecoupe = new Date();
    commande.historique.push({
      action: 'Découpe commencée',
      statut: 'en_decoupe',
      utilisateur: req.userId,
      date: new Date()
    });

    await commande.save();

    res.json({ message: 'Commande en découpe', commande });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Envoyer en couture (styliste)
router.post('/:id/couture', authenticate, authorize('styliste', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    commande.statut = 'en_couture';
    commande.historique.push({
      action: 'Envoyé en couture',
      statut: 'en_couture',
      utilisateur: req.userId,
      date: new Date()
    });

    await commande.save();

    res.json({ message: 'Commande envoyée en couture', commande });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Marquer couture terminée (couturier)
router.post('/:id/terminer-couture', authenticate, authorize('couturier', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    commande.statut = 'en_stock';
    commande.couturier = req.userId;
    commande.dateCouture = new Date();
    commande.historique.push({
      action: 'Couture terminée',
      statut: 'en_stock',
      utilisateur: req.userId,
      date: new Date()
    });

    await commande.save();

    // Ajouter au stock principal
    const stockItem = await Stock.findOne({
      modele: commande.modele.nom,
      taille: commande.taille,
      couleur: commande.couleur
    });

    if (stockItem) {
      stockItem.quantitePrincipale += 1;
      stockItem.mouvements.push({
        type: 'entree',
        quantite: 1,
        source: 'Atelier de confection',
        destination: 'Stock principal',
        commande: commande._id,
        utilisateur: req.userId,
        commentaire: 'Ajout après confection'
      });
      await stockItem.save();
    } else {
      const newStock = new Stock({
        modele: commande.modele.nom,
        taille: commande.taille,
        couleur: commande.couleur,
        quantitePrincipale: 1,
        prix: commande.prix,
        image: commande.modele.image,
        mouvements: [{
          type: 'entree',
          quantite: 1,
          source: 'Atelier de confection',
          destination: 'Stock principal',
          commande: commande._id,
          utilisateur: req.userId,
          commentaire: 'Création et ajout après confection'
        }]
      });
      await newStock.save();
    }

    res.json({ message: 'Commande terminée et ajoutée au stock', commande });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Annuler une commande
router.post('/:id/annuler', authenticate, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    commande.statut = 'annulee';
    commande.historique.push({
      action: 'Commande annulée',
      statut: 'annulee',
      utilisateur: req.userId,
      date: new Date(),
      commentaire: req.body.motif || ''
    });

    await commande.save();

    res.json({ message: 'Commande annulée', commande });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Supprimer TOUTES les commandes (Admin uniquement - Réinitialisation complète)
router.delete('/admin/reset-all', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const result = await Commande.deleteMany({});
    
    res.json({ 
      message: 'Toutes les commandes ont été supprimées avec succès', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la réinitialisation', error: error.message });
  }
});

// Supprimer une commande (Admin uniquement)
router.delete('/:id', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    await Commande.findByIdAndDelete(req.params.id);

    res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
});

export default router;




