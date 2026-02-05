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

// GET /api/ecommerce/products
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ecommerce_products')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase ecommerce_products list error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, products: data || [] });
  } catch (e) {
    console.error('❌ /api/ecommerce/products error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: e.message });
  }
});

// GET /api/ecommerce/products/:id
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID manquant' });

    const { data, error } = await supabase
      .from('ecommerce_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Supabase renvoie une erreur si aucun résultat avec single()
      const notFound = String(error.code || '').toLowerCase() === 'pgrst116';
      if (notFound) return res.status(404).json({ success: false, message: 'Produit introuvable' });
      console.error('❌ Supabase ecommerce_products get error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, product: data });
  } catch (e) {
    console.error('❌ /api/ecommerce/products/:id error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: e.message });
  }
});

// POST /api/ecommerce/products/sync
// Body: { token, products: [...] }
router.post('/sync', async (req, res) => {
  try {
    if (!requireToken(req, res)) return;

    const supabase = getSupabaseAdmin();
    const products = Array.isArray(req.body?.products) ? req.body.products : [];
    if (!products.length) {
      return res.status(400).json({ success: false, message: 'Liste produits vide' });
    }

    const now = new Date().toISOString();
    const rows = products.map((p) => ({
      id: String(p.id || '').trim(),
      name: String(p.name || '').trim(),
      category: p.category || null,
      price: Number(p.price) || 0,
      original_price: Number(p.originalPrice) || 0,
      stock: Number(p.stock) || 0,
      description: p.description || null,
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      colors: Array.isArray(p.colors) ? p.colors : [],
      images: Array.isArray(p.images) ? p.images : [],
      video: p.video || null,
      thumbnail: p.thumbnail || null,
      active: p.active !== false,
      created_at: p.createdAt || now,
      updated_at: now,
    })).filter((r) => r.id && r.name);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Aucun produit valide' });
    }

    const { error } = await supabase
      .from('ecommerce_products')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('❌ Supabase ecommerce_products upsert error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, count: rows.length });
  } catch (e) {
    console.error('❌ /api/ecommerce/products/sync error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: e.message });
  }
});

export default router;

