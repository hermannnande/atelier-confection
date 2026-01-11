import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Inscription (accessible uniquement aux admins)
router.post('/register', authenticate, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin ou gestionnaire
    if (!['administrateur', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Seuls les administrateurs peuvent créer des comptes' 
      });
    }

    const { nom, email, password, role, telephone } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const user = new User({ nom, email, password, role, telephone });
    await user.save();

    res.status(201).json({ 
      message: 'Utilisateur créé avec succès', 
      user 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    if (!user.actif) {
      return res.status(401).json({ message: 'Compte désactivé' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Connexion réussie', 
      token, 
      user 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la connexion', error: error.message });
  }
});

// Obtenir l'utilisateur courant
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

export default router;




