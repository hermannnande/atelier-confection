import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes MongoDB (par défaut)
import mongoAuthRoutes from './routes/auth.js';
import mongoCommandeRoutes from './routes/commandes.js';
import mongoStockRoutes from './routes/stock.js';
import mongoLivraisonRoutes from './routes/livraisons.js';
import mongoPerformanceRoutes from './routes/performances.js';
import mongoUserRoutes from './routes/users.js';
import mongoModeleRoutes from './routes/modeles.js';
import systemRoutes from './routes/system.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const USE_SUPABASE = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
const IS_VERCEL = !!process.env.VERCEL;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers uploadés
app.use('/uploads', express.static('uploads'));

// Routes (MongoDB ou Supabase)
if (USE_SUPABASE) {
  const [{ default: authRoutes }, { default: commandeRoutes }, { default: commandePublicRoutes }, { default: stockRoutes }, { default: livraisonRoutes }, { default: performanceRoutes }, { default: userRoutes }, { default: modeleRoutes }] =
    await Promise.all([
      import('./supabase/routes/auth.js'),
      import('./supabase/routes/commandes.js'),
      import('./supabase/routes/commandes-public.js'),
      import('./supabase/routes/stock.js'),
      import('./supabase/routes/livraisons.js'),
      import('./supabase/routes/performances.js'),
      import('./supabase/routes/users.js'),
      import('./supabase/routes/modeles.js'),
    ]);

  app.use('/api/auth', authRoutes);
  app.use('/api/commandes', commandeRoutes);
  app.use('/api/commandes', commandePublicRoutes); // Route publique pour le site web
  app.use('/api/stock', stockRoutes);
  app.use('/api/livraisons', livraisonRoutes);
  app.use('/api/performances', performanceRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/modeles', modeleRoutes);

  console.log('🟣 Mode base de données: Supabase (PostgreSQL)');
} else {
  app.use('/api/auth', mongoAuthRoutes);
  app.use('/api/commandes', mongoCommandeRoutes);
  app.use('/api/stock', mongoStockRoutes);
  app.use('/api/livraisons', mongoLivraisonRoutes);
  app.use('/api/performances', mongoPerformanceRoutes);
  app.use('/api/users', mongoUserRoutes);
  app.use('/api/modeles', mongoModeleRoutes);

  console.log('🟢 Mode base de données: MongoDB');
}
app.use('/api', systemRoutes);

if (!IS_VERCEL) {
  if (USE_SUPABASE) {
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
  } else {
    // Connexion à MongoDB
    mongoose
      .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/atelier-confection')
      .then(() => {
        console.log('✅ Connecté à MongoDB');
        app.listen(PORT, () => {
          console.log(`🚀 Serveur démarré sur le port ${PORT}`);
        });
      })
      .catch((error) => {
        console.error('❌ Erreur de connexion à MongoDB:', error);
      });
  }
}

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Une erreur est survenue!', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Pour Vercel (serverless): exporter l'app Express comme handler
export default app;
