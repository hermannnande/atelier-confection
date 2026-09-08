export function normalizeOrderSupplements(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => ({
      id: String(item?.id || `supplement-${index + 1}`),
      libelle: String(item?.libelle ?? item?.label ?? '').trim(),
      taille: String(item?.taille ?? '').trim(),
      montant: Math.max(0, Math.round(Number(item?.montant ?? item?.prix) || 0)),
    }))
    .filter((item) => item.libelle && item.montant > 0);
}

export function getOrderBasePrice(commande) {
  if (commande?.prixBase != null || commande?.prix_base != null) {
    return Math.max(0, Number(commande.prixBase ?? commande.prix_base) || 0);
  }
  const supplementTotal = normalizeOrderSupplements(commande?.supplements).reduce(
    (sum, item) => sum + item.montant,
    0,
  );
  return Math.max(0, (Number(commande?.prix) || 0) - supplementTotal);
}

export function getOrderTotal(prixBase, supplements = []) {
  return (
    Math.max(0, Number(prixBase) || 0) +
    normalizeOrderSupplements(supplements).reduce((sum, item) => sum + item.montant, 0)
  );
}
