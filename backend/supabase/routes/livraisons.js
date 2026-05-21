import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCountry, ensureCountryAccess } from '../middleware/country.js';
import { mapCommande, mapLivraison, mapUser } from '../map.js';
import smsService from '../../services/sms.service.js';

const router = express.Router();

// 🔧 Paginer les .in() pour éviter de dépasser la limite Supabase/PostgREST
// (longueur d'URL ~8KB → ~200 UUID max par requête en pratique)
async function fetchInChunks(supabase, table, ids, select = '*') {
  if (!ids || ids.length === 0) return [];
  const CHUNK = 150; // marge confortable sous la limite d'URL
  const results = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase.from(table).select(select).in('id', slice);
    if (error) {
      console.error(`[hydrate] ${table} chunk ${i}-${i + slice.length}:`, error.message);
      continue;
    }
    if (Array.isArray(data) && data.length) results.push(...data);
  }
  return results;
}

async function hydrateLivraisons(supabase, livRows) {
  const commandeIds = Array.from(new Set(livRows.map((l) => l.commande_id).filter(Boolean)));
  const userIds = new Set();
  for (const l of livRows) {
    if (l.livreur_id) userIds.add(l.livreur_id);
    if (l.gestionnaire_id) userIds.add(l.gestionnaire_id);
  }

  const commandesRows = await fetchInChunks(supabase, 'commandes', commandeIds, '*');
  const commandesById = new Map(commandesRows.map((c) => [c.id, mapCommande(c)]));

  for (const c of commandesById.values()) {
    if (c.appelant_id) userIds.add(c.appelant_id);
    if (c.styliste_id) userIds.add(c.styliste_id);
    if (c.couturier_id) userIds.add(c.couturier_id);
    if (c.livreur_id) userIds.add(c.livreur_id);
  }

  const usersRows = await fetchInChunks(
    supabase,
    'users',
    Array.from(userIds),
    'id, nom, email, role, telephone, actif, created_at, updated_at'
  );
  const usersById = new Map(usersRows.map((u) => [u.id, mapUser(u)]));

  return livRows.map((l) => {
    const commande = commandesById.get(l.commande_id);
    const livreur = l.livreur_id ? usersById.get(l.livreur_id) : undefined;
    const gestionnaire = l.gestionnaire_id ? usersById.get(l.gestionnaire_id) : undefined;
    return mapLivraison({ ...l, commande, livreur, gestionnaire });
  });
}

router.get('/', authenticate, resolveCountry, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    let q = supabase
      .from('livraisons')
      .select('*')
      .eq('pays_code', req.country)
      .order('date_assignation', { ascending: false });
    if (req.user.role === 'livreur') q = q.eq('livreur_id', req.userId);

    const { data, error } = await q;
    if (error) return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });

    const livraisons = await hydrateLivraisons(supabase, data || []);
    return res.json({ livraisons });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

