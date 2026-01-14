import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mapTimestamps, withMongoShape } from '../map.js';

const router = express.Router();

// Mapper une session Supabase vers format MongoDB
function mapSession(row) {
  if (!row) return row;
  return withMongoShape(
    mapTimestamps({
      ...row,
      livreur: row.livreur ?? undefined,
      gestionnaire: row.gestionnaire ?? undefined,
      livraisons: row.livraisons || [],
      montantTotal: row.montant_total,
      nombreLivraisons: row.nombre_livraisons,
      dateDebut: row.date_debut,
      dateCloture: row.date_cloture,
      livreurId: row.livreur_id,
      gestionnaireId: row.gestionnaire_id,
    })
  );
}

// Obtenir toutes les sessions (avec filtres)
router.get('/', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { livreurId, statut } = req.query;

    let query = supabase
      .from('sessions_caisse')
      .select(`
        *,
        livreur:livreur_id(id, nom, email, telephone),
        gestionnaire:gestionnaire_id(id, nom, email)
      `)
      .order('created_at', { ascending: false });

    if (livreurId) query = query.eq('livreur_id', livreurId);
    if (statut) query = query.eq('statut', statut);

    const { data, error } = await query;

    if (error) return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });

    const sessions = data.map(mapSession);
    return res.json({ sessions });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Obtenir la session ouverte d'un livreur (ou créer si n'existe pas)
router.get('/livreur/:livreurId/session-active', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { livreurId } = req.params;

    // Chercher une session ouverte existante
    let { data: session, error: sessionError } = await supabase
      .from('sessions_caisse')
      .select(`
        *,
        livreur:livreur_id(id, nom, email, telephone)
      `)
      .eq('livreur_id', livreurId)
      .eq('statut', 'ouverte')
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      return res.status(500).json({ message: 'Erreur lors de la récupération', error: sessionError.message });
    }

    // Si pas de session ouverte, chercher les livraisons livrées non assignées à une session
    if (!session) {
      const { data: livraisonsNonAssignees, error: livError } = await supabase
        .from('livraisons')
        .select('*, commande:commande_id(*)')
        .eq('livreur_id', livreurId)
        .eq('statut', 'livree')
        .is('session_caisse_id', null);

      if (livError) return res.status(500).json({ message: 'Erreur livraisons', error: livError.message });

      // Créer une nouvelle session si des livraisons existent
      if (livraisonsNonAssignees && livraisonsNonAssignees.length > 0) {
        const montantTotal = livraisonsNonAssignees.reduce((sum, l) => sum + (l.commande?.prix || 0), 0);

        const { data: newSession, error: createError } = await supabase
          .from('sessions_caisse')
          .insert({
            livreur_id: livreurId,
            montant_total: montantTotal,
            nombre_livraisons: livraisonsNonAssignees.length,
            statut: 'ouverte',
            date_debut: new Date().toISOString()
          })
          .select('*, livreur:livreur_id(id, nom, email, telephone)')
          .single();

        if (createError) return res.status(500).json({ message: 'Erreur création session', error: createError.message });

        // Lier les livraisons à cette session
        const { error: updateError } = await supabase
          .from('livraisons')
          .update({ session_caisse_id: newSession.id })
          .in('id', livraisonsNonAssignees.map(l => l.id));

        if (updateError) return res.status(500).json({ message: 'Erreur liaison livraisons', error: updateError.message });

        // Récupérer les livraisons liées
        const { data: livraisons } = await supabase
          .from('livraisons')
          .select('*, commande:commande_id(*)')
          .eq('session_caisse_id', newSession.id);

        session = { ...newSession, livraisons: livraisons || [] };
      }
    } else {
      // Récupérer les livraisons de la session existante
      const { data: livraisons } = await supabase
        .from('livraisons')
        .select('*, commande:commande_id(*)')
        .eq('session_caisse_id', session.id);

      session.livraisons = livraisons || [];
    }

    return res.json({ session: session ? mapSession(session) : null });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Clôturer une session (marquer comme payée)
