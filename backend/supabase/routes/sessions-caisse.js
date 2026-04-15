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
      montantTotal: row.montant_total ?? row.montantTotal,
      nombreLivraisons:
        row.nombre_livraisons ??
        row.nombreLivraisons ??
        (Array.isArray(row.livraisons) ? row.livraisons.length : 0),
      nombreLivres: row.nombreLivres,
      nombreEnCours: row.nombreEnCours,
      nombreRefuses: row.nombreRefuses,
      nombreRestants: row.nombreRestants,
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

async function hydrateSessionRow(supabase, sess) {
  if (!sess) return null;
  const { data: livraisons } = await supabase
    .from('livraisons')
    .select('*, commande:commande_id(*)')
    .eq('session_caisse_id', sess.id);
  const s = { ...sess, livraisons: livraisons || [] };
  const nombreLivres = s.livraisons.filter((l) => l.statut === 'livree').length;
  const nombreEnCours = s.livraisons.filter((l) => l.statut === 'en_cours').length;
  const nombreRefuses = s.livraisons.filter((l) => l.statut === 'refusee').length;
  s.nombreLivres = nombreLivres;
  s.nombreEnCours = nombreEnCours;
  s.nombreRefuses = nombreRefuses;
  s.nombreRestants = nombreEnCours + nombreRefuses;
  s.nombre_livraisons = s.livraisons.length;
  s.montant_total = s.livraisons
    .filter((l) => l.statut === 'livree')
    .reduce((sum, l) => sum + (Number(l.commande?.prix) || 0), 0);
  return s;
}

