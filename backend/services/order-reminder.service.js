export const ORDER_REMINDER_STATUS = 'a_rappeler';
export const ORDER_STATUSES_ALLOWED_FOR_REMINDER = ['nouvelle', 'validee'];

export function assertCanSendOrderToReminder(status) {
  if (!ORDER_STATUSES_ALLOWED_FOR_REMINDER.includes(status)) {
    throw new Error('Seules les commandes nouvelles ou validées peuvent être envoyées en rappel');
  }
  return ORDER_REMINDER_STATUS;
}

export function assertCanConfirmOrderReminder(status) {
  if (status !== ORDER_REMINDER_STATUS) {
    throw new Error('Cette commande n’est pas en attente de rappel');
  }
  return 'validee';
}
