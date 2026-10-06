// Une ancienne copie du catalogue (navigateur admin resté sur d'anciennes
// données) ne doit écraser ni les fiches modifiées depuis, ni les photos et
// vidéos allégées par leurs originaux lourds.
export const STALE_COPY_TOLERANCE_MS = 10 * 60 * 1000;

const OPTIMIZED_FILE = /^(.+?)-optimized(?:-(?:thumbnail|gallery|video)-[0-9a-f]{12})?(?:-\d+)?\.(?:webp|mp4)$/i;

function fileName(url) {
  const clean = String(url || '').split(/[?#]/)[0];
  return clean.slice(clean.lastIndexOf('/') + 1).toLowerCase();
}

export function optimizedSourceName(url) {
  const match = fileName(url).match(OPTIMIZED_FILE);
  return match ? match[1] : null;
}

export function originalSourceName(url) {
  const name = fileName(url);
  if (!name || OPTIMIZED_FILE.test(name)) return null;
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : null;
}

function optimizedBySource(urls) {
  const sources = new Map();
  for (const url of urls) {
    const source = optimizedSourceName(url);
    if (source) sources.set(source, url);
  }
  return sources;
}

export function keepOptimizedMedia(row, current) {
  const images = optimizedBySource([current.thumbnail, ...(Array.isArray(current.images) ? current.images : [])]);
  const videos = optimizedBySource([current.video]);
  const keep = (sources) => (url) => sources.get(originalSourceName(url)) || url;
  return {
    ...row,
    thumbnail: row.thumbnail ? keep(images)(row.thumbnail) : row.thumbnail,
    images: row.images.map(keep(images)),
    video: row.video ? keep(videos)(row.video) : row.video,
  };
}

export function isStaleCopy(clientUpdatedAt, serverUpdatedAt, toleranceMs = STALE_COPY_TOLERANCE_MS) {
  const client = Date.parse(clientUpdatedAt || '');
  const server = Date.parse(serverUpdatedAt || '');
  if (!Number.isFinite(client) || !Number.isFinite(server)) return false;
  return client < server - toleranceMs;
}

export function protectCatalogRows(rows, currentRows, { toleranceMs = STALE_COPY_TOLERANCE_MS } = {}) {
  const currentById = new Map(currentRows.map((row) => [String(row.id), row]));
  const accepted = [];
  const skippedIds = [];
  for (const { clientUpdatedAt, ...row } of rows) {
    const current = currentById.get(row.id);
    if (!current) {
      accepted.push(row);
    } else if (isStaleCopy(clientUpdatedAt, current.updated_at, toleranceMs)) {
      skippedIds.push(row.id);
    } else {
      accepted.push(keepOptimizedMedia(row, current));
    }
  }
  return { rows: accepted, skippedIds };
}
