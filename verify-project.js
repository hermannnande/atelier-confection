#!/usr/bin/env node

/**
 * Script de vérification de l'intégrité du projet Atelier de Confection
 * Vérifie que tous les fichiers essentiels sont présents
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de l\'intégrité du projet...\n');

const checks = {
  success: 0,
  errors: 0,
  warnings: 0
};

// Fonction helper pour vérifier l'existence d'un fichier
function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description}`);
    checks.success++;
    return true;
  } else {
    console.log(`❌ MANQUANT: ${description}`);
    console.log(`   Chemin: ${filePath}`);
    checks.errors++;
    return false;
  }
}

// Fonction pour vérifier le contenu d'un fichier
function checkFileContent(filePath, searchString, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes(searchString)) {
      console.log(`✅ ${description}`);
      checks.success++;
      return true;
    } else {
      console.log(`⚠️  ATTENTION: ${description}`);
      console.log(`   Recherche: "${searchString}" non trouvée dans ${filePath}`);
      checks.warnings++;
      return false;
    }
  } else {
    console.log(`❌ FICHIER MANQUANT: ${filePath}`);
    checks.errors++;
    return false;
  }
}

console.log('📄 Vérification des pages frontend:\n');
checkFile('frontend/src/pages/CaisseLivreurs.jsx', 'Page Caisse Livreurs');
checkFile('frontend/src/pages/Appel.jsx', 'Page Appel');
checkFile('frontend/src/pages/Commandes.jsx', 'Page Commandes');
checkFile('frontend/src/pages/PreparationColis.jsx', 'Page Préparation Colis');
checkFile('frontend/src/pages/HistoriqueCommandes.jsx', 'Page Historique Complet');
checkFile('frontend/src/pages/AtelierStyliste.jsx', 'Page Atelier Styliste');
checkFile('frontend/src/pages/AtelierCouturier.jsx', 'Page Atelier Couturier');
checkFile('frontend/src/pages/Livraisons.jsx', 'Page Livraisons');

console.log('\n🔗 Vérification des routes:\n');
checkFileContent('frontend/src/App.jsx', 'CaisseLivreurs', 'Import CaisseLivreurs dans App.jsx');
checkFileContent('frontend/src/App.jsx', '/caisse-livreurs', 'Route /caisse-livreurs configurée');

console.log('\n🧭 Vérification de la navigation:\n');
checkFileContent('frontend/src/components/Layout.jsx', 'Caisse Livreurs', 'Menu Caisse Livreurs');
checkFileContent('frontend/src/components/Layout.jsx', 'Wallet', 'Icône Wallet importée');

console.log('\n🔧 Vérification backend:\n');
checkFile('backend/routes/livraisons.js', 'Routes livraisons (MongoDB)');
checkFile('backend/supabase/routes/livraisons.js', 'Routes livraisons (Supabase)');
checkFile('backend/models/Livraison.js', 'Modèle Livraison');

console.log('\n📊 Vérification des champs de paiement:\n');
checkFileContent('backend/models/Livraison.js', 'paiement_recu', 'Champ paiement_recu dans modèle');
checkFileContent('backend/models/Livraison.js', 'date_paiement', 'Champ date_paiement dans modèle');

console.log('\n📝 Vérification des migrations:\n');
checkFile('backend/supabase/migrations/add_paiement_fields.sql', 'Migration SQL paiements');

console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ DE LA VÉRIFICATION:\n');
console.log(`✅ Succès: ${checks.success}`);
console.log(`⚠️  Avertissements: ${checks.warnings}`);
console.log(`❌ Erreurs: ${checks.errors}`);
console.log('='.repeat(60) + '\n');

if (checks.errors > 0) {
  console.log('❌ Des fichiers essentiels sont manquants !');
  console.log('📞 Restaurez les fichiers depuis le dépôt Git ou contactez le support.\n');
  process.exit(1);
} else if (checks.warnings > 0) {
  console.log('⚠️  Quelques éléments nécessitent votre attention.');
  console.log('✅ Mais le projet devrait fonctionner correctement.\n');
  process.exit(0);
} else {
  console.log('✅ TOUT EST EN PLACE ! Le projet est complet et fonctionnel.\n');
  console.log('💡 Si vous ne voyez pas la page "Caisse Livreurs":');
  console.log('   1. Videz le cache du navigateur (Ctrl+F5)');
  console.log('   2. Redémarrez le serveur frontend');
  console.log('   3. Vérifiez votre rôle utilisateur (Gestionnaire ou Admin)\n');
  process.exit(0);
}