// Session ouverte du livreur : auto-crée/fusionne les livraisons sans session dans l unique session ouverte
router.get('/livreur/:livreurId/session-active', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { livreurId } = req.params;

    let { data: openRow } = await supabase
      .from('sessions_caisse')
      .select('*, livreur:livreur_id(id, nom, email, telephone)')
      .eq('livreur_id', livreurId)
      .eq('statut', 'ouverte')
      .order('date_debut', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: pendingLivraisons, error: pendingErr } = await supabase
      .from('livraisons')
      .select('*, commande:commande_id(*)')
      .eq('livreur_id', livreurId)
      .in('statut', ['livree', 'en_cours', 'refusee'])
      .is('session_caisse_id', null);

    if (pendingErr) return res.status(500).json({ message: 'Erreur livraisons', error: pendingErr.message });

    const pending = pendingLivraisons || [];

    if (pending.length > 0) {
      const nouveauMontant = pending
        .filter((l) => l.statut === 'livree')
        .reduce((sum, l) => sum + (Number(l.commande?.prix) || 0), 0);

      if (!openRow) {
        const { data: newSession, error: createErr } = await supabase
          .from('sessions_caisse')
          .insert({
            livreur_id: livreurId,
            montant_total: nouveauMontant,
            nombre_livraisons: pending.length,
            statut: 'ouverte',
            date_debut: new Date().toISOString()
          })
          .select('*, livreur:livreur_id(id, nom, email, telephone)')
          .single();

        if (createErr) return res.status(500).json({ message: 'Erreur création session', error: createErr.message });
        openRow = newSession;
      } else {
        const { error: mergeErr } = await supabase
          .from('sessions_caisse')
          .update({
            montant_total: (openRow.montant_total || 0) + nouveauMontant,
            nombre_livraisons: (openRow.nombre_livraisons || 0) + pending.length
          })
          .eq('id', openRow.id);
        if (mergeErr) return res.status(500).json({ message: 'Erreur fusion session', error: mergeErr.message });
      }

      const { error: linkErr } = await supabase
        .from('livraisons')
        .update({ session_caisse_id: openRow.id })
        .in('id', pending.map((l) => l.id));
      if (linkErr) return res.status(500).json({ message: 'Erreur liaison livraisons', error: linkErr.message });
    }

    let sessionHydratee = null;
    if (openRow) {
      sessionHydratee = await hydrateSessionRow(supabase, openRow);
    }

    const { data: colisRestants } = await supabase
      .from('livraisons')
      .select('*, commande:commande_id(*), session:session_caisse_id(id, statut, date_cloture)')
      .eq('livreur_id', livreurId)
      .eq('statut', 'en_cours')
      .not('session_caisse_id', 'is', null);

    const colisRestantsFiltres = (colisRestants || []).filter((l) => l.session?.statut === 'cloturee');

    const mapped = sessionHydratee ? mapSession(sessionHydratee) : null;

    return res.json({
      session: mapped,
      sessionsOuvertes: mapped ? [mapped] : [],
      colisRestants: colisRestantsFiltres
    });
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

    // Marquer SEULEMENT les livraisons "livrées" comme payées
    const { error: livError } = await supabase
      .from('livraisons')
      .update({
        paiement_recu: true,
        date_paiement: new Date().toISOString()
      })
      .eq('session_caisse_id', sessionId)
      .eq('statut', 'livree');

    if (livError) return res.status(500).json({ message: 'Erreur mise à jour livraisons', error: livError.message });

    // Les colis "en cours" restent liés à cette session clôturée
    // Ils seront affichés en rouge sur la carte du livreur comme "colis restants"

    // Récupérer les colis REFUSÉS pour les remettre en stock
    const { data: colisRefuses, error: fetchRefusesError } = await supabase
      .from('livraisons')
      .select('*, commande:commande_id(*)')
      .eq('session_caisse_id', sessionId)
      .eq('statut', 'refusee');

    if (!fetchRefusesError && colisRefuses && colisRefuses.length > 0) {
      // Pour chaque colis refusé, le remettre en stock
      for (const livraison of colisRefuses) {
        const commande = livraison.commande;
        if (!commande) continue;

        // Trouver l'item dans le stock
        const { data: stockItem, error: stockError } = await supabase
          .from('stock')
          .select('*')
          .eq('modele', commande.modele?.nom || commande.modele)
          .eq('taille', commande.taille)
          .eq('couleur', commande.couleur)
          .maybeSingle();

        if (!stockError && stockItem) {
          // Remettre en stock principal depuis stock en livraison
          const mouvements = Array.isArray(stockItem.mouvements) ? stockItem.mouvements : [];
          mouvements.push({
            type: 'retour',
            quantite: 1,
            source: 'Livraison refusée',
            destination: 'Stock principal',
            commande: commande.id,
            utilisateur: req.userId,
            date: new Date().toISOString(),
            commentaire: 'Retour en stock suite à clôture session'
          });

          await supabase
            .from('stock')
            .update({
              quantite_principale: (stockItem.quantite_principale || 0) + 1,
              quantite_en_livraison: Math.max((stockItem.quantite_en_livraison || 0) - 1, 0),
              mouvements
            })
            .eq('id', stockItem.id);
        }

        // Remettre la commande en stock
        await supabase
          .from('commandes')
          .update({ statut: 'en_stock', livreur_id: null })
          .eq('id', commande.id);
      }

      // Supprimer les livraisons refusées (remises en stock)
      await supabase
        .from('livraisons')
        .delete()
        .eq('session_caisse_id', sessionId)
        .eq('statut', 'refusee');
    }

    return res.json({
      message: `Session clôturée ! ${session.nombre_livraisons} livraison(s) - ${session.montant_total.toLocaleString('fr-FR')} FCFA reçu de ${session.livreur?.nom}`,
      session: mapSession(session)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la clôture', error: error.message });
  }
});

// Faire le point : fusionne les livraisons sans session dans l unique session ouverte (ou en cree une)
router.post('/livreur/:livreurId/ajouter-livraisons', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { livreurId } = req.params;

    const { data: openRow } = await supabase
      .from('sessions_caisse')
      .select('*')
      .eq('livreur_id', livreurId)
      .eq('statut', 'ouverte')
      .order('date_debut', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: nouvellesLivraisons, error: livError } = await supabase
      .from('livraisons')
      .select('*, commande:commande_id(*)')
      .eq('livreur_id', livreurId)
      .in('statut', ['livree', 'en_cours', 'refusee'])
      .is('session_caisse_id', null);

    if (livError) return res.status(500).json({ message: 'Erreur livraisons', error: livError.message });

    if (!nouvellesLivraisons || nouvellesLivraisons.length === 0) {
      return res.json({ message: 'Aucune nouvelle livraison à ajouter' });
    }

    const nouveauMontant = nouvellesLivraisons
      .filter((l) => l.statut === 'livree')
      .reduce((sum, l) => sum + (Number(l.commande?.prix) || 0), 0);

    let session;

    if (!openRow) {
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
      const { error: updErr } = await supabase
        .from('sessions_caisse')
        .update({
          montant_total: (openRow.montant_total || 0) + nouveauMontant,
          nombre_livraisons: (openRow.nombre_livraisons || 0) + nouvellesLivraisons.length
        })
        .eq('id', openRow.id);

      if (updErr) return res.status(500).json({ message: 'Erreur mise à jour', error: updErr.message });
      session = { ...openRow, montant_total: (openRow.montant_total || 0) + nouveauMontant, nombre_livraisons: (openRow.nombre_livraisons || 0) + nouvellesLivraisons.length };
    }

    const { error: linkError } = await supabase
      .from('livraisons')
      .update({ session_caisse_id: session.id })
      .in('id', nouvellesLivraisons.map((l) => l.id));

    if (linkError) return res.status(500).json({ message: 'Erreur liaison', error: linkError.message });

    const hydrated = await hydrateSessionRow(supabase, session);

    return res.json({
      message: `Point de caisse : ${nouvellesLivraisons.length} livraison(s) ajoutée(s)`,
      session: mapSession(hydrated || session),
      montantAjoute: nouveauMontant
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de l\'ajout', error: error.message });
  }
});

