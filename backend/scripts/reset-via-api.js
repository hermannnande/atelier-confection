import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Identifiants admin par défaut (à ajuster selon votre configuration)
const ADMIN_EMAIL = 'admin@atelier.com';
const ADMIN_PASSWORD = 'admin123';

const resetViaAPI = async () => {
  try {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🔄 RÉINITIALISATION VIA API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Étape 1: Authentification
    console.log('🔐 Authentification admin...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Échec de l'authentification: ${loginResponse.status}`);
    }

    const { token } = await loginResponse.json();
    console.log('✅ Authentifié avec succès');
    console.log('');

    // Étape 2: Compter les commandes
    console.log('📊 Récupération du nombre de commandes...');
    const countResponse = await fetch(`${API_URL}/commandes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!countResponse.ok) {
      throw new Error(`Échec de récupération: ${countResponse.status}`);
    }

    const { commandes } = await countResponse.json();
    console.log(`   Nombre actuel: ${commandes.length} commandes`);
    console.log('');

    if (commandes.length === 0) {
      console.log('✨ La base de données est déjà vide !');
      console.log('');
      process.exit(0);
    }

    // Étape 3: Réinitialisation
    console.log('🗑️  Suppression en cours...');
    const resetResponse = await fetch(`${API_URL}/commandes/admin/reset-all`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!resetResponse.ok) {
      const error = await resetResponse.json();
      throw new Error(error.message || `Échec de la réinitialisation: ${resetResponse.status}`);
    }

    const result = await resetResponse.json();
    
    console.log('');
    console.log('✅ RÉINITIALISATION TERMINÉE !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ${result.deletedCount} commande(s) supprimée(s)`);
    console.log('   Système prêt pour de nouvelles données');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ ERREUR :');
    console.error('   ' + error.message);
    console.error('');
    console.error('💡 Vérifiez que :');
    console.error('   - Le serveur backend est démarré');
    console.error('   - L\'URL de l\'API est correcte');
    console.error('   - Les identifiants admin sont valides');
    console.error('');
    process.exit(1);
  }
};

console.log('');
console.log('⚠️  ATTENTION : Toutes les commandes vont être supprimées !');
console.log('');
console.log('🚀 Lancement dans 2 secondes...');

setTimeout(() => {
  resetViaAPI();
}, 2000);

