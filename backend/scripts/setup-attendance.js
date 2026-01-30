/**
 * ============================================================================
 * SCRIPT : CONFIGURATION DU SYSTÈME DE POINTAGE GPS
 * ============================================================================
 * 
 * Ce script configure les coordonnées GPS de votre atelier dans la base de données.
 * 
 * AVANT D'EXÉCUTER CE SCRIPT :
 * 1. Obtenez vos coordonnées GPS sur Google Maps
 * 2. Remplacez les valeurs ci-dessous par vos vraies coordonnées
 * 3. Exécutez : node backend/scripts/setup-attendance.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur : Variables d\'environnement manquantes');
  console.error('   Assurez-vous que SUPABASE_URL et SUPABASE_SERVICE_KEY sont définis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAttendanceConfig() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║     🚀 CONFIGURATION SYSTÈME DE POINTAGE GPS            ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // ========================================================================
  // ⚠️ CONFIGURATION À MODIFIER AVEC VOS COORDONNÉES GPS
  // ========================================================================
  
  const config = {
    nom: 'Atelier de Confection Principal',
    adresse: 'Abidjan, Côte d\'Ivoire', // 📍 À modifier
    
    // 🌍 COORDONNÉES GPS DE VOTRE ATELIER
    // Comment les obtenir :
    // 1. Ouvrir Google Maps : https://www.google.com/maps
    // 2. Rechercher votre atelier
    // 3. Clic-droit sur l'emplacement exact
    // 4. Copier les coordonnées (ex: 5.353021, -3.870182)
    
    latitude: 5.353859,   // Coordonnées atelier (mise à jour)
    longitude: -3.868327, // Coordonnées atelier (mise à jour)
    
    // PARAMÈTRES DE VALIDATION
    rayon_tolerance: 50,     // Rayon en mètres (50m recommandé)
    heure_ouverture: '08:30', // Heure d'ouverture
    heure_fermeture: '17:30', // Heure de fermeture
    tolerance_retard: 15      // Tolérance de retard en minutes
  };

  // ========================================================================
  // Vérification des coordonnées
  // ========================================================================
  
  console.log('📍 Configuration à appliquer :');
  console.log('   ├─ Nom : ' + config.nom);
  console.log('   ├─ Adresse : ' + config.adresse);
  console.log('   ├─ Latitude : ' + config.latitude);
  console.log('   ├─ Longitude : ' + config.longitude);
  console.log('   ├─ Rayon de tolérance : ' + config.rayon_tolerance + 'm');
  console.log('   ├─ Horaires : ' + config.heure_ouverture + ' - ' + config.heure_fermeture);
  console.log('   └─ Tolérance retard : ' + config.tolerance_retard + ' minutes');
  console.log('');

  // ========================================================================
  // Insertion/mise à jour dans la base de données
  // ========================================================================

  try {
    console.log('🔄 Vérification de la configuration existante...');

    // Vérifier si une config existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('store_config')
      .select('*')
      .maybeSingle();

    let result;

    if (existing) {
      // Mise à jour
      console.log('📝 Configuration existante trouvée. Mise à jour...');
      
      result = await supabase
        .from('store_config')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insertion
      console.log('➕ Aucune configuration trouvée. Création...');
      
      result = await supabase
        .from('store_config')
        .insert(config)
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║             ✅ CONFIGURATION RÉUSSIE !                   ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('✨ Le système de pointage GPS est maintenant configuré !');
    console.log('');
    console.log('📊 Paramètres appliqués :');
    console.log('   ✓ Latitude : ' + result.data.latitude);
    console.log('   ✓ Longitude : ' + result.data.longitude);
    console.log('   ✓ Rayon de validation : ' + result.data.rayon_tolerance + 'm');
    console.log('   ✓ Horaires : ' + result.data.heure_ouverture + ' - ' + result.data.heure_fermeture);
    console.log('   ✓ Tolérance retard : ' + result.data.tolerance_retard + ' min');
    console.log('');
    console.log('🎯 Prochaines étapes :');
    console.log('   1. Exécuter la migration SQL (si pas déjà fait) :');
    console.log('      → Ouvrir Supabase Dashboard > SQL Editor');
    console.log('      → Copier le contenu de supabase/migrations/20260130_add_attendance_system.sql');
    console.log('      → Exécuter la requête');
    console.log('');
    console.log('   2. Accéder au système de pointage :');
    console.log('      → Menu : Présence (pour pointer)');
    console.log('      → Menu : Historique Présences (admin/gestionnaire)');
    console.log('');
    console.log('   3. Tester le système :');
    console.log('      → Ouvrir Chrome DevTools (F12)');
    console.log('      → Onglet "Sensors" (dans "..." > More tools)');
    console.log('      → Simuler une position GPS');
    console.log('      → Cliquer sur "Marquer ma présence"');
    console.log('');
    console.log('💡 Pour modifier la configuration plus tard :');
    console.log('   → Connexion en tant qu\'admin');
    console.log('   → API PUT /api/attendance/store-config');
    console.log('   → Ou modifier ce script et le réexécuter');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║                                                          ║');
    console.error('║             ❌ ERREUR DE CONFIGURATION                   ║');
    console.error('║                                                          ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Message d\'erreur :', error.message);
    console.error('');
    console.error('🔍 Solutions possibles :');
    console.error('   1. Vérifiez que la migration SQL a été exécutée');
    console.error('   2. Vérifiez vos variables d\'environnement (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
    console.error('   3. Vérifiez que la table store_config existe dans Supabase');
    console.error('');
    process.exit(1);
  }
}

// Exécuter la configuration
setupAttendanceConfig();

