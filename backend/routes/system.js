import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Test de santé de l'API
router.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'Connecté' : 'Déconnecté';
  
  res.json({
    status: 'OK',
    message: 'API Atelier de Confection - Serveur actif',
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Statistiques globales
router.get('/stats', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const stats = {};

    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      stats[collection.name] = count;
    }

    res.json({
      status: 'OK',
      database: mongoose.connection.name,
      collections: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
});

export default router;




