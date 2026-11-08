import Stock from './Stock';

// Même page et mêmes actions que Stock, limitées aux modèles « Vente de déstockage ».
const Destockage = () => <Stock rayon="destockage" />;

export default Destockage;
