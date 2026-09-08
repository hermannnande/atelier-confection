export function getDeliveryRouteDayKey(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDeliveryReportEvent(event) {
  if (!event) return false;
  if (event.statut === 'reportee') return true;

  const action = String(event.action || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return action.includes('livraison reportee');
}

function getCurrentRouteDate(livraison) {
  return (
    livraison?.dateTournee ||
    livraison?.dateAssignation ||
    livraison?.date_tournee ||
    livraison?.date_assignation
  );
}

/**
 * Ajoute des lignes uniquement visuelles pour les anciennes tournées depuis
 * lesquelles un colis a été reporté. La livraison réelle reste unique : les
 * montants et les actions continuent donc d'utiliser son état actuel.
 */
export function buildDeliveryRouteEntries(livraisons = []) {
  const entries = [];

  for (const livraison of livraisons) {
    entries.push(livraison);

    const livraisonId = livraison?._id || livraison?.id;
    const assignmentDate = livraison?.dateAssignation || livraison?.date_assignation;
    const assignmentTime = assignmentDate ? new Date(assignmentDate).getTime() : Number.NaN;
    const currentDay = getDeliveryRouteDayKey(getCurrentRouteDate(livraison));
    const history = Array.isArray(livraison?.commande?.historique)
      ? livraison.commande.historique
      : [];
    const historicalDays = new Set();

    history.forEach((event, index) => {
      if (!isDeliveryReportEvent(event)) return;

      // Une commande peut être renvoyée en préparation puis réassignée. Les
      // événements portant un autre identifiant appartiennent à l'ancienne
      // livraison et ne doivent pas être attribués au nouveau livreur.
      if (
        event.livraisonId &&
        livraisonId &&
        String(event.livraisonId) !== String(livraisonId)
      ) {
        return;
      }

      // Compatibilité avec les anciens événements qui n'avaient pas encore
      // d'identifiant de livraison : ignorer ceux antérieurs à l'assignation.
      const eventTime = event.date ? new Date(event.date).getTime() : Number.NaN;
      if (
        !event.livraisonId &&
        Number.isFinite(assignmentTime) &&
        Number.isFinite(eventTime) &&
        eventTime < assignmentTime
      ) {
        return;
      }

      // Les nouveaux événements contiennent la date exacte de la tournée.
      // Pour les anciens reports, la date de l'événement permet de restaurer
      // au mieux la trace déjà enregistrée dans l'historique commande.
      const originalRouteDate =
        event.dateTourneeOrigine || event.date_tournee_origine || event.date;
      const originalDay = getDeliveryRouteDayKey(originalRouteDate);

      if (!originalDay || originalDay === currentDay || historicalDays.has(originalDay)) return;
      historicalDays.add(originalDay);

      entries.push({
        ...livraison,
        statut: 'reportee_historique',
        dateTournee: originalRouteDate,
        date_tournee: originalRouteDate,
        commentaireGestionnaire:
          event.commentaire || livraison.commentaireGestionnaire || livraison.commentaire_gestionnaire,
        historiqueReport: true,
        dateReport: event.date,
        historiqueRouteKey: `${livraisonId || 'livraison'}:report:${originalDay}:${index}`,
      });
    });
  }

  return entries;
}
