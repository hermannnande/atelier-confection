const MAX_SUPPLEMENTS = 20;
const MAX_LABEL_LENGTH = 100;
const MAX_AMOUNT = 10_000_000;

export function normalizeOrderBasePrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) {
    throw new Error('Le prix de base doit être un montant valide entre 0 et 10 000 000 F');
  }
  return Math.round(amount);
}

export function normalizeOrderSupplements(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error('La liste des articles supplémentaires est invalide');
  }
  if (value.length > MAX_SUPPLEMENTS) {
    throw new Error(`Une commande ne peut pas contenir plus de ${MAX_SUPPLEMENTS} suppléments`);
  }

  return value.map((item, index) => {
    const libelle = String(item?.libelle ?? item?.label ?? '').trim();
    if (!libelle) {
      throw new Error(`Le libellé du supplément ${index + 1} est obligatoire`);
    }
    if (libelle.length > MAX_LABEL_LENGTH) {
      throw new Error(`Le libellé du supplément ${index + 1} est trop long`);
    }

    const montant = Number(item?.montant ?? item?.prix);
    if (!Number.isFinite(montant) || montant <= 0 || montant > MAX_AMOUNT) {
      throw new Error(`Le montant du supplément ${index + 1} doit être supérieur à 0 F`);
    }

    return {
      id: String(item?.id || `supplement-${index + 1}`).slice(0, 120),
      libelle,
      montant: Math.round(montant),
    };
  });
}

export function calculateOrderTotal(prixBase, supplements = []) {
  const base = normalizeOrderBasePrice(prixBase);
  const normalizedSupplements = normalizeOrderSupplements(supplements);
  return base + normalizedSupplements.reduce((sum, item) => sum + item.montant, 0);
}

export function resolveStoredOrderBasePrice(order = {}, supplements = []) {
  if (order.prix_base != null) return normalizeOrderBasePrice(order.prix_base);
  const total = normalizeOrderBasePrice(order.prix ?? 0);
  const supplementTotal = normalizeOrderSupplements(supplements).reduce(
    (sum, item) => sum + item.montant,
    0,
  );
  return Math.max(0, total - supplementTotal);
}
