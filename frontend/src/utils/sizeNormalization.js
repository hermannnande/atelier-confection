export function normalizeSize(value) {
  const text = String(value ?? '').trim();
  const compact = text.replace(/\s+/g, '').toUpperCase();
  if (compact === 'XXL' || compact === '2XL') return '2XL';
  if (compact === 'XXXL' || compact === '3XL') return '3XL';
  return text;
}
