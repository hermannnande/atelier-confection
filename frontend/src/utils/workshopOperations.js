const operations = new Map();
// Keep the same request identifier after a timeout or reload. The server also
// checks the expected received count, protecting retries from another device.
export function workshopOperation(scope) {
  const key = `atelier-operation:${scope}`;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) return saved;
  } catch { /* Private browsing may disable storage. */ }
  const id = operations.get(key) || crypto.randomUUID();
  operations.set(key, id);
  try { sessionStorage.setItem(key, id); } catch { /* Server checks still apply. */ }
  return id;
}
