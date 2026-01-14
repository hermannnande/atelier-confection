import mongoose from 'mongoose';

const sessionCaisseSchema = new mongoose.Schema({
  livreur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  livraisons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Livraison'
  }],
  statut: {
    type: String,
    enum: ['ouverte', 'cloturee'],
    default: 'ouverte'
  },
  montantTotal: {
    type: Number,
    default: 0
  },
  nombreLivraisons: {
    type: Number,
    default: 0
  },
  dateDebut: {
    type: Date,
    default: Date.now
  },
  dateCloture: {
    type: Date
  },
  gestionnaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  commentaire: {
    type: String
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
sessionCaisseSchema.index({ livreur: 1, statut: 1 });
sessionCaisseSchema.index({ dateCloture: 1 });

const SessionCaisse = mongoose.model('SessionCaisse', sessionCaisseSchema);

export default SessionCaisse;

