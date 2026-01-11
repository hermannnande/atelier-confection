import mongoose from 'mongoose';

const modeleSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  prixBase: {
    type: Number,
    required: true,
    min: 0
  },
  // Catégorie (optionnel)
  categorie: {
    type: String,
    enum: ['Robe', 'Chemise', 'Pantalon', 'Ensemble', 'Accessoire', 'Autre'],
    default: 'Autre'
  },
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour recherche rapide
modeleSchema.index({ nom: 1 });
modeleSchema.index({ categorie: 1 });

export default mongoose.model('Modele', modeleSchema);
