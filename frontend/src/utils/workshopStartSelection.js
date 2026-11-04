// Le styliste peut commencer seulement une partie des pièces d'une variation
// (par exemple 1 sur 2). Les pièces restantes restent dans « Modèles en attente ».

// Le nombre choisi, borné aux pièces affichées. Sans choix : toutes les pièces.
export function chosenStartCount(chosen, available) {
  const max = Math.max(0, Math.trunc(Number(available) || 0));
  if (max === 0) return 0;
  const value = Math.trunc(Number(chosen));
  if (!Number.isFinite(value) || chosen === null || chosen === undefined) return max;
  return Math.min(Math.max(value, 1), max);
}

// Le serveur envoie les pièces par priorité (urgentes, puis validées le plus
// tôt) : on commence donc toujours les premières.
export function piecesToStart(pieces, count) {
  const list = Array.isArray(pieces) ? pieces : [];
  return list.slice(0, chosenStartCount(count, list.length));
}

export function startButtonLabel(count, available) {
  if (count < available) return `Je commence ${count} pièce${count > 1 ? 's' : ''} sur ${available}`;
  return count > 1 ? `Je commence ces ${count} pièces` : 'Je commence cette pièce';
}

export function startSuccessMessage(count, remaining) {
  const started = count > 1
    ? 'C’est enregistré. Ces pièces restent dans « Mes tenues en cours » jusqu’à leur réception.'
    : 'C’est enregistré. Cette pièce reste dans « Mes tenues en cours » jusqu’à sa réception.';
  if (remaining < 1) return started;
  return `${started} ${remaining > 1 ? `Il reste ${remaining} pièces` : 'Il reste 1 pièce'} à commencer.`;
}
