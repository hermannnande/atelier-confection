import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mapCommande, mapUser } from '../map.js';

const router = express.Router();

async function hydrateUsersForCommandes(supabase, rows) {
  const ids = new Set();
  for (const r of rows) {
    if (r.appelant_id) ids.add(r.appelant_id);
    if (r.styliste_id) ids.add(r.styliste_id);
    if (r.couturier_id) ids.add(r.couturier_id);
    if (r.livreur_id) ids.add(r.livreur_id);
    if (Array.isArray(r.historique)) {
      for (const h of r.historique) {
        if (h?.utilisateur) ids.add(h.utilisateur);
      }
    }
  }

  if (ids.size === 0) return new Map();

  const { data, error } = await supabase
    .from('users')
    .select('id, nom, email, role, telephone, actif, created_at, updated_at')
    .in('id', Array.from(ids));

  if (error || !data) return new Map();
  return new Map(data.map((u) => [u.id, mapUser(u)]));
}

function attachUsers(row, usersById) {
  const clone = { ...row };
  if (clone.appelant_id) clone.appelant = usersById.get(clone.appelant_id);
  if (clone.styliste_id) clone.styliste = usersById.get(clone.styliste_id);
  if (clone.couturier_id) clone.couturier = usersById.get(clone.couturier_id);
  if (clone.livreur_id) clone.livreur = usersById.get(clone.livreur_id);

  if (Array.isArray(clone.historique)) {
    clone.historique = clone.historique.map((h) => ({
      ...h,
      utilisateur: h?.utilisateur ? usersById.get(h.utilisateur) : h?.utilisateur,
    }));
  }

  return clone;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { statut, urgence } = req.query;
    const supabase = getSupabaseAdmin();

    let q = supabase.from('commandes').select('*');

    // Filtres selon rôle
    if (req.user.role === 'appelant') {
      // Les appelants voient toutes les commandes en attente (pour traiter les appels)
      // Ne pas filtrer par appelant_id
    } else if (req.user.role === 'styliste') {
      q = q.in('statut', ['validee', 'en_decoupe']);
    } else if (req.user.role === 'couturier') {
      q = q.eq('statut', 'en_couture');
    } else if (req.user.role === 'livreur') {
      q = q.eq('livreur_id', req.userId).eq('statut', 'en_livraison');
    }

    if (statut) {
      // Supporte: ?statut=a,b,c
      const parts = String(statut)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      q = parts.length > 1 ? q.in('statut', parts) : q.eq('statut', parts[0]);
    }
    if (urgence !== undefined) q = q.eq('urgence', urgence === 'true');

    q = q.order('urgence', { ascending: false }).order('created_at', { ascending: false });

    const { data, error } = await q;
    if (error) return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });

    const rows = data || [];
    const usersById = await hydrateUsersForCommandes(supabase, rows);
    const commandes = rows.map((r) => mapCommande(attachUsers(r, usersById)));

    return res.json({ commandes });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.post('/', authenticate, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Support Google Sheets (payload plat) + payload normal (client/modele)
    const client =
      req.body.client ||
      (req.body.nomClient || req.body.contactClient || req.body.ville
        ? {
            nom: req.body.nomClient,
            contact: req.body.contactClient,
            ville: req.body.ville,
          }
        : undefined);

    const modele =
      req.body.modele && typeof req.body.modele === 'object'
        ? req.body.modele
        : req.body.modele
          ? { nom: req.body.modele, image: req.body.image, description: req.body.description }
          : undefined;

    const noteAppelant =
      req.body.noteAppelant ?? req.body.note ?? req.body.specificite ?? req.body.specificite;

    const urgenceFlag = req.body.urgence ?? req.body.urgent;

    // Statut demandé (admin/gestionnaire uniquement)
    let statutInitial = 'nouvelle';
    if (req.body.statut && ['administrateur', 'gestionnaire'].includes(req.user.role)) {
      statutInitial = req.body.statut;
    }

    // Validation des champs obligatoires
    if (!client || !client.nom || !client.contact) {
      return res.status(400).json({ 
        message: 'Informations client incomplètes', 
        required: ['client.nom', 'client.contact'] 
      });
    }

    if (!modele || !modele.nom) {
      return res.status(400).json({ 
        message: 'Informations modèle incomplètes', 
        required: ['modele.nom'] 
      });
    }

    if (!req.body.taille || !req.body.couleur) {
      return res.status(400).json({ 
        message: 'Taille et couleur obligatoires', 
        required: ['taille', 'couleur'] 
      });
    }

    const commandeData = {
      numero_commande: null, // Sera généré automatiquement par le trigger
      client,
      modele,
      taille: req.body.taille,
      couleur: req.body.couleur,
      prix: Number(req.body.prix) || 0,
      urgence: !!urgenceFlag,
      note_appelant: noteAppelant || null,
      appelant_id: req.userId,
      statut: statutInitial,
      historique: [
        {
          action: 'Commande créée',
          statut: statutInitial,
          utilisateur: req.userId,
          date: now,
        },
      ],
    };

    const { data, error } = await supabase.from('commandes').insert(commandeData).select('*').single();
    if (error) {
      console.error('❌ Erreur Supabase lors de la création:', error);
      return res.status(500).json({ message: 'Erreur lors de la création', error: error.message, details: error });
    }

    const usersById = await hydrateUsersForCommandes(supabase, [data]);
    const commande = mapCommande(attachUsers(data, usersById));
    return res.status(201).json({ message: 'Commande créée avec succès', commande });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ message: 'Commande non trouvée' });

    const usersById = await hydrateUsersForCommandes(supabase, [data]);
    const commande = mapCommande(attachUsers(data, usersById));
    return res.json({ commande });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.put('/:id', authenticate, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });

    // Les appelants peuvent modifier toutes les commandes en attente (pour traiter les appels)
    // Ne pas restreindre par appelant_id

    const update = {};
    if (req.body.client) update.client = { ...existing.client, ...req.body.client };
    if (req.body.modele) update.modele = { ...existing.modele, ...req.body.modele };
    if (req.body.taille) update.taille = req.body.taille;
    if (req.body.couleur) update.couleur = req.body.couleur;
    if (req.body.prix !== undefined) update.prix = Number(req.body.prix);
    if (req.body.urgence !== undefined || req.body.urgent !== undefined) {
      update.urgence = !!(req.body.urgence ?? req.body.urgent);
    }
    if (req.body.noteAppelant !== undefined || req.body.note !== undefined) {
      update.note_appelant = req.body.noteAppelant ?? req.body.note;
    }
    if (req.body.statut !== undefined) update.statut = req.body.statut;

    const historique = Array.isArray(existing.historique) ? existing.historique : [];
    historique.push({
      action: 'Commande modifiée',
      statut: req.body.statut ?? existing.statut,
      utilisateur: req.userId,
      date: new Date().toISOString(),
      commentaire: 'Modification des détails de la commande',
    });
    update.historique = historique;

    const { data, error } = await supabase.from('commandes').update(update).eq('id', req.params.id).select('*').single();
    if (error) return res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });

    const usersById = await hydrateUsersForCommandes(supabase, [data]);
    const commande = mapCommande(attachUsers(data, usersById));
    return res.json({ message: 'Commande modifiée avec succès', commande });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });
  }
});

