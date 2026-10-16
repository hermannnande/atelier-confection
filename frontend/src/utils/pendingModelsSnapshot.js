// Dernier état connu de « Modèles en attente », gardé dans ce navigateur : la
// page s'affiche aussitôt, puis se met à jour dès que le serveur répond.
const STORAGE_PREFIX = 'modeles-en-attente:';
const MAX_SNAPSHOT_AGE_MS = 12 * 60 * 60 * 1000;
export const REFRESH_INTERVAL_MS = 5000;
const MAX_REFRESH_INTERVAL_MS = 30000;

export function pendingModelsState(data = {}) {
  return {
    groupes: Array.isArray(data?.groupes) ? data.groupes : [],
    totalCommandes: Number(data?.totalCommandes) || 0,
    totalValidees: Number(data?.totalValidees) || 0,
    totalCouvertesStock: Number(data?.totalCouvertesStock) || 0,
    serverNow: data?.serverNow || null,
    generatedAt: data?.generatedAt || data?.serverNow || null,
    stale: data?.stale === true,
  };
}

export function readPendingModelsSnapshot(country, { storage = globalThis.localStorage, now = Date.now() } = {}) {
  try {
    const saved = JSON.parse(storage?.getItem(`${STORAGE_PREFIX}${country}`) || 'null');
    const savedAt = Number(saved?.savedAt);
    if (!saved?.data || !Number.isFinite(savedAt) || now - savedAt > MAX_SNAPSHOT_AGE_MS) return null;
    return pendingModelsState(saved.data);
  } catch {
    return null;
  }
}

export function savePendingModelsSnapshot(country, state, { storage = globalThis.localStorage, now = Date.now() } = {}) {
  try {
    storage?.setItem(`${STORAGE_PREFIX}${country}`, JSON.stringify({ savedAt: now, data: state }));
  } catch {
    // Stockage plein ou bloqué : la page fonctionne simplement sans.
  }
}

// Mise à jour toutes les 5 s, espacée après des échecs pour ne pas charger un
// serveur déjà en difficulté : 10 s, 20 s, puis 30 s au plus.
export function nextRefreshDelayMs(consecutiveFailures = 0) {
  if (!consecutiveFailures) return REFRESH_INTERVAL_MS;
  return Math.min(REFRESH_INTERVAL_MS * 2 ** consecutiveFailures, MAX_REFRESH_INTERVAL_MS);
}
