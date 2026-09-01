export const ORDER_ORGANIZATION_COLORS = Object.freeze([
  'yellow',
]);

export function parseOrderOrganizationColor(value) {
  if (value === null || value === undefined || value === '' || value === 'none') {
    return null;
  }

  const color = String(value).trim().toLowerCase();
  if (!ORDER_ORGANIZATION_COLORS.includes(color)) {
    throw new RangeError('Couleur d’organisation invalide');
  }

  return color;
}
