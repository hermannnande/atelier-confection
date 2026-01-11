import jwt from 'jsonwebtoken';
import { getSupabaseAdmin } from '../client.js';
import { mapUser } from '../map.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('users')
      .select('id, nom, email, role, telephone, actif')
      .eq('id', decoded.userId)
      .single();

    if (error || !data || data.actif === false) {
      return res.status(401).json({ message: 'Utilisateur non trouvé ou inactif' });
    }

    req.user = mapUser(data);
    req.userId = data.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès non autorisé pour votre rôle' });
    }

    next();
  };
};



