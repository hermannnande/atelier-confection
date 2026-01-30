// GOOGLE SHEETS -> PAGE "APPEL" (SANS COLONNE STATUT_SYNC VISIBLE)
// Utilise une feuille "Tracking" cachée pour éviter les doublons

// ==========================
// CONFIGURATION
// ==========================
const API_URL = 'https://atelier-confection.vercel.app/api/commandes';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmNTZkYTA1OS0xM2ZlLTRjMDEtOWYyZi0wNDAyOTA4NjdmODMiLCJyb2xlIjoiYWRtaW5pc3RyYXRldXIiLCJpYXQiOjE3NjgxNTU0NjYsImV4cCI6MTc2ODc2MDI2Nn0.BU14DFVNQVQfvI5Ncl1eve83tRmK-lijVlPkS-i1ei0';

const SPREADSHEET_ID = '';
const TRACKING_SHEET_NAME = '_Tracking_Sync'; // Nom de la feuille cachée
const HEADER_ROW = 1;
const FIRST_DATA_ROW = 2;

const HEADER_ALIASES = {
  nomClient: ['nom client', 'client', 'nom', 'customer', 'prenom', 'prénom'],
  contact: ['contact', 'phone', 'telephone', 'téléphone', 'tel', 'mobile'],
  modele: ['modeles', 'modèles', 'modele', 'modèle', 'produit', 'article', 'model'],
  specificite: ['specificite', 'spécificité', 'note', 'notes', 'description', 'details', 'détails'],
  taille: ['taille', 'size'],
  couleur: ['couleur', 'color'],
  prix: ['prix', 'prixunitaire', 'prix unitaire', 'montant', 'total'],
  ville: ['ville', 'localite', 'localité', 'adresse', 'quartier'],
};

/**
 * Helpers
 */
function normalize_(v) {
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const fromProps = props.getProperty('SPREADSHEET_ID') || '';
  const id = (SPREADSHEET_ID && String(SPREADSHEET_ID).trim()) ? String(SPREADSHEET_ID).trim() : String(fromProps).trim();
  if (id) return SpreadsheetApp.openById(id);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("ID du spreadsheet manquant.");
  return ss;
}

/**
 * Crée ou récupère la feuille de tracking (cachée)
 */
function getTrackingSheet_() {
  const ss = getSpreadsheet_();
  let trackingSheet = ss.getSheetByName(TRACKING_SHEET_NAME);
  
  if (!trackingSheet) {
    trackingSheet = ss.insertSheet(TRACKING_SHEET_NAME);
    trackingSheet.getRange(1, 1, 1, 4).setValues([['Sheet', 'Row', 'Hash', 'Date']]);
    trackingSheet.hideSheet(); // Cacher la feuille
  }
  
  return trackingSheet;
}

/**
 * Génère un hash unique pour une ligne (évite les doublons)
 */
function generateRowHash_(sheetName, row, nomClient, contact, modele) {
  const str = sheetName + '|' + row + '|' + nomClient + '|' + contact + '|' + modele;
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str)
    .map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Vérifie si une ligne a déjà été envoyée
 */
function isRowSent_(trackingSheet, hash) {
  const data = trackingSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === hash) return true;
  }
  return false;
}

/**
 * Marque une ligne comme envoyée
 */
function markRowAsSent_(trackingSheet, sheetName, row, hash) {
  trackingSheet.appendRow([sheetName, row, hash, new Date()]);
}

function buildHeaderIndex_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return { indexByName: new Map(), lastCol };
  const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0] || [];
  const indexByName = new Map();
  headers.forEach((h, i) => {
    const key = normalize_(h);
    if (key) indexByName.set(key, i + 1);
  });
  return { indexByName, lastCol };
}

function findCol_(indexByName, aliases) {
  for (const a of aliases) {
    const key = normalize_(a);
    if (indexByName.has(key)) return indexByName.get(key);
  }
  return null;
}

/**
 * Construit la map de colonnes
 */
function buildColMap_(sheet) {
  const { indexByName } = buildHeaderIndex_(sheet);

  return {
    nomClient: findCol_(indexByName, HEADER_ALIASES.nomClient),
    contact: findCol_(indexByName, HEADER_ALIASES.contact),
    modele: findCol_(indexByName, HEADER_ALIASES.modele),
    specificite: findCol_(indexByName, HEADER_ALIASES.specificite),
    taille: findCol_(indexByName, HEADER_ALIASES.taille),
    couleur: findCol_(indexByName, HEADER_ALIASES.couleur),
    prix: findCol_(indexByName, HEADER_ALIASES.prix),
    ville: findCol_(indexByName, HEADER_ALIASES.ville),
  };
}

/**
 * Envoie UNE ligne vers l'API
 */
