import express from 'express';
import SessionCaisse from '../models/SessionCaisse.js';
import Livraison from '../models/Livraison.js';
import Stock from '../models/Stock.js';
import Commande from '../models/Commande.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Obtenir toutes les sessions (avec filtres)
router.get('/', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { livreurId, statut } = req.query;
    const filter = {};
    
    if (livreurId) filter.livreur = livreurId;
    if (statut) filter.statut = statut;

    const sessions = await SessionCaisse.find(filter)
      .populate('livreur', 'nom email telephone')
      .populate('gestionnaire', 'nom email')
      .populate({
        path: 'livraisons',
        populate: {
          path: 'commande',
          select: 'numeroCommande client prix'
        }
      })
      .sort({ createdAt: -1 });

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

function enrichSessionCounts(session) {
  if (!session || !session.livraisons) return session;
  const livs = session.livraisons;
  session.nombreLivraisons = livs.length;
  session.nombreLivres = livs.filter((l) => l.statut === 'livree').length;
  session.nombreEnCours = livs.filter((l) => l.statut === 'en_cours').length;
  session.nombreRefuses = livs.filter((l) => l.statut === 'refusee').length;
  session.nombreRestants = session.nombreEnCours + session.nombreRefuses;
  session.montantTotal = livs
    .filter((l) => l.statut === 'livree')
    .reduce((sum, l) => sum + (Number(l.commande?.prix) || 0), 0);
  return session;
}

// Sessions ouvertes + livraisons sans session (lecture seule). Ouverture = POST ajouter-livraisons.
router.get('/livreur/:livreurId/session-active', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { livreurId } = req.params;

    const populateLiv = {
      path: 'livraisons',
      populate: {
        path: 'commande',
        select: 'numeroCommande client modele prix dateLivraison'
      }
    };

    let openSessions = await SessionCaisse.find({
      livreur: livreurId,
      statut: 'ouverte'
    })
      .sort({ dateDebut: -1 })
      .populate('livreur', 'nom email telephone')
      .populate(populateLiv);

    const pendingLivraisons = await Livraison.find({
      livreur: livreurId,
      statut: { $in: ['livree', 'en_cours', 'refusee'] },
      $or: [{ session_caisse: { $exists: false } }, { session_caisse: null }]
    }).populate('commande');

    const sessionsOuvertes = openSessions.map((s) =>
      enrichSessionCounts(typeof s.toObject === 'function' ? s.toObject() : { ...s })
    );

    const colisRestants = await Livraison.find({
      livreur: livreurId,
      statut: 'en_cours',
      session_caisse: { $exists: true, $ne: null }
    })
      .populate({
        path: 'session_caisse',
        select: 'statut dateCloture'
      })
      .populate({
        path: 'commande',
        select: 'numeroCommande client modele prix dateLivraison'
      });

    const colisRestantsFiltres = colisRestants.filter((l) => l.session_caisse?.statut === 'cloturee');

    res.json({
      session: sessionsOuvertes[0] || null,
      sessionsOuvertes: sessionsOuvertes,
      colisRestants: colisRestantsFiltres,
      livraisonsSansSession: pendingLivraisons.map((l) =>
        typeof l.toObject === 'function' ? l.toObject() : l
      )
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Clôturer une session (marquer comme payée)
router.post('/:sessionId/cloturer', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { commentaire } = req.body;

    const session = await SessionCaisse.findById(sessionId)
      .populate('livreur', 'nom')
      .populate('livraisons');

    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }

    if (session.statut === 'cloturee') {
      return res.status(400).json({ message: 'Session déjà clôturée' });
    }

    // Marquer la session comme clôturée
    session.statut = 'cloturee';
    session.dateCloture = new Date();
    session.gestionnaire = req.userId;
    if (commentaire) session.commentaire = commentaire;

    await session.save();

    // Marquer SEULEMENT les livraisons "livrées" comme payées
    await Livraison.updateMany(
      { 
        _id: { $in: session.livraisons.map(l => l._id || l) },
        statut: 'livree'
      },
      { 
        $set: { 
          paiement_recu: true,
          date_paiement: new Date()
        } 
      }
    );

    // Retirer les colis "en cours" de la session (ils réapparaîtront dans la prochaine session)
    await Livraison.updateMany(
      { 
        _id: { $in: session.livraisons.map(l => l._id || l) },
        statut: 'en_cours'
      },
      { 
        $unset: { session_caisse: '' }
      }
    );

    // Récupérer les colis REFUSÉS pour les remettre en stock
    const colisRefuses = await Livraison.find({
      _id: { $in: session.livraisons.map(l => l._id || l) },
      statut: 'refusee'
    }).populate('commande');

    // Pour chaque colis refusé, le remettre en stock
    for (const livraison of colisRefuses) {
      const commande = livraison.commande;
      if (!commande) continue;

      // Trouver l'item dans le stock
      const stockItem = await Stock.findOne({
        modele: commande.modele?.nom || commande.modele,
        taille: commande.taille,
        couleur: commande.couleur
      });

      if (stockItem) {
        // Remettre en stock principal depuis stock en livraison
        stockItem.quantitePrincipale += 1;
        stockItem.quantiteEnLivraison = Math.max(stockItem.quantiteEnLivraison - 1, 0);
        stockItem.mouvements.push({
          type: 'retour',
          quantite: 1,
          source: 'Livraison refusée',
          destination: 'Stock principal',
          commande: commande._id,
          utilisateur: req.userId,
          date: new Date(),
          commentaire: 'Retour en stock suite à clôture session'
        });
        await stockItem.save();
      }

      // Remettre la commande en stock
      commande.statut = 'en_stock';
      commande.livreur = null;
      await commande.save();
    }

    // Supprimer les livraisons refusées (remises en stock)
    await Livraison.deleteMany({
      _id: { $in: session.livraisons.map(l => l._id || l) },
      statut: 'refusee'
    });

    // Créer automatiquement une nouvelle session avec les colis "en cours" restants
    const colisEnCours = await Livraison.find({
      livreur: session.livreur,
      statut: 'en_cours',
      session_caisse: { $exists: false }
    }).populate('commande');

    if (colisEnCours.length > 0) {
      // Ne compter QUE les colis livrés (donc 0 ici car ce sont des "en_cours")
      const montantNouvelle = colisEnCours
        .filter(l => l.statut === 'livree')
        .reduce((sum, l) => sum + (l.commande?.prix || 0), 0);

      const nouvelleSession = new SessionCaisse({
        livreur: session.livreur,
        livraisons: colisEnCours.map(l => l._id),
        montantTotal: montantNouvelle,
        nombreLivraisons: colisEnCours.length,
        statut: 'ouverte',
        dateDebut: new Date()
      });

      await nouvelleSession.save();

      // Lier les colis à la nouvelle session
      await Livraison.updateMany(
        { _id: { $in: colisEnCours.map(l => l._id) } },
        { $set: { session_caisse: nouvelleSession._id } }
      );
    }

    res.json({
      message: `Session clôturée ! ${session.nombreLivraisons} livraison(s) - ${session.montantTotal.toLocaleString('fr-FR')} FCFA reçu de ${session.livreur?.nom}`,
      session
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la clôture', error: error.message });
  }
});

// Ajouter des livraisons (même règles que GET session-active)
router.post('/livreur/:livreurId/ajouter-livraisons', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { livreurId } = req.params;

    const openSessions = await SessionCaisse.find({
      livreur: livreurId,
      statut: 'ouverte'
    }).sort({ dateDebut: -1 });

    const nouvellesLivraisons = await Livraison.find({
      livreur: livreurId,
      statut: { $in: ['livree', 'en_cours', 'refusee'] },
      $or: [{ session_caisse: { $exists: false } }, { session_caisse: null }]
    }).populate('commande');

    if (nouvellesLivraisons.length === 0) {
      return res.json({ message: 'Aucune nouvelle livraison à ajouter' });
    }

    const nouveauMontant = nouvellesLivraisons
      .filter((l) => l.statut === 'livree')
      .reduce((sum, l) => sum + (Number(l.commande?.prix) || 0), 0);

    let session;

    if (openSessions.length === 0) {
      session = new SessionCaisse({
        livreur: livreurId,
        livraisons: nouvellesLivraisons.map((l) => l._id),
        montantTotal: nouveauMontant,
        nombreLivraisons: nouvellesLivraisons.length,
        statut: 'ouverte'
      });
    } else {
      session = new SessionCaisse({
        livreur: livreurId,
        livraisons: nouvellesLivraisons.map((l) => l._id),
        montantTotal: nouveauMontant,
        nombreLivraisons: nouvellesLivraisons.length,
        statut: 'ouverte'
      });
    }

    await session.save();

    await Livraison.updateMany(
      { _id: { $in: nouvellesLivraisons.map((l) => l._id) } },
      { $set: { session_caisse: session._id } }
    );

    const populated = await SessionCaisse.findById(session._id).populate({
      path: 'livraisons',
      populate: { path: 'commande', select: 'numeroCommande client modele prix dateLivraison' }
    });

    const sessionOut = enrichSessionCounts(
      typeof populated.toObject === 'function' ? populated.toObject() : populated
    );

    res.json({
      message: `Point de caisse : ${nouvellesLivraisons.length} livraison(s) rattachée(s) à une nouvelle session ouverte`,
      session: sessionOut,
      montantAjoute: nouveauMontant
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'ajout', error: error.message });
  }
});

// Obtenir l'historique des sessions clôturées d'un livreur
router.get('/livreur/:livreurId/historique', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { livreurId } = req.params;
    const { limit = 10 } = req.query;

    const sessions = await SessionCaisse.find({
      livreur: livreurId,
      statut: 'cloturee'
    })
      .populate('gestionnaire', 'nom')
      .sort({ dateCloture: -1 })
      .limit(parseInt(limit));

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Supprimer une session (admin uniquement)
router.delete('/session/:sessionId', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await SessionCaisse.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }

    await Livraison.updateMany(
      { session_caisse: sessionId },
      { $set: { session_caisse: null } }
    );

    await SessionCaisse.findByIdAndDelete(sessionId);

    res.json({ message: 'Session supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
});

export default router;

