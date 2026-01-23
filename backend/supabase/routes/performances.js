import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const [{ data: commandes }, { data: users }] = await Promise.all([
      supabase.from('commandes').select('id, statut, prix'),
      supabase.from('users').select('id, role, actif'),
    ]);

    const totalCommandes = (commandes || []).length;
    const commandesLivrees = (commandes || []).filter((c) => c.statut === 'livree').length;
    const commandesEnCours = (commandes || []).filter((c) =>
      ['validee', 'en_decoupe', 'en_couture', 'en_stock', 'en_livraison'].includes(c.statut)
    ).length;
    const commandesAnnulees = (commandes || []).filter((c) => c.statut === 'annulee').length;
    const chiffreAffairesTotal = (commandes || []).filter((c) => c.statut === 'livree').reduce((sum, c) => sum + Number(c.prix || 0), 0);
    const tauxReussite = totalCommandes > 0 ? ((commandesLivrees / totalCommandes) * 100).toFixed(2) : 0;

    const actifs = (users || []).filter((u) => u.actif !== false);
    const stats = {
      totalCommandes,
      commandesLivrees,
      commandesEnCours,
      commandesAnnulees,
      tauxReussite,
      chiffreAffairesTotal,
      totalUtilisateurs: actifs.length,
      appelants: actifs.filter((u) => u.role === 'appelant').length,
      stylistes: actifs.filter((u) => u.role === 'styliste').length,
      couturiers: actifs.filter((u) => u.role === 'couturier').length,
      livreurs: actifs.filter((u) => u.role === 'livreur').length,
    };

    return res.json({ stats });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

