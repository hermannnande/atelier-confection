// Équipes de l'atelier : les couturiers et les stylistes travaillent de jour ou de nuit.
export const TEAM_ROLES = ['couturier', 'styliste'];

export const TEAM_OPTIONS = [
  { value: 'jour', label: '☀️ Équipe de jour' },
  { value: 'nuit', label: '🌙 Équipe de nuit (19:00 → 07:00)' },
];

export function hasTeam(role) {
  return TEAM_ROLES.includes(role);
}

// Libellé court d'une équipe (« ☀️ Jour » ou « 🌙 Nuit ») ; vide pour les autres rôles.
export function teamLabel(equipe) {
  if (equipe === 'nuit') return '🌙 Nuit';
  if (equipe === 'jour') return '☀️ Jour';
  return '';
}

// Couturiers d'une équipe : '' = toutes les équipes. Sans équipe notée : jour.
export function inTeam(equipeChoisie, equipe) {
  return !equipeChoisie || (equipe || 'jour') === equipeChoisie;
}
