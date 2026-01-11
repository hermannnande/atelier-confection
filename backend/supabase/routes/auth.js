import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../client.js';
import { authenticate } from '../middleware/auth.js';
import { mapUser } from '../map.js';

const router = express.Router();

router.post('/register', authenticate, async (req, res) => {
  try {
    if (!['administrateur', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seuls les administrateurs peuvent créer des comptes' });
    }

    const { nom, email, password, role, telephone } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', String(email).toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert({
        nom,
        email: String(email).toLowerCase(),
        password: passwordHash,
        role,
        telephone,
        actif: true,
      })
      .select('id, nom, email, role, telephone, actif, created_at, updated_at')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
    }

    return res.status(201).json({ message: 'Utilisateur créé avec succès', user: mapUser(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, nom, email, password, role, telephone, actif, created_at, updated_at')
      .eq('email', String(email).toLowerCase())
      .maybeSingle();

    // Si la requête DB échoue (clé Supabase invalide, RLS, etc.), ce n'est pas un "mauvais mot de passe"
    if (error) {
      return res.status(500).json({ message: 'Erreur base de données', error: error.message });
    }

    if (!userRow) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    if (userRow.actif === false) {
      return res.status(401).json({ message: 'Compte désactivé' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { userId: userRow.id, role: userRow.role },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '7d' }
    );

    const user = mapUser(userRow);
    delete user.password;
    return res.json({ message: 'Connexion réussie', token, user });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la connexion', error: error.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

export default router;



