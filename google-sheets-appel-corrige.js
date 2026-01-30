// GOOGLE SHEETS -> PAGE "APPEL" (100% AUTOMATIQUE, SANS MENU)
// A coller dans Google Sheets : Extensions -> Apps Script

// ==========================
// CONFIGURATION
// ==========================
const API_URL = 'https://atelier-confection.vercel.app/api/commandes';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmNTZkYTA1OS0xM2ZlLTRjMDEtOWYyZi0wNDAyOTA4NjdmODMiLCJyb2xlIjoiYWRtaW5pc3RyYXRldXIiLCJpYXQiOjE3NjgxNTU0NjYsImV4cCI6MTc2ODc2MDI2Nn0.BU14DFVNQVQfvI5Ncl1eve83tRmK-lijVlPkS-i1ei0';

const SPREADSHEET_ID = '';

// Lignes d'en-tete / debut des donnees
const HEADER_ROW = 1;
const FIRST_DATA_ROW = 2;

// Nom de la colonne de synchronisation (sera creee si absente)
const SYNC_HEADER = 'Statut_Sync';

// Aliases d'en-tetes (le script retrouve les colonnes en fonction des titres en ligne 1)
const HEADER_ALIASES = {
  nomClient: ['nom client', 'client', 'nom', 'customer', 'prenom', 'prénom'],
  contact: ['contact', 'phone', 'telephone', 'téléphone', 'tel', 'mobile'],
  modele: ['modeles', 'modèles', 'modele', 'modèle', 'produit', 'article', 'model'],
  specificite: ['specificite', 'spécificité', 'note', 'notes', 'description', 'details', 'détails'],
  taille: ['taille', 'size'],
  couleur: ['couleur', 'color'],
  prix: [
    'prix',
    'prixunitaire',
    'prix unitaire',
    'prixunita',
    'prixunit',
    'montant',
    'total',
    'prixunita',
    'prixunita.',
    'prixunitá',
  ],
  ville: ['ville', 'localite', 'localité', 'adresse', 'quartier'],
  statutMetier: ['statut', 'status'],
};

/**
 * Helpers
 */
