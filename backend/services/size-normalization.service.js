export function normalizeSize(value) {
  const text = String(value ?? '').trim();
  const compact = text.replace(/\s+/g, '').toUpperCase();
  if (compact === 'XXL' || compact === '2XL') return '2XL';
  if (compact === 'XXXL' || compact === '3XL') return '3XL';
  return text;
}

export function equivalentSizes(value) {
  const size = normalizeSize(value);
  if (size === '2XL') return ['2XL', 'XXL', '2xl', 'xxl', '2 XL', '2 xl'];
  if (size === '3XL') return ['3XL', 'XXXL', '3xl', 'xxxl', '3 XL', '3 xl'];
  return [...new Set([
    size,
    size.toUpperCase(),
    size.toLowerCase(),
    size.charAt(0).toUpperCase() + size.slice(1).toLowerCase(),
  ])];
}
