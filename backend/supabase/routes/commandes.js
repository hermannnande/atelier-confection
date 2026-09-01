import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCountry, ensureCountryAccess } from '../middleware/country.js';
import { mapCommande, mapUser } from '../map.js';
import smsService from '../../services/sms.service.js';
import customerSmsService, { CUSTOMER_SMS_EVENT_CODES } from '../../services/customer-sms.service.js';
import { parseOrderOrganizationColor } from '../../services/order-organization.service.js';
import {
  buildOrderStatistics,
  resolveStatisticsDateRange,
} from '../../services/order-statistics.service.js';

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

router.get('/', authenticate, resolveCountry, async (req, res) => {
  try {
    const { statut, urgence } = req.query;
    const supabase = getSupabaseAdmin();

    let q = supabase.from('commandes').select('*').eq('pays_code', req.country);

    // Filtres selon rôle
    if (req.user.role === 'appelant') {
      // Les appelants voient toutes les commandes en attente (pour traiter les appels)
      // Ne pas filtrer par appelant_id
    } else if (req.user.role === 'styliste') {
      q = q.in('statut', ['validee', 'en_decoupe', 'en_couture']);
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

router.post('/', authenticate, resolveCountry, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
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

    // Statut demandé : admin/gestionnaire = libre ; appelant = 'nouvelle' ou 'validee' uniquement
    let statutInitial = 'nouvelle';
    if (req.body.statut) {
      if (['administrateur', 'gestionnaire'].includes(req.user.role)) {
        statutInitial = req.body.statut;
      } else if (req.user.role === 'appelant' && ['nouvelle', 'validee'].includes(req.body.statut)) {
        statutInitial = req.body.statut;
      }
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
      pays_code: req.country, // Multi-pays : la commande est creee dans le pays actif
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

    try {
      await customerSmsService.sendCommandeNotification(
        CUSTOMER_SMS_EVENT_CODES.COMMANDE_RECUE,
        data,
        { userId: req.userId }
      );
    } catch (smsError) {
      console.error('Erreur SMS client commande reçue (non bloquant):', smsError.message);
    }

    if (data.statut === 'validee') {
      try {
        await customerSmsService.sendCommandeNotification(
          CUSTOMER_SMS_EVENT_CODES.COMMANDE_VALIDEE,
          data,
          { userId: req.userId }
        );
      } catch (smsError) {
        console.error('Erreur SMS client commande validée à la création (non bloquant):', smsError.message);
      }
    }

    return res.status(201).json({ message: 'Commande créée avec succès', commande });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
});

router.get('/:id', authenticate, resolveCountry, async (req, res) => {
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

router.patch('/:id/couleur-organisation', authenticate, resolveCountry, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    let couleur;
    try {
      couleur = parseOrderOrganizationColor(req.body.couleur);
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    if (!ensureCountryAccess(existing, req, res)) return;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('commandes')
      .update({
        couleur_organisation: couleur,
        couleur_organisation_statut: couleur ? existing.statut : null,
        couleur_organisation_par: couleur ? req.userId : null,
        couleur_organisation_at: couleur ? now : null,
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({
        message: 'Erreur lors de l’enregistrement de la couleur',
        error: error.message,
      });
    }

    const usersById = await hydrateUsersForCommandes(supabase, [data]);
    const commande = mapCommande(attachUsers(data, usersById));
    return res.json({
      message: couleur ? 'Couleur visible par tous enregistrée' : 'Couleur retirée',
      commande,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erreur lors de l’enregistrement de la couleur',
      error: error.message,
    });
  }
});

router.patch('/:id/note', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const noteValue = req.body.noteAppelant ?? req.body.note ?? '';
    if (typeof noteValue !== 'string') {
      return res.status(400).json({ message: 'La note doit être un texte' });
    }

    const note = noteValue.trim();
    if (note.length > 1000) {
      return res.status(400).json({ message: 'La note ne peut pas dépasser 1 000 caractères' });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    if (!ensureCountryAccess(existing, req, res)) return;

    const historique = Array.isArray(existing.historique) ? existing.historique : [];
    historique.push({
      action: note ? 'Note de commande modifiée' : 'Note de commande supprimée',
      statut: existing.statut,
      utilisateur: req.userId,
      date: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('commandes')
      .update({ note_appelant: note || null, historique })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Erreur lors de la modification de la note', error: error.message });
    }

    const usersById = await hydrateUsersForCommandes(supabase, [data]);
    const commande = mapCommande(attachUsers(data, usersById));
    return res.json({
      message: note ? 'Note enregistrée' : 'Note supprimée',
      commande,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la modification de la note', error: error.message });
  }
});

router.put('/:id', authenticate, resolveCountry, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(existing, req, res)) return;

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

    // 📱 Robustesse: si le statut a changé via PUT, déclencher le SMS correspondant
    // (certaines pages changent le statut via PUT et ne passent pas par les routes spécialisées).
    try {
      const statutAvant = existing.statut;
      const statutApres = data?.statut;

      if (statutApres && statutApres !== statutAvant) {
        const statutToTemplate = {
          en_couture: 'en_couture',
          en_stock: 'confectionnee', // couture terminée => mise en stock
        };

        const templateCode = statutToTemplate[statutApres];
        if (templateCode) {
          const autoSendEnabled = await smsService.isAutoSendEnabled(templateCode);
          if (autoSendEnabled) {
            const alreadySent = await smsService.hasAlreadySent(data.id, templateCode);
            if (!alreadySent) {
              await smsService.sendCommandeNotification(templateCode, data, req.userId);
            }
          }
        }
      }
    } catch (smsError) {
      console.error('⚠️ Erreur envoi SMS (PUT statut) non bloquant:', smsError.message);
    }

    try {
      if (data?.statut === 'validee' && existing.statut !== 'validee') {
        await customerSmsService.sendCommandeNotification(
          CUSTOMER_SMS_EVENT_CODES.COMMANDE_VALIDEE,
          data,
          { userId: req.userId }
        );
      }
    } catch (smsError) {
      console.error('Erreur SMS client validation via PUT (non bloquant):', smsError.message);
    }

    const usersById = await hydrateUsersForCommandes(supabase, [data]);
    const commande = mapCommande(attachUsers(data, usersById));
    return res.json({ message: 'Commande modifiée avec succès', commande });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });
  }
});

router.post('/:id/valider', authenticate, resolveCountry, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(existing, req, res)) return;

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

    try {
      await customerSmsService.sendCommandeNotification(
        CUSTOMER_SMS_EVENT_CODES.COMMANDE_VALIDEE,
        data,
        { userId: req.userId }
      );
    } catch (smsError) {
      console.error('Erreur SMS client commande validée (non bloquant):', smsError.message);
    }

    return res.json({ message: 'Commande validée avec succès', commande: mapCommande(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la validation', error: error.message });
  }
});

// 📱 Route : Mettre en attente de dépôt et envoyer SMS demande d'avance
router.post('/:id/attente-depot', authenticate, resolveCountry, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(existing, req, res)) return;

    const historique = Array.isArray(existing.historique) ? existing.historique : [];
    historique.push({
      action: 'Mise en attente de dépôt',
      statut: 'en_attente_paiement',
      utilisateur: req.userId,
      date: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('commandes')
      .update({ statut: 'en_attente_paiement', historique })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ message: 'Erreur lors de la mise en attente', error: error.message });

    // ℹ️ Pas d'envoi SMS ici: l'étape 2 est désormais déclenchée à la confirmation.

    return res.json({ message: 'Commande mise en attente de dépôt', commande: mapCommande(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la mise en attente', error: error.message });
  }
});

router.post('/:id/decoupe', authenticate, resolveCountry, authorize('styliste', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(existing, req, res)) return;

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

router.post('/:id/couture', authenticate, resolveCountry, authorize('styliste', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(existing, req, res)) return;

    const historique = Array.isArray(existing.historique) ? existing.historique : [];
    historique.push({
      action: 'Envoyé en couture',
      statut: 'en_couture',
      utilisateur: req.userId,
      date: new Date().toISOString(),
    });

    const update = {
      statut: 'en_couture',
      historique,
      styliste_id: existing.styliste_id ?? req.userId,
    };
    if (!existing.date_decoupe) {
      update.date_decoupe = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('commandes')
      .update(update)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ message: 'Erreur', error: error.message });

    // 📱 Envoyer SMS automatique "En cours de confection"
    try {
      const autoSendEnabled = await smsService.isAutoSendEnabled('en_couture');
      if (autoSendEnabled) {
        const alreadySent = await smsService.hasAlreadySent(data.id, 'en_couture');
        if (!alreadySent) {
          await smsService.sendCommandeNotification('en_couture', data, req.userId);
          console.log('✅ SMS "En cours de confection" envoyé');
        } else {
          console.log('ℹ️ SMS en_couture déjà envoyé, on évite le doublon');
        }
      }
    } catch (smsError) {
      console.error('⚠️ Erreur envoi SMS (non bloquant):', smsError.message);
    }

    return res.json({ message: 'Commande envoyée en couture', commande: mapCommande(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

router.post('/:id/terminer-couture', authenticate, resolveCountry, authorize('couturier', 'styliste', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(existing, req, res)) return;

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

    const commandeCountry = existing.pays_code || 'CI';
    const { data: stockItem } = await supabase
      .from('stock')
      .select('*')
      .eq('pays_code', commandeCountry)
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
        pays_code: commandeCountry,
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

    // 📱 Envoyer SMS automatique "Confection terminée"
    try {
      const autoSendEnabled = await smsService.isAutoSendEnabled('confectionnee');
      if (autoSendEnabled) {
        const alreadySent = await smsService.hasAlreadySent(updatedCommande.id, 'confectionnee');
        if (!alreadySent) {
          await smsService.sendCommandeNotification('confectionnee', updatedCommande, req.userId);
          console.log('✅ SMS "Confection terminée" envoyé');
        } else {
          console.log('ℹ️ SMS confectionnee déjà envoyé, on évite le doublon');
        }
      }
    } catch (smsError) {
      console.error('⚠️ Erreur envoi SMS (non bloquant):', smsError.message);
    }

    return res.json({ message: 'Commande terminée et ajoutée au stock', commande: mapCommande(updatedCommande) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// 📦 Marquer / démarquer un colis comme "emballé" (Préparation Colis)
// - Toggle simple : si emballe_at est NULL on le met, sinon on le retire.
// - N'altère JAMAIS le statut, livreur_id, ou tout autre champ métier.
// - Réservé aux gestionnaires et administrateurs.
router.post('/:id/emballe', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase
      .from('commandes')
      .select('id, pays_code, statut, emballe_at')
      .eq('id', req.params.id)
      .single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(existing, req, res)) return;

    const isEmballe = !!existing.emballe_at;
    const update = isEmballe
      ? { emballe_at: null, emballe_par_id: null }
      : { emballe_at: new Date().toISOString(), emballe_par_id: req.userId };

    const { data, error } = await supabase
      .from('commandes')
      .update(update)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ message: 'Erreur lors du marquage', error: error.message });

    return res.json({
      message: isEmballe ? 'Étiquette « emballé » retirée' : 'Colis marqué comme emballé',
      emballe: !isEmballe,
      commande: mapCommande(data),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors du marquage', error: error.message });
  }
});

router.post('/:id/annuler', authenticate, resolveCountry, authorize('appelant', 'gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(existing, req, res)) return;

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
router.delete('/:id', authenticate, resolveCountry, authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: e1 } = await supabase.from('commandes').select('*').eq('id', req.params.id).single();
    if (e1 || !existing) return res.status(404).json({ message: 'Commande non trouvée' });
    if (!ensureCountryAccess(existing, req, res)) return;

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

// ─── Statistiques avancées ───
router.get('/statistiques/analyse', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    let range;
    try {
      range = resolveStatisticsDateRange(req.query);
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const fields = 'id, modele, prix, statut, created_at, updated_at, date_livraison, historique';
    const fetchAllPages = async (createQuery) => {
      const rows = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await createQuery().range(from, from + pageSize - 1);
        if (error) throw error;
        const page = data || [];
        rows.push(...page);
        if (page.length < pageSize) break;
      }
      return rows;
    };

    const [receivedOrders, deliveredOrders, cancelledCandidates] = await Promise.all([
      fetchAllPages(() => supabase
        .from('commandes')
        .select(fields)
        .eq('pays_code', req.country)
        .gte('created_at', range.start.toISOString())
        .lt('created_at', range.endExclusive.toISOString())
        .order('created_at', { ascending: true })),
      fetchAllPages(() => supabase
        .from('commandes')
        .select(fields)
        .eq('pays_code', req.country)
        .gte('date_livraison', range.start.toISOString())
        .lt('date_livraison', range.endExclusive.toISOString())
        .order('date_livraison', { ascending: true })),
      fetchAllPages(() => supabase
        .from('commandes')
        .select(fields)
        .eq('pays_code', req.country)
        .eq('statut', 'annulee')
        .order('updated_at', { ascending: true })),
    ]);

    const statistics = buildOrderStatistics({
      receivedOrders,
      deliveredOrders,
      cancelledCandidates,
      range,
    });

    return res.json({
      periode: {
        dateDebut: range.dateDebut,
        dateFin: range.dateFin,
        nombreJours: range.nombreJours,
        fuseauHoraire: 'Africa/Abidjan',
      },
      totalCommandes: statistics.recues,
      chiffreAffaires: statistics.chiffreAffairesLivre,
      ...statistics,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur statistiques', error: error.message });
  }
});

export default router;