router.get('/appelants', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const supabase = getSupabaseAdmin();
    
    // Récupérer les appelants
    const { data: appelants } = await supabase
      .from('users')
      .select('id, nom, email, actif')
      .eq('role', 'appelant')
      .eq('actif', true);

    // Construire la requête des commandes avec filtres de date
    let commandesQuery = supabase
      .from('commandes')
      .select('id, appelant_id, statut, urgence, prix, created_at');
    
    // Appliquer les filtres de date si présents
    if (dateDebut) {
      commandesQuery = commandesQuery.gte('created_at', dateDebut);
    }
    if (dateFin) {
      // Ajouter un jour pour inclure toute la journée de fin
      const dateFin23h59 = new Date(dateFin);
      dateFin23h59.setHours(23, 59, 59, 999);
      commandesQuery = commandesQuery.lte('created_at', dateFin23h59.toISOString());
    }
    
    const { data: commandes } = await commandesQuery;

    const commandesByAppelant = new Map();
    for (const c of commandes || []) {
      if (!c.appelant_id) continue;
      const arr = commandesByAppelant.get(c.appelant_id) || [];
      arr.push(c);
      commandesByAppelant.set(c.appelant_id, arr);
    }

    const performances = (appelants || []).map((a) => {
      const list = commandesByAppelant.get(a.id) || [];
      
      // ✅ CORRECTION : Une commande est validée uniquement si elle est "confirmee" (confirmée par l'appelant)
      const commandesValidees = list.filter((c) => c.statut === 'confirmee').length;
      
      const commandesAnnulees = list.filter((c) => c.statut === 'annulee').length;
      const commandesEnAttente = list.filter((c) => c.statut === 'en_attente_paiement').length;
      const commandesUrgentes = list.filter((c) => c.urgence).length;
      
      // Taux de validation basé sur les commandes non annulées
      const tauxValidation = list.length > 0 ? (((list.filter((c) => c.statut !== 'annulee').length / list.length) * 100).toFixed(2)) : 0;
      
      // CA des commandes livrées
      const chiffreAffaires = list.filter((c) => c.statut === 'livree').reduce((sum, c) => sum + Number(c.prix || 0), 0);

      return {
        appelant: { id: a.id, nom: a.nom, email: a.email },
        totalCommandes: list.length,
        commandesValidees,
        commandesAnnulees,
        commandesEnAttente,
        commandesUrgentes,
        tauxValidation,
        chiffreAffaires,
      };
    });

    performances.sort((x, y) => y.totalCommandes - x.totalCommandes);
    return res.json({ performances });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

router.get('/stylistes', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const supabase = getSupabaseAdmin();
    
    const { data: stylistes } = await supabase
      .from('users')
      .select('id, nom, email, actif')
      .eq('role', 'styliste')
      .eq('actif', true);
    
    // Construire la requête avec filtres de date
    let commandesQuery = supabase
      .from('commandes')
      .select('id, styliste_id, statut, created_at');
    
    if (dateDebut) {
      commandesQuery = commandesQuery.gte('created_at', dateDebut);
    }
    if (dateFin) {
      const dateFin23h59 = new Date(dateFin);
      dateFin23h59.setHours(23, 59, 59, 999);
      commandesQuery = commandesQuery.lte('created_at', dateFin23h59.toISOString());
    }
    
    const { data: commandes } = await commandesQuery;

    const commandesByStyliste = new Map();
    for (const c of commandes || []) {
      if (!c.styliste_id) continue;
      const arr = commandesByStyliste.get(c.styliste_id) || [];
      arr.push(c);
      commandesByStyliste.set(c.styliste_id, arr);
    }

    const performances = (stylistes || []).map((s) => {
      const list = commandesByStyliste.get(s.id) || [];
      const commandesDecoupees = list.filter((c) => ['en_couture', 'en_stock', 'en_livraison', 'livree'].includes(c.statut)).length;
      const commandesEnCours = list.filter((c) => c.statut === 'en_decoupe').length;
      return {
        styliste: { id: s.id, nom: s.nom, email: s.email },
        totalCommandesTraitees: commandesDecoupees,
        commandesEnCours,
        productivite: commandesDecoupees,
      };
    });

    performances.sort((a, b) => b.totalCommandesTraitees - a.totalCommandesTraitees);
    return res.json({ performances });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

router.get('/couturiers', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const supabase = getSupabaseAdmin();
    
    const { data: couturiers } = await supabase
      .from('users')
      .select('id, nom, email, actif')
      .eq('role', 'couturier')
      .eq('actif', true);
    
    // Construire la requête avec filtres de date
    let commandesQuery = supabase
      .from('commandes')
      .select('id, couturier_id, statut, created_at, date_couture');
    
    if (dateDebut) {
      commandesQuery = commandesQuery.gte('created_at', dateDebut);
    }
    if (dateFin) {
      const dateFin23h59 = new Date(dateFin);
      dateFin23h59.setHours(23, 59, 59, 999);
      commandesQuery = commandesQuery.lte('created_at', dateFin23h59.toISOString());
    }
    
    const { data: commandes } = await commandesQuery;

    const commandesByCouturier = new Map();
    for (const c of commandes || []) {
      if (!c.couturier_id) continue;
      const arr = commandesByCouturier.get(c.couturier_id) || [];
      arr.push(c);
      commandesByCouturier.set(c.couturier_id, arr);
    }

    const performances = (couturiers || []).map((c) => {
      const list = commandesByCouturier.get(c.id) || [];
      const commandesTerminees = list.filter((x) => ['en_stock', 'en_livraison', 'livree'].includes(x.statut));
      const commandesEnCours = list.filter((x) => x.statut === 'en_couture');

      let tempsMoyenConfection = 0;
      if (commandesTerminees.length > 0) {
        const tempsTotal = commandesTerminees.reduce((sum, x) => {
          if (x.date_couture && x.created_at) {
            return sum + (new Date(x.date_couture).getTime() - new Date(x.created_at).getTime());
          }
          return sum;
        }, 0);
        tempsMoyenConfection = Math.round(tempsTotal / commandesTerminees.length / (1000 * 60 * 60 * 24));
      }

      return {
        couturier: { id: c.id, nom: c.nom, email: c.email },
        totalCommandesTraitees: commandesTerminees.length,
        commandesEnCours: commandesEnCours.length,
        tempsMoyenConfection,
        productivite: commandesTerminees.length,
      };
    });

    performances.sort((a, b) => b.totalCommandesTraitees - a.totalCommandesTraitees);
    return res.json({ performances });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

router.get('/livreurs', authenticate, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const supabase = getSupabaseAdmin();
    
    const { data: livreurs } = await supabase
      .from('users')
      .select('id, nom, telephone, actif')
      .eq('role', 'livreur')
      .eq('actif', true);
    
    // Construire la requête des livraisons avec filtres de date
    let livraisonsQuery = supabase
      .from('livraisons')
      .select('id, livreur_id, statut, commande_id, created_at');
    
    if (dateDebut) {
      livraisonsQuery = livraisonsQuery.gte('created_at', dateDebut);
    }
    if (dateFin) {
      const dateFin23h59 = new Date(dateFin);
      dateFin23h59.setHours(23, 59, 59, 999);
      livraisonsQuery = livraisonsQuery.lte('created_at', dateFin23h59.toISOString());
    }
    
    const [{ data: livraisons }, { data: commandes }] = await Promise.all([
      livraisonsQuery,
      supabase.from('commandes').select('id, prix')
    ]);

    const prixByCommande = new Map((commandes || []).map((c) => [c.id, Number(c.prix || 0)]));
    const livByLivreur = new Map();
    for (const l of livraisons || []) {
      if (!l.livreur_id) continue;
      const arr = livByLivreur.get(l.livreur_id) || [];
      arr.push(l);
      livByLivreur.set(l.livreur_id, arr);
    }

    const performances = (livreurs || []).map((l) => {
      const list = livByLivreur.get(l.id) || [];
      const livraisonsReussies = list.filter((x) => x.statut === 'livree');
      const livraisonsRefusees = list.filter((x) => x.statut === 'refusee');
      const livraisonsEnCours = list.filter((x) => x.statut === 'en_cours');

      const tauxReussite = list.length > 0 ? ((livraisonsReussies.length / list.length) * 100).toFixed(2) : 0;
      const chiffreAffaires = livraisonsReussies.reduce((sum, x) => sum + (prixByCommande.get(x.commande_id) || 0), 0);

      return {
        livreur: { id: l.id, nom: l.nom, telephone: l.telephone },
        totalLivraisons: list.length,
        livraisonsReussies: livraisonsReussies.length,
        livraisonsRefusees: livraisonsRefusees.length,
        livraisonsEnCours: livraisonsEnCours.length,
        tauxReussite,
        chiffreAffaires,
      };
    });

    performances.sort((a, b) => b.livraisonsReussies - a.livraisonsReussies);
    return res.json({ performances });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors du calcul', error: error.message });
  }
});

export default router;



