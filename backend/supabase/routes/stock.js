import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mapStock } from '../map.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { modele, taille, couleur } = req.query;
    const supabase = getSupabaseAdmin();

    let q = supabase.from('stock').select('*').order('modele', { ascending: true });
    if (modele) q = q.ilike('modele', `%${modele}%`);
    if (taille) q = q.eq('taille', taille);
    if (couleur) q = q.eq('couleur', couleur);

    const { data, error } = await q;
    if (error) return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });

    const stock = (data || []).map(mapStock);
    const totaux = {
      quantiteTotalePrincipale: stock.reduce((sum, i) => sum + (i.quantitePrincipale || 0), 0),
      quantiteTotaleEnLivraison: stock.reduce((sum, i) => sum + (i.quantiteEnLivraison || 0), 0),
      valeurTotale: stock.reduce((sum, i) => sum + ((i.quantitePrincipale || 0) * (Number(i.prix) || 0)), 0),
    };

    return res.json({ stock, totaux });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.get('/stats/resume', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('stock').select('*');
    if (error) return res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });

    const rows = data || [];
    const stats = {
      totalArticles: rows.length,
      quantiteTotalePrincipale: rows.reduce((sum, i) => sum + (i.quantite_principale || 0), 0),
      quantiteTotaleEnLivraison: rows.reduce((sum, i) => sum + (i.quantite_en_livraison || 0), 0),
      valeurTotalePrincipale: rows.reduce((sum, i) => sum + ((i.quantite_principale || 0) * (Number(i.prix) || 0)), 0),
      valeurTotaleEnLivraison: rows.reduce((sum, i) => sum + ((i.quantite_en_livraison || 0) * (Number(i.prix) || 0)), 0),
      articlesEnRupture: rows.filter((i) => (i.quantite_principale || 0) === 0).length,
      articlesFaibleStock: rows.filter((i) => (i.quantite_principale || 0) > 0 && (i.quantite_principale || 0) < 5).length,
    };

    return res.json({ stats });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('stock').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ message: 'Article non trouvé' });
    return res.json({ stockItem: mapStock(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.post('/', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { modele, taille, couleur, quantite, prix, image } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('stock')
      .select('*')
      .eq('modele', modele)
      .eq('taille', taille)
      .eq('couleur', couleur)
      .maybeSingle();

    if (existing) {
      const mouvements = Array.isArray(existing.mouvements) ? existing.mouvements : [];
      mouvements.push({
        type: 'entree',
        quantite: Number(quantite),
        source: 'Ajout manuel',
        destination: 'Stock principal',
        utilisateur: req.userId,
        date: new Date().toISOString(),
        commentaire: 'Ajout manuel au stock',
      });

      const { data, error } = await supabase
        .from('stock')
        .update({
          quantite_principale: (existing.quantite_principale || 0) + Number(quantite),
          prix: Number(prix),
          image: image ?? existing.image,
          mouvements,
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) return res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
      return res.status(201).json({ message: 'Stock mis à jour avec succès', stockItem: mapStock(data) });
    }

    const mouvements = [
      {
        type: 'entree',
        quantite: Number(quantite),
        source: 'Création',
        destination: 'Stock principal',
        utilisateur: req.userId,
        date: new Date().toISOString(),
        commentaire: 'Création et ajout initial',
      },
    ];

    const { data, error } = await supabase
      .from('stock')
      .insert({
        modele,
        taille,
        couleur,
        quantite_principale: Number(quantite),
        quantite_en_livraison: 0,
        prix: Number(prix),
        image,
        mouvements,
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
    return res.status(201).json({ message: 'Stock mis à jour avec succès', stockItem: mapStock(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
});

// PUT /api/stock/:id - Modifier quantité et prix directement (Admin/Gestionnaire)
router.put('/:id', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { quantite, prix } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: existing, error: e1 } = await supabase.from('stock').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Article non trouvé' });

    const updates = {};
    if (quantite !== undefined) {
      updates.quantite_principale = Number(quantite);
      
      // Ajouter mouvement
      const mouvements = Array.isArray(existing.mouvements) ? existing.mouvements : [];
      mouvements.push({
        type: 'ajustement',
        quantite: Number(quantite),
        ancienneQuantite: existing.quantite_principale || 0,
        source: 'Modification manuelle',
        destination: 'Stock principal',
        utilisateur: req.userId,
        date: new Date().toISOString(),
        commentaire: 'Modification directe du stock'
      });
      updates.mouvements = mouvements;
    }
    if (prix !== undefined) updates.prix = Number(prix);

    const { data, error } = await supabase
      .from('stock')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
    return res.json({ message: 'Stock modifié avec succès', stockItem: mapStock(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });
  }
});

router.put('/:id/ajuster', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { quantite, type, commentaire } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: existing, error: e1 } = await supabase.from('stock').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Article non trouvé' });

    const q = Number(quantite);
    let quantitePrincipale = existing.quantite_principale || 0;
    if (type === 'entree') quantitePrincipale += q;
    if (type === 'sortie') {
      if (quantitePrincipale < q) return res.status(400).json({ message: 'Stock insuffisant' });
      quantitePrincipale -= q;
    }

    const mouvements = Array.isArray(existing.mouvements) ? existing.mouvements : [];
    mouvements.push({
      type,
      quantite: q,
      source: type === 'sortie' ? 'Stock principal' : 'Ajustement',
      destination: type === 'entree' ? 'Stock principal' : 'Ajustement',
      utilisateur: req.userId,
      date: new Date().toISOString(),
      commentaire: commentaire || 'Ajustement manuel',
    });

    const { data, error } = await supabase
      .from('stock')
      .update({ quantite_principale: quantitePrincipale, mouvements })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ message: "Erreur lors de l'ajustement", error: error.message });
    return res.json({ message: 'Stock ajusté avec succès', stockItem: mapStock(data) });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de l'ajustement", error: error.message });
  }
});

export default router;



