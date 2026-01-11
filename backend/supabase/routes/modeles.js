import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

// GET /api/modeles - Liste tous les modèles
router.get('/', async (req, res) => {
  try {
    const { actif, categorie, search } = req.query;
    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('modeles')
      .select('*')
      .order('nom', { ascending: true });
    
    if (actif !== undefined) {
      query = query.eq('actif', actif === 'true');
    }
    
    if (categorie) {
      query = query.eq('categorie', categorie);
    }
    
    if (search) {
      query = query.ilike('nom', `%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(500).json({ message: 'Erreur base de données', error: error.message });
    }
    
    res.json({ modeles: data || [] });
  } catch (error) {
    console.error('Erreur récupération modèles:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/modeles/:id - Détails d'un modèle
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('modeles')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ message: 'Modèle non trouvé' });
    }
    
    res.json({ modele: data });
  } catch (error) {
    console.error('Erreur récupération modèle:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/modeles - Créer un modèle (Admin/Gestionnaire)
router.post('/', async (req, res) => {
  try {
    if (!['administrateur', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    const { nom, description, image, prixBase, categorie } = req.body;
    const supabase = getSupabaseAdmin();
    
    // Vérifier si le modèle existe déjà
    const { data: existant } = await supabase
      .from('modeles')
      .select('id')
      .eq('nom', nom)
      .maybeSingle();
    
    if (existant) {
      return res.status(400).json({ message: 'Un modèle avec ce nom existe déjà' });
    }
    
    const { data, error } = await supabase
      .from('modeles')
      .insert({
        nom,
        description,
        image,
        prix_base: prixBase,
        categorie: categorie || 'Autre',
        actif: true
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ message: 'Erreur création modèle', error: error.message });
    }
    
    res.status(201).json({ 
      message: 'Modèle créé avec succès',
      modele: {
        ...data,
        prixBase: data.prix_base
      }
    });
  } catch (error) {
    console.error('Erreur création modèle:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT /api/modeles/:id - Modifier un modèle (Admin/Gestionnaire)
router.put('/:id', async (req, res) => {
  try {
    if (!['administrateur', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    const { nom, description, image, prixBase, categorie, actif } = req.body;
    const supabase = getSupabaseAdmin();
    
    // Vérifier unicité du nom si modifié
    if (nom) {
      const { data: existant } = await supabase
        .from('modeles')
        .select('id')
        .eq('nom', nom)
        .neq('id', req.params.id)
        .maybeSingle();
      
      if (existant) {
        return res.status(400).json({ message: 'Un modèle avec ce nom existe déjà' });
      }
    }
    
    const updates = {};
    if (nom !== undefined) updates.nom = nom;
    if (description !== undefined) updates.description = description;
    if (image !== undefined) updates.image = image;
    if (prixBase !== undefined) updates.prix_base = prixBase;
    if (categorie !== undefined) updates.categorie = categorie;
    if (actif !== undefined) updates.actif = actif;
    
    const { data, error } = await supabase
      .from('modeles')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ message: 'Erreur modification modèle', error: error.message });
    }
    
    if (!data) {
      return res.status(404).json({ message: 'Modèle non trouvé' });
    }
    
    res.json({ 
      message: 'Modèle modifié avec succès',
      modele: {
        ...data,
        prixBase: data.prix_base
      }
    });
  } catch (error) {
    console.error('Erreur modification modèle:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE /api/modeles/:id - Supprimer un modèle (Admin/Gestionnaire)
router.delete('/:id', async (req, res) => {
  try {
    if (!['administrateur', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Désactiver au lieu de supprimer
    const { error } = await supabase
      .from('modeles')
      .update({ actif: false })
      .eq('id', req.params.id);
    
    if (error) {
      return res.status(500).json({ message: 'Erreur suppression modèle', error: error.message });
    }
    
    res.json({ message: 'Modèle désactivé avec succès' });
  } catch (error) {
    console.error('Erreur suppression modèle:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

export default router;
