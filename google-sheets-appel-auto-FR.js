// 🇫🇷 GOOGLE SHEETS FRANCE -> PAGE "APPEL" (100% AUTOMATIQUE, SANS MENU)
// A coller dans Google Sheets : Extensions -> Apps Script
//
// Cette version utilise la route PUBLIQUE /api/commandes/public :
//   - Pas de JWT à renouveler (clé fixe NOUSUNIQUE123, jamais expirée)
//   - Pays "FR" envoyé dans le body
//   - Compatible avec le site web e-commerce qui utilise la même route

// ==========================
// CONFIGURATION
// ==========================
const API_URL = 'https://atelier-confection.vercel.app/api/commandes/public';
const API_TOKEN = 'NOUSUNIQUE123'; // Clé fixe partagée, jamais expirée

// ⚠️ Ce script est dédié au pays France.
const COUNTRY_CODE = 'FR';

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
    'prix', 'prixunitaire', 'prix unitaire', 'prixunita', 'prixunit',
    'montant', 'total', 'prixunita.', 'prixunitá',
  ],
  ville: ['ville', 'localite', 'localité', 'adresse', 'quartier'],
  statutMetier: ['statut', 'status'],
};

function normalize_(v) {
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
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
  const existing = findCol_(indexByName, [SYNC_HEADER]);
  if (existing) return existing;
  for (const [key, colIndex] of indexByName.entries()) {
    if (key.includes('statut_sync') || key.includes('statut sync')) {
      sheet.getRange(HEADER_ROW, colIndex).setValue(SYNC_HEADER);
      return colIndex;
    }
  }
  const newCol = lastCol + 1;
  sheet.insertColumnAfter(lastCol);
  sheet.getRange(HEADER_ROW, newCol).setValue(SYNC_HEADER);
  return newCol;
}

function envoyerCommandeVersAPI(sheet, row, colMap) {
  const syncCol = colMap.syncCol;
  
  const syncStatus = sheet.getRange(row, syncCol).getValue();
  if (String(syncStatus).indexOf('ENVOY') > -1) return;
  
  const nomClient = colMap.nomClient ? sheet.getRange(row, colMap.nomClient).getValue() : '';
  const contact = colMap.contact ? sheet.getRange(row, colMap.contact).getValue() : '';
  const modele = colMap.modele ? sheet.getRange(row, colMap.modele).getValue() : '';
  const specificite = colMap.specificite ? sheet.getRange(row, colMap.specificite).getValue() : '';
  const taille = colMap.taille ? sheet.getRange(row, colMap.taille).getValue() : '';
  const couleur = colMap.couleur ? sheet.getRange(row, colMap.couleur).getValue() : '';
  const prix = colMap.prix ? sheet.getRange(row, colMap.prix).getValue() : '';
  const ville = colMap.ville ? sheet.getRange(row, colMap.ville).getValue() : '';

  const safeNom = nomClient ? String(nomClient).trim() : 'Client à identifier';
  const safeContact = contact ? String(contact).trim() : '';
  const safeModele = modele ? String(modele).trim() : 'Modèle non renseigné';
  
  if (!safeContact) {
    sheet.getRange(row, syncCol).setValue('❌ contact manquant');
    return;
  }
  
  const commandeData = {
    token: API_TOKEN,
    country: COUNTRY_CODE,
    client: safeNom,
    phone: safeContact,
    ville: String(ville || 'Non spécifié').trim(),
    name: safeModele,
    sku: safeModele,
    taille: String(taille || 'M').trim(),
    couleur: String(couleur || 'Non spécifié').trim(),
    price: Number(prix) || 0,
    note: specificite ? String(specificite).trim() : '',
    source: 'Google Sheets ' + COUNTRY_CODE,
    category: 'Sheet ' + COUNTRY_CODE
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(commandeData),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200 || responseCode === 201) {
      sheet.getRange(row, syncCol).setValue('✅ ENVOYE APPEL ' + COUNTRY_CODE);
    } else {
      sheet.getRange(row, syncCol).setValue('❌ HTTP ' + responseCode);
      Logger.log('Erreur HTTP ' + responseCode + ': ' + responseText);
    }
  } catch (error) {
    sheet.getRange(row, syncCol).setValue('❌ ' + error.message.substring(0, 30));
    Logger.log('Erreur envoi: ' + error.message);
  }
}

function buildColMap_(sheet) {
  const header = buildHeaderIndex_(sheet);
  const syncCol = ensureSyncCol_(sheet, header);
  const { indexByName } = buildHeaderIndex_(sheet);

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

  if (!colMap.nomClient || !colMap.contact || !colMap.modele) {
    Logger.log('⚠️ ATTENTION: En-têtes manquants ou mal nommés. Vérifie que tu as au moins: "Nom Client", "Contact", "Modèle"');
  }
  return colMap;
}

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
      Logger.log('✅ ' + totalEnvoye + ' commande(s) ' + COUNTRY_CODE + ' envoyée(s) vers la page Appel');
    }
  } catch (err) {
    Logger.log('❌ Erreur syncPending: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}

function onChange(e) {
  try { syncPending_(); } catch (err) { Logger.log('Erreur onChange: ' + err.message); }
}

function installerTriggersAutomatiques() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("Ouvre le Google Sheet, puis exécute installerTriggersAutomatiques().");

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', active.getId());
  const ss = SpreadsheetApp.openById(active.getId());

  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    const h = t.getHandlerFunction();
    if (h === 'onChange' || h === 'syncPending_' || h === 'syncNow') {
      ScriptApp.deleteTrigger(t);
    }
  }

  ScriptApp.newTrigger('onChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('syncPending_').timeBased().everyMinutes(5).create();

  Logger.log('✅ Triggers installés ' + COUNTRY_CODE + ': onChange + timeBased(5min)');
  SpreadsheetApp.getUi().alert('✅ Installation France réussie !\n\nLes commandes seront automatiquement envoyées vers la page Appel (pays FR).\n\nAucun token JWT à gérer : ce script utilise la clé fixe partagée.');
}

function syncNow() {
  syncPending_();
  SpreadsheetApp.getUi().alert('Synchronisation France terminée !\nVérifie les logs (Affichage > Journaux).');
}

function nettoyerColonnesStatutSync() {
  const ss = getSpreadsheet_();
  const sheets = ss.getSheets();
  
  for (const sheet of sheets) {
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) continue;
    
    const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
    const colsToDelete = [];
    
    headers.forEach((h, i) => {
      const normalized = normalize_(h);
      if (normalized.includes('statut_sync') || normalized.includes('statut sync')) {
        colsToDelete.push({ col: i + 1, name: h });
      }
    });
    
    if (colsToDelete.length > 1) {
      Logger.log('Feuille "' + sheet.getName() + '": ' + colsToDelete.length + ' colonnes Statut_Sync trouvées');
      sheet.getRange(HEADER_ROW, colsToDelete[0].col).setValue(SYNC_HEADER);
      for (let i = colsToDelete.length - 1; i >= 1; i--) {
        Logger.log('  Suppression colonne ' + colsToDelete[i].col + ': "' + colsToDelete[i].name + '"');
        sheet.deleteColumn(colsToDelete[i].col);
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('✅ Nettoyage terminé !\n\nLes colonnes en double ont été supprimées.');
}
