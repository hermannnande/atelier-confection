import express from 'express';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCountry, ensureCountryAccess } from '../middleware/country.js';
import { mapUserWithTeam } from '../map.js';
import { parseTeam, teamStatsUpdate } from '../../services/team.service.js';

const router = express.Router();
const VALID_USER_ROLES = ['administrateur', 'gestionnaire', 'gestionnaire_stock', 'appelant', 'styliste', 'couturier', 'livreur'];
// stats contient l'équipe (jour ou nuit) des couturiers et stylistes.
const USER_COLUMNS = 'id, nom, email, role, telephone, actif, pays_code, pays_autorises, stats, created_at, updated_at';

router.get('/', authenticate, resolveCountry, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { role, actif } = req.query;
    const supabase = getSupabaseAdmin();

    // Multi-pays : on ne retourne que les users dont le pays_code = pays actif
    // (on n'inclut pas tous les pays autorises de l'admin pour eviter de melanger
    // les listes de livreurs entre pays sur la page Caisse).
    let q = supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('pays_code', req.country)
      .order('nom', { ascending: true });

    if (role) q = q.eq('role', role);
    if (actif !== undefined) q = q.eq('actif', actif === 'true');

    const { data, error } = await q;
    if (error) return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });

    return res.json({ users: (data || []).map(mapUserWithTeam) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.get('/:id', authenticate, resolveCountry, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    if (!ensureCountryAccess(data, req, res)) return;
    return res.json({ user: mapUserWithTeam(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.put('/:id', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { nom, email, role, telephone, actif, pays_code, pays_autorises, password } = req.body;
    const supabase = getSupabaseAdmin();

    if (role && !VALID_USER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Rôle utilisateur invalide' });
    }
    const { equipe, error: teamError } = parseTeam(req.body.equipe);
    if (teamError) return res.status(400).json({ message: teamError });
    if (role === 'gestionnaire_stock' && req.user.role !== 'administrateur') {
      return res.status(403).json({ message: 'Seul un administrateur peut attribuer ce rôle' });
    }

    // Verifier acces au user cible
    const { data: existing, error: e1 } = await supabase
      .from('users')
      .select('id, pays_code, role, stats')
      .eq('id', req.params.id)
      .single();
    if (e1 || !existing) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    if (!ensureCountryAccess(existing, req, res)) return;

    const update = {};
    // Équipe de jour ou de nuit : seulement pour un couturier ou un styliste.
    const stats = teamStatsUpdate({ stats: existing.stats, role: role || existing.role, equipe });
    if (stats) update.stats = stats;
    if (nom) update.nom = nom;
    if (email) update.email = String(email).toLowerCase();
    if (role) update.role = role;
    if (telephone !== undefined) update.telephone = telephone;
    if (actif !== undefined) update.actif = actif;

    // Reinitialiser le mot de passe (admin/gestionnaire uniquement, deja autorise par authorize())
    if (password !== undefined && password !== null && String(password).length > 0) {
      const pwd = String(password);
      if (pwd.length < 6) {
        return res.status(400).json({ message: 'Le mot de passe doit faire au moins 6 caractères' });
      }
      update.password = await bcrypt.hash(pwd, 10);
    }

    // Multi-pays : modification autorisee uniquement pour les administrateurs
    // (un gestionnaire ne peut pas reassigner un user a un autre pays).
    if (req.user.role === 'administrateur') {
      if (pays_code && /^[A-Z]{2}$/.test(pays_code)) update.pays_code = pays_code;
      if (Array.isArray(pays_autorises)) {
        const filtered = pays_autorises.filter((c) => /^[A-Z]{2}$/.test(c));
        update.pays_autorises = filtered.length > 0 ? filtered : null;
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', req.params.id)
      .select(USER_COLUMNS)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    return res.json({ message: 'Utilisateur modifié avec succès', user: mapUserWithTeam(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });
  }
});

router.delete('/:id', authenticate, resolveCountry, authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase
      .from('users')
      .select('id, pays_code')
      .eq('id', req.params.id)
      .single();
    if (e1 || !existing) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    if (!ensureCountryAccess(existing, req, res)) return;

    const { error } = await supabase.from('users').update({ actif: false }).eq('id', req.params.id);
    if (error) return res.status(500).json({ message: 'Erreur lors de la désactivation', error: error.message });
    return res.json({ message: 'Utilisateur désactivé avec succès' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la désactivation', error: error.message });
  }
});

export default router;


