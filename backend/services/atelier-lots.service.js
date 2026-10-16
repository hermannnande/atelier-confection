import { buildStockSynchronization, stockVariationKey } from './stock-synchronization.service.js';
import { courierContext, courierSynchronizationOrders, readCountryRows, snapshotArticles } from './courier-stock.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
const pieceKey = p => `${p.commandeId}:${p.articleKey}`;
export function validateStartInput(input) {
  if (!UUID.test(input?.operationId) || typeof input.key !== 'string' || !Array.isArray(input.pieces)
    || input.pieces.length < 1 || input.pieces.length > 500
    || input.pieces.some(p => !UUID.test(p?.commandeId) || !/^(principal|supplement-[1-9][0-9]*)$/.test(p?.articleKey))
    || new Set(input.pieces.map(pieceKey)).size !== input.pieces.length) fail('La liste doit être actualisée avant de commencer.', 400);
}
export async function workshopRpc(db, name, params) {
  const { data, error } = await db.rpc(name, params);
  if (error) fail(error.code === '42501' ? 'Action non autorisée.' :
    ['40001', 'P0001'].includes(error.code) ? error.message : 'La réception n’a pas été confirmée. Actualisez puis réessayez.',
  error.code === '42501' ? 403 : 409);
  return data;
}

export async function startWorkshopLot(db, { country, actor, input }) {
  validateStartInput(input);
  const { data: previous, error } = await db.from('atelier_lots').select('*').eq('id', input.operationId).maybeSingle();
  if (error) throw error;
  if (previous) {
    if (previous.pays_code !== country || previous.cree_par !== actor || previous.variation_key !== input.key
      || previous.pieces.map(pieceKey).sort().join() !== input.pieces.map(pieceKey).sort().join()) fail('Action déjà utilisée.');
    return previous;
  }
  const revision = await workshopRpc(db, 'atelier_revision', { p_country: country });
  const context = await courierContext(db, country);
  const sync = buildStockSynchronization({ orders: courierSynchronizationOrders(context), stock: context.stock });
  if (sync.variations.some(v => v.key === input.key && v.incoherencesPreparation > 0)) {
    fail('Le stock réservé à d’anciens colis doit être vérifié par le responsable avant de recommencer ces pièces.');
  }
  const available = new Map(sync.uncoveredOrders.filter(o => stockVariationKey(o) === input.key).map(o => {
    const p = { commandeId: o.sourceOrderId || o.id, articleKey: o.sourceArticleKey || 'principal' };
    return [pieceKey(p), p];
  }));
  if (input.pieces.some(p => !available.has(pieceKey(p)))) fail('Certaines pièces sont déjà commencées ou disponibles. Actualisez la liste.');
  const first = input.pieces[0];
  const order = context.orders.find(o => o.id === first.commandeId);
  const article = snapshotArticles(order).find(a => a.id === first.articleKey);
  // Use the existing stock spelling whenever possible; never invent a size or merge different models.
  const stock = context.stock.find(s => stockVariationKey(s) === input.key);
  const canonical = stock ? { ...article, modele: stock.modele, taille: stock.taille, couleur: stock.couleur,
    image: stock.image || article.image, prix: stock.prix ?? article.prix } : article;
  const selected = new Set(input.pieces.map(pieceKey));
  return workshopRpc(db, 'atelier_start', { p_id: input.operationId, p_country: country, p_actor: actor,
    p_revision: revision, p_key: input.key, p_article: canonical,
    p_pieces: [...available.values()].filter(p => selected.has(pieceKey(p))) });
}

export async function receiveWorkshopLot(db, { country, actor, lotId, input }) {
  if (!UUID.test(lotId) || !UUID.test(input?.operationId) || !Number.isInteger(input.quantity) || input.quantity < 1
    || !Number.isInteger(input.expectedReceived) || input.expectedReceived < 0) fail('Quantité reçue invalide.', 400);
  return workshopRpc(db, 'atelier_receive', { p_id: input.operationId, p_lot: lotId, p_country: country,
    p_actor: actor, p_quantity: input.quantity, p_expected: input.expectedReceived });
}

export async function listWorkshopLots(db, country) {
  const [lots, orders, legacy] = await Promise.all([
    readCountryRows(db, 'atelier_lots', country),
    readCountryRows(db, 'commandes', country, q => q.neq('atelier_pieces', '{}'), 'id, statut, atelier_pieces'),
    readCountryRows(db, 'commandes', country, q => q.in('statut', ['en_decoupe', 'en_couture']),
      'id, numero_commande, modele, taille, couleur, statut'),
  ]);
  const byId = new Map(orders.map(o => [o.id, o]));
  return {
    lots: lots.filter(l => l.recues < l.quantite || Date.now() - new Date(l.updated_at).getTime() < 86400000)
      .sort((a, b) => Number(a.recues === a.quantite) - Number(b.recues === b.quantite) || a.created_at.localeCompare(b.created_at))
      .map(l => ({ ...l, aVerifier: l.pieces.slice(l.recues).some(p => byId.get(p.commandeId)?.statut !== 'validee') })),
    anciens: legacy.map(o => ({ id: o.id, numero: o.numero_commande, modele: o.modele?.nom,
      taille: o.taille, couleur: o.couleur })),
  };
}

export async function assertNoPendingLot(db, country, article) {
  const key = stockVariationKey(article);
  const lots = await readCountryRows(db, 'atelier_lots', country, q => q.eq('variation_key', key));
  if (lots.some(l => l.recues < l.quantite)) {
    fail('Ces pièces ont un lot en cours. Utilisez « Tout reçu » ou « Reçu une partie » dans Tenues à recevoir.');
  }
}
