const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDateKey(value, fallback = new Date()) {
  if (typeof value === 'string' && DATE_PATTERN.test(value)) {
    const parsed = new Date(`${value}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) {
      return value;
    }
  }
  return fallback.toISOString().slice(0, 10);
}

export function validateProductionItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Ajoutez au moins une tenue confectionnée');
  }
  if (items.length > 50) {
    throw new Error('Une déclaration ne peut pas contenir plus de 50 tenues');
  }

  const seen = new Set();
  return items.map((item) => {
    const modeleId = String(item?.modeleId || '').trim();
    const quantite = Number(item?.quantite);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(modeleId)) {
      throw new Error('Un modèle sélectionné est invalide');
    }
    if (!Number.isInteger(quantite) || quantite < 1 || quantite > 1000) {
      throw new Error('La quantité doit être un nombre entier compris entre 1 et 1000');
    }
    if (seen.has(modeleId)) {
      throw new Error('Une même tenue ne peut apparaître qu’une fois par déclaration');
    }
    seen.add(modeleId);
    return { modeleId, quantite };
  });
}

export function parseMoney(value, { allowZero = false } = {}) {
  const amount = Number(value);
  const minimum = allowZero ? 0 : 0.01;
  if (!Number.isFinite(amount) || amount < minimum) {
    throw new Error(allowZero ? 'Le montant doit être positif' : 'Le montant doit être supérieur à zéro');
  }
  return Math.round(amount * 100) / 100;
}

function mondayOf(dateKey) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return date.toISOString().slice(0, 10);
}

export function calculateRemunerationSummary({ productions = [], paiements = [], today }) {
  const todayKey = normalizeDateKey(today);
  const weekStart = mondayOf(todayKey);
  const monthStart = `${todayKey.slice(0, 7)}-01`;

  const validated = productions.filter((item) => item.statut === 'validee');
  const totalGagne = validated.reduce((sum, item) => sum + Number(item.montant_total || 0), 0);
  const totalPaye = paiements
    .filter((item) => item.statut === 'payee')
    .reduce((sum, item) => sum + Number(item.montant || 0), 0);
  const paiementEnAttente = paiements
    .filter((item) => item.statut === 'en_attente')
    .reduce((sum, item) => sum + Number(item.montant || 0), 0);

  const sumFrom = (start, exact = false) => validated.reduce((sum, item) => {
    const key = String(item.date_production || '').slice(0, 10);
    const included = exact ? key === start : key >= start && key <= todayKey;
    return included ? sum + Number(item.montant_total || 0) : sum;
  }, 0);

  const countFrom = (start, exact = false) => validated.reduce((sum, item) => {
    const key = String(item.date_production || '').slice(0, 10);
    const included = exact ? key === start : key >= start && key <= todayKey;
    return included ? sum + Number(item.quantite || 0) : sum;
  }, 0);

  return {
    aujourdHui: sumFrom(todayKey, true),
    semaine: sumFrom(weekStart),
    mois: sumFrom(monthStart),
    piecesAujourdHui: countFrom(todayKey, true),
    piecesSemaine: countFrom(weekStart),
    piecesMois: countFrom(monthStart),
    totalGagne,
    totalPaye,
    paiementEnAttente,
    soldeDisponible: Math.max(0, totalGagne - totalPaye - paiementEnAttente),
    soldeAvantDemandes: Math.max(0, totalGagne - totalPaye),
  };
}
