// Équipes de l'atelier (décision du 03/10/2026) : les couturiers et les stylistes
// travaillent de jour ou de nuit. L'équipe est notée dans le champ libre users.stats,
// vide jusque-là : sans valeur, la personne fait partie de l'équipe de jour.
export const TEAM_ROLES = ['couturier', 'styliste'];
export const TEAMS = ['jour', 'nuit'];

export function hasTeam(role) {
  return TEAM_ROLES.includes(role);
}

export function userTeam(row) {
  if (!hasTeam(row?.role)) return null;
  return row?.stats?.equipe === 'nuit' ? 'nuit' : 'jour';
}

// Valeur reçue d'un formulaire : « jour », « nuit » ou absente.
export function parseTeam(value) {
  if (value === undefined || value === null || value === '') return { equipe: undefined };
  return TEAMS.includes(value) ? { equipe: value } : { equipe: undefined, error: 'Équipe invalide' };
}

// Nouveau contenu de stats pour ce rôle et cette équipe, ou undefined si rien ne change.
// Les autres clés éventuelles de stats sont conservées.
export function teamStatsUpdate({ stats, role, equipe }) {
  const current = stats && typeof stats === 'object' ? stats : {};
  if (!hasTeam(role)) {
    if (!('equipe' in current)) return undefined;
    const { equipe: _retiree, ...rest } = current;
    return rest;
  }
  if (!equipe || current.equipe === equipe) return undefined;
  return { ...current, equipe };
}
