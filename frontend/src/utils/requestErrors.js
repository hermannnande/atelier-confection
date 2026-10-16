// Pourquoi une requête n'a pas abouti : un message clair pour l'équipe, et une
// nouvelle tentative automatique seulement quand elle est sans risque.

export function isRequestCanceled(error) {
  return error?.code === 'ERR_CANCELED'
    || error?.name === 'CanceledError'
    || error?.name === 'AbortError';
}

export function isRequestTimeout(error) {
  return error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
}

// Serveur injoignable, en redémarrage ou passerelle en erreur : une lecture
// peut être relancée. Jamais une écriture, qui risquerait d'être faite deux fois.
export function isRetryableRequestError(error) {
  if (isRequestCanceled(error)) return false;
  const status = error?.response?.status;
  if (!status) return true;
  return status === 502 || status === 503 || status === 504;
}

export function describeRequestError(error, { online = globalThis.navigator?.onLine !== false } = {}) {
  if (!online) return 'Pas de connexion Internet.';
  if (isRequestTimeout(error)) return 'Le serveur met trop de temps à répondre.';

  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;
  if (!status) return 'Serveur injoignable. Vérifiez la connexion Internet.';
  if (status === 503) return serverMessage || 'Le serveur redémarre. Réessayez dans quelques secondes.';
  if (status === 502 || status === 504) return 'Le serveur ne répond pas pour le moment.';
  if (status === 403) return serverMessage || 'Accès non autorisé pour votre rôle.';
  return serverMessage || 'Erreur du serveur lors du chargement.';
}

// Attente avant la nouvelle tentative : celle demandée par le serveur
// (Retry-After, en secondes), bornée pour ne pas bloquer l'écran.
export function retryDelayMs(error, { fallbackMs = 1500, maxMs = 5000 } = {}) {
  const headers = error?.response?.headers;
  const seconds = Number(headers?.get?.('retry-after') ?? headers?.['retry-after']);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, maxMs) : fallbackMs;
}
