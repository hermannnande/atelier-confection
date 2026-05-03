import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate } from '../middleware/auth.js';
import { getAllowedCountriesForUser } from '../middleware/country.js';

const router = express.Router();

/**
 * GET /api/pays
 * Liste des pays accessibles par l'utilisateur connecte (filtres par actif=true).
 *
 * Reponse :
 *   {
 *     pays: [
 *       { code: 'CI', nom: 'Cote d''Ivoire', devise: 'XOF', symbole_devise: 'FCFA',
 *         indicatif_tel: '+225', drapeau: '🇨🇮', actif: true },
 *       ...
 *     ],
 *     pays_actuel: 'CI',           // pays principal de l'utilisateur
 *     peut_switcher: true          // true si l'user a acces a plusieurs pays
 *   }
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const allowed = getAllowedCountriesForUser(req.user);

    const { data, error } = await supabase
      .from('pays')
      .select('code, nom, devise, symbole_devise, indicatif_tel, drapeau, ordre, actif')
      .eq('actif', true)
      .in('code', allowed)
      .order('ordre', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Erreur lors de la recuperation des pays', error: error.message });
    }

    return res.json({
      pays: data || [],
      pays_actuel: req.user.pays_code || 'CI',
      peut_switcher: (data || []).length > 1,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

/**
 * GET /api/pays/all
 * Liste de TOUS les pays (admin uniquement, pour gerer la liste).
 */
router.get('/all', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'administrateur') {
      return res.status(403).json({ message: "Reserve a l'administrateur" });
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('pays')
      .select('*')
      .order('ordre', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Erreur', error: error.message });
    }
    return res.json({ pays: data || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

export default router;
