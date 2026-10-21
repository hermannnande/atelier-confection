import { normalizeSize } from './size-normalization.service.js';
import { stockVariationKey } from './stock-synchronization.service.js';
import { compareAndSet } from './courier-stock.service.js';

// Fusion des anciennes lignes de stock en double (« Bleu Marine » / « Bleu marine »,
// « XXXL » / « 3XL »…). La synchronisation les additionnait déjà ; la fusion garde
// une seule ligne, avec la somme des quantités et tous les mouvements.
const quantity = value => Math.max(0, Number(value) || 0);
const spelling = row => `${row.modele}|${row.taille}|${row.couleur}`;
const time = value => Date.parse(value || '') || 0;

// La réception d'un lot atelier retrouve sa ligne par l'orthographe exacte :
// la ligne utilisée par un lot encore ouvert est toujours celle qu'on garde.
export function planDuplicateMerges(rows = [], openLots = []) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.pays_code}::${stockVariationKey(row)}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const lotSpellings = new Set(openLots.map(lot => `${lot.pays_code}::${lot.article?.modele}|${lot.article?.taille}|${lot.article?.couleur}`));
  const merges = [];
  const skipped = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const used = group.filter(row => lotSpellings.has(`${row.pays_code}::${spelling(row)}`));
    if (used.length > 1) {
      skipped.push({ cle: key, raison: 'Plusieurs orthographes utilisées par des lots atelier ouverts' });
      continue;
    }
    const [keeper, ...duplicates] = [...group].sort((a, b) => (
      Number(used.includes(b)) - Number(used.includes(a))
      || Number(b.taille === normalizeSize(b.taille)) - Number(a.taille === normalizeSize(a.taille))
      || (b.mouvements || []).length - (a.mouvements || []).length
      || time(a.created_at) - time(b.created_at)
      || String(a.id).localeCompare(String(b.id))
    ));
    merges.push({
      cle: key,
      keeper,
      duplicates,
      quantitePrincipale: group.reduce((sum, row) => sum + quantity(row.quantite_principale), 0),
      quantiteEnLivraison: group.reduce((sum, row) => sum + quantity(row.quantite_en_livraison), 0),
    });
  }
  return { merges, skipped };
}

// Mouvements des deux lignes, dans l'ordre chronologique ; ceux de la ligne
// supprimée gardent la trace de leur ancienne orthographe.
export function mergeMovements(keeper, duplicate) {
  const origin = `${duplicate.couleur} / ${duplicate.taille}`;
  return [
    ...(keeper.mouvements || []).map((movement, index) => ({ movement, index, from: 0 })),
    ...(duplicate.mouvements || []).map((movement, index) => ({ movement: { ...movement, ligneOrigine: origin }, index, from: 1 })),
  ].sort((a, b) => time(a.movement.date) - time(b.movement.date) || a.from - b.from || a.index - b.index)
    .map(item => item.movement);
}

async function readRow(db, row) {
  const { data, error } = await db.from('stock').select('*').eq('id', row.id).eq('pays_code', row.pays_code).maybeSingle();
  if (error) throw error;
  return data;
}

// Trois étapes qui peuvent reprendre après une coupure : vider la ligne en double
// (en notant ce qu'elle contenait), créditer la ligne gardée, supprimer la ligne vide.
export async function mergeDuplicateRow(db, { keeperId, duplicateId, country, now = new Date().toISOString() }) {
  const inMovement = `fusion:${duplicateId}`;
  const outMovement = `fusion-sortie:${duplicateId}`;
  let keeper = await readRow(db, { id: keeperId, pays_code: country });
  let duplicate = await readRow(db, { id: duplicateId, pays_code: country });
  if (!keeper) throw new Error(`Ligne gardée introuvable : ${keeperId}`);
  if (keeper.mouvements?.some(m => m.operation === inMovement)) {
    if (duplicate) await deleteEmptyRow(db, duplicate);
    return { etat: 'deja-fusionnee' };
  }
  if (!duplicate) throw new Error(`Ligne en double introuvable sans fusion enregistrée : ${duplicateId}`);
  if (stockVariationKey(keeper) !== stockVariationKey(duplicate)) throw new Error('Les deux lignes ne sont pas la même tenue');

  let moved = duplicate.mouvements?.find(m => m.operation === outMovement);
  if (!moved) {
    moved = {
      operation: outMovement,
      type: 'fusion',
      quantite: 0,
      quantitePrincipale: quantity(duplicate.quantite_principale),
      quantiteEnLivraison: quantity(duplicate.quantite_en_livraison),
      source: 'Fusion des lignes en double',
      destination: `${keeper.couleur} / ${keeper.taille}`,
      date: now,
      commentaire: `Quantités transférées vers la ligne « ${keeper.couleur} / ${keeper.taille} »`,
    };
    duplicate = await compareAndSet(db, 'stock', duplicate, {
      quantite_principale: 0, quantite_en_livraison: 0, mouvements: [...(duplicate.mouvements || []), moved],
    });
  }

  const history = mergeMovements(keeper, { ...duplicate, mouvements: (duplicate.mouvements || []).filter(m => m.operation !== outMovement) });
  keeper = await compareAndSet(db, 'stock', keeper, {
    quantite_principale: quantity(keeper.quantite_principale) + moved.quantitePrincipale,
    quantite_en_livraison: quantity(keeper.quantite_en_livraison) + moved.quantiteEnLivraison,
    image: keeper.image || duplicate.image || null,
    mouvements: [...history, {
      operation: inMovement,
      type: 'fusion',
      quantite: 0,
      quantitePrincipale: moved.quantitePrincipale,
      quantiteEnLivraison: moved.quantiteEnLivraison,
      source: 'Fusion des lignes en double',
      destination: 'Stock principal',
      date: now,
      commentaire: `Fusion de la ligne « ${duplicate.couleur} / ${duplicate.taille} » : `
        + `${moved.quantitePrincipale} en stock, ${moved.quantiteEnLivraison} en livraison`,
    }],
  });
  await deleteEmptyRow(db, duplicate);
  return { etat: 'fusionnee', quantitePrincipale: keeper.quantite_principale, quantiteEnLivraison: keeper.quantite_en_livraison };
}

async function deleteEmptyRow(db, row) {
  if (quantity(row.quantite_principale) || quantity(row.quantite_en_livraison)) {
    throw new Error(`La ligne ${row.id} n'est pas vide : suppression annulée`);
  }
  const { data, error } = await db.from('stock').delete()
    .eq('id', row.id).eq('pays_code', row.pays_code).eq('updated_at', row.updated_at).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error(`La ligne ${row.id} a changé pendant la fusion : relancez le script`);
}