router.post('/assigner', authenticate, resolveCountry, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { commandeId, livreurId, instructions } = req.body;
    const supabase = getSupabaseAdmin();

    const { data: commande, error: e1 } = await supabase.from('commandes').select('*').eq('id', commandeId).single();
    if (e1 || !commande) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(commande, req, res)) return;
    if (commande.statut !== 'en_stock') {
      return res.status(400).json({ message: 'La commande doit être en stock pour être assignée à un livreur' });
    }

    if (commande.livreur_id) {
      return res.status(400).json({ message: 'Cette commande est déjà assignée à un livreur' });
    }

    const { data: livraisonExistante } = await supabase
      .from('livraisons')
      .select('id, statut')
      .eq('commande_id', commandeId)
      .in('statut', ['assignee', 'en_cours', 'reportee'])
      .maybeSingle();

    if (livraisonExistante) {
      return res.status(400).json({ message: 'Cette commande a déjà une livraison en cours' });
    }

    const commandeCountry = commande.pays_code || 'CI';

    // Vérifier le stock dans le pays de la commande (optionnel, ne bloque pas)
    const { data: stockItem, error: e2 } = await supabase
      .from('stock')
      .select('*')
      .eq('pays_code', commandeCountry)
      .eq('modele', commande.modele?.nom)
      .eq('taille', commande.taille)
      .eq('couleur', commande.couleur)
      .maybeSingle();

    // Créer livraison (même si stock vide)
    const nowIso = new Date().toISOString();
    const { data: livraison, error: e3 } = await supabase
      .from('livraisons')
      .insert({
        pays_code: commandeCountry,
        commande_id: commandeId,
        livreur_id: livreurId,
        statut: 'en_cours',
        adresse_livraison: { ville: commande.client?.ville, details: '' },
        instructions: instructions || commande.note_appelant,
        date_assignation: nowIso,
        date_tournee: nowIso, // sera aussi mis par le trigger BD, mais on l'écrit explicitement pour la clarté
      })
      .select('*')
      .single();
    if (e3) return res.status(500).json({ message: "Erreur lors de l'assignation", error: e3.message });

    // Mettre à jour commande
    const historique = Array.isArray(commande.historique) ? commande.historique : [];
    historique.push({
      action: 'Assigné au livreur',
      statut: 'en_livraison',
      utilisateur: req.userId,
      date: new Date().toISOString(),
    });

    const { error: e4 } = await supabase
      .from('commandes')
      .update({ statut: 'en_livraison', livreur_id: livreurId, historique })
      .eq('id', commandeId);
    if (e4) {
      // Annuler la livraison créée si la commande n'a pas pu être mise à jour
      await supabase.from('livraisons').delete().eq('id', livraison.id);
      return res.status(500).json({ message: "Erreur lors de l'assignation", error: e4.message });
    }

    // Transférer stock principal -> en livraison (SI disponible)
    if (stockItem && (stockItem.quantite_principale || 0) >= 1) {
      const mouvements = Array.isArray(stockItem.mouvements) ? stockItem.mouvements : [];
      mouvements.push({
        type: 'transfert',
        quantite: 1,
        source: 'Stock principal',
        destination: 'Stock en livraison',
        commande: commandeId,
        utilisateur: req.userId,
        date: new Date().toISOString(),
        commentaire: 'Assignation au livreur',
      });

      const { error: e5 } = await supabase
        .from('stock')
        .update({
          quantite_principale: (stockItem.quantite_principale || 0) - 1,
          quantite_en_livraison: (stockItem.quantite_en_livraison || 0) + 1,
          mouvements,
        })
        .eq('id', stockItem.id);
      if (e5) return res.status(500).json({ message: "Erreur lors de l'assignation", error: e5.message });
    }

    // 📱 Envoyer SMS automatique "Livraison dans 24h"
    try {
      const autoSendEnabled = await smsService.isAutoSendEnabled('en_livraison');
      if (autoSendEnabled) {
        // Récupérer la commande mise à jour
        const { data: updatedCommande } = await supabase
          .from('commandes')
          .select('*')
          .eq('id', commandeId)
          .single();
        
        if (updatedCommande) {
          await smsService.sendCommandeNotification('en_livraison', updatedCommande, req.userId);
          console.log('✅ SMS "Livraison dans 24h" envoyé');
        }
      }
    } catch (smsError) {
      console.error('⚠️ Erreur envoi SMS (non bloquant):', smsError.message);
    }

    return res.status(201).json({ message: 'Livraison assignée avec succès', livraison: mapLivraison(livraison) });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de l'assignation", error: error.message });
  }
});

// Supprimer une livraison (notamment les orphelines : commande_id pointe vers une commande inexistante)
router.delete('/:id', authenticate, resolveCountry, authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: livraison, error: e1 } = await supabase
      .from('livraisons')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (e1 || !livraison) return res.status(404).json({ message: 'Livraison non trouvée' });
    if (!ensureCountryAccess(livraison, req, res)) return;

    const { error: e2 } = await supabase.from('livraisons').delete().eq('id', req.params.id);
    if (e2) return res.status(500).json({ message: 'Erreur lors de la suppression', error: e2.message });

    return res.json({ message: 'Livraison supprimée', livraisonId: req.params.id });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Mettre à jour une livraison (pour paiement, etc.)
router.put('/:id', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: livraison, error: e1 } = await supabase.from('livraisons').select('*').eq('id', req.params.id).single();
    
    if (e1) {
      console.error('Erreur recherche livraison:', e1);
      return res.status(404).json({ message: 'Livraison non trouvée', error: e1.message });
    }
    
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée - aucune donnée' });
    }
    if (!ensureCountryAccess(livraison, req, res)) return;

    // Autoriser la mise à jour de certains champs seulement
    const updates = {};
    const allowedUpdates = ['paiement_recu', 'date_paiement', 'commentaire_gestionnaire', 'verifie_par_gestionnaire'];
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Aucun champ valide à mettre à jour' });
    }

    const { data: updated, error: e2 } = await supabase.from('livraisons').update(updates).eq('id', req.params.id).select().single();
    
    if (e2) {
      console.error('Erreur mise à jour:', e2);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour', error: e2.message });
    }

    return res.json({ message: 'Livraison mise à jour', livraison: mapLivraison(updated) });
  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
});

