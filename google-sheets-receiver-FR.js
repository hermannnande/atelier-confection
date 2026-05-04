// 🇫🇷 GOOGLE SHEETS FRANCE — WEB APP RECEIVER
// Reçoit les commandes du tunnel HTML (POST) et ajoute une ligne au Sheet FR.
//
// ⚠️ IMPORTANT: Ce code DOIT être collé dans un projet Apps Script créé
// DEPUIS le Sheet FR (Extensions -> Apps Script depuis le bon Sheet).
//
// DEPLOIEMENT EN WEB APP:
// 1. Ouvrir le Sheet FR
// 2. Extensions -> Apps Script
// 3. Coller ce code dans Code.gs (REMPLACER tout l'ancien code si besoin)
// 4. Sauvegarder (Ctrl+S)
// 5. Cliquer "Déployer" -> "Nouveau déploiement"
//    - Type: Application Web
//    - Exécuter en tant que: Moi
//    - Qui peut accéder: Tout le monde
// 6. Copier l'URL générée et la coller dans GOOGLE_SCRIPT_URL du tunnel HTML FR
//
// EN-TETES ATTENDUS dans la ligne 1 du Sheet FR (au minimum):
//   Nom Client | Contact | Modèle | Taille | Couleur | Prix | Ville | Statut_Sync
//
// Les alias enrichis ci-dessous permettent de matcher d'autres variantes
// (ex: "Téléphone" -> phone, "Numéro" -> phone, etc.)

const SECRET_TOKEN = 'NOUSUNIQUE123';
const COUNTRY_CODE = 'FR';

const FIELD_TO_HEADER_ALIASES = {
  client: ['nom client', 'client', 'nom', 'customer', 'prenom', 'prénom', 'nom & prénom', 'nom et prénom'],
  phone:  ['contact', 'phone', 'telephone', 'téléphone', 'tel', 'mobile', 'numéro', 'numero', 'tel client'],
  name:   ['modeles', 'modèles', 'modele', 'modèle', 'produit', 'article', 'model', 'nom produit', 'sku'],
  taille: ['taille', 'size', 'tailles'],
  couleur:['couleur', 'color', 'couleurs'],
  price:  ['prix', 'prixunitaire', 'prix unitaire', 'montant', 'total', 'prix total', 'prix unita.'],
  ville:  ['ville', 'localite', 'localité', 'adresse', 'quartier', 'commune', 'code postal'],
  source: ['source', 'origine', 'origine commande'],
};

function normalize_(v) {
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findColIndex_(headers, aliases) {
  for (const alias of aliases) {
    const key = normalize_(alias);
    const idx = headers.findIndex(h => normalize_(h) === key);
    if (idx >= 0) return idx;
  }
  return -1;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput('OK - Apps Script ' + COUNTRY_CODE + ' receiver actif. Utilisez POST pour envoyer une commande.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const params = (e && e.parameter) || {};
    Logger.log('📥 PARAMS RECUS: ' + JSON.stringify(params));

    if (params.token !== SECRET_TOKEN) {
      Logger.log('❌ Token invalide: ' + params.token);
      return jsonResponse_({ success: false, message: 'Token invalide' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      Logger.log('❌ Aucun Sheet attache');
      return jsonResponse_({ success: false, message: 'Aucun Sheet attaché au projet' });
    }
    Logger.log('📂 Classeur: ' + ss.getName() + ' (' + ss.getId() + ')');

    const sheets = ss.getSheets();
    Logger.log('📑 Feuilles disponibles: ' + sheets.map(function(s){ return s.getName(); }).join(', '));

    const sheet = sheets[0];
    Logger.log('📋 Feuille utilisee: "' + sheet.getName() + '"');

    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) {
      Logger.log('❌ Sheet vide');
      return jsonResponse_({ success: false, message: 'Sheet vide' });
    }

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    Logger.log('📑 EN-TETES TROUVES: ' + JSON.stringify(headers));

    const newRow = new Array(lastCol).fill('');
    const mapping = {};
    const unmapped = [];

    Object.keys(FIELD_TO_HEADER_ALIASES).forEach(function(field) {
      const colIdx = findColIndex_(headers, FIELD_TO_HEADER_ALIASES[field]);
      if (colIdx >= 0) {
        mapping[field] = '"' + headers[colIdx] + '" (col ' + (colIdx + 1) + ')';
        var value = params[field];
        if (value === undefined || value === null) value = '';
        if (field === 'price') value = Number(value) || 0;
        newRow[colIdx] = value;
      } else {
        unmapped.push(field);
        mapping[field] = '❌ AUCUNE COLONNE TROUVEE (alias cherches: ' + FIELD_TO_HEADER_ALIASES[field].join(', ') + ')';
      }
    });

    Logger.log('🗺️ MAPPING: ' + JSON.stringify(mapping, null, 2));
    if (unmapped.length > 0) {
      Logger.log('⚠️ Champs sans colonne: ' + unmapped.join(', '));
    }

    const syncIdx = headers.findIndex(function(h) { return normalize_(h) === 'statut_sync'; });
    if (syncIdx >= 0) {
      newRow[syncIdx] = '✅ ENVOYE APPEL ' + COUNTRY_CODE + ' (Web)';
    }

    Logger.log('📝 NOUVELLE LIGNE: ' + JSON.stringify(newRow));
    sheet.appendRow(newRow);
    Logger.log('✅ Ligne ' + sheet.getLastRow() + ' ajoutee');

    return jsonResponse_({
      success: true,
      message: 'Commande ajoutee au Sheet ' + COUNTRY_CODE,
      row: sheet.getLastRow(),
      sheet_name: sheet.getName(),
      headers: headers,
      mapping: mapping,
      unmapped: unmapped
    });

  } catch (err) {
    Logger.log('❌ Erreur: ' + err.message + ' | Stack: ' + err.stack);
    return jsonResponse_({ success: false, message: 'Erreur: ' + err.message });
  }
}