function normalize_(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const fromProps = props.getProperty('SPREADSHEET_ID') || '';
  const id = (SPREADSHEET_ID && String(SPREADSHEET_ID).trim()) ? String(SPREADSHEET_ID).trim() : String(fromProps).trim();
  if (id) return SpreadsheetApp.openById(id);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("ID du spreadsheet manquant. Ouvre ton Google Sheet, puis exécute installerTriggersAutomatiques() une fois.");
  return ss;
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

function ensureSyncCol_(sheet, header) {
  const { indexByName, lastCol } = header;
  
  // ✅ Chercher la colonne existante EXACTEMENT par le nom "statut_sync"
  // On ignore les variantes avec "(VERIFIE...)" pour éviter les doublons
  const existing = findCol_(indexByName, [SYNC_HEADER]);
  if (existing) return existing;
  
  // ✅ Chercher aussi les variantes avec le texte "(VERIFIE" pour les réutiliser
  for (const [key, colIndex] of indexByName.entries()) {
    if (key.includes('statut_sync') || key.includes('statut sync')) {
      // Renommer proprement la colonne existante
      sheet.getRange(HEADER_ROW, colIndex).setValue(SYNC_HEADER);
      return colIndex;
    }
  }

  // Si vraiment pas trouvée, créer une nouvelle colonne
  const newCol = lastCol + 1;
  sheet.insertColumnAfter(lastCol);
  sheet.getRange(HEADER_ROW, newCol).setValue(SYNC_HEADER);
  return newCol;
}

/**
 * Envoie UNE ligne vers l'API, en utilisant un mapping par en-tetes.
 */
function envoyerCommandeVersAPI(sheet, row, colMap) {
  const syncCol = colMap.syncCol;
  
  // Vérifier si déjà envoyée
  const syncStatus = sheet.getRange(row, syncCol).getValue();
  if (String(syncStatus).indexOf('ENVOY') > -1) return;
  
  // 📊 Récupérer les données de la ligne
  const nomClient = colMap.nomClient ? sheet.getRange(row, colMap.nomClient).getValue() : '';
  const contact = colMap.contact ? sheet.getRange(row, colMap.contact).getValue() : '';
  const modele = colMap.modele ? sheet.getRange(row, colMap.modele).getValue() : '';
  const specificite = colMap.specificite ? sheet.getRange(row, colMap.specificite).getValue() : '';
  const taille = colMap.taille ? sheet.getRange(row, colMap.taille).getValue() : '';
  const couleur = colMap.couleur ? sheet.getRange(row, colMap.couleur).getValue() : '';
  const prix = colMap.prix ? sheet.getRange(row, colMap.prix).getValue() : '';
  const ville = colMap.ville ? sheet.getRange(row, colMap.ville).getValue() : '';

  // ✅ Valider les données essentielles
  const safeNom = nomClient ? String(nomClient).trim() : 'Client non renseigné';
  const safeContact = contact ? String(contact).trim() : 'Contact non renseigné';
  const safeModele = modele ? String(modele).trim() : 'Modèle non renseigné';
  
  // 📦 Préparer les données pour l'API
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
    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200 || responseCode === 201) {
      sheet.getRange(row, syncCol).setValue('✅ ENVOYE APPEL');
    } else {
      sheet.getRange(row, syncCol).setValue('❌ HTTP ' + responseCode);
      Logger.log('Erreur HTTP ' + responseCode + ': ' + responseText);
    }
  } catch (error) {
    sheet.getRange(row, syncCol).setValue('❌ ' + error.message.substring(0, 30));
    Logger.log('Erreur envoi: ' + error.message);
  }
}

/**
 * Construit la map de colonnes a partir des en-tetes
 */
function buildColMap_(sheet) {
  const header = buildHeaderIndex_(sheet);
  const syncCol = ensureSyncCol_(sheet, header);
  const { indexByName } = buildHeaderIndex_(sheet); // relire apres creation possible

  const colMap = {
    nomClient: findCol_(indexByName, HEADER_ALIASES.nomClient),
    contact: findCol_(indexByName, HEADER_ALIASES.contact),
    modele: findCol_(indexByName, HEADER_ALIASES.modele),
    specificite: findCol_(indexByName, HEADER_ALIASES.specificite),
    taille: findCol_(indexByName, HEADER_ALIASES.taille),
    couleur: findCol_(indexByName, HEADER_ALIASES.couleur),
    prix: findCol_(indexByName, HEADER_ALIASES.prix),
    ville: findCol_(indexByName, HEADER_ALIASES.ville),
    statutMetier: findCol_(indexByName, HEADER_ALIASES.statutMetier),
    syncCol,
  };

  // ✅ CORRECTION : Ne JAMAIS modifier le nom de la colonne !
  // On logue juste un avertissement si les en-têtes sont manquants
  if (!colMap.nomClient || !colMap.contact || !colMap.modele) {
    Logger.log('⚠️ ATTENTION: En-têtes manquants ou mal nommés. Vérifie que tu as au moins: "Nom Client", "Contact", "Modèle"');
    // Les commandes seront quand même envoyées avec des valeurs par défaut
  }
  
  return colMap;
}

/**
 * Synchronise toutes les lignes non envoyees (sur toutes les feuilles du classeur)
 */
