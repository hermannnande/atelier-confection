import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCountry } from '../middleware/country.js';
import {
  calculateAdminRemunerationAlerts,
  calculateProductionBonusAllocations,
  calculateRemunerationSummary,
  normalizeDateKey,
  parseMoney,
  validateProductionIds,
  validateProductionItems,
} from '../../services/remuneration.service.js';

const router = express.Router();

router.use(authenticate, resolveCountry);

// Le système de rémunération est volontairement limité à la Côte d'Ivoire.
// Cette vérification serveur reste obligatoire même si le menu est masqué côté client.
router.use((req, res, next) => {
  if (req.country !== 'CI') {
    return res.status(403).json({
      message: 'La rémunération des couturiers est disponible uniquement en Côte d’Ivoire',
    });
  }
  return next();
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCouturier(req) {
  return req.user?.role === 'couturier';
}

function mapTarif(modele, tarif) {
  return {
    id: tarif?.id || null,
    modeleId: modele.id,
    nom: modele.nom,
    image: modele.image,
    categorie: modele.categorie,
    montantUnitaire: tarif ? Number(tarif.montant_unitaire || 0) : null,
    actif: tarif?.actif ?? false,
    configured: Boolean(tarif),
  };
}

function safeNote(value, maxLength = 500) {
  if (value === undefined || value === null) return null;
  const note = String(value).trim();
  return note ? note.slice(0, maxLength) : null;
}

async function getFinancialRows(supabase, country, couturierId) {
  const [productionsResult, paymentsResult] = await Promise.all([
    supabase
      .from('productions_couturiers')
      .select('id, date_production, quantite, tarif_unitaire, quantite_bonus, bonus_unitaire, montant_bonus, montant_total, statut, motif_refus, created_at, validee_at, modele:modeles(id, nom, image, categorie)')
      .eq('pays_code', country)
      .eq('couturier_id', couturierId)
      .order('date_production', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('paiements_couturiers')
      .select('id, montant, statut, note_couturier, note_admin, created_at, traitee_at')
      .eq('pays_code', country)
      .eq('couturier_id', couturierId)
      .order('created_at', { ascending: false }),
  ]);

  if (productionsResult.error) throw productionsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  return {
    productions: productionsResult.data || [],
    paiements: paymentsResult.data || [],
  };
}

// Catalogue commun avec tarif propre à chaque pays.
router.get('/tarifs', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const [modelesResult, tarifsResult] = await Promise.all([
      supabase
        .from('modeles')
        .select('id, nom, image, categorie, actif')
        .eq('actif', true)
        .order('nom', { ascending: true }),
      supabase
        .from('tarifs_confection')
        .select('id, modele_id, montant_unitaire, actif')
        .eq('pays_code', req.country),
    ]);

    if (modelesResult.error || tarifsResult.error) {
      const error = modelesResult.error || tarifsResult.error;
      return res.status(500).json({ message: 'Impossible de charger les tarifs', error: error.message });
    }

    const tarifByModele = new Map((tarifsResult.data || []).map((item) => [item.modele_id, item]));
    const tarifs = (modelesResult.data || []).map((modele) => mapTarif(modele, tarifByModele.get(modele.id)));
    return res.json({ tarifs });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de charger les tarifs', error: error.message });
  }
});

router.put('/tarifs/:modeleId', authorize('administrateur'), async (req, res) => {
  try {
    const modeleId = String(req.params.modeleId || '');
    if (!uuidPattern.test(modeleId)) {
      return res.status(400).json({ message: 'Modèle invalide' });
    }

    let montantUnitaire;
    try {
      montantUnitaire = parseMoney(req.body.montantUnitaire, { allowZero: true });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const supabase = getSupabaseAdmin();
    const { data: modele, error: modeleError } = await supabase
      .from('modeles')
      .select('id, nom, image, categorie, actif')
      .eq('id', modeleId)
      .single();
    if (modeleError || !modele) return res.status(404).json({ message: 'Modèle introuvable' });

    const { data, error } = await supabase
      .from('tarifs_confection')
      .upsert({
        pays_code: req.country,
        modele_id: modeleId,
        montant_unitaire: montantUnitaire,
        actif: req.body.actif !== false,
        created_by: req.userId,
      }, { onConflict: 'pays_code,modele_id' })
      .select('id, modele_id, montant_unitaire, actif')
      .single();

    if (error) return res.status(500).json({ message: 'Impossible d’enregistrer le tarif', error: error.message });
    return res.json({ message: 'Tarif enregistré', tarif: mapTarif(modele, data) });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible d’enregistrer le tarif', error: error.message });
  }
});

router.get('/me/resume', authorize('couturier'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const rows = await getFinancialRows(supabase, req.country, req.userId);
    const today = normalizeDateKey(req.query.today);
    return res.json({
      resume: calculateRemunerationSummary({ ...rows, today }),
      productions: rows.productions.slice(0, 100),
      paiements: rows.paiements.slice(0, 100),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de charger vos gains', error: error.message });
  }
});

router.get('/me/productions', authorize('couturier'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('productions_couturiers')
      .select('id, date_production, quantite, tarif_unitaire, quantite_bonus, bonus_unitaire, montant_bonus, montant_total, statut, motif_refus, created_at, validee_at, modele:modeles(id, nom, image, categorie)')
      .eq('pays_code', req.country)
      .eq('couturier_id', req.userId)
      .order('date_production', { ascending: false })
      .order('created_at', { ascending: false });
    if (req.query.from) query = query.gte('date_production', normalizeDateKey(req.query.from));
    if (req.query.to) query = query.lte('date_production', normalizeDateKey(req.query.to));
    const { data, error } = await query.limit(500);
    if (error) return res.status(500).json({ message: 'Impossible de charger les productions', error: error.message });
    return res.json({ productions: data || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de charger les productions', error: error.message });
  }
});

router.post('/me/productions', authorize('couturier'), async (req, res) => {
  try {
    let items;
    try {
      items = validateProductionItems(req.body.items);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const rawDate = String(req.body.dateProduction || '');
    const dateProduction = normalizeDateKey(rawDate);
    if (rawDate && dateProduction !== rawDate) {
      return res.status(400).json({ message: 'Date de production invalide' });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (dateProduction > today) {
      return res.status(400).json({ message: 'La production ne peut pas être saisie dans le futur' });
    }

    const supabase = getSupabaseAdmin();
    const modeleIds = items.map((item) => item.modeleId);
    const { data: tarifs, error: tarifsError } = await supabase
      .from('tarifs_confection')
      .select('modele_id, montant_unitaire, actif')
      .eq('pays_code', req.country)
      .eq('actif', true)
      .in('modele_id', modeleIds);
    if (tarifsError) return res.status(500).json({ message: 'Impossible de vérifier les tarifs', error: tarifsError.message });

    const tarifMap = new Map((tarifs || []).map((tarif) => [tarif.modele_id, tarif]));
    const missing = modeleIds.filter((id) => !tarifMap.has(id));
    if (missing.length > 0) {
      return res.status(400).json({ message: 'Un tarif actif doit être défini pour chaque tenue sélectionnée' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('productions_couturiers')
      .select('modele_id, quantite, tarif_unitaire, statut')
      .eq('pays_code', req.country)
      .eq('couturier_id', req.userId)
      .eq('date_production', dateProduction)
      .in('statut', ['en_attente', 'validee']);
    if (existingError) return res.status(500).json({ message: 'Impossible de vérifier la déclaration', error: existingError.message });
    if ((existing || []).some((item) => modeleIds.includes(item.modele_id))) {
      return res.status(409).json({ message: 'Une tenue sélectionnée a déjà été déclarée pour cette journée' });
    }

    const itemsWithBonus = calculateProductionBonusAllocations({
      items,
      tarifByModele: tarifMap,
      existingProductions: existing || [],
    });
    const rows = itemsWithBonus.map((item) => ({
      pays_code: req.country,
      couturier_id: req.userId,
      modele_id: item.modeleId,
      date_production: dateProduction,
      quantite: item.quantite,
      tarif_unitaire: Number(tarifMap.get(item.modeleId).montant_unitaire),
      quantite_bonus: item.quantiteBonus,
      bonus_unitaire: item.bonusUnitaire,
      statut: 'en_attente',
    }));
    const { data, error } = await supabase
      .from('productions_couturiers')
      .insert(rows)
      .select('id, date_production, quantite, tarif_unitaire, quantite_bonus, bonus_unitaire, montant_bonus, montant_total, statut, created_at, modele:modeles(id, nom, image, categorie)');
    if (error) {
      const duplicate = error.code === '23505';
      return res.status(duplicate ? 409 : 500).json({
        message: duplicate ? 'Cette production a déjà été déclarée' : 'Impossible d’enregistrer la production',
        error: error.message,
      });
    }
    return res.status(201).json({ message: 'Production envoyée pour validation', productions: data || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible d’enregistrer la production', error: error.message });
  }
});

router.post('/me/paiements', authorize('couturier'), async (req, res) => {
  try {
    let montant;
    try {
      montant = parseMoney(req.body.montant);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('demander_paiement_couturier', {
      p_couturier_id: req.userId,
      p_pays_code: req.country,
      p_montant: montant,
      p_note: safeNote(req.body.note),
    });
    if (error) return res.status(400).json({ message: error.message });
    const paiement = Array.isArray(data) ? data[0] : data;
    return res.status(201).json({ message: 'Demande de paiement envoyée à l’administrateur', paiement });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de demander le paiement', error: error.message });
  }
});

router.get('/admin/resume', authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const [usersResult, productionsResult, paymentsResult] = await Promise.all([
      supabase
        .from('users')
        .select('id, nom, email, telephone, actif')
        .eq('pays_code', req.country)
        .eq('role', 'couturier')
        .order('nom', { ascending: true }),
      supabase.from('productions_couturiers').select('*').eq('pays_code', req.country),
      supabase.from('paiements_couturiers').select('*').eq('pays_code', req.country),
    ]);
    const error = usersResult.error || productionsResult.error || paymentsResult.error;
    if (error) return res.status(500).json({ message: 'Impossible de charger les rémunérations', error: error.message });

    const today = normalizeDateKey(req.query.today);
    const productions = productionsResult.data || [];
    const paiements = paymentsResult.data || [];
    const couturiers = (usersResult.data || []).map((couturier) => ({
      ...couturier,
      resume: calculateRemunerationSummary({
        today,
        productions: productions.filter((item) => item.couturier_id === couturier.id),
        paiements: paiements.filter((item) => item.couturier_id === couturier.id),
      }),
    }));
    return res.json({ couturiers });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de charger les rémunérations', error: error.message });
  }
});

router.get('/admin/alertes', authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const [productionsResult, paiementsResult] = await Promise.all([
      supabase
        .from('productions_couturiers')
        .select('quantite, montant_total, montant_bonus, statut')
        .eq('pays_code', req.country)
        .eq('statut', 'en_attente'),
      supabase
        .from('paiements_couturiers')
        .select('montant, statut')
        .eq('pays_code', req.country)
        .eq('statut', 'en_attente'),
    ]);
    const error = productionsResult.error || paiementsResult.error;
    if (error) return res.status(500).json({ message: 'Impossible de charger les alertes', error: error.message });

    return res.json(calculateAdminRemunerationAlerts({
      productions: productionsResult.data || [],
      paiements: paiementsResult.data || [],
    }));
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de charger les alertes', error: error.message });
  }
});

router.get('/admin/productions', authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('productions_couturiers')
      .select('id, date_production, quantite, tarif_unitaire, quantite_bonus, bonus_unitaire, montant_bonus, montant_total, statut, motif_refus, created_at, validee_at, couturier:users!productions_couturiers_couturier_id_fkey(id, nom, telephone), modele:modeles(id, nom, image, categorie)')
      .eq('pays_code', req.country)
      .order('created_at', { ascending: false });
    if (req.query.statut) query = query.eq('statut', req.query.statut);
    const { data, error } = await query.limit(500);
    if (error) return res.status(500).json({ message: 'Impossible de charger les productions', error: error.message });
    return res.json({ productions: data || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de charger les productions', error: error.message });
  }
});

router.patch('/admin/productions/groupe', authorize('administrateur'), async (req, res) => {
  try {
    const action = req.body.action;
    if (!['valider', 'refuser'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide' });
    }

    let ids;
    try {
      ids = validateProductionIds(req.body.ids);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const motif = safeNote(req.body.motif);
    if (action === 'refuser' && (!motif || motif.length < 3)) {
      return res.status(400).json({ message: 'Précisez le motif du refus' });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from('productions_couturiers')
      .select('id, pays_code, statut')
      .in('id', ids);
    if (existingError) return res.status(500).json({ message: 'Impossible de vérifier les productions', error: existingError.message });
    if ((existing || []).length !== ids.length) return res.status(404).json({ message: 'Une production est introuvable' });
    if (existing.some((item) => item.pays_code !== req.country)) return res.status(403).json({ message: 'Accès refusé pour ce pays' });
    if (existing.some((item) => item.statut !== 'en_attente')) return res.status(409).json({ message: 'Une production a déjà été traitée' });

    const { data, error } = await supabase
      .from('productions_couturiers')
      .update({
        statut: action === 'valider' ? 'validee' : 'refusee',
        motif_refus: action === 'refuser' ? motif : null,
        validee_par: req.userId,
        validee_at: new Date().toISOString(),
      })
      .in('id', ids)
      .eq('pays_code', req.country)
      .eq('statut', 'en_attente')
      .select('*');
    if (error || (data || []).length !== ids.length) {
      return res.status(409).json({ message: 'Une production a déjà été traitée', error: error?.message });
    }

    return res.json({
      message: action === 'valider' ? 'Productions validées' : 'Productions refusées',
      productions: data,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de traiter les productions', error: error.message });
  }
});

router.patch('/admin/productions/:id', authorize('administrateur'), async (req, res) => {
  try {
    const action = req.body.action;
    if (!['valider', 'refuser'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide' });
    }
    const motif = safeNote(req.body.motif);
    if (action === 'refuser' && (!motif || motif.length < 3)) {
      return res.status(400).json({ message: 'Précisez le motif du refus' });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from('productions_couturiers')
      .select('id, pays_code, statut')
      .eq('id', req.params.id)
      .single();
    if (existingError || !existing) return res.status(404).json({ message: 'Production introuvable' });
    if (existing.pays_code !== req.country) return res.status(403).json({ message: 'Accès refusé pour ce pays' });
    if (existing.statut !== 'en_attente') return res.status(409).json({ message: 'Cette production a déjà été traitée' });

    const { data, error } = await supabase
      .from('productions_couturiers')
      .update({
        statut: action === 'valider' ? 'validee' : 'refusee',
        motif_refus: action === 'refuser' ? motif : null,
        validee_par: req.userId,
        validee_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('statut', 'en_attente')
      .select('*')
      .single();
    if (error || !data) return res.status(409).json({ message: 'La production a déjà été traitée' });
    return res.json({ message: action === 'valider' ? 'Production validée' : 'Production refusée', production: data });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de traiter la production', error: error.message });
  }
});

router.get('/admin/paiements', authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('paiements_couturiers')
      .select('id, montant, statut, note_couturier, note_admin, created_at, traitee_at, couturier:users!paiements_couturiers_couturier_id_fkey(id, nom, telephone)')
      .eq('pays_code', req.country)
      .order('created_at', { ascending: false });
    if (req.query.statut) query = query.eq('statut', req.query.statut);
    const { data, error } = await query.limit(500);
    if (error) return res.status(500).json({ message: 'Impossible de charger les paiements', error: error.message });
    return res.json({ paiements: data || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de charger les paiements', error: error.message });
  }
});

router.patch('/admin/paiements/:id', authorize('administrateur'), async (req, res) => {
  try {
    const action = req.body.action;
    if (!['payer', 'refuser'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide' });
    }
    const noteAdmin = safeNote(req.body.noteAdmin);
    if (action === 'refuser' && (!noteAdmin || noteAdmin.length < 3)) {
      return res.status(400).json({ message: 'Précisez le motif du refus' });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from('paiements_couturiers')
      .select('id, pays_code, statut')
      .eq('id', req.params.id)
      .single();
    if (existingError || !existing) return res.status(404).json({ message: 'Demande introuvable' });
    if (existing.pays_code !== req.country) return res.status(403).json({ message: 'Accès refusé pour ce pays' });
    if (existing.statut !== 'en_attente') return res.status(409).json({ message: 'Cette demande a déjà été traitée' });

    const { data, error } = await supabase
      .from('paiements_couturiers')
      .update({
        statut: action === 'payer' ? 'payee' : 'refusee',
        note_admin: noteAdmin,
        traitee_par: req.userId,
        traitee_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('statut', 'en_attente')
      .select('*')
      .single();
    if (error || !data) return res.status(409).json({ message: 'La demande a déjà été traitée' });
    return res.json({ message: action === 'payer' ? 'Paiement confirmé' : 'Demande refusée', paiement: data });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de traiter le paiement', error: error.message });
  }
});

export default router;
