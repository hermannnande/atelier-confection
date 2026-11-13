// Suppression d'une commande depuis Préparation Colis, réservée à l'administrateur.
// Contrairement à une annulation, la robe réservée à la commande ne redevient pas
// disponible : elle sort du stock (pièce détruite ou perdue), avec une trace dans
// l'historique du stock puisque la commande elle-même disparaît.
// Une commande encore à l'atelier ou déjà confiée à un livreur n'est pas supprimée ici :
// sa pièce arriverait plus tard dans le stock, ou elle est déjà sortie.
import { compareAndSet, CourierStockError, readCountryRows } from './courier-stock.service.js';
import { normalizeSize } from './size-normalization.service.js';
import {
  orderStockArticles, preparationReservation, stockArticleKey, stockVariationKey,
} from './stock-synchronization.service.js';

const fail = (message, status = 409) => { throw new CourierStockError(message, status); };
const quantity = value => Math.max(0, Number(value) || 0);
const modelName = modele => (typeof modele === 'object' ? modele?.nom : modele) || 'Modèle inconnu';
const label = article => `${modelName(article.modele)} ${article.couleur} ${normalizeSize(article.taille)}`;

export const deletionOperation = (orderId, articleKey) => `suppression-commande:${orderId}:${articleKey}`;

// Pièces que la commande retient en Préparation Colis : celles enregistrées à son entrée.
export function heldPreparationArticles(order) {
  const { held } = preparationReservation(order);
  return orderStockArticles(order)
    .map((article, index) => ({ ...article, articleKey: stockArticleKey(index) }))
    .filter(article => held.has(article.articleKey));
}

// Retire une robe de la variante, une seule fois par opération (reprise sûre après coupure).
async function removeOnePiece(db, { country, article, operation, userId, commentaire, now }) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rows = (await readCountryRows(db, 'stock', country))
      .filter(row => stockVariationKey(row) === stockVariationKey(article));
    if (rows.some(row => (row.mouvements || []).some(m => m.operation === operation))) return 'deja_retiree';
    const row = rows.filter(r => quantity(r.quantite_principale) > 0)
      .sort((a, b) => quantity(b.quantite_principale) - quantity(a.quantite_principale))[0];
    if (!row) return 'absente';
    const avant = quantity(row.quantite_principale);
    try {
      await compareAndSet(db, 'stock', row, {
        quantite_principale: avant - 1,
        mouvements: [...(row.mouvements || []), {
          type: 'sortie', quantite: 1, ancienneQuantite: avant, nouvelleQuantite: avant - 1,
          source: 'Stock principal', destination: 'Supprimée avec la commande',
          utilisateur: userId, date: now, operation, commentaire,
        }],
      });
      return 'retiree';
    } catch (error) {
      if (!(error instanceof CourierStockError) || attempt === 4) throw error;
    }
  }
  return 'erreur';
}

export async function deletePreparationOrder(db, { country, orderId, userId, actorName = '', motif = '' }) {
  const { data: order, error } = await db.from('commandes').select('*')
    .eq('id', orderId).eq('pays_code', country).maybeSingle();
  if (error) throw error;
  if (!order) fail('Commande introuvable : elle a peut-être déjà été supprimée.', 404);
  const numero = order.numero_commande || order.id;
  if (order.statut !== 'en_stock' || order.livreur_id) {
    fail(`La commande ${numero} n’est pas prête en stock : annulez-la au lieu de la supprimer.`);
  }
  if (Object.values(order.atelier_pieces || {}).some(piece => piece?.etat === 'en_cours')) {
    fail(`Une pièce de la commande ${numero} est encore en couture : annulez-la au lieu de la supprimer.`);
  }
  const { data: livraisons, error: livraisonsError } = await db.from('livraisons').select('id')
    .eq('commande_id', order.id).eq('pays_code', country);
  if (livraisonsError) throw livraisonsError;
  if ((livraisons || []).length) fail(`La commande ${numero} a déjà une livraison : elle ne peut pas être supprimée.`);

  const pieces = heldPreparationArticles(order);
  const now = new Date().toISOString();
  // La commande est effacée d'abord, et seulement si elle n'a pas changé depuis sa lecture :
  // une commande partie entre-temps avec un livreur ne fait pas sortir une deuxième robe.
  const { data: deleted, error: deleteError } = await db.from('commandes').delete()
    .eq('id', order.id).eq('pays_code', country).eq('updated_at', order.updated_at)
    .select('id').maybeSingle();
  if (deleteError) {
    if (deleteError.code === '23503') fail(`La commande ${numero} est liée à d’autres données : annulez-la au lieu de la supprimer.`);
    throw deleteError;
  }
  if (!deleted) fail('Cette commande vient de changer. Actualisez puis réessayez.');
  console.info('[suppression-commande]', JSON.stringify({
    id: order.id, numero, statut: order.statut, pieces: pieces.map(label), par: userId, date: now,
  }));

  const commentaire = `Commande ${numero} supprimée depuis Préparation Colis${actorName ? ` par ${actorName}` : ''}`
    + ` : robe retirée du stock${motif ? ` (motif : ${motif})` : ''}`;
  const resultats = [];
  for (const article of pieces) {
    let resultat;
    try {
      resultat = await removeOnePiece(db, {
        country, article, operation: deletionOperation(order.id, article.articleKey), userId, commentaire, now,
      });
    } catch {
      resultat = 'erreur';
    }
    resultats.push({ tenue: label(article), resultat });
  }
  return { numero, pieces: resultats };
}
