const DAY_IN_MS = 86_400_000;
const DEFAULT_TIME_ZONE = 'Africa/Abidjan';

const toValidDate = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? null : date;
};

// Moment où la commande est devenue validée : début de sa dernière suite de lignes
// « validée ». Une modification d'une commande déjà validée ne déplace pas cette date ;
// une commande repassée par un autre statut puis revalidée prend la nouvelle validation.
export const getOrderValidatedAt = (commande) => {
  const historique = Array.isArray(commande?.historique) ? commande.historique : [];
  let validatedAt = null;

  for (const event of historique) {
    const statut = event?.statut;
    const isValidation = statut === 'validee'
      || (!statut && String(event?.action || '').toLocaleLowerCase('fr').includes('valid'));
    if (isValidation) {
      validatedAt = validatedAt || toValidDate(event?.date);
    } else if (statut) {
      validatedAt = null;
    }
  }
  if (validatedAt) return validatedAt;

  return toValidDate(
    commande?.createdAt
      || commande?.created_at
      || commande?.updatedAt
      || commande?.updated_at,
  );
};

const getCalendarDateNumber = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
};

export const getOrderValidationAgeInDays = (
  commande,
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
) => {
  const validatedAt = getOrderValidatedAt(commande);
  if (!validatedAt || !(now instanceof Date) || Number.isNaN(now.getTime())) return null;

  return Math.floor(
    (getCalendarDateNumber(now, timeZone) - getCalendarDateNumber(validatedAt, timeZone)) / DAY_IN_MS,
  );
};

// « 02/10 à 14:35 » (heure d'Abidjan), avec l'année si ce n'est pas l'année en cours.
export const formatOrderValidationDate = (date, now = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  if (!date) return '';
  const sameYear = new Intl.DateTimeFormat('fr-FR', { timeZone, year: 'numeric' }).format(date)
    === new Intl.DateTimeFormat('fr-FR', { timeZone, year: 'numeric' }).format(now);
  const jour = new Intl.DateTimeFormat('fr-FR', {
    timeZone, day: '2-digit', month: '2-digit', ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
  const heure = new Intl.DateTimeFormat('fr-FR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(date);
  return `${jour} à ${heure}`;
};

export const isValidatedForAtLeastDays = (
  commande,
  minimumDays = 5,
  now = new Date(),
) => commande?.statut === 'validee'
  && getOrderValidationAgeInDays(commande, now) >= minimumDays;
