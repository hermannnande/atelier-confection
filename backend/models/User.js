import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['administrateur', 'gestionnaire', 'appelant', 'styliste', 'couturier', 'livreur'],
    required: true
  },
  telephone: {
    type: String,
    trim: true
  },
  actif: {
    type: Boolean,
    default: true
  },
  // Statistiques
  stats: {
    commandesTraitees: { type: Number, default: 0 },
    commandesEnCours: { type: Number, default: 0 },
    tauxReussite: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Ne pas retourner le mot de passe dans les requêtes
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);




