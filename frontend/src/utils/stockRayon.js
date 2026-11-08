// Un modèle « Vente de déstockage » est repéré par la fin de son nom, comme côté serveur.
const NOM_DESTOCKAGE = /\sd[ée]stockage\s*$/i;

export const isModeleDestockage = (modele) => NOM_DESTOCKAGE.test(String(modele?.nom ?? ''));
export const nomSansDestockage = (nom) => String(nom ?? '').replace(NOM_DESTOCKAGE, '').trim();
export const nomDestockage = (nom) => `${nomSansDestockage(nom)} Déstockage`;
