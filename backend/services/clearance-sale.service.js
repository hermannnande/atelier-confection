import { normalizeSize } from './size-normalization.service.js';
import {
  buildStockSynchronization, orderStockArticles, stockVariationKey,
} from './stock-synchronization.service.js';
import { courierContext, courierSynchronizationOrders, readCountryRows } from './courier-stock.service.js';
import { clearanceModelKeys, isClearanceModel, stockModelKey } from './clearance-stock.service.js';

// Page publique de déstockage. Une pièce commandée disparaît de la page tout de suite,
// avant l'appel de confirmation (décision de l’utilisateur, 08/11/2026) ; elle y revient
// si la commande est annulée. Le stock réservé ne compte, lui, que les commandes validées :
// les commandes encore à appeler sont donc retirées en plus.
export const CLEARANCE_HOLD_STATUSES = ['nouvelle', 'en_attente_validation', 'en_attente_paiement', 'a_rappeler'];
export const MAX_PENDING_PER_PHONE = 3;

const SIZE_ORDER = ['S', 'M', 'L', 'XL', '2XL', '3XL', 'Standard'];
const HOLD_COLUMNS = 'id, numero_commande, modele, taille, couleur, supplements, statut, client';
const text = (value, max) => String(value ?? '').trim().slice(0, max);
const samePart = (a, b) => stockModelKey(a) === stockModelKey(b);
const phoneTail = (value) => String(value ?? '').replace(/\D/g, '').slice(-8);

export class ClearanceOrderError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const clearanceDisplayName = (nom) => String(nom ?? '').replace(/\s+d[ée]stockage\s*$/i, '').trim();

export function countClearanceHolds(orders = []) {
  const holds = new Map();
  for (const order of orders) {
    for (const article of orderStockArticles(order)) {
      const key = stockVariationKey(article);
      holds.set(key, (holds.get(key) || 0) + 1);
    }
  }
  return holds;
}

const compareSizes = (a, b) => {
  const rank = (size) => { const index = SIZE_ORDER.indexOf(size); return index === -1 ? SIZE_ORDER.length : index; };
  return rank(a.taille) - rank(b.taille) || a.taille.localeCompare(b.taille, 'fr', { numeric: true });
};

// Modèle, couleurs, puis tailles encore libres avec leur nombre de pièces. Ce qui est vide n'apparaît pas.
export function buildClearanceCatalog({ modeles = [], variations = [], holds = new Map() } = {}) {
  return modeles
    .filter((modele) => isClearanceModel(modele) && modele.actif !== false)
    .map((modele) => {
      const modelKey = stockModelKey(modele.nom);
      const couleurs = new Map();
      for (const variation of variations) {
        if (variation.key.split('::')[0] !== modelKey) continue;
        const quantite = Math.max((variation.quantiteDisponible || 0) - (holds.get(variation.key) || 0), 0);
        if (quantite < 1) continue;
        const colourKey = stockModelKey(variation.couleur);
        if (!couleurs.has(colourKey)) couleurs.set(colourKey, { couleur: variation.couleur, pieces: 0, tailles: [] });
        const couleur = couleurs.get(colourKey);
        couleur.pieces += quantite;
        couleur.tailles.push({ taille: variation.taille, quantite });
      }
      const liste = [...couleurs.values()]
        .map((couleur) => ({ ...couleur, tailles: couleur.tailles.sort(compareSizes) }))
        .sort((a, b) => b.pieces - a.pieces || a.couleur.localeCompare(b.couleur, 'fr'));
      return {
        id: modele.id,
        nom: modele.nom,
        nomAffiche: clearanceDisplayName(modele.nom),
        prix: Number(modele.prix_base || 0),
        image: modele.image || '',
        pieces: liste.reduce((sum, couleur) => sum + couleur.pieces, 0),
        couleurs: liste,
      };
    });
}

