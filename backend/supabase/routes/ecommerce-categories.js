import express from 'express';
import { getSupabaseAdmin } from '../client.js';

const router = express.Router();

const DEFAULT_SYNC_TOKEN = 'ATELIER_ECOM_2026';
const getExpectedToken = () => process.env.ECOMMERCE_SYNC_TOKEN || DEFAULT_SYNC_TOKEN;

const requireToken = (req, res) => {
  const token = req.body?.token || req.query?.token || req.headers['x-ecom-token'];
  if (token !== getExpectedToken()) {
    res.status(401).json({ success: false, message: 'Token invalide' });
    return false;
  }
  return true;
};

// Catégories par défaut (repli si la table n'existe pas encore)
const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Élégant', slug: 'elegant', description: 'Collection élégante et raffinée', active: true },
  { id: '2', name: 'Perle Rare', slug: 'perle-rare', description: 'Pièces uniques et précieuses', active: true },
  { id: '3', name: 'Perle Unique', slug: 'perle-unique', description: 'Créations exclusives', active: true },
  { id: '4', name: 'Style Event', slug: 'style-event', description: 'Tenues pour événements', active: true },
];

// GET /api/ecommerce/categories
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ecommerce_categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase ecommerce_categories list error (repli sur défauts):', error);
      return res.json({ success: true, categories: DEFAULT_CATEGORIES, fallback: true });
    }

    return res.json({ success: true, categories: data || [] });
  } catch (e) {
    console.error('/api/ecommerce/categories error:', e);
    return res.json({ success: true, categories: DEFAULT_CATEGORIES, fallback: true });
  }
});

// POST /api/ecommerce/categories/sync
// Body: { token, categories: [...] }
router.post('/sync', async (req, res) => {
  try {
    if (!requireToken(req, res)) return;

    const supabase = getSupabaseAdmin();
    const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];
    if (!categories.length) {
      return res.status(400).json({ success: false, message: 'Liste catégories vide' });
    }

    const now = new Date().toISOString();
    const rows = categories.map((c) => ({
      id: String(c.id || '').trim(),
      name: String(c.name || '').trim(),
      slug: String(c.slug || '').trim(),
      description: c.description || null,
      active: c.active !== false,
      created_at: c.createdAt || now,
      updated_at: now,
    })).filter((r) => r.id && r.name && r.slug);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Aucune catégorie valide' });
    }

    const { error } = await supabase
      .from('ecommerce_categories')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Supabase ecommerce_categories upsert error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, count: rows.length });
  } catch (e) {
    console.error('/api/ecommerce/categories/sync error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: e.message });
  }
});

// DELETE /api/ecommerce/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const token = req.query?.token || req.headers['x-ecom-token'];
    if (token !== getExpectedToken()) {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }

    const supabase = getSupabaseAdmin();
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID manquant' });

    const { error } = await supabase
      .from('ecommerce_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase ecommerce_categories delete error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, deleted: id });
  } catch (e) {
    console.error('/api/ecommerce/categories delete error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: e.message });
  }
});

export default router;