// Cloturer TOUTES les sessions ouvertes d un livreur d un coup
router.post('/livreur/:livreurId/cloturer-tout', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { livreurId } = req.params;
    const { commentaire } = req.body;

    const { data: openSessions, error: fetchErr } = await supabase
      .from('sessions_caisse')
      .select('*, livreur:livreur_id(nom)')
      .eq('livreur_id', livreurId)
      .eq('statut', 'ouverte');

    if (fetchErr) return res.status(500).json({ message: 'Erreur', error: fetchErr.message });
    if (!openSessions || openSessions.length === 0) {
      return res.status(404).json({ message: 'Aucune session ouverte pour ce livreur' });
    }

    const sessionIds = openSessions.map((s) => s.id);

    const { error: clotErr } = await supabase
      .from('sessions_caisse')
      .update({
        statut: 'cloturee',
        date_cloture: new Date().toISOString(),
        gestionnaire_id: req.userId,
        commentaire: commentaire || null
      })
      .in('id', sessionIds);

    if (clotErr) return res.status(500).json({ message: 'Erreur clôture', error: clotErr.message });

    await supabase
      .from('livraisons')
      .update({ paiement_recu: true, date_paiement: new Date().toISOString() })
      .in('session_caisse_id', sessionIds)
      .eq('statut', 'livree');

    const { data: colisRefuses } = await supabase
      .from('livraisons')
      .select('*, commande:commande_id(*)')
      .in('session_caisse_id', sessionIds)
      .eq('statut', 'refusee');

    if (colisRefuses && colisRefuses.length > 0) {
      for (const livraison of colisRefuses) {
        const commande = livraison.commande;
        if (commande) {
          await supabase.from('commandes').update({ statut: 'en_stock', livreur_id: null }).eq('id', commande.id);
        }
      }
      await supabase.from('livraisons').delete().in('session_caisse_id', sessionIds).eq('statut', 'refusee');
    }

    const totalColis = openSessions.reduce((s, ss) => s + (ss.nombre_livraisons || 0), 0);
    const totalMontant = openSessions.reduce((s, ss) => s + (ss.montant_total || 0), 0);
    const nomLivreur = openSessions[0]?.livreur?.nom || '';

    return res.json({
      message: `Session clôturée ! ${totalColis} livraison(s) - ${totalMontant.toLocaleString('fr-FR')} FCFA reçu de ${nomLivreur}`,
      sessionsClosees: sessionIds.length
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la clôture', error: error.message });
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

// Supprimer une session (admin uniquement) — détache les livraisons puis supprime la ligne
router.delete('/session/:sessionId', authenticate, authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { sessionId } = req.params;

    const { data: existing, error: fetchErr } = await supabase
      .from('sessions_caisse')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle();

    if (fetchErr) return res.status(500).json({ message: 'Erreur lors de la vérification', error: fetchErr.message });
    if (!existing) return res.status(404).json({ message: 'Session non trouvée' });

    const { error: unlinkErr } = await supabase
      .from('livraisons')
      .update({ session_caisse_id: null })
      .eq('session_caisse_id', sessionId);

    if (unlinkErr) return res.status(500).json({ message: 'Erreur lors du détachement des livraisons', error: unlinkErr.message });

    const { error: delErr } = await supabase.from('sessions_caisse').delete().eq('id', sessionId);

    if (delErr) return res.status(500).json({ message: 'Erreur lors de la suppression', error: delErr.message });

    return res.json({ message: 'Session supprimée avec succès' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
});

export default router;

