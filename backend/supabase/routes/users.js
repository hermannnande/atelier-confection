import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mapUser } from '../map.js';

const router = express.Router();

router.get('/', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { role, actif } = req.query;
    const supabase = getSupabaseAdmin();

    let q = supabase
      .from('users')
      .select('id, nom, email, role, telephone, actif, created_at, updated_at')
      .order('nom', { ascending: true });

    if (role) q = q.eq('role', role);
    if (actif !== undefined) q = q.eq('actif', actif === 'true');

    const { data, error } = await q;
    if (error) return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });

    return res.json({ users: (data || []).map(mapUser) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('id, nom, email, role, telephone, actif, created_at, updated_at')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    return res.json({ user: mapUser(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.put('/:id', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { nom, email, role, telephone, actif } = req.body;
    const supabase = getSupabaseAdmin();

    const update = {};
    if (nom) update.nom = nom;
    if (email) update.email = String(email).toLowerCase();
    if (role) update.role = role;
    if (telephone !== undefined) update.telephone = telephone;
    if (actif !== undefined) update.actif = actif;

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', req.params.id)
      .select('id, nom, email, role, telephone, actif, created_at, updated_at')
      .single();

    if (error || !data) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    return res.json({ message: 'Utilisateur modifié avec succès', user: mapUser(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });
  }
});

router.delete('/:id', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('users').update({ actif: false }).eq('id', req.params.id);
    if (error) return res.status(500).json({ message: 'Erreur lors de la désactivation', error: error.message });
    return res.json({ message: 'Utilisateur désactivé avec succès' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la désactivation', error: error.message });
  }
});

export default router;



