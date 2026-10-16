// Un même résultat de lecture, partagé entre les requêtes simultanées et
// réutilisé quelques secondes : dix onglets qui se rafraîchissent toutes les
// 5 s ne déclenchent plus qu'une lecture Supabase. Si la base ne répond pas,
// la dernière version réussie reste servie un moment, marquée comme ancienne,
// au lieu d'une erreur. À réserver aux affichages : jamais pour décider d'une
// écriture (réservation, mouvement de stock).
export function createSharedSnapshot({
  load,
  maxAgeMs,
  staleIfErrorMs = 0,
  now = () => Date.now(),
}) {
  const entries = new Map();

  return async function readSnapshot(key) {
    let entry = entries.get(key);
    if (!entry) {
      entry = { value: undefined, generatedAt: 0, pending: null };
      entries.set(key, entry);
    }

    if (entry.generatedAt && now() - entry.generatedAt < maxAgeMs) {
      return { value: entry.value, generatedAt: entry.generatedAt, stale: false };
    }

    if (!entry.pending) {
      entry.pending = Promise.resolve()
        .then(() => load(key))
        .then((value) => {
          entry.value = value;
          entry.generatedAt = now();
          return { value, generatedAt: entry.generatedAt, stale: false };
        })
        .finally(() => {
          entry.pending = null;
        });
    }

    try {
      return await entry.pending;
    } catch (error) {
      if (entry.generatedAt && now() - entry.generatedAt < staleIfErrorMs) {
        return { value: entry.value, generatedAt: entry.generatedAt, stale: true, error };
      }
      throw error;
    }
  };
}
