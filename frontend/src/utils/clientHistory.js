// Profil du client affiché dans Appel, à partir de l'historique calculé par le serveur.
const plural = (count, singular, pluralForm) => `${count} ${count > 1 ? pluralForm : singular}`;

export const CLIENT_PROFILES = {
  nouveau: { label: 'Nouveau client', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  connu: { label: 'Client connu', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  fiable: { label: 'Client fiable', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  surveiller: { label: 'À surveiller', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  risque: { label: 'Client à risque', className: 'bg-gray-800 text-white border-gray-900' },
};

export const ORDER_OUTCOMES = {
  livree: { label: 'Livrée', className: 'bg-emerald-100 text-emerald-800' },
  refusee: { label: 'Refusée à la livraison', className: 'bg-gray-800 text-white' },
  annulee_apres_validation: { label: 'Annulée après validation', className: 'bg-orange-100 text-orange-800' },
  annulee: { label: 'Annulée avant validation', className: 'bg-slate-100 text-slate-700' },
  en_cours: { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
};

export function clientProfileSummary(history) {
  if (!history) return null;
  const profile = CLIENT_PROFILES[history.profil] || CLIENT_PROFILES.connu;
  const parts = [];
  if (history.total === 0) parts.push('Première commande');
  if (history.refusees > 0) parts.push(plural(history.refusees, 'refus à la livraison', 'refus à la livraison'));
  if (history.annuleesApresValidation > 0) {
    parts.push(plural(history.annuleesApresValidation, 'annulée après validation', 'annulées après validation'));
  }
  if (history.livrees > 0) parts.push(plural(history.livrees, 'livrée', 'livrées'));
  if (parts.length === 0) parts.push(plural(history.total, 'commande précédente', 'commandes précédentes'));
  return { ...profile, detail: parts.join(' · ') };
}

export function orderOutcomeLabel(issue) {
  return ORDER_OUTCOMES[issue] || ORDER_OUTCOMES.en_cours;
}
