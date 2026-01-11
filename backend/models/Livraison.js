import mongoose from 'mongoose';

const livraisonSchema = new mongoose.Schema({
  commande: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commande',
    required: true
  },
  livreur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  statut: {
    type: String,
    enum: ['assignee', 'en_cours', 'livree', 'refusee', 'retournee'],
    default: 'assignee'
  },
  dateAssignation: {
    type: Date,
    default: Date.now
  },
  dateLivraison: Date,
  // Détails de livraison
  adresseLivraison: {
    ville: String,
    details: String
  },
  instructions: String,
  // En cas de refus
  motifRefus: String,
  photoRefus: String, // URL de la photo si nécessaire
  // Retour au stock
  dateRetour: Date,
  verifieParGestionnaire: {
    type: Boolean,
    default: false
  },
  gestionnaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  commentaireGestionnaire: String
}, {
  timestamps: true
});

export default mongoose.model('Livraison', livraisonSchema);




