// 🇫🇷 GOOGLE SHEETS FRANCE — WEB APP RECEIVER
// Reçoit les commandes du tunnel HTML (POST) et ajoute une ligne au Sheet FR.
//
// Voir google-sheets-receiver-BF.js pour les instructions de déploiement détaillées.

const SECRET_TOKEN = 'NOUSUNIQUE123';
const COUNTRY_CODE = 'FR';

const FIELD_TO_HEADER_ALIASES = {
  client: ['nom client', 'client', 'nom', 'customer', 'prenom', 'prénom'],
  phone:  ['contact', 'phone', 'telephone', 'téléphone', 'tel', 'mobile'],
  name:   ['modeles', 'modèles', 'modele', 'modèle', 'produit', 'article', 'model'],
  taille: ['taille', 'size'],
  couleur:['couleur', 'color'],
  price:  ['prix', 'prixunitaire', 'prix unitaire', 'montant', 'total'],
  ville:  ['ville', 'localite', 'localité', 'adresse', 'quartier'],
  source: ['source', 'origine'],
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

    if (params.token !== SECRET_TOKEN) {
      return jsonResponse_({ success: false, message: 'Token invalide' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return jsonResponse_({
        success: false,
        message: 'Aucun Sheet attaché au projet Apps Script. Recréer le projet depuis le Sheet ' + COUNTRY_CODE + '.'
      });
    }

    const sheet = ss.getSheets()[0];
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) {
      return jsonResponse_({
        success: false,
        message: 'Sheet vide. Ajouter au minimum une ligne d\'en-tetes (Nom Client, Contact, Modele, Taille, Couleur, Prix, Ville).'
      });
    }

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const newRow = new Array(lastCol).fill('');

    Object.keys(FIELD_TO_HEADER_ALIASES).forEach(function(field) {
      const colIdx = findColIndex_(headers, FIELD_TO_HEADER_ALIASES[field]);
      if (colIdx >= 0) {
        var value = params[field];
        if (value === undefined || value === null) value = '';
        if (field === 'price') value = Number(value) || 0;
        newRow[colIdx] = value;
      }
    });

    const syncIdx = headers.findIndex(function(h) { return normalize_(h) === 'statut_sync'; });
    if (syncIdx >= 0) {
      newRow[syncIdx] = '✅ ENVOYE APPEL ' + COUNTRY_CODE + ' (Web)';
    }

    sheet.appendRow(newRow);

    return jsonResponse_({
      success: true,
      message: 'Commande ajoutee au Sheet ' + COUNTRY_CODE,
      row: sheet.getLastRow()
    });

  } catch (err) {
    return jsonResponse_({ success: false, message: 'Erreur: ' + err.message });
  }
}
