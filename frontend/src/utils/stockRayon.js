// Un modèle « Vente de déstockage » est repéré par sa catégorie, comme côté serveur.
export const CATEGORIE_DESTOCKAGE = 'Déstockage';

const sansAccent = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase('fr')
  .trim();

export const isModeleDestockage = (modele) => sansAccent(modele?.categorie) === sansAccent(CATEGORIE_DESTOCKAGE);
