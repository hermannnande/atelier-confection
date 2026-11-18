import { stockVariationKey } from './stock-synchronization.service.js';

// Modèles « Vente de déstockage », repérés par la fin de leur nom (« DAVICHI ROYALE Déstockage »),
// car la base n'accepte qu'une liste fixe de catégories. Leur stock vit dans la même table que
// le stock normal, pour suivre le même parcours (réservation, préparation, livreur, retour),
// mais il a sa propre page et ne part jamais à l'atelier.
const CLEARANCE_NAME = /\sd[ée]stockage\s*$/i;

export const isClearanceModel = (modele) => CLEARANCE_NAME.test(String(modele?.nom ?? ''));

// Le stock compare les noms de modèles sans accents, majuscules ni ponctuation.
export const stockModelKey = (nom) => stockVariationKey({ modele: nom }).split('::')[0];

export function clearanceModelKeys(modeles = []) {
  return new Set(modeles.filter(isClearanceModel).map((modele) => stockModelKey(modele.nom)));
}

export async function loadClearanceModelKeys(db, { signal } = {}) {
  let query = db.from('modeles').select('nom');
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return clearanceModelKeys(data || []);
}

// Modèle de déstockage supprimé depuis Modèles (actif = false) : retiré de la vente. Il reste
// un modèle de déstockage (jamais de confection, retours de livraison au bon endroit) et garde
// son stock en base pour les commandes en cours ; seule la page Déstockage ne le montre plus.
export function retiredClearanceModelKeys(modeles = []) {
  return new Set(modeles
    .filter((modele) => isClearanceModel(modele) && modele.actif === false)
    .map((modele) => stockModelKey(modele.nom)));
}

export async function loadRetiredClearanceModelKeys(db) {
  const { data, error } = await db.from('modeles').select('nom, actif').eq('actif', false);
  if (error) throw error;
  return retiredClearanceModelKeys(data || []);
}

// Sans rayon, tout le stock est renvoyé : Appel et Commandes en ont besoin.
export function parseStockRayon(value) {
  return ['normal', 'destockage'].includes(value) ? value : null;
}

export function belongsToRayon(modelKey, rayon, clearanceKeys) {
  return !rayon || clearanceKeys.has(modelKey) === (rayon === 'destockage');
}

// Ce qu'une page de stock affiche : son rayon, sans les modèles de déstockage retirés de la vente.
export function shownInRayon(modelKey, rayon, clearanceKeys, retiredKeys = new Set()) {
  if (rayon === 'destockage' && retiredKeys.has(modelKey)) return false;
  return belongsToRayon(modelKey, rayon, clearanceKeys);
}

export async function readModelsAndStockNames(db) {
  const { data: modeles, error } = await db.from('modeles').select('id, nom');
  if (error) throw error;
  const stockNames = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error: stockError } = await db.from('stock').select('modele')
      .order('id', { ascending: true }).range(offset, offset + 999);
    if (stockError) throw stockError;
    stockNames.push(...(data || []).map((row) => row.modele));
    if ((data || []).length < 1000) break;
  }
  return { modeles: modeles || [], stockNames };
}

// Le stock normal et le déstockage ne doivent jamais se mélanger : le système retrouve
// les pièces par nom de modèle, couleur et taille. Renvoie le message d'erreur, ou null.
export function clearanceNameProblem({ modeles = [], stockNames = [], nom, actuel = null }) {
  const key = stockModelKey(nom);
  const clearance = isClearanceModel({ nom });
  const hasStockNamed = (modelKey) => stockNames.some((name) => stockModelKey(name) === modelKey);

  const autre = modeles.find((modele) => (
    (!actuel || modele.id !== actuel.id)
    && stockModelKey(modele.nom) === key
    && (clearance || isClearanceModel(modele))
  ));
  if (autre) {
    return `Le modèle « ${autre.nom} » porte déjà ce nom. Pour ne pas mélanger les stocks, choisissez un nom différent.`;
  }

  const memeNom = actuel && stockModelKey(actuel.nom) === key;
  if (clearance && !memeNom && hasStockNamed(key)) {
    return `Du stock existe déjà sous le nom « ${nom} ». Choisissez un nom différent.`;
  }

  if (actuel && hasStockNamed(stockModelKey(actuel.nom))) {
    if (isClearanceModel(actuel) !== clearance) {
      return 'Ce modèle a déjà du stock : il ne peut plus changer de type.';
    }
    if (clearance && !memeNom) return 'Ce modèle de déstockage a déjà du stock : son nom ne peut plus changer.';
  }
  return null;
}