router.post('/:id/valider', authenticate, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });

    const historique = Array.isArray(existing.historique) ? existing.historique : [];
    historique.push({
      action: 'Commande validée',
      statut: 'validee',
      utilisateur: req.userId,
      date: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('commandes')
      .update({ statut: 'validee', historique })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ message: 'Erreur lors de la validation', error: error.message });
    return res.json({ message: 'Commande validée avec succès', commande: mapCommande(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la validation', error: error.message });
  }
});

router.post('/:id/decoupe', authenticate, authorize('styliste', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });

    const historique = Array.isArray(existing.historique) ? existing.historique : [];
    historique.push({
      action: 'Découpe commencée',
      statut: 'en_decoupe',
      utilisateur: req.userId,
      date: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('commandes')
      .update({ statut: 'en_decoupe', styliste_id: req.userId, date_decoupe: new Date().toISOString(), historique })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ message: 'Erreur', error: error.message });
    return res.json({ message: 'Commande en découpe', commande: mapCommande(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

router.post('/:id/couture', authenticate, authorize('styliste', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });

    const historique = Array.isArray(existing.historique) ? existing.historique : [];
    historique.push({
      action: 'Envoyé en couture',
      statut: 'en_couture',
      utilisateur: req.userId,
      date: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('commandes')
      .update({ statut: 'en_couture', historique })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ message: 'Erreur', error: error.message });
    return res.json({ message: 'Commande envoyée en couture', commande: mapCommande(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

router.post('/:id/terminer-couture', authenticate, authorize('couturier', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });

    const historique = Array.isArray(existing.historique) ? existing.historique : [];
    historique.push({
      action: 'Couture terminée',
      statut: 'en_stock',
      utilisateur: req.userId,
      date: new Date().toISOString(),
    });

    const { data: updatedCommande, error: e2 } = await supabase
      .from('commandes')
      .update({
        statut: 'en_stock',
        couturier_id: req.userId,
        date_couture: new Date().toISOString(),
        historique,
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (e2) return res.status(500).json({ message: 'Erreur', error: e2.message });

    // Ajouter au stock principal (upsert)
    const modeleNom = existing.modele?.nom;
    const taille = existing.taille;
    const couleur = existing.couleur;

    const { data: stockItem } = await supabase
      .from('stock')
      .select('*')
      .eq('modele', modeleNom)
      .eq('taille', taille)
      .eq('couleur', couleur)
      .maybeSingle();

    if (stockItem) {
      const mouvements = Array.isArray(stockItem.mouvements) ? stockItem.mouvements : [];
      mouvements.push({
        type: 'entree',
        quantite: 1,
        source: 'Atelier de confection',
        destination: 'Stock principal',
        commande: existing.id,
        utilisateur: req.userId,
        date: new Date().toISOString(),
        commentaire: 'Ajout après confection',
      });

      await supabase
        .from('stock')
        .update({
          quantite_principale: (stockItem.quantite_principale || 0) + 1,
          mouvements,
        })
        .eq('id', stockItem.id);
    } else {
      const mouvements = [
        {
          type: 'entree',
          quantite: 1,
          source: 'Atelier de confection',
          destination: 'Stock principal',
          commande: existing.id,
          utilisateur: req.userId,
          date: new Date().toISOString(),
          commentaire: 'Création et ajout après confection',
        },
      ];

      await supabase.from('stock').insert({
        modele: modeleNom,
        taille,
        couleur,
        quantite_principale: 1,
        quantite_en_livraison: 0,
        prix: existing.prix,
        image: existing.modele?.image,
        mouvements,
      });
    }

    return res.json({ message: 'Commande terminée et ajoutée au stock', commande: mapCommande(updatedCommande) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

router.post('/:id/annuler', authenticate, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });

    const historique = Array.isArray(existing.historique) ? existing.historique : [];
    historique.push({
      action: 'Commande annulée',
      statut: 'annulee',
      utilisateur: req.userId,
      date: new Date().toISOString(),
      commentaire: req.body.motif || '',
    });

    const { data, error } = await supabase
      .from('commandes')
      .update({ statut: 'annulee', historique })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ message: 'Erreur', error: error.message });
    return res.json({ message: 'Commande annulée', commande: mapCommande(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Supprimer une commande (Admin uniquement)
router.delete('/:id', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });

    const { error } = await supabase
      .from('commandes')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
    return res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

export default router;


