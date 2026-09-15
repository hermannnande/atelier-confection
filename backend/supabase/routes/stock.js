import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCountry, ensureCountryAccess } from '../middleware/country.js';
import { mapStock } from '../map.js';
import {
  buildStockSynchronization,
  enrichStockWithSynchronization,
} from '../../services/stock-synchronization.service.js';

const router = express.Router();

router.get('/', authenticate, resolveCountry, async (req, res) => {
  try {
    const { modele, taille, couleur } = req.query;
    const supabase = getSupabaseAdmin();

    let q = supabase
      .from('stock')
      .select('*')
      .eq('pays_code', req.country)
      .order('modele', { ascending: true });
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

// Vue du stock physique avec les pièces réservées par les commandes encore validées.
// La réservation est calculée : elle ne retire pas physiquement l'article avant son envoi.
router.get('/suivi-commandes', authenticate, resolveCountry, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const [stockResult, ordersResult] = await Promise.all([
      supabase
        .from('stock')
        .select('*')
        .eq('pays_code', req.country)
        .order('modele', { ascending: true }),
      supabase
        .from('commandes')
        .select('id, modele, taille, couleur, statut, urgence, created_at, historique')
        .eq('pays_code', req.country)
        .eq('statut', 'validee'),
    ]);

    if (stockResult.error) {
      return res.status(500).json({ message: 'Erreur lors du chargement du stock', error: stockResult.error.message });
    }
    if (ordersResult.error) {
      return res.status(500).json({ message: 'Erreur lors du chargement des réservations', error: ordersResult.error.message });
    }

    const stock = (stockResult.data || []).map(mapStock);
    const synchronization = buildStockSynchronization({
      orders: ordersResult.data || [],
      stock,
    });
    const valeurTotale = stock.reduce(
      (sum, item) => sum + ((item.quantitePrincipale || 0) * (Number(item.prix) || 0)),
      0,
    );

    return res.json({
      stock: enrichStockWithSynchronization(stock, synchronization),
      variations: synchronization.variations,
      couvertureCommandes: synchronization.couvertureCommandes,
      totaux: { ...synchronization.totals, valeurTotale },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la synchronisation du stock', error: error.message });
  }
});

router.get('/historique', authenticate, resolveCountry, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from('stock')
      .select('id, modele, taille, couleur, mouvements')
      .eq('pays_code', req.country);

    if (error) return res.status(500).json({ message: "Erreur lors du chargement de l'historique", error: error.message });

    const rawMovements = (rows || []).flatMap((item) => (
      (Array.isArray(item.mouvements) ? item.mouvements : []).map((movement, index) => ({
        ...movement,
        id: `${item.id}-${index}`,
        stockId: item.id,
        modele: item.modele,
        taille: item.taille,
        couleur: item.couleur,
      }))
    ));
    const userIds = [...new Set(rawMovements
      .map((movement) => (typeof movement.utilisateur === 'object' ? movement.utilisateur?.id : movement.utilisateur))
      .filter(Boolean))];
    let usersById = new Map();

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, nom, role')
        .in('id', userIds);
      if (usersError) return res.status(500).json({ message: "Erreur lors du chargement des utilisateurs", error: usersError.message });
      usersById = new Map((users || []).map((user) => [user.id, user]));
    }

    const mouvements = rawMovements
      .map((movement) => {
        const userId = typeof movement.utilisateur === 'object' ? movement.utilisateur?.id : movement.utilisateur;
        return {
          ...movement,
          utilisateur: usersById.get(userId) || movement.utilisateur || null,
          utilisateurNom: usersById.get(userId)?.nom || 'Système',
        };
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return res.json({ mouvements });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors du chargement de l'historique", error: error.message });
  }
});

router.get('/stats/resume', authenticate, resolveCountry, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('stock').select('*').eq('pays_code', req.country);
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

router.get('/:id', authenticate, resolveCountry, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('stock').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ message: 'Article non trouvé' });
    if (!ensureCountryAccess(data, req, res)) return;
    return res.json({ stockItem: mapStock(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.post('/', authenticate, resolveCountry, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { modele, taille, couleur, quantite, prix, image } = req.body;
    const supabase = getSupabaseAdmin();
    const quantity = Number(quantite);
    const unitPrice = Number(prix);

    if (!modele || !taille || !couleur || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Modèle, taille, couleur et quantité positive sont requis' });
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({ message: 'Le prix du catalogue est invalide' });
    }

    const { data: existing } = await supabase
      .from('stock')
      .select('*')
      .eq('pays_code', req.country)
      .eq('modele', modele)
      .eq('taille', taille)
      .eq('couleur', couleur)
      .maybeSingle();

    if (existing) {
      const mouvements = Array.isArray(existing.mouvements) ? existing.mouvements : [];
      mouvements.push({
        type: 'entree',
        quantite: quantity,
        source: 'Ajout manuel',
        destination: 'Stock principal',
        utilisateur: req.userId,
        date: new Date().toISOString(),
        commentaire: 'Ajout manuel au stock',
      });

      const { data, error } = await supabase
        .from('stock')
        .update({
          quantite_principale: (existing.quantite_principale || 0) + quantity,
          prix: req.user.role === 'gestionnaire_stock' ? existing.prix : unitPrice,
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
        quantite: quantity,
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
        pays_code: req.country,
        modele,
        taille,
        couleur,
        quantite_principale: quantity,
        quantite_en_livraison: 0,
        prix: unitPrice,
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
router.put('/:id', authenticate, resolveCountry, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { quantite, prix } = req.body;
    const supabase = getSupabaseAdmin();

    if (req.user.role === 'gestionnaire_stock' && prix !== undefined) {
      return res.status(403).json({ message: 'Ce rôle peut modifier les quantités, mais pas les prix' });
    }

    const { data: existing, error: e1 } = await supabase.from('stock').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Article non trouvé' });
    if (!ensureCountryAccess(existing, req, res)) return;

    const updates = {};
    if (quantite !== undefined) {
      const newQuantity = Number(quantite);
      if (!Number.isFinite(newQuantity) || newQuantity < 0) {
        return res.status(400).json({ message: 'La quantité doit être un nombre positif ou nul' });
      }
      updates.quantite_principale = newQuantity;
      
      // Ajouter mouvement
      const mouvements = Array.isArray(existing.mouvements) ? existing.mouvements : [];
      const oldQuantity = existing.quantite_principale || 0;
      if (newQuantity !== oldQuantity) {
        mouvements.push({
          type: 'ajustement',
          quantite: Math.abs(newQuantity - oldQuantity),
          ancienneQuantite: oldQuantity,
          nouvelleQuantite: newQuantity,
          variation: newQuantity - oldQuantity,
          source: 'Modification manuelle',
          destination: 'Stock principal',
          utilisateur: req.userId,
          date: new Date().toISOString(),
          commentaire: 'Modification directe du stock'
        });
      }
      updates.mouvements = mouvements;
    }
    if (prix !== undefined) {
      const unitPrice = Number(prix);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ message: 'Le prix doit être un nombre positif ou nul' });
      }
      updates.prix = unitPrice;
    }

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

router.put('/:id/ajuster', authenticate, resolveCountry, authorize('gestionnaire_stock', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { quantite, type, commentaire } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: existing, error: e1 } = await supabase.from('stock').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Article non trouvé' });
    if (!ensureCountryAccess(existing, req, res)) return;

    const q = Number(quantite);
    if (!['entree', 'sortie'].includes(type) || !Number.isFinite(q) || q <= 0) {
      return res.status(400).json({ message: "Choisissez une entrée ou une sortie avec une quantité positive" });
    }
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

