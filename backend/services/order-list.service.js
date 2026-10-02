// Supabase renvoie au plus 1000 lignes par requête : une liste plus longue est
// lue par pages successives, dans le même ordre.
const PAGE_SIZE = 1000;
export const MAX_ORDER_LIST_LIMIT = 2000;

export function parseOrderListLimit(value) {
  if (value === undefined || value === null || value === '') return null;
  const limit = Number.parseInt(value, 10);
  if (!Number.isFinite(limit) || limit < 1) return null;
  return Math.min(limit, MAX_ORDER_LIST_LIMIT);
}

export async function fetchRowsUpTo(buildQuery, limit, pageSize = PAGE_SIZE) {
  const rows = [];
  while (rows.length < limit) {
    const size = Math.min(pageSize, limit - rows.length);
    const { data, error } = await buildQuery().range(rows.length, rows.length + size - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if ((data || []).length < size) break;
  }
  return { data: rows, error: null };
}
