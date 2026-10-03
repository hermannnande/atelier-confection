// Horaires de pointage selon l'équipe. Les heures et les dates sont celles d'Abidjan
// (UTC), comme la date des pointages.
// Équipe de nuit (décision du 03/10/2026) : 19:00 → 07:00. Une nuit est rattachée à la
// date de son début : un pointage fait avant midi appartient à la nuit commencée la veille.
export const NIGHT_SHIFT = { debut: '19:00', fin: '07:00' };

const hhmm = (value, fallback) => String(value || fallback).slice(0, 5);

export function shiftDate(now, equipe) {
  const date = new Date(now);
  if (equipe === 'nuit' && date.getUTCHours() < 12) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function shiftHours(equipe, config) {
  if (equipe === 'nuit') return { ...NIGHT_SHIFT };
  return { debut: hhmm(config?.heure_ouverture, '08:30'), fin: hhmm(config?.heure_fermeture, '17:30') };
}

// En retard : plus de « tolerance_retard » minutes après le début du poste.
export function isLateArrival(now, equipe, config) {
  const [heures, minutes] = shiftHours(equipe, config).debut.split(':').map(Number);
  const debut = new Date(`${shiftDate(now, equipe)}T00:00:00.000Z`);
  debut.setUTCHours(heures, minutes, 0, 0);
  if (now <= debut) return false;
  return Math.floor((now - debut) / 60000) > Number(config?.tolerance_retard || 0);
}