function syncPending_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('Sync déjà en cours, abandon.');
    return;
  }
  try {
    const ss = getSpreadsheet_();
    const sheets = ss.getSheets();
    let totalEnvoye = 0;

    for (const sheet of sheets) {
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      if (lastRow < FIRST_DATA_ROW || lastCol < 1) continue;

      const colMap = buildColMap_(sheet);
      if (!colMap.syncCol) continue;

      for (let row = FIRST_DATA_ROW; row <= lastRow; row++) {
        const syncStatus = sheet.getRange(row, colMap.syncCol).getValue();
        if (String(syncStatus).indexOf('ENVOYE') > -1) continue;

        // Si la ligne est totalement vide, on skip
        const anyValue =
          (colMap.nomClient ? sheet.getRange(row, colMap.nomClient).getValue() : '') ||
          (colMap.contact ? sheet.getRange(row, colMap.contact).getValue() : '') ||
          (colMap.modele ? sheet.getRange(row, colMap.modele).getValue() : '');
        if (!String(anyValue).trim()) continue;

        envoyerCommandeVersAPI(sheet, row, colMap);
        totalEnvoye++;
        Utilities.sleep(200);
      }
    }
    
    if (totalEnvoye > 0) {
      Logger.log('✅ ' + totalEnvoye + ' commande(s) envoyée(s) vers la page Appel');
    }
  } catch (err) {
    Logger.log('❌ Erreur syncPending: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Trigger onChange (installable): relance une synchro legere
 */
function onChange(e) {
  try {
    syncPending_();
  } catch (err) {
    Logger.log('Erreur onChange: ' + err.message);
  }
}

/**
 * INSTALLATION (a executer UNE SEULE FOIS)
 */
function installerTriggersAutomatiques() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("Ouvre le Google Sheet, puis exécute installerTriggersAutomatiques().");

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', active.getId());
  const ss = SpreadsheetApp.openById(active.getId());

  // Supprimer les anciens triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    const h = t.getHandlerFunction();
    if (h === 'onChange' || h === 'syncPending_' || h === 'syncNow') {
      ScriptApp.deleteTrigger(t);
    }
  }

  ScriptApp.newTrigger('onChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('syncPending_').timeBased().everyMinutes(5).create();

  Logger.log('✅ Triggers installés: onChange + timeBased(5min)');
  SpreadsheetApp.getUi().alert('✅ Installation réussie !\n\nLes commandes seront automatiquement envoyées vers la page Appel.');
}

/**
 * Lancer une synchro manuelle (pour tester)
 */
function syncNow() {
  syncPending_();
  SpreadsheetApp.getUi().alert('Synchronisation terminée !\nVérifie les logs (Affichage > Journaux).');
}

/**
 * 🧹 NETTOYAGE: Supprimer les colonnes "Statut_Sync" en double
 * Exécute cette fonction UNE FOIS pour nettoyer les colonnes en trop
 */
function nettoyerColonnesStatutSync() {
  const ss = getSpreadsheet_();
  const sheets = ss.getSheets();
  
  for (const sheet of sheets) {
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) continue;
    
    const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
    const colsToDelete = [];
    
    // Trouver toutes les colonnes avec "statut_sync" ou "statut sync"
    headers.forEach((h, i) => {
      const normalized = normalize_(h);
      if (normalized.includes('statut_sync') || normalized.includes('statut sync')) {
        colsToDelete.push({ col: i + 1, name: h });
      }
    });
    
    // Garder seulement la première, supprimer les autres
    if (colsToDelete.length > 1) {
      Logger.log('Feuille "' + sheet.getName() + '": ' + colsToDelete.length + ' colonnes Statut_Sync trouvées');
      
      // Renommer la première proprement
      sheet.getRange(HEADER_ROW, colsToDelete[0].col).setValue(SYNC_HEADER);
      
      // Supprimer les autres (en partant de la fin pour ne pas décaler les index)
      for (let i = colsToDelete.length - 1; i >= 1; i--) {
        Logger.log('  Suppression colonne ' + colsToDelete[i].col + ': "' + colsToDelete[i].name + '"');
        sheet.deleteColumn(colsToDelete[i].col);
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('✅ Nettoyage terminé !\n\nLes colonnes en double ont été supprimées.');
}
















