// Script Google Apps Script pour intégration future
// À déployer dans votre Google Sheet

/**
 * Fonction pour envoyer une commande à l'API
 * Déclenchée lors de l'ajout d'une nouvelle ligne dans le Google Sheet
 */
function onFormSubmit(e) {
  // URL de votre API (à modifier selon votre déploiement)
  const API_URL = 'http://votre-serveur.com/api/commandes';
  const API_TOKEN = 'votre_token_jwt'; // Token d'authentification
  
  // Récupérer les données du formulaire
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = e.range.getRow();
  const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Mapper les données selon votre structure de commande
  const commande = {
    client: {
      nom: data[0],
      contact: data[1],
      ville: data[2]
    },
    modele: {
      nom: data[3],
      image: data[4] || '',
      description: data[5] || ''
    },
    taille: data[6],
    couleur: data[7],
    prix: parseFloat(data[8]) || 0,
    urgence: data[9] === 'Oui',
    noteAppelant: data[10] || ''
  };
  
  // Envoyer à l'API
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'Bearer ' + API_TOKEN
    },
    'payload': JSON.stringify(commande),
    'muteHttpExceptions': true
  };
  
  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    const result = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 201) {
      // Succès - Marquer la ligne comme synchronisée
      sheet.getRange(row, sheet.getLastColumn() + 1).setValue('✅ Synchronisé');
      sheet.getRange(row, sheet.getLastColumn()).setValue(result.commande.numeroCommande);
      Logger.log('Commande créée: ' + result.commande.numeroCommande);
    } else {
      // Erreur
      sheet.getRange(row, sheet.getLastColumn() + 1).setValue('❌ Erreur');
      Logger.log('Erreur: ' + result.message);
    }
  } catch (error) {
    sheet.getRange(row, sheet.getLastColumn() + 1).setValue('❌ Erreur API');
    Logger.log('Erreur API: ' + error.toString());
  }
}

/**
 * Fonction pour configurer le déclencheur automatique
 * À exécuter une seule fois pour installer le déclencheur
 */
function installerDeclencheur() {
  // Supprimer les déclencheurs existants
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Créer un nouveau déclencheur sur la soumission du formulaire
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
    
  Logger.log('Déclencheur installé avec succès');
}

/**
 * Menu personnalisé dans Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Atelier API')
    .addItem('Installer le déclencheur', 'installerDeclencheur')
    .addItem('Synchroniser toutes les commandes', 'synchroniserTout')
    .addToUi();
}

/**
 * Synchroniser manuellement toutes les commandes non synchronisées
 */
function synchroniserTout() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const statusCol = sheet.getLastColumn();
  
  for (let i = 2; i <= lastRow; i++) {
    const status = sheet.getRange(i, statusCol).getValue();
    if (status !== '✅ Synchronisé') {
      // Simuler un événement de soumission pour cette ligne
      const range = sheet.getRange(i, 1, 1, sheet.getLastColumn());
      onFormSubmit({ range: range });
      Utilities.sleep(1000); // Pause de 1 seconde entre chaque appel
    }
  }
  
  SpreadsheetApp.getUi().alert('Synchronisation terminée !');
}




