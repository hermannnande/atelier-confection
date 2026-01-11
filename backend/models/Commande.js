import mongoose from 'mongoose';

const commandeSchema = new mongoose.Schema({
  numeroCommande: {
    type: String,
    unique: true,
    required: true
  },
  // Informations client
  client: {
    nom: { type: String, required: true },
    contact: { type: String, required: true },
    ville: { type: String, required: true }
  },
  // Détails de la commande
  modele: {
    nom: { type: String, required: true },
    image: { type: String }, // URL de l'image
    description: String
  },
  taille: {
    type: String,
    required: true
  },
  couleur: {
    type: String,
    default: 'Non spécifié'
  },
  prix: {
    type: Number,
    required: true,
    min: 0
  },
  // Statut de la commande
  statut: {
    type: String,
    enum: [
      'en_attente_validation', // Nouvelle commande Google Sheets (à traiter)
      'nouvelle',           // Nouvelle commande
      'confirmee',          // Confirmée (anciennement validee)
      'validee',           // Validée par l'appelant
      'en_attente_paiement', // En attente de paiement
      'en_decoupe',        // Chez le styliste
      'en_couture',        // Chez le couturier
      'en_stock',          // Dans le stock principal
      'en_livraison',      // Assignée au livreur
      'livree',            // Livrée avec succès
      'refusee',           // Refusée par le client
      'annulee'            // Annulée
    ],
    default: 'nouvelle'
  },
  // Priorité
  urgence: {
    type: Boolean,
    default: false
  },
  // Workflow
  appelant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  noteAppelant: {
    type: String,
    trim: true
  },
  styliste: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dateDecoupe: Date,
  couturier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dateCouture: Date,
  livreur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dateLivraison: Date,
  motifRefus: String,
  // Traçabilité
  historique: [{
    action: String,
    statut: String,
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

// Générer un numéro de commande automatique
commandeSchema.pre('save', async function(next) {
  if (this.isNew && !this.numeroCommande) {
    const count = await mongoose.model('Commande').countDocuments();
    this.numeroCommande = `CMD${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Commande', commandeSchema);




