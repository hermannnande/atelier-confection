export const isConfirmedAfterReminder = (commande) => {
  if (commande?.statut !== 'validee') return false;

  const history = Array.isArray(commande?.historique) ? commande.historique : [];
  let lastReminderIndex = -1;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.statut === 'a_rappeler') {
      lastReminderIndex = index;
      break;
    }
  }

  if (lastReminderIndex < 0) return false;
  return history.slice(lastReminderIndex + 1).some((event) => event?.statut === 'validee');
};
