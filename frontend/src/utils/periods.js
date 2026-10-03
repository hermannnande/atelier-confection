// Périodes proposées pour consulter les gains (dates locales, bornes incluses).
export const PERIOD_PRESETS = [
  { id: 'aujourdhui', label: 'Aujourd’hui' },
  { id: 'hier', label: 'Hier' },
  { id: 'semaine', label: 'Cette semaine' },
  { id: 'semaine-derniere', label: 'Semaine dernière' },
  { id: 'mois', label: 'Ce mois' },
  { id: 'mois-dernier', label: 'Mois dernier' },
  { id: 'personnalisee', label: 'Dates au choix' },
];

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const decale = (date, jours) => {
  const copie = new Date(date);
  copie.setDate(copie.getDate() + jours);
  return copie;
};

// Lundi de la semaine de la date (la semaine commence le lundi).
const lundi = (date) => decale(date, -((date.getDay() + 6) % 7));

export function periodRange(preset, now = new Date()) {
  const aujourdhui = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'hier': {
      const hier = dateKey(decale(aujourdhui, -1));
      return { du: hier, au: hier };
    }
    case 'semaine':
      return { du: dateKey(lundi(aujourdhui)), au: dateKey(aujourdhui) };
    case 'semaine-derniere': {
      const debut = decale(lundi(aujourdhui), -7);
      return { du: dateKey(debut), au: dateKey(decale(debut, 6)) };
    }
    case 'mois':
      return { du: dateKey(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1)), au: dateKey(aujourdhui) };
    case 'mois-dernier':
      return {
        du: dateKey(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1)),
        au: dateKey(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 0)),
      };
    default:
      return { du: dateKey(aujourdhui), au: dateKey(aujourdhui) };
  }
}

// « le 03/10/2026 » ou « du 01/10/2026 au 31/10/2026 ».
export function periodLabel(du, au) {
  const lisible = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('fr-FR');
  return du === au ? `le ${lisible(du)}` : `du ${lisible(du)} au ${lisible(au)}`;
}
