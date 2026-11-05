// Recherche de la page Commandes : numéro, client, modèle principal et articles supplémentaires.
// Une robe ajoutée comme 2ᵉ article (ex. Aura de Femme dans une commande de Jupe Peniel) est retrouvée.
export function orderMatchesSearch(commande, searchTerm) {
  const term = String(searchTerm || '').toLowerCase();
  const supplements = Array.isArray(commande?.supplements) ? commande.supplements : [];
  return [
    commande?.numeroCommande,
    commande?.client?.nom,
    commande?.modele?.nom,
    ...supplements.map((item) => item?.libelle ?? item?.label),
  ].some((texte) => String(texte || '').toLowerCase().includes(term));
}
