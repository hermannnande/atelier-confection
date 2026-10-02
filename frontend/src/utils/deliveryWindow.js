// Page Livreurs : à l'ouverture, seules les tournées des 60 derniers jours sont
// chargées ; « Tout » ou une date plus ancienne charge tout l'historique.
export const DELIVERY_WINDOW_DAYS = 60;
// Les anciens reports (sans date de tournée d'origine) s'affichent jusqu'à 6 jours
// après la tournée du colis : la lecture commence 7 jours plus tôt.
export const DELIVERY_REPORT_MARGIN_DAYS = 7;

// Minuit (heure locale) il y a 60 jours : les tournées à partir de ce jour sont complètes.
export function deliveryWindowStart(now = new Date(), days = DELIVERY_WINDOW_DAYS) {
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function deliveryLoadStart(now = new Date()) {
  return deliveryWindowStart(now, DELIVERY_WINDOW_DAYS + DELIVERY_REPORT_MARGIN_DAYS);
}

export function needsFullDeliveryHistory(dateFilter, customDate, windowStartKey) {
  if (dateFilter === 'all') return true;
  return dateFilter === 'custom' && Boolean(customDate) && customDate < windowStartKey;
}
