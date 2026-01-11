// 📞 SCRIPT GOOGLE SHEETS → PAGE APPEL - VERSION VERCEL
// ⚠️ À COPIER DANS GOOGLE SHEETS : Extensions → Apps Script

// ⚙️ CONFIGURATION
const API_URL = 'https://atelier-confection.vercel.app/api/commandes'; 
const API_TOKEN = 'TON_TOKEN_A_RECUPERER'; // ⚠️ Voir instructions ci-dessous

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔑 COMMENT RÉCUPÉRER TON TOKEN :
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 1. Va sur https://atelier-confection.vercel.app
// 2. Connecte-toi avec admin@atelier.com / admin123
// 3. Appuie sur F12 (Console du navigateur)
// 4. Va dans : Application → Local Storage → https://atelier-confection.vercel.app
// 5. Copie la valeur de "token"
// 6. Colle-la ci-dessus dans API_TOKEN
//
// OU en une ligne dans PowerShell :
// curl.exe -X POST https://atelier-confection.vercel.app/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"admin@atelier.com\",\"password\":\"admin123\"}'
// Copie le "token" reçu
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 📋 MAPPING DES COLONNES (selon ton sheet)
const COLONNES = {
  NOM_CLIENT: 2,     // B - Nom client (ex: Nipié Jemima)
  CONTACT: 3,        // C - Contact (ex: 788714889)
  MODELE: 4,         // D - Modèle (ex: Robe Volante)
  SPECIFICITE: 5,    // E - Spécificité (note/description)
  TAILLE: 6,         // F - Taille (ex: 2XL)
  COULEUR: 7,        // G - Couleur (ex: Blanc)
  PRIX: 9,           // I - Prix (ex: 11000)
  VILLE: 16,         // P - Ville (ex: Blanc)
  STATUT_SHEET: 17   // Q - Statut ("✅ ENVOYÉ APPEL")
};

/**
 * 🚀 Fonction principale : Envoyer une commande à l'API
 */
function envoyerCommandeVersAPI(row) {
  const sheet = SpreadsheetApp.getActiveSheet();
  
  // 📊 Récupérer les données de la ligne
  const nomClient = sheet.getRange(row, COLONNES.NOM_CLIENT).getValue();
  const contact = sheet.getRange(row, COLONNES.CONTACT).getValue();
  const modele = sheet.getRange(row, COLONNES.MODELE).getValue();
  const specificite = sheet.getRange(row, COLONNES.SPECIFICITE).getValue();
  const taille = sheet.getRange(row, COLONNES.TAILLE).getValue();
  const couleur = sheet.getRange(row, COLONNES.COULEUR).getValue();
  const prix = sheet.getRange(row, COLONNES.PRIX).getValue();
  const ville = sheet.getRange(row, COLONNES.VILLE).getValue();
  
  // ✅ Valider les données essentielles
  if (!nomClient || !contact || !modele) {
    Logger.log('❌ Données manquantes pour la ligne ' + row);
    sheet.getRange(row, COLONNES.STATUT_SHEET).setValue('❌ ERREUR - Données manquantes');
    return;
  }
  
  // 📦 Préparer les données pour l'API
  const commandeData = {
    nomClient: String(nomClient).trim(),
    contactClient: String(contact).trim(),
    ville: String(ville || 'Non spécifié').trim(),
    modele: String(modele).trim(),
    taille: String(taille || 'M').trim(),
    couleur: String(couleur || 'Non spécifié').trim(),
    prix: Number(prix) || 0,
    statut: 'en_attente_validation',
    note: specificite ? String(specificite).trim() : 'Importé depuis Google Sheets le ' + new Date().toLocaleString('fr-FR')
  };
  
  // 🌐 Envoyer à l'API
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN
    },
    payload: JSON.stringify(commandeData),
    muteHttpExceptions: true
  };
  
  try {
    Logger.log('📤 Envoi de la commande : ' + JSON.stringify(commandeData));
    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200 || responseCode === 201) {
      Logger.log('✅ Commande envoyée avec succès !');
      sheet.getRange(row, COLONNES.STATUT_SHEET).setValue('✅ ENVOYÉ APPEL');
      sheet.getRange(row, COLONNES.STATUT_SHEET).setBackground('#d4edda');
      
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Commande de ' + nomClient + ' envoyée vers Appel !',
        '✅ Succès',
        5
      );
    } else {
      Logger.log('❌ Erreur HTTP ' + responseCode + ': ' + responseText);
      sheet.getRange(row, COLONNES.STATUT_SHEET).setValue('❌ ERREUR ' + responseCode);
      sheet.getRange(row, COLONNES.STATUT_SHEET).setBackground('#f8d7da');
    }
  } catch (error) {
    Logger.log('❌ Erreur lors de l\'envoi : ' + error.message);
    sheet.getRange(row, COLONNES.STATUT_SHEET).setValue('❌ ERREUR - ' + error.message);
    sheet.getRange(row, COLONNES.STATUT_SHEET).setBackground('#f8d7da');
  }
}

/**
 * 🔄 Trigger : Nouvelle ligne ajoutée
 */
function onFormSubmit(e) {
  const row = e.range.getRow();
  Logger.log('🆕 Nouvelle ligne détectée : ' + row);
  envoyerCommandeVersAPI(row);
}

/**
 * 📝 Menu personnalisé : Envoyer manuellement
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📞 Appel API')
    .addItem('📤 Envoyer ligne sélectionnée', 'envoyerLigneSelectionnee')
    .addItem('📤 Envoyer toutes les lignes non envoyées', 'envoyerToutesLignes')
    .addItem('⚙️ Tester la connexion API', 'testerConnexion')
    .addToUi();
}

/**
 * 📤 Envoyer la ligne actuellement sélectionnée
 */
function envoyerLigneSelectionnee() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = sheet.getActiveCell().getRow();
  
  if (row < 2) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Sélectionne une ligne de données (pas l\'en-tête)', '⚠️ Attention', 3);
    return;
  }
  
  envoyerCommandeVersAPI(row);
}

/**
 * 📤 Envoyer toutes les lignes qui n'ont pas été envoyées
 */
function envoyerToutesLignes() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  let compteur = 0;
  
  for (let row = 2; row <= lastRow; row++) {
    const statut = sheet.getRange(row, COLONNES.STATUT_SHEET).getValue();
    
    if (!statut || String(statut).indexOf('ENVOYÉ') === -1) {
      envoyerCommandeVersAPI(row);
      compteur++;
      Utilities.sleep(500);
    }
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    compteur + ' commande(s) envoyée(s) vers Appel !',
    '✅ Terminé',
    5
  );
}

/**
 * ⚙️ Tester la connexion à l'API
 */
function testerConnexion() {
  try {
    const testOptions = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch('https://atelier-confection.vercel.app/api/system/health', testOptions);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200 || responseCode === 404) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Connexion API réussie ! Code: ' + responseCode,
        '✅ Succès',
        5
      );
      Logger.log('✅ Connexion API OK');
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Erreur API : Code ' + responseCode,
        '❌ Erreur',
        5
      );
      Logger.log('❌ Erreur API : ' + responseCode);
    }
  } catch (error) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Erreur : ' + error.message,
      '❌ Erreur',
      5
    );
    Logger.log('❌ Erreur connexion : ' + error.message);
  }
}

/**
 * 🔧 Installer le trigger automatique
 */
function installerTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
  
  Logger.log('✅ Trigger installé !');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Trigger installé ! Les nouvelles lignes seront envoyées automatiquement.',
    '✅ Succès',
    5
  );
}
