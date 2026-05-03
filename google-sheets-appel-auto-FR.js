// ========================================
// 🇫🇷 GOOGLE SHEETS FRANCE -> PAGE "APPEL"
// ========================================
// Version multi-pays du script (pour la France uniquement)
// A coller dans le Google Sheet de la France : Extensions -> Apps Script
//
// Différence avec le script CI :
//   - Constante COUNTRY_CODE = 'FR'
//   - Le header HTTP 'X-Country: FR' est ajouté à chaque requête
//
// Tout le reste est identique au script CI.
// ========================================

// ==========================
// CONFIGURATION
// ==========================
const API_URL = 'https://atelier-confection.vercel.app/api/commandes';
const API_TOKEN = 'COLLE_TON_TOKEN_ICI'; // JWT d'un admin/gestionnaire qui a 'FR' dans pays_autorises

// ⚠️ IMPORTANT : ce script est dédié au pays France.
// Le header X-Country envoyé au backend lui dit dans quel pays créer la commande.
const COUNTRY_CODE = 'FR';

// IMPORTANT:
// - Les triggers "time-based" n'ont PAS de "classeur actif" (pas d'UI).
// - Donc on stocke automatiquement l'ID du spreadsheet au moment de l'installation des triggers.
// Tu peux laisser vide, puis exécuter installerTriggersAutomatiques() une fois.
const SPREADSHEET_ID = ''; // optionnel (sinon lu depuis ScriptProperties)

// Lignes d'en-tete / debut des donnees
const HEADER_ROW = 1;
const FIRST_DATA_ROW = 2;

// Fréquence du scan automatique (1, 5, 10, 15, 30)
const SYNC_EVERY_MINUTES = 1;

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

  // Fallback uniquement quand tu lances manuellement depuis l'UI
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("ID du spreadsheet manquant. Ouvre ton Google Sheet, puis exécute installerTriggersAutomatiques() une fois (ça enregistre l'ID).");
  return ss;
}

function buildHeaderIndex_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return { indexByName: new Map(), lastCol };
  const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0] || [];
  const indexByName = new Map();
  headers.forEach((h, i) => {
    const key = normalize_(h);
    if (key) indexByName.set(key, i + 1); // 1-based
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
  // Pour que "toute ligne" puisse remonter, on met des valeurs par défaut si manquantes.
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
    note: specificite ? String(specificite).trim() : 'Importé depuis Google Sheets ' + COUNTRY_CODE
  };
  
  // 🌐 Envoyer à l'API (avec le header X-Country pour le pays France)
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
      'X-Country': COUNTRY_CODE
    },
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
      sheet.getRange(row, syncCol).setValue('ERREUR HTTP ' + responseCode);
      Logger.log('Erreur HTTP ' + responseCode + ': ' + responseText);
    }
  } catch (error) {
    sheet.getRange(row, syncCol).setValue('ERREUR: ' + error.message);
  }
}

function getBaselineMap_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('BASELINE_ROWS') || '{}';
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setBaselineMap_(map) {
  PropertiesService.getScriptProperties().setProperty('BASELINE_ROWS', JSON.stringify(map || {}));
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

  // Si on ne trouve pas au moins nom/contact/modele, on ne peut pas synchroniser
  if (!colMap.nomClient || !colMap.contact || !colMap.modele) {
    sheet.getRange(HEADER_ROW, syncCol).setValue(SYNC_HEADER + ' (VERIFIE TES EN-TETES)');
  }
  return colMap;
}

/**
 * Synchronise toutes les lignes non envoyees (sur toutes les feuilles du classeur)
 */
function syncPending_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const ss = getSpreadsheet_();
    const sheets = ss.getSheets();
    const baselineMap = getBaselineMap_();

    for (const sheet of sheets) {
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      if (lastRow < FIRST_DATA_ROW || lastCol < 1) continue;

      const colMap = buildColMap_(sheet);
      // On essaie quand même: si les en-têtes sont manquants, la map sera incomplète
      // mais on évite de casser. Dans ce cas, l'utilisateur doit renommer ses en-têtes.
      if (!colMap.syncCol) continue;

      // ✅ IMPORTANT: on n'importe QUE les nouvelles lignes ajoutées APRES l'installation des triggers.
      const sheetKey = String(sheet.getSheetId());
      const baseline = Number(baselineMap[sheetKey] ?? (FIRST_DATA_ROW - 1));
      const startRow = Math.max(FIRST_DATA_ROW, baseline + 1);

      if (startRow > lastRow) {
        // rien de nouveau
        baselineMap[sheetKey] = lastRow;
        continue;
      }

      for (let row = startRow; row <= lastRow; row++) {
        const syncStatus = sheet.getRange(row, colMap.syncCol).getValue();
        if (String(syncStatus).indexOf('ENVOYE') > -1) continue;

        // Si la ligne est totalement vide, on skip
        // (on teste 3 champs si possible)
        const anyValue =
          (colMap.nomClient ? sheet.getRange(row, colMap.nomClient).getValue() : '') ||
          (colMap.contact ? sheet.getRange(row, colMap.contact).getValue() : '') ||
          (colMap.modele ? sheet.getRange(row, colMap.modele).getValue() : '');
        if (!String(anyValue).trim()) continue;

        envoyerCommandeVersAPI(sheet, row, colMap);
        Utilities.sleep(200);
      }

      // Après scan, on met à jour la baseline au dernier row actuel
      baselineMap[sheetKey] = lastRow;
    }

    setBaselineMap_(baselineMap);
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
 * - Trigger onChange
 * - Trigger temps (toutes les minutes par défaut) -> tres fiable meme si l'ajout vient d'un site/API
 */
function installerTriggersAutomatiques() {
  // IMPORTANT: a executer depuis le bon Google Sheet (celui qui reçoit les commandes)
  // pour enregistrer l'ID du spreadsheet pour les triggers time-based.
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("Ouvre le Google Sheet (dans le navigateur), puis exécute installerTriggersAutomatiques() depuis Apps Script.");

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', active.getId());
  const ss = SpreadsheetApp.openById(active.getId());

  // ✅ Baseline: on mémorise la dernière ligne existante MAINTENANT,
  // ainsi les anciennes lignes ne seront jamais importées.
  const baselineMap = {};
  for (const sh of ss.getSheets()) {
    baselineMap[String(sh.getSheetId())] = sh.getLastRow();
  }
  setBaselineMap_(baselineMap);

  // Supprimer les anciens triggers lies a ce script
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    const h = t.getHandlerFunction();
    if (h === 'onChange' || h === 'syncPending_' || h === 'syncNow') {
      ScriptApp.deleteTrigger(t);
    }
  }

  ScriptApp.newTrigger('onChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('syncPending_').timeBased().everyMinutes(SYNC_EVERY_MINUTES).create();

  Logger.log('Triggers installés pour ' + COUNTRY_CODE + ': onChange + timeBased(' + SYNC_EVERY_MINUTES + 'min)');
}

// Alias au cas ou tu as deja execute l'ancien nom
function installerTriggerAutomatique() {
  installerTriggersAutomatiques();
}

/**
 * Lancer une synchro manuelle (pour tester)
 */
function syncNow() {
  syncPending_();
}
