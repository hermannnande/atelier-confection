import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Obtenir tous les utilisateurs
router.get('/', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { role, actif } = req.query;
    let query = {};

    if (role) query.role = role;
    if (actif !== undefined) query.actif = actif === 'true';

    const users = await User.find(query).sort({ nom: 1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Obtenir un utilisateur spécifique
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Modifier un utilisateur
router.put('/:id', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { nom, email, role, telephone, actif } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (nom) user.nom = nom;
    if (email) user.email = email;
    if (role) user.role = role;
    if (telephone) user.telephone = telephone;
    if (actif !== undefined) user.actif = actif;

    await user.save();

    res.json({ message: 'Utilisateur modifié avec succès', user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });
  }
});

// Désactiver un utilisateur
router.delete('/:id', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.actif = false;
    await user.save();

    res.json({ message: 'Utilisateur désactivé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la désactivation', error: error.message });
  }
});

export default router;