function envoyerCommandeVersAPI(sheet, row, colMap, trackingSheet) {
  const sheetName = sheet.getName();
  
  // Récupérer les données
  const nomClient = colMap.nomClient ? sheet.getRange(row, colMap.nomClient).getValue() : '';
  const contact = colMap.contact ? sheet.getRange(row, colMap.contact).getValue() : '';
  const modele = colMap.modele ? sheet.getRange(row, colMap.modele).getValue() : '';
  const specificite = colMap.specificite ? sheet.getRange(row, colMap.specificite).getValue() : '';
  const taille = colMap.taille ? sheet.getRange(row, colMap.taille).getValue() : '';
  const couleur = colMap.couleur ? sheet.getRange(row, colMap.couleur).getValue() : '';
  const prix = colMap.prix ? sheet.getRange(row, colMap.prix).getValue() : '';
  const ville = colMap.ville ? sheet.getRange(row, colMap.ville).getValue() : '';

  // Générer un hash unique pour cette ligne
  const hash = generateRowHash_(sheetName, row, nomClient, contact, modele);
  
  // Vérifier si déjà envoyée
  if (isRowSent_(trackingSheet, hash)) {
    return; // Déjà envoyée, on skip
  }

  const safeNom = nomClient ? String(nomClient).trim() : 'Client non renseigné';
  const safeContact = contact ? String(contact).trim() : 'Contact non renseigné';
  const safeModele = modele ? String(modele).trim() : 'Modèle non renseigné';
  
  const commandeData = {
    nomClient: safeNom,
    contactClient: safeContact,
    ville: String(ville || 'Non spécifié').trim(),
    modele: safeModele,
    taille: String(taille || 'M').trim(),
    couleur: String(couleur || 'Non spécifié').trim(),
    prix: Number(prix) || 0,
    statut: 'en_attente_validation',
    note: specificite ? String(specificite).trim() : 'Importé depuis Google Sheets'
  };
  
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
    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200 || responseCode === 201) {
      markRowAsSent_(trackingSheet, sheetName, row, hash);
      Logger.log('✅ Ligne ' + row + ' envoyée avec succès');
    } else {
      Logger.log('❌ Erreur HTTP ' + responseCode + ' pour ligne ' + row);
    }
  } catch (error) {
    Logger.log('❌ Erreur envoi ligne ' + row + ': ' + error.message);
  }
}

/**
 * Synchronise toutes les lignes non envoyées
 */
function syncPending_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('Sync déjà en cours, abandon.');
    return;
  }
  
  try {
    const ss = getSpreadsheet_();
    const trackingSheet = getTrackingSheet_();
    const sheets = ss.getSheets();
    let totalEnvoye = 0;

    for (const sheet of sheets) {
      // Ignorer la feuille de tracking
      if (sheet.getName() === TRACKING_SHEET_NAME) continue;
      
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      if (lastRow < FIRST_DATA_ROW || lastCol < 1) continue;

      const colMap = buildColMap_(sheet);

      for (let row = FIRST_DATA_ROW; row <= lastRow; row++) {
        // Vérifier si la ligne est vide
        const anyValue =
          (colMap.nomClient ? sheet.getRange(row, colMap.nomClient).getValue() : '') ||
          (colMap.contact ? sheet.getRange(row, colMap.contact).getValue() : '') ||
          (colMap.modele ? sheet.getRange(row, colMap.modele).getValue() : '');
        if (!String(anyValue).trim()) continue;

        envoyerCommandeVersAPI(sheet, row, colMap, trackingSheet);
        totalEnvoye++;
        Utilities.sleep(200);
      }
    }
    
    if (totalEnvoye > 0) {
      Logger.log('✅ ' + totalEnvoye + ' commande(s) envoyée(s)');
    }
  } catch (err) {
    Logger.log('❌ Erreur: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Trigger onChange
 */
function onChange(e) {
  try {
    syncPending_();
  } catch (err) {
    Logger.log('Erreur onChange: ' + err.message);
  }
}

/**
 * INSTALLATION
 */
function installerTriggersAutomatiques() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("Ouvre le Google Sheet.");

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', active.getId());
  const ss = SpreadsheetApp.openById(active.getId());

  // Supprimer anciens triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    const h = t.getHandlerFunction();
    if (h === 'onChange' || h === 'syncPending_' || h === 'syncNow') {
      ScriptApp.deleteTrigger(t);
    }
  }

  ScriptApp.newTrigger('onChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('syncPending_').timeBased().everyMinutes(5).create();

  // Créer la feuille de tracking
  getTrackingSheet_();

  Logger.log('✅ Installation terminée');
  SpreadsheetApp.getUi().alert('✅ Installation réussie !\n\nUne feuille cachée "_Tracking_Sync" a été créée pour éviter les doublons.\nVotre interface reste propre !');
}

/**
 * Sync manuelle
 */
function syncNow() {
  syncPending_();
  SpreadsheetApp.getUi().alert('✅ Synchronisation terminée !');
}

/**
 * Réinitialiser le tracking (renvoyer toutes les commandes)
 */
function reinitialiserTracking() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '⚠️ Attention',
    'Cela va RENVOYER toutes les commandes vers la page Appel.\nContinuer ?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    const trackingSheet = getTrackingSheet_();
    trackingSheet.clear();
    trackingSheet.getRange(1, 1, 1, 4).setValues([['Sheet', 'Row', 'Hash', 'Date']]);
    ui.alert('✅ Tracking réinitialisé !');
  }
}
















