const DAY_MS = 86400000;
const MAX_RANGE_DAYS = 366;

function parseDateInput(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    throw new RangeError(`${fieldName} invalide`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`${fieldName} invalide`);
  }
  return date;
}

function getAbidjanDate(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Abidjan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function resolveStatisticsDateRange(query = {}, now = new Date()) {
  const today = getAbidjanDate(now);
  const dateDebut = String(query.dateDebut || query.date || today);
  const dateFin = String(query.dateFin || query.date || dateDebut);
  const start = parseDateInput(dateDebut, 'Date de début');
  const end = parseDateInput(dateFin, 'Date de fin');

  if (end < start) throw new RangeError('La date de fin doit être après la date de début');

  const nombreJours = Math.floor((end - start) / DAY_MS) + 1;
  if (nombreJours > MAX_RANGE_DAYS) {
    throw new RangeError('La période ne peut pas dépasser 366 jours');
  }

  return {
    dateDebut,
    dateFin,
    nombreJours,
    start,
    endExclusive: new Date(end.getTime() + DAY_MS),
  };
}

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getCancellationDate(commande) {
  const historique = Array.isArray(commande?.historique) ? commande.historique : [];
  for (let index = historique.length - 1; index >= 0; index -= 1) {
    const event = historique[index];
    const action = String(event?.action || '').toLowerCase();
    if (event?.statut !== 'annulee' && !action.includes('annul')) continue;
    const date = toValidDate(event?.date);
    if (date) return date;
  }

  return commande?.statut === 'annulee' ? toValidDate(commande.updated_at) : null;
}

function getModelName(commande) {
  const name = commande?.modele?.nom || commande?.modele || 'Modèle inconnu';
  return String(name).trim() || 'Modèle inconnu';
}

function getDayKey(value) {
  const date = toValidDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function createCounters() {
  return { recues: 0, livrees: 0, annulees: 0, chiffreAffairesLivre: 0 };
}

export function buildOrderStatistics({
  receivedOrders = [],
  deliveredOrders = [],
  cancelledCandidates = [],
  range,
}) {
  const totals = createCounters();
  const byModel = new Map();
  const byDay = new Map();

  for (let cursor = range.start.getTime(); cursor < range.endExclusive.getTime(); cursor += DAY_MS) {
    byDay.set(new Date(cursor).toISOString().slice(0, 10), createCounters());
  }

  const ensureModel = (commande) => {
    const nom = getModelName(commande);
    if (!byModel.has(nom)) byModel.set(nom, { nom, ...createCounters(), byDay: new Map() });
    return byModel.get(nom);
  };

  const increment = (commande, field, dateValue, amount = 0) => {
    const key = getDayKey(dateValue);
    if (!key || !byDay.has(key)) return;

    const model = ensureModel(commande);
    const modelDay = model.byDay.get(key) || createCounters();
    totals[field] += 1;
    byDay.get(key)[field] += 1;
    model[field] += 1;
    modelDay[field] += 1;

    if (field === 'livrees') {
      const price = Number(amount) || 0;
      totals.chiffreAffairesLivre += price;
      byDay.get(key).chiffreAffairesLivre += price;
      model.chiffreAffairesLivre += price;
      modelDay.chiffreAffairesLivre += price;
    }
    model.byDay.set(key, modelDay);
  };

  receivedOrders.forEach((commande) => increment(commande, 'recues', commande.created_at));
  deliveredOrders.forEach((commande) => (
    increment(commande, 'livrees', commande.date_livraison, commande.prix)
  ));
  cancelledCandidates.forEach((commande) => {
    const cancelledAt = getCancellationDate(commande);
    if (cancelledAt && cancelledAt >= range.start && cancelledAt < range.endExclusive) {
      increment(commande, 'annulees', cancelledAt);
    }
  });

  const commandesParJour = Array.from(byDay, ([date, counts]) => ({ date, ...counts }));
  const statistiquesParModele = Array.from(byModel.values())
    .map(({ byDay: modelDays, ...model }) => ({
      ...model,
      commandesParJour: Array.from(modelDays, ([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => (
      b.recues - a.recues
      || b.livrees - a.livrees
      || a.nom.localeCompare(b.nom, 'fr')
    ));

  return { ...totals, commandesParJour, statistiquesParModele };
}
