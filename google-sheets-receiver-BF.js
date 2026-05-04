// 🇧🇫 GOOGLE SHEETS BURKINA FASO — WEB APP RECEIVER
// Reçoit les commandes du tunnel HTML (POST) et ajoute une ligne au Sheet BF.
//
// ⚠️ IMPORTANT: Ce code DOIT être collé dans un projet Apps Script créé
// DEPUIS le Sheet BF (Extensions -> Apps Script depuis le bon Sheet).
//
// DEPLOIEMENT EN WEB APP:
// 1. Coller ce code dans Code.gs (REMPLACER tout l'ancien code)
// 2. Sauvegarder (Ctrl+S)
// 3. Cliquer "Déployer" -> "Gérer les déploiements" (icône engrenage)
//    -> Modifier le déploiement existant -> Nouvelle version -> Déployer
//    L'URL reste la même !
// 4. Si jamais c'est un nouveau déploiement: "Nouveau déploiement"
//    - Type: Application Web
//    - Exécuter en tant que: Moi
//    - Qui peut accéder: Tout le monde
//    Copier la nouvelle URL et la mettre dans GOOGLE_SCRIPT_URL du tunnel HTML.
//
// PAYLOAD ATTENDU (form-urlencoded depuis le tunnel HTML):
//   token   = NOUSUNIQUE123 (obligatoire)
//   country = BF (informatif, optionnel)
//   client, phone, ville, sku, name, taille, couleur, price, source

const SECRET_TOKEN = 'NOUSUNIQUE123';
const COUNTRY_CODE = 'BF';

// Aliases d'en-tetes pour matcher les colonnes du Sheet BF.
// Le receiver retrouve la bonne colonne meme si l'en-tete varie.
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

/**
 * Appelé quand quelqu'un ouvre l'URL Web App dans le navigateur (GET).
 * Permet de tester rapidement que le déploiement marche.
 */
function doGet() {
  return ContentService
    .createTextOutput('OK - Apps Script ' + COUNTRY_CODE + ' receiver actif. Utilisez POST pour envoyer une commande.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Appelé par le tunnel HTML quand un client passe commande.
 * Reçoit les données en form-urlencoded et ajoute une ligne au Sheet.
 */
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

    // On ecrit dans la premiere feuille du classeur.
    // Si tu veux une feuille specifique, remplace par ss.getSheetByName('NomDeLaFeuille')
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

    // Marquer la ligne comme deja synchronisee pour eviter les doublons
    // si jamais le script auto-sync etait active sur ce meme Sheet.
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
