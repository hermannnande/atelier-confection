/**
 * ============================================================================
 * ROUTES : SYSTÈME DE POINTAGE PAR GÉOLOCALISATION GPS
 * ============================================================================
 *
 * Fonctionnalités :
 * ✅ Pointage arrivée avec validation GPS (refus si hors zone + réessai)
 * ✅ Pointage départ avec GPS
 * ✅ Validation automatique du rayon (50m par défaut)
 * ✅ Détection de retard avec tolérance configurable
 * ✅ Historique des présences
 * ✅ Statistiques de présence
 * ✅ Configuration de l'atelier (coordonnées GPS)
 *
 * Rôles concernés : gestionnaire, appelant, styliste, couturier
 * Exclus : administrateur, livreur
 */

import express from 'express';
import { getSupabaseAdmin } from '../client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCountry, ensureCountryAccess } from '../middleware/country.js';
import { mapUser } from '../map.js';

const router = express.Router();
const ATTENDANCE_ROLES = ['gestionnaire', 'appelant', 'styliste', 'couturier'];

// ============================================================================
// FORMULE DE HAVERSINE : Calculer la distance entre deux coordonnées GPS
// ============================================================================

/**
 * Calcule la distance en mètres entre deux coordonnées GPS
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @returns {number} Distance en mètres
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance en mètres
}

// ============================================================================
// ROUTE 1 : 📍 MARQUER SON ARRIVÉE (avec validation GPS)
// ============================================================================

router.post('/mark-arrival', authenticate, resolveCountry, authorize(...ATTENDANCE_ROLES), async (req, res) => {
  try {
    const { latitude, longitude, note } = req.body;
    const userId = req.userId;
    const supabase = getSupabaseAdmin();

    // Validation des coordonnées
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Coordonnées GPS manquantes',
        message: 'Veuillez activer votre géolocalisation'
      });
    }

    // Multi-pays : on tag le pointage avec le pays_code de l'utilisateur (pas req.country
    // qui peut etre un pays d'admin) car un livreur/couturier appartient a un seul pays.
    const userPaysCode = req.user.pays_code || 'CI';

    // Vérifier si déjà pointé aujourd'hui (du pays du user)
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingAttendance, error: checkError } = await supabase
      .from('attendances')
      .select('*')
      .eq('pays_code', userPaysCode)
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (checkError) {
      return res.status(500).json({
        error: 'Erreur lors de la vérification',
        message: checkError.message
      });
    }

    if (existingAttendance) {
      return res.status(400).json({
        error: 'Déjà pointé',
        message: 'Vous avez déjà marqué votre présence aujourd\'hui',
        attendance: existingAttendance
      });
    }

    // Récupérer la configuration de l'atelier (du pays du user)
    const { data: storeConfig, error: configError } = await supabase
      .from('store_config')
      .select('*')
      .eq('pays_code', userPaysCode)
      .maybeSingle();

    if (configError || !storeConfig) {
      return res.status(500).json({
        error: 'Configuration manquante',
        message: `La configuration GPS de l'atelier (${userPaysCode}) n'est pas définie. Contactez l'administrateur.`
      });
    }

    // Calculer la distance entre l'utilisateur et l'atelier
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(storeConfig.latitude),
      parseFloat(storeConfig.longitude)
    );

    const distanceRounded = Math.round(distance);

    console.log(`📍 Tentative de pointage - ${req.user?.nom || 'Utilisateur'} - Distance: ${distanceRounded}m`);

    // ❌ REFUSER si hors de la zone (possibilité de réessayer)
    if (distance > storeConfig.rayon_tolerance) {
      console.log(`❌ REFUSÉ - Hors zone (${distanceRounded}m > ${storeConfig.rayon_tolerance}m)`);
      
      return res.status(400).json({
        success: false,
        error: 'HORS_ZONE',
        message: `❌ Pointage refusé : Vous êtes à ${distanceRounded}m de l'atelier. Vous devez être à moins de ${storeConfig.rayon_tolerance}m pour pointer.`,
        distance: distanceRounded,
        rayonTolerance: storeConfig.rayon_tolerance,
        validee: false,
        status: 'ABSENT',
        canRetry: true
      });
    }

    // ✅ Dans la zone : Déterminer si retard
    let validation = 'VALIDE';
    const now = new Date();
    const heureOuverture = new Date();
    const [heureO, minuteO] = storeConfig.heure_ouverture.split(':');
    heureOuverture.setHours(parseInt(heureO), parseInt(minuteO), 0, 0);

    if (now > heureOuverture) {
      const retardMinutes = Math.floor((now - heureOuverture) / (1000 * 60));
      if (retardMinutes > storeConfig.tolerance_retard) {
        validation = 'RETARD';
      }
    }

    // Enregistrer le pointage (avec le pays du user)
    const { data: attendance, error: insertError } = await supabase
      .from('attendances')
      .insert({
        pays_code: userPaysCode,
        user_id: userId,
        date: today,
        heure_arrivee: new Date().toISOString(),
        latitude_arrivee: parseFloat(latitude),
        longitude_arrivee: parseFloat(longitude),
        distance_arrivee: distanceRounded,
        validee: true,
        validation: validation,
        note: note || null,
        ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        device_info: req.headers['user-agent'] || 'unknown'
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Erreur insertion pointage:', insertError);
      return res.status(500).json({
        error: 'Erreur lors de l\'enregistrement',
        message: insertError.message
      });
    }

    // Récupérer les infos utilisateur pour la réponse
    const { data: userRow } = await supabase
      .from('users')
      .select('id, nom, role, email, telephone, actif, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    const user = mapUser(userRow);

    console.log(`✅ ACCEPTÉ - ${user?.nom || 'Utilisateur'} - ${validation} - ${distanceRounded}m`);

    res.json({
      success: true,
      message: validation === 'RETARD'
        ? `⚠️ Présence enregistrée avec RETARD à ${new Date().toLocaleTimeString('fr-FR')}`
        : `✅ Présence enregistrée à ${new Date().toLocaleTimeString('fr-FR')}`,
      attendance: {
        ...attendance,
        user
      },
      distance: distanceRounded,
      rayonTolerance: storeConfig.rayon_tolerance,
      validee: true,
      validation,
      status: validation === 'RETARD' ? 'RETARD' : 'PRÉSENT'
    });

  } catch (error) {
    console.error('❌ Erreur pointage arrivée:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors du pointage'
    });
  }
});

// ============================================================================
// ROUTE 2 : 👋 MARQUER SON DÉPART
// ============================================================================

router.post('/mark-departure', authenticate, resolveCountry, authorize(...ATTENDANCE_ROLES), async (req, res) => {
  try {
    const { latitude, longitude, note } = req.body;
    const userId = req.userId;
    const supabase = getSupabaseAdmin();

    // Validation des coordonnées
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Coordonnées GPS manquantes',
        message: 'Veuillez activer votre géolocalisation'
      });
    }

    const userPaysCode = req.user.pays_code || 'CI';

    // Trouver le pointage d'aujourd'hui (du pays du user)
    const today = new Date().toISOString().split('T')[0];
    
    const { data: attendance, error: findError } = await supabase
      .from('attendances')
      .select('*')
      .eq('pays_code', userPaysCode)
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (findError || !attendance) {
      return res.status(400).json({
        error: 'Aucun pointage d\'arrivée',
        message: 'Vous devez d\'abord marquer votre présence avant de partir'
      });
    }

    if (attendance.heure_depart) {
      return res.status(400).json({
        error: 'Départ déjà enregistré',
        message: 'Vous avez déjà marqué votre départ aujourd\'hui'
      });
    }

    // Récupérer la config pour calculer la distance (du pays du user)
    const { data: storeConfig } = await supabase
      .from('store_config')
      .select('*')
      .eq('pays_code', userPaysCode)
      .maybeSingle();

    if (!storeConfig) {
      return res.status(500).json({
        error: 'Configuration manquante',
        message: `La configuration GPS de l'atelier (${userPaysCode}) n'est pas définie. Contactez l'administrateur.`
      });
    }

    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(storeConfig.latitude),
      parseFloat(storeConfig.longitude)
    );

    const distanceRounded = Math.round(distance);

    // Mettre à jour le pointage avec le départ
    const { data: updatedAttendance, error: updateError } = await supabase
      .from('attendances')
      .update({
        heure_depart: new Date().toISOString(),
        latitude_depart: parseFloat(latitude),
        longitude_depart: parseFloat(longitude),
        distance_depart: distanceRounded,
        note: note ? `${attendance.note || ''}\nDépart: ${note}`.trim() : attendance.note
      })
      .eq('id', attendance.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erreur mise à jour départ:', updateError);
      return res.status(500).json({
        error: 'Erreur lors de l\'enregistrement',
        message: updateError.message
      });
    }

    // Récupérer les infos utilisateur
    const { data: userRow } = await supabase
      .from('users')
      .select('id, nom, role, email, telephone, actif, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    const user = mapUser(userRow);

    console.log(`👋 Départ enregistré - ${user?.nom || 'Utilisateur'} - ${new Date().toLocaleTimeString('fr-FR')}`);

    res.json({
      success: true,
      message: `✅ Départ enregistré à ${new Date().toLocaleTimeString('fr-FR')}`,
      attendance: {
        ...updatedAttendance,
        user
      },
      status: 'PARTI'
    });

  } catch (error) {
    console.error('❌ Erreur pointage départ:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'enregistrement du départ'
    });
  }
});

// ============================================================================
// ROUTE 3 : 📊 OBTENIR MA PRÉSENCE DU JOUR
// ============================================================================

router.get('/my-attendance-today', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.user.role;
    const userPaysCode = req.user.pays_code || 'CI';
    const supabase = getSupabaseAdmin();

    // Les admins et livreurs n'ont pas de pointage
    if (userRole === 'administrateur' || userRole === 'livreur') {
      return res.json({
        attendance: null,
        message: 'Le système de pointage ne s\'applique pas à votre rôle'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: attendance, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('pays_code', userPaysCode)
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    // Pas d'erreur si aucun pointage (null c'est normal)
    if (error) {
      console.error('Erreur récupération présence:', error);
      return res.status(500).json({
        error: 'Erreur serveur',
        message: error.message
      });
    }

    // Récupérer les infos utilisateur
    const { data: userRow } = await supabase
      .from('users')
      .select('id, nom, role, email, telephone, actif, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    const user = mapUser(userRow);

    res.json({
      attendance: attendance ? { ...attendance, user } : null
    });

  } catch (error) {
    console.error('❌ Erreur récupération présence:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
});

// ============================================================================
// ROUTE 4 : 📋 HISTORIQUE DES PRÉSENCES (Admin/Gestionnaire)
// ============================================================================

router.get('/history', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    const { 
      userId, 
      date, 
      startDate, 
      endDate, 
      validee, 
      validation,
      page = 1, 
      limit = 50 
    } = req.query;

    let query = supabase
      .from('attendances')
      .select(`
        *,
        user:users (
          id,
          nom,
          role
        )
      `, { count: 'exact' })
      .eq('pays_code', req.country);

    // Filtres
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Filtre par date unique
    if (date) {
      query = query.eq('date', date);
    }
    // Filtre par plage de dates
    else if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }
    // PAR DÉFAUT : Aujourd'hui uniquement
    else {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('date', today);
    }

    if (validee !== undefined) {
      query = query.eq('validee', validee === 'true');
    }

    if (validation) {
      query = query.eq('validation', validation);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query
      .order('date', { ascending: false })
      .order('heure_arrivee', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: attendances, error, count } = await query;

    if (error) {
      console.error('Erreur récupération historique:', error);
      return res.status(500).json({
        error: 'Erreur serveur',
        message: error.message
      });
    }

    res.json({
      attendances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
});

// ============================================================================
// ROUTE 5 : 📊 STATISTIQUES DE PRÉSENCE (Admin/Gestionnaire)
// ============================================================================

router.get('/statistics', authenticate, resolveCountry, authorize('gestionnaire', 'administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    // Multi-pays : on filtre par les user_ids du pays actif (la vue v_attendance_stats
    // ne contient pas pays_code, on passe donc par les users)
    const { data: usersOfCountry, error: usersErr } = await supabase
      .from('users')
      .select('id')
      .eq('pays_code', req.country);

    if (usersErr) {
      return res.status(500).json({
        error: 'Erreur serveur',
        message: usersErr.message
      });
    }

    const userIds = (usersOfCountry || []).map((u) => u.id);
    if (userIds.length === 0) {
      return res.json({ statistics: [] });
    }

    const { data: stats, error } = await supabase
      .from('v_attendance_stats')
      .select('*')
      .in('user_id', userIds)
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur statistiques:', error);
      return res.status(500).json({
        error: 'Erreur serveur',
        message: error.message
      });
    }

    res.json({ statistics: stats });

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
});

// ============================================================================
// ROUTE 6 : 🏢 RÉCUPÉRER LA CONFIGURATION DE L'ATELIER
// ============================================================================

router.get('/store-config', authenticate, resolveCountry, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: config, error } = await supabase
      .from('store_config')
      .select('*')
      .eq('pays_code', req.country)
      .maybeSingle();

    if (error || !config) {
      return res.status(404).json({
        error: 'Configuration non trouvée',
        message: `La configuration GPS de l'atelier (${req.country}) n'existe pas`
      });
    }

    res.json({ config });

  } catch (error) {
    console.error('❌ Erreur récupération config:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
});

// ============================================================================
// ROUTE 7 : 🔧 METTRE À JOUR LA CONFIGURATION (Admin uniquement)
// ============================================================================

router.put('/store-config', authenticate, resolveCountry, authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    const {
      nom,
      adresse,
      latitude,
      longitude,
      rayon_tolerance,
      heure_ouverture,
      heure_fermeture,
      tolerance_retard
    } = req.body;

    // Construire l'objet de mise à jour
    const updates = {};
    if (nom !== undefined) updates.nom = nom;
    if (adresse !== undefined) updates.adresse = adresse;
    if (latitude !== undefined) updates.latitude = parseFloat(latitude);
    if (longitude !== undefined) updates.longitude = parseFloat(longitude);
    if (rayon_tolerance !== undefined) updates.rayon_tolerance = parseInt(rayon_tolerance);
    if (heure_ouverture !== undefined) updates.heure_ouverture = heure_ouverture;
    if (heure_fermeture !== undefined) updates.heure_fermeture = heure_fermeture;
    if (tolerance_retard !== undefined) updates.tolerance_retard = parseInt(tolerance_retard);

    // Récupérer la config du pays actif (1 config par pays)
    const { data: existingConfig } = await supabase
      .from('store_config')
      .select('id, pays_code')
      .eq('pays_code', req.country)
      .maybeSingle();

    let result;
    if (existingConfig) {
      // Mettre à jour
      result = await supabase
        .from('store_config')
        .update(updates)
        .eq('id', existingConfig.id)
        .select('*')
        .single();
    } else {
      // Créer (avec le pays actif)
      result = await supabase
        .from('store_config')
        .insert({ ...updates, pays_code: req.country })
        .select('*')
        .single();
    }

    if (result.error) {
      console.error('Erreur mise à jour config:', result.error);
      return res.status(500).json({
        error: 'Erreur serveur',
        message: result.error.message
      });
    }

    console.log(`🔧 Configuration mise à jour par ${req.user?.nom || 'Administrateur'}`);

    res.json({
      success: true,
      message: 'Configuration mise à jour avec succès',
      config: result.data
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour config:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
});

// ============================================================================
// ROUTE 8 : 🗑️ SUPPRIMER UN POINTAGE (Admin uniquement)
// ============================================================================

router.delete('/attendances/:id', authenticate, resolveCountry, authorize('administrateur'), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    const { id } = req.params;

    // Verifier l'acces au pointage avant suppression
    const { data: existing, error: fetchErr } = await supabase
      .from('attendances')
      .select('id, pays_code')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Pointage non trouvé', message: 'Le pointage demandé n\'existe pas' });
    }
    if (!ensureCountryAccess(existing, req, res)) return;

    const { error } = await supabase
      .from('attendances')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur suppression:', error);
      return res.status(500).json({
        error: 'Erreur serveur',
        message: error.message
      });
    }

    console.log(`🗑️ Pointage #${id} supprimé par ${req.user?.nom || 'Administrateur'}`);

    res.json({
      success: true,
      message: 'Pointage supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
});

export default router;

