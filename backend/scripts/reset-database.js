import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '../.env') });

// Importer les modèles
import Commande from '../models/Commande.js';

const resetDatabase = async () => {
  try {
    console.log('🔄 Connexion à la base de données...');
    
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/atelier-confection');
    
    console.log('✅ Connecté à MongoDB');
    console.log('');
    
    // Compter les commandes avant suppression
    const countBefore = await Commande.countDocuments();
    console.log(`📊 Nombre de commandes actuelles : ${countBefore}`);
    console.log('');
    
    if (countBefore === 0) {
      console.log('✨ La base de données est déjà vide !');
      process.exit(0);
    }
    
    console.log('🗑️  Suppression de toutes les commandes...');
    
    // Supprimer toutes les commandes
    const result = await Commande.deleteMany({});
    
    console.log('');
    console.log('✅ RÉINITIALISATION TERMINÉE !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ${result.deletedCount} commande(s) supprimée(s)`);
    console.log('   Système prêt pour de nouvelles données');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('👋 Déconnexion de la base de données');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ ERREUR lors de la réinitialisation :');
    console.error(error.message);
    console.error('');
    process.exit(1);
  }
};

// Lancer la réinitialisation
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🔄 SCRIPT DE RÉINITIALISATION COMPLÈTE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('⚠️  ATTENTION : Toutes les commandes vont être supprimées !');
console.log('');

// Attendre 3 secondes avant de lancer
setTimeout(() => {
  console.log('🚀 Lancement dans 3 secondes...');
  setTimeout(() => {
    console.log('');
    resetDatabase();
  }, 3000);
}, 100);