router.post('/:id/livree', authenticate, resolveCountry, authorize('livreur', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: livraison, error: e1 } = await supabase.from('livraisons').select('*').eq('id', req.params.id).single();
    if (e1 || !livraison) return res.status(404).json({ message: 'Livraison non trouvée' });
    if (!ensureCountryAccess(livraison, req, res)) return;
    const livraisonCountry = livraison.pays_code || 'CI';

    await supabase.from('livraisons').update({ statut: 'livree', date_livraison: new Date().toISOString() }).eq('id', req.params.id);

    const { data: commande } = await supabase.from('commandes').select('*').eq('id', livraison.commande_id).single();
    if (commande) {
      const historique = Array.isArray(commande.historique) ? commande.historique : [];
      historique.push({
        action: 'Livraison effectuée',
        statut: 'livree',
        utilisateur: req.userId,
        date: new Date().toISOString(),
      });

      await supabase
        .from('commandes')
        .update({ statut: 'livree', date_livraison: new Date().toISOString(), historique })
        .eq('id', livraison.commande_id);

      // réduire stock en livraison (dans le pays de la livraison)
      const { data: stockItem } = await supabase
        .from('stock')
        .select('*')
        .eq('pays_code', livraisonCountry)
        .eq('modele', commande.modele?.nom)
        .eq('taille', commande.taille)
        .eq('couleur', commande.couleur)
        .maybeSingle();

      if (stockItem) {
        const mouvements = Array.isArray(stockItem.mouvements) ? stockItem.mouvements : [];
        mouvements.push({
          type: 'sortie',
          quantite: 1,
          source: 'Stock en livraison',
          destination: 'Client',
          commande: commande.id,
          utilisateur: req.userId,
          date: new Date().toISOString(),
          commentaire: 'Livraison réussie',
        });

        await supabase
          .from('stock')
          .update({ quantite_en_livraison: (stockItem.quantite_en_livraison || 0) - 1, mouvements })
          .eq('id', stockItem.id);
      }
    }

    return res.json({ message: 'Livraison confirmée', livraison: mapLivraison(livraison) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

router.post('/:id/refusee', authenticate, resolveCountry, authorize('livreur', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { motifRefus } = req.body;
    const supabase = getSupabaseAdmin();
    const { data: livraison, error: e1 } = await supabase.from('livraisons').select('*').eq('id', req.params.id).single();
    if (e1 || !livraison) return res.status(404).json({ message: 'Livraison non trouvée' });
    if (!ensureCountryAccess(livraison, req, res)) return;
    const livraisonCountry = livraison.pays_code || 'CI';

    // Marquer la livraison comme retournée directement (retour stock automatique)
    await supabase
      .from('livraisons')
      .update({
        statut: 'retournee',
        motif_refus: motifRefus,
        date_livraison: new Date().toISOString(),
        date_retour: new Date().toISOString(),
        verifie_par_gestionnaire: true,
        gestionnaire_id: req.userId,
        commentaire_gestionnaire: 'Retour automatique au stock après refus',
      })
      .eq('id', req.params.id);

    const { data: commande } = await supabase.from('commandes').select('*').eq('id', livraison.commande_id).single();
    if (commande) {
      const historique = Array.isArray(commande.historique) ? commande.historique : [];
      historique.push({
        action: 'Livraison refusée par le client (retour stock automatique)',
        statut: 'refusee',
        utilisateur: req.userId,
        date: new Date().toISOString(),
        commentaire: motifRefus,
      });

      await supabase
        .from('commandes')
        .update({ statut: 'refusee', motif_refus: motifRefus, historique })
        .eq('id', commande.id);

      // Retour automatique au stock principal
      const { data: stockItem } = await supabase
        .from('stock')
        .select('*')
        .eq('pays_code', livraisonCountry)
        .eq('modele', commande.modele?.nom)
        .eq('taille', commande.taille)
        .eq('couleur', commande.couleur)
        .maybeSingle();

      if (stockItem) {
        const mouvements = Array.isArray(stockItem.mouvements) ? stockItem.mouvements : [];
        mouvements.push({
          type: 'retour',
          quantite: 1,
          source: 'Stock en livraison',
          destination: 'Stock principal',
          commande: commande.id,
          utilisateur: req.userId,
          date: new Date().toISOString(),
          commentaire: `Retour automatique après refus: ${motifRefus || 'sans motif'}`,
        });

        await supabase
          .from('stock')
          .update({
            quantite_en_livraison: Math.max(0, (stockItem.quantite_en_livraison || 0) - 1),
            quantite_principale: (stockItem.quantite_principale || 0) + 1,
            mouvements,
          })
          .eq('id', stockItem.id);
      }
    }

    return res.json({ message: 'Refus enregistré et stock mis à jour', livraison: mapLivraison(livraison) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Reporter une livraison au lendemain : le colis reste avec le livreur, pas de retour au stock
router.post('/:id/reportee', authenticate, resolveCountry, authorize('livreur', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { motifReport } = req.body;
    const supabase = getSupabaseAdmin();
    const { data: livraison, error: e1 } = await supabase
      .from('livraisons')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (e1 || !livraison) return res.status(404).json({ message: 'Livraison non trouvée' });
    if (!ensureCountryAccess(livraison, req, res)) return;

    const { data: updated, error: e2 } = await supabase
      .from('livraisons')
      .update({
        statut: 'reportee',
        commentaire_gestionnaire: motifReport || null,
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (e2) return res.status(500).json({ message: 'Erreur lors du report', error: e2.message });

    // Historique sur la commande (statut commande reste en_livraison)
    const { data: commande } = await supabase
      .from('commandes')
      .select('historique')
      .eq('id', livraison.commande_id)
      .single();
    if (commande) {
      const historique = Array.isArray(commande.historique) ? commande.historique : [];
      historique.push({
        action: 'Livraison reportée au lendemain',
        statut: 'reportee',
        utilisateur: req.userId,
        date: new Date().toISOString(),
        commentaire: motifReport || null,
      });
      await supabase.from('commandes').update({ historique }).eq('id', livraison.commande_id);
    }

    return res.json({ message: 'Livraison reportée', livraison: mapLivraison(updated) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Remettre une livraison "reportee" en cours (livreur reprend sa tournée le lendemain)
// → date_tournee est mise à NOW() pour que le colis bascule dans la carte du jour courant
router.post('/:id/reprendre', authenticate, resolveCountry, authorize('livreur', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: livraison, error: e1 } = await supabase
      .from('livraisons')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (e1 || !livraison) return res.status(404).json({ message: 'Livraison non trouvée' });
    if (!ensureCountryAccess(livraison, req, res)) return;
    if (livraison.statut !== 'reportee') {
      return res.status(400).json({ message: 'Seules les livraisons reportées peuvent être reprises' });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: e2 } = await supabase
      .from('livraisons')
      .update({
        statut: 'en_cours',
        date_tournee: nowIso, // bascule dans la carte du jour courant
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (e2) return res.status(500).json({ message: 'Erreur lors de la reprise', error: e2.message });

    // Trace dans l'historique commande
    try {
      const { data: cmd } = await supabase
        .from('commandes')
        .select('historique')
        .eq('id', livraison.commande_id)
        .single();
      if (cmd) {
        const historique = Array.isArray(cmd.historique) ? cmd.historique : [];
        historique.push({
          action: 'Livraison reprise (nouvelle tournée)',
          statut: 'en_cours',
          utilisateur: req.userId,
          date: nowIso,
        });
        await supabase.from('commandes').update({ historique }).eq('id', livraison.commande_id);
      }
    } catch {}

    return res.json({ message: 'Livraison reprise', livraison: mapLivraison(updated) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

router.post('/:id/confirmer-retour', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { commentaire } = req.body;
    const supabase = getSupabaseAdmin();
    const { data: livraison, error: e1 } = await supabase.from('livraisons').select('*').eq('id', req.params.id).single();
    if (e1 || !livraison) return res.status(404).json({ message: 'Livraison non trouvée' });
    if (!ensureCountryAccess(livraison, req, res)) return;
    if (livraison.statut !== 'refusee') return res.status(400).json({ message: 'Seules les livraisons refusées peuvent être retournées' });
    const livraisonCountry = livraison.pays_code || 'CI';

    const { data: commande } = await supabase.from('commandes').select('*').eq('id', livraison.commande_id).single();

    await supabase
      .from('livraisons')
      .update({
        statut: 'retournee',
        date_retour: new Date().toISOString(),
        verifie_par_gestionnaire: true,
        gestionnaire_id: req.userId,
        commentaire_gestionnaire: commentaire,
      })
      .eq('id', req.params.id);

    if (commande) {
      const { data: stockItem } = await supabase
        .from('stock')
        .select('*')
        .eq('pays_code', livraisonCountry)
        .eq('modele', commande.modele?.nom)
        .eq('taille', commande.taille)
        .eq('couleur', commande.couleur)
        .maybeSingle();

      if (stockItem) {
        const mouvements = Array.isArray(stockItem.mouvements) ? stockItem.mouvements : [];
        mouvements.push({
          type: 'retour',
          quantite: 1,
          source: 'Stock en livraison',
          destination: 'Stock principal',
          commande: commande.id,
          utilisateur: req.userId,
          date: new Date().toISOString(),
          commentaire: `Retour après refus: ${commentaire || 'Aucun commentaire'}`,
        });

        await supabase
          .from('stock')
          .update({
            quantite_en_livraison: (stockItem.quantite_en_livraison || 0) - 1,
            quantite_principale: (stockItem.quantite_principale || 0) + 1,
            mouvements,
          })
          .eq('id', stockItem.id);
      }
    }

    return res.json({ message: 'Retour confirmé et stock mis à jour', livraison: mapLivraison(livraison) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Marquer l'argent comme reçu sur une sélection de livraisons (dépôt partiel)
router.post('/marquer-paiement-recu-batch', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { livraisonIds } = req.body;

    if (!Array.isArray(livraisonIds) || livraisonIds.length === 0) {
      return res.status(400).json({ message: 'livraisonIds doit être un tableau non vide' });
    }

    // Vérifier que toutes les livraisons appartiennent au pays actif, sont livrées et non payées
    const { data: livraisons, error: selectError } = await supabase
      .from('livraisons')
      .select('id, commande_id, livreur_id, pays_code, statut, paiement_recu')
      .in('id', livraisonIds)
      .eq('pays_code', req.country);

    if (selectError) {
      return res.status(500).json({ message: 'Erreur lors de la récupération', error: selectError.message });
    }

    const eligibles = (livraisons || []).filter(
      (l) => l.statut === 'livree' && l.paiement_recu === false
    );

    if (eligibles.length === 0) {
      return res.status(400).json({ message: 'Aucune livraison éligible (doit être livrée et non payée)' });
    }

    const idsEligibles = eligibles.map((l) => l.id);

    // Calculer le montant total à partir des commandes
    const commandeIds = eligibles.map((l) => l.commande_id);
    const { data: commandes } = await supabase
      .from('commandes')
      .select('id, prix')
      .in('id', commandeIds);

    const montantTotal = (commandes || []).reduce((sum, c) => sum + (c.prix || 0), 0);

    // Marquer comme payées
    const { error: updateError } = await supabase
      .from('livraisons')
      .update({
        paiement_recu: true,
        date_paiement: new Date().toISOString(),
        gestionnaire_id: req.userId,
      })
      .in('id', idsEligibles);

    if (updateError) {
      return res.status(500).json({ message: 'Erreur lors de la mise à jour', error: updateError.message });
    }

    return res.json({
      message: 'Paiements enregistrés',
      nombreLivraisons: idsEligibles.length,
      montantTotal,
      livraisonIds: idsEligibles,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Marquer l'argent comme remis pour un livreur (legacy : tout en bloc)
router.post('/livreur/:livreurId/marquer-paiement-recu', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { livreurId } = req.params;
    
    // Trouver toutes les livraisons livrées (du pays actif) du livreur qui n'ont pas encore eu leur paiement reçu
    const { data: livraisons, error: selectError } = await supabase
      .from('livraisons')
      .select('id, commande_id')
      .eq('pays_code', req.country)
      .eq('livreur_id', livreurId)
      .eq('statut', 'livree')
      .eq('paiement_recu', false);

    if (selectError) {
      return res.status(500).json({ message: 'Erreur lors de la récupération', error: selectError.message });
    }

    if (!livraisons || livraisons.length === 0) {
      return res.status(404).json({ message: 'Aucune livraison à marquer comme payée' });
    }

    // Récupérer les commandes pour calculer le montant total
    const commandeIds = livraisons.map(l => l.commande_id);
    const { data: commandes } = await supabase
      .from('commandes')
      .select('prix')
      .in('id', commandeIds);

    const montantTotal = commandes ? commandes.reduce((sum, c) => sum + (c.prix || 0), 0) : 0;

    // Marquer toutes ces livraisons (du pays actif) comme payées
    const { error: updateError } = await supabase
      .from('livraisons')
      .update({
        paiement_recu: true,
        date_paiement: new Date().toISOString()
      })
      .eq('pays_code', req.country)
      .eq('livreur_id', livreurId)
      .eq('statut', 'livree')
      .eq('paiement_recu', false);

    if (updateError) {
      return res.status(500).json({ message: 'Erreur lors de la mise à jour', error: updateError.message });
    }

    return res.json({ 
      message: 'Paiement marqué comme reçu', 
      nombreLivraisons: livraisons.length,
      montantTotal
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

export default router;



