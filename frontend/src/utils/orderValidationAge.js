const DAY_IN_MS = 86_400_000;
const DEFAULT_TIME_ZONE = 'Africa/Abidjan';

const toValidDate = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getOrderValidatedAt = (commande) => {
  const historique = Array.isArray(commande?.historique) ? commande.historique : [];

  for (let index = historique.length - 1; index >= 0; index -= 1) {
    const event = historique[index];
    const isValidation = event?.statut === 'validee'
      || String(event?.action || '').toLocaleLowerCase('fr').includes('valid');
    const eventDate = isValidation ? toValidDate(event?.date) : null;
    if (eventDate) return eventDate;
  }

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

export const isValidatedForAtLeastDays = (
  commande,
  minimumDays = 5,
  now = new Date(),
) => commande?.statut === 'validee'
  && getOrderValidationAgeInDays(commande, now) >= minimumDays;