router.post('/:sessionId/cloturer', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { sessionId } = req.params;
    const { commentaire } = req.body;

    // Récupérer la session
    const { data: session, error: fetchError } = await supabase
      .from('sessions_caisse')
      .select('*, livreur:livreur_id(nom)')
      .eq('id', sessionId)
      .single();

    if (fetchError) return res.status(404).json({ message: 'Session non trouvée', error: fetchError.message });

    if (session.statut === 'cloturee') {
      return res.status(400).json({ message: 'Session déjà clôturée' });
    }

    // Marquer la session comme clôturée
    const { error: updateError } = await supabase
      .from('sessions_caisse')
      .update({
        statut: 'cloturee',
        date_cloture: new Date().toISOString(),
        gestionnaire_id: req.userId,
        commentaire: commentaire || null
      })
      .eq('id', sessionId);

    if (updateError) return res.status(500).json({ message: 'Erreur mise à jour session', error: updateError.message });

    // Marquer toutes les livraisons de cette session comme payées
    const { error: livError } = await supabase
      .from('livraisons')
      .update({
        paiement_recu: true,
        date_paiement: new Date().toISOString()
      })
      .eq('session_caisse_id', sessionId);

    if (livError) return res.status(500).json({ message: 'Erreur mise à jour livraisons', error: livError.message });

    return res.json({
      message: `Session clôturée ! ${session.nombre_livraisons} livraison(s) - ${session.montant_total.toLocaleString('fr-FR')} FCFA reçu de ${session.livreur?.nom}`,
      session: mapSession(session)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la clôture', error: error.message });
  }
});

// Ajouter des livraisons à la session ouverte
router.post('/livreur/:livreurId/ajouter-livraisons', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { livreurId } = req.params;

    // Chercher la session ouverte
    let { data: session } = await supabase
      .from('sessions_caisse')
      .select('*')
      .eq('livreur_id', livreurId)
      .eq('statut', 'ouverte')
      .single();

    // Chercher les livraisons livrées non assignées
    const { data: nouvellesLivraisons, error: livError } = await supabase
      .from('livraisons')
      .select('*, commande:commande_id(*)')
      .eq('livreur_id', livreurId)
      .eq('statut', 'livree')
      .is('session_caisse_id', null);

    if (livError) return res.status(500).json({ message: 'Erreur livraisons', error: livError.message });

    if (!nouvellesLivraisons || nouvellesLivraisons.length === 0) {
      return res.json({ message: 'Aucune nouvelle livraison à ajouter' });
    }

    const nouveauMontant = nouvellesLivraisons.reduce((sum, l) => sum + (l.commande?.prix || 0), 0);

    if (!session) {
      // Créer une nouvelle session
      const { data: newSession, error: createError } = await supabase
        .from('sessions_caisse')
        .insert({
          livreur_id: livreurId,
          montant_total: nouveauMontant,
          nombre_livraisons: nouvellesLivraisons.length,
          statut: 'ouverte',
          date_debut: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) return res.status(500).json({ message: 'Erreur création', error: createError.message });
      session = newSession;
    } else {
      // Ajouter à la session existante
      const { error: updateError } = await supabase
        .from('sessions_caisse')
        .update({
          montant_total: session.montant_total + nouveauMontant,
          nombre_livraisons: session.nombre_livraisons + nouvellesLivraisons.length
        })
        .eq('id', session.id);

      if (updateError) return res.status(500).json({ message: 'Erreur mise à jour', error: updateError.message });
    }

    // Lier les livraisons à cette session
    const { error: linkError } = await supabase
      .from('livraisons')
      .update({ session_caisse_id: session.id })
      .in('id', nouvellesLivraisons.map(l => l.id));

    if (linkError) return res.status(500).json({ message: 'Erreur liaison', error: linkError.message });

    return res.json({
      message: `${nouvellesLivraisons.length} livraison(s) ajoutée(s) à la session`,
      session: mapSession(session),
      montantAjoute: nouveauMontant
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de l\'ajout', error: error.message });
  }
});

// Obtenir l'historique des sessions clôturées d'un livreur
router.get('/livreur/:livreurId/historique', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { livreurId } = req.params;
    const { limit = 10 } = req.query;

    const { data: sessions, error } = await supabase
      .from('sessions_caisse')
      .select('*, gestionnaire:gestionnaire_id(id, nom)')
      .eq('livreur_id', livreurId)
      .eq('statut', 'cloturee')
      .order('date_cloture', { ascending: false })
      .limit(parseInt(limit));

    if (error) return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });

    return res.json({ sessions: (sessions || []).map(mapSession) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

export default router;