export async function loadClearanceCatalog(db, country) {
  const [context, modelesResult, holdOrders] = await Promise.all([
    courierContext(db, country),
    db.from('modeles').select('id, nom, categorie, actif, prix_base, image'),
    readCountryRows(db, 'commandes', country, (q) => q.in('statut', CLEARANCE_HOLD_STATUSES), HOLD_COLUMNS),
  ]);
  if (modelesResult.error) throw modelesResult.error;
  const modeles = modelesResult.data || [];
  const clearanceKeys = clearanceModelKeys(modeles);
  const synchronization = buildStockSynchronization({
    orders: courierSynchronizationOrders(context),
    stock: context.stock,
    sansConfection: clearanceKeys,
  });
  return {
    catalogue: buildClearanceCatalog({
      modeles, variations: synchronization.variations, holds: countClearanceHolds(holdOrders),
    }),
    holdOrders,
    clearanceKeys,
  };
}

export function parseClearanceOrder(body = {}) {
  const phone = String(body.phone ?? '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  if (!/^\+?\d{8,15}$/.test(phone)) throw new ClearanceOrderError('Veuillez saisir un numéro de téléphone valide.', 400, 'TELEPHONE');
  const input = {
    phone,
    modele: text(body.modele, 150),
    couleur: text(body.couleur, 80),
    taille: normalizeSize(text(body.taille, 30)),
    client: text(body.client, 120),
    ville: text(body.ville, 120),
    source: text(body.source, 500),
  };
  if (!input.modele || !input.couleur || !input.taille) {
    throw new ClearanceOrderError('Choisissez un modèle, une couleur et une taille.', 400, 'CHAMPS');
  }
  return input;
}

// Une seule commande de déstockage à la fois : deux clientes ne peuvent pas prendre la même
// dernière pièce. Le serveur de l'atelier est un processus unique.
let orderQueue = Promise.resolve();
function runExclusive(task) {
  const run = orderQueue.then(task, task);
  orderQueue = run.catch(() => {});
  return run;
}

export function createClearanceOrder(db, { country, input, load = loadClearanceCatalog, now = () => new Date() }) {
  return runExclusive(async () => {
    const { catalogue, holdOrders, clearanceKeys } = await load(db, country);
    const modele = catalogue.find((item) => samePart(item.nom, input.modele));
    const couleur = modele?.couleurs.find((item) => samePart(item.couleur, input.couleur));
    const taille = couleur?.tailles.find((item) => samePart(item.taille, input.taille));

    const tail = phoneTail(input.phone);
    const duClient = holdOrders.filter((order) => phoneTail(order.client?.contact) === tail
      && clearanceKeys.has(stockModelKey(order.modele?.nom)));
    // Un double envoi (réseau, double appui) ne retire pas une deuxième pièce.
    const wanted = stockVariationKey({ modele: input.modele, couleur: input.couleur, taille: input.taille });
    const doublon = duClient.find((order) => stockVariationKey(order) === wanted);
    if (doublon) return { commande: doublon, doublon: true };

    if (duClient.length >= MAX_PENDING_PER_PHONE) {
      throw new ClearanceOrderError('Vous avez déjà des commandes en attente. Notre équipe vous appelle très vite pour les confirmer.', 429, 'LIMITE');
    }
    if (!taille || taille.quantite < 1) {
      throw new ClearanceOrderError('Cette pièce vient d’être commandée. Choisissez une autre couleur ou une autre taille.', 409, 'INDISPONIBLE');
    }

    const date = now().toISOString();
    const source = input.source || 'la page de déstockage';
    const { data, error } = await db.from('commandes').insert([{
      pays_code: country,
      client: {
        nom: input.client || '🔍 Client à identifier',
        contact: input.phone,
        ville: input.ville || 'Non spécifié',
      },
      modele: {
        id: modele.id,
        nom: modele.nom,
        sku: modele.nom,
        image: modele.image,
        categorie: 'Déstockage',
        description: `Commandé depuis ${source}`,
      },
      taille: taille.taille,
      couleur: couleur.couleur,
      prix_base: modele.prix,
      prix: modele.prix,
      supplements: [],
      statut: 'en_attente_validation',
      urgence: false,
      appelant_id: null,
      note_appelant: '',
      historique: [{
        action: `Commande reçue depuis ${source} (pays: ${country})`,
        statut: 'en_attente_validation',
        utilisateur: null,
        date,
      }],
      created_at: date,
      updated_at: date,
    }]).select().single();
    if (error) throw error;
    return { commande: data, doublon: false };
  });
}
