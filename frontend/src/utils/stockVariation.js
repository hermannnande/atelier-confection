import { normalizeSize } from './sizeNormalization.js';

export function normalizeStockLabel(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function sameStockLabel(a, b) {
  return normalizeStockLabel(a) === normalizeStockLabel(b);
}

// Regroupe seulement l'affichage : les lignes et mouvements historiques restent en base.
export function summarizeStockVariations(rows = []) {
  const grouped = new Map();
  for (const row of rows) {
    const taille = normalizeSize(row.taille);
    const key = `${normalizeStockLabel(row.couleur)}::${normalizeStockLabel(taille)}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        ...row,
        taille,
        quantitePrincipale: 0,
        quantite: 0,
        quantiteReservee: 0,
        quantiteDisponible: 0,
        quantiteEnLivraison: 0,
      });
    }
    const summary = grouped.get(key);
    const physical = Number(row.quantitePrincipale ?? row.quantite ?? 0);
    summary.quantitePrincipale += physical;
    summary.quantite += physical;
    summary.quantiteReservee += Number(row.quantiteReservee || 0);
    summary.quantiteDisponible += Number(row.quantiteDisponible || 0);
    summary.quantiteEnLivraison += Number(row.quantiteEnLivraison || 0);
  }
  return Array.from(grouped.values());
}
