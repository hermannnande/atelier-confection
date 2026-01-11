import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  modele: {
    type: String,
    required: true
  },
  taille: {
    type: String,
    required: true
  },
  couleur: {
    type: String,
    required: true
  },
  // Stock principal (en atelier)
  quantitePrincipale: {
    type: Number,
    default: 0,
    min: 0
  },
  // Stock en livraison (chez les livreurs)
  quantiteEnLivraison: {
    type: Number,
    default: 0,
    min: 0
  },
  // Prix unitaire
  prix: {
    type: Number,
    required: true,
    min: 0
  },
  // Image du modèle
  image: String,
  // Historique des mouvements
  mouvements: [{
    type: {
      type: String,
      enum: ['entree', 'sortie', 'transfert', 'retour'],
      required: true
    },
    quantite: {
      type: Number,
      required: true
    },
    source: String, // Stock principal, en livraison, etc.
    destination: String,
    commande: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Commande'
    },
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    },
    commentaire: String
  }]
}, {
  timestamps: true
});

// Index pour recherche rapide
stockSchema.index({ modele: 1, taille: 1, couleur: 1 }, { unique: true });

export default mongoose.model('Stock', stockSchema);




