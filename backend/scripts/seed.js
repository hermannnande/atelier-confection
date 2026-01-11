import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const users = [
  {
    nom: 'Admin Principal',
    email: 'admin@atelier.com',
    password: 'password123',
    role: 'administrateur',
    telephone: '+225 07 00 00 00 01'
  },
  {
    nom: 'Gestionnaire Principal',
    email: 'gestionnaire@atelier.com',
    password: 'password123',
    role: 'gestionnaire',
    telephone: '+225 07 00 00 00 02'
  },
  {
    nom: 'Appelant Marie',
    email: 'appelant@atelier.com',
    password: 'password123',
    role: 'appelant',
    telephone: '+225 07 00 00 00 03'
  },
  {
    nom: 'Appelant Jean',
    email: 'appelant2@atelier.com',
    password: 'password123',
    role: 'appelant',
    telephone: '+225 07 00 00 00 04'
  },
  {
    nom: 'Styliste Fatou',
    email: 'styliste@atelier.com',
    password: 'password123',
    role: 'styliste',
    telephone: '+225 07 00 00 00 05'
  },
  {
    nom: 'Couturier Amadou',
    email: 'couturier@atelier.com',
    password: 'password123',
    role: 'couturier',
    telephone: '+225 07 00 00 00 06'
  },
  {
    nom: 'Couturier Aïcha',
    email: 'couturier2@atelier.com',
    password: 'password123',
    role: 'couturier',
    telephone: '+225 07 00 00 00 07'
  },
  {
    nom: 'Livreur Koffi',
    email: 'livreur@atelier.com',
    password: 'password123',
    role: 'livreur',
    telephone: '+225 07 00 00 00 08'
  },
  {
    nom: 'Livreur Didier',
    email: 'livreur2@atelier.com',
    password: 'password123',
    role: 'livreur',
    telephone: '+225 07 00 00 00 09'
  }
];

const seedDatabase = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/atelier-confection');
    console.log('✅ Connecté à MongoDB');

    // Supprimer tous les utilisateurs existants
    await User.deleteMany({});
    console.log('🗑️  Utilisateurs existants supprimés');

    // Créer les nouveaux utilisateurs
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Utilisateur créé: ${user.nom} (${user.role})`);
    }

    console.log('\n🎉 Base de données initialisée avec succès!');
    console.log('\n📝 Comptes créés:');
    console.log('┌─────────────────────┬──────────────────────────────┬──────────────┐');
    console.log('│ Rôle                │ Email                        │ Mot de passe │');
    console.log('├─────────────────────┼──────────────────────────────┼──────────────┤');
    users.forEach(u => {
      console.log(`│ ${u.role.padEnd(19)} │ ${u.email.padEnd(28)} │ ${u.password.padEnd(12)} │`);
    });
    console.log('└─────────────────────┴──────────────────────────────┴──────────────┘');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
};

seedDatabase();




