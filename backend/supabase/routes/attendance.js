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
 * Exclus : admin, livreur
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

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
// MIDDLEWARE : Vérifier que l'utilisateur peut utiliser le système de pointage
// ============================================================================

function checkAttendanceRole(req, res, next) {
  const userRole = req.user.role;
  
  // Les admin et livreurs ne pointent pas
  if (userRole === 'admin' || userRole === 'livreur') {
    return res.status(403).json({
      error: 'Système de pointage non applicable',
      message: `Les ${userRole}s ne sont pas concernés par le système de pointage`
    });
  }

  // Rôles autorisés : gestionnaire, appelant, styliste, couturier
  const allowedRoles = ['gestionnaire', 'appelant', 'styliste', 'couturier'];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      error: 'Rôle non autorisé',
      message: 'Votre rôle ne vous permet pas d\'utiliser le système de pointage'
    });
  }

  next();
}

// ============================================================================
// ROUTE 1 : 📍 MARQUER SON ARRIVÉE (avec validation GPS)
// ============================================================================

router.post('/mark-arrival', checkAttendanceRole, async (req, res) => {
  try {
    const { latitude, longitude, note } = req.body;
    const userId = req.user.id;

    // Validation des coordonnées
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Coordonnées GPS manquantes',
        message: 'Veuillez activer votre géolocalisation'
      });
    }

    // Vérifier si déjà pointé aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingAttendance, error: checkError } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existingAttendance) {
      return res.status(400).json({
        error: 'Déjà pointé',
        message: 'Vous avez déjà marqué votre présence aujourd\'hui',
        attendance: existingAttendance
      });
    }

    // Récupérer la configuration de l'atelier
    const { data: storeConfig, error: configError } = await supabase
      .from('store_config')
      .select('*')
      .single();

    if (configError || !storeConfig) {
      return res.status(500).json({
        error: 'Configuration manquante',
        message: 'La configuration GPS de l\'atelier n\'est pas définie. Contactez l\'administrateur.'
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

    console.log(`📍 Tentative de pointage - ${req.user.prenom} ${req.user.nom} - Distance: ${distanceRounded}m`);

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

    // Enregistrer le pointage
    const { data: attendance, error: insertError } = await supabase
      .from('attendances')
      .insert({
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
    const { data: user } = await supabase
      .from('users')
      .select('id, nom, prenom, role')
      .eq('id', userId)
      .single();

    console.log(`✅ ACCEPTÉ - ${user.prenom} ${user.nom} - ${validation} - ${distanceRounded}m`);

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

router.post('/mark-departure', checkAttendanceRole, async (req, res) => {
  try {
    const { latitude, longitude, note } = req.body;
    const userId = req.user.id;

    // Validation des coordonnées
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Coordonnées GPS manquantes',
        message: 'Veuillez activer votre géolocalisation'
      });
    }

    // Trouver le pointage d'aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    
    const { data: attendance, error: findError } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

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

    // Récupérer la config pour calculer la distance
    const { data: storeConfig } = await supabase
      .from('store_config')
      .select('*')
      .single();

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
    const { data: user } = await supabase
      .from('users')
      .select('id, nom, prenom, role')
      .eq('id', userId)
      .single();

    console.log(`👋 Départ enregistré - ${user.prenom} ${user.nom} - ${new Date().toLocaleTimeString('fr-FR')}`);

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

router.get('/my-attendance-today', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Les admins et livreurs n'ont pas de pointage
    if (userRole === 'admin' || userRole === 'livreur') {
      return res.json({
        attendance: null,
        message: 'Le système de pointage ne s\'applique pas à votre rôle'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: attendance, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    // Pas d'erreur si aucun pointage (null c'est normal)
    if (error && error.code !== 'PGRST116') {
      console.error('Erreur récupération présence:', error);
      return res.status(500).json({
        error: 'Erreur serveur',
        message: error.message
      });
    }

    // Récupérer les infos utilisateur
    const { data: user } = await supabase
      .from('users')
      .select('id, nom, prenom, role')
      .eq('id', userId)
      .single();

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

router.get('/history', async (req, res) => {
  try {
    const userRole = req.user.role;

    // Seuls admin et gestionnaire peuvent voir l'historique
    if (userRole !== 'admin' && userRole !== 'gestionnaire') {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas l\'autorisation de voir l\'historique'
      });
    }

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
          prenom,
          role
        )
      `, { count: 'exact' });

    // Filtres
    if (userId) {
      query = query.eq('user_id', parseInt(userId));
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

router.get('/statistics', async (req, res) => {
  try {
    const userRole = req.user.role;

    // Seuls admin et gestionnaire
    if (userRole !== 'admin' && userRole !== 'gestionnaire') {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas l\'autorisation'
      });
    }

    const { data: stats, error } = await supabase
      .from('v_attendance_stats')
      .select('*')
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

router.get('/store-config', async (req, res) => {
  try {
    const { data: config, error } = await supabase
      .from('store_config')
      .select('*')
      .single();

    if (error || !config) {
      return res.status(404).json({
        error: 'Configuration non trouvée',
        message: 'La configuration GPS de l\'atelier n\'existe pas'
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

router.put('/store-config', async (req, res) => {
  try {
    const userRole = req.user.role;

    // Seuls les admins peuvent modifier la config
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Seuls les administrateurs peuvent modifier la configuration'
      });
    }

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

    // Récupérer l'ID de la config (normalement 1)
    const { data: existingConfig } = await supabase
      .from('store_config')
      .select('id')
      .single();

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
      // Créer
      result = await supabase
        .from('store_config')
        .insert(updates)
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

    console.log(`🔧 Configuration mise à jour par ${req.user.prenom} ${req.user.nom}`);

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

router.delete('/attendances/:id', async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Seuls les administrateurs peuvent supprimer des pointages'
      });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('attendances')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Erreur suppression:', error);
      return res.status(500).json({
        error: 'Erreur serveur',
        message: error.message
      });
    }

    console.log(`🗑️ Pointage #${id} supprimé par ${req.user.prenom} ${req.user.nom}`);

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

module.exports = router;

