import express from 'express';
import Modele from '../models/Modele.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

// GET /api/modeles - Liste tous les modèles
router.get('/', async (req, res) => {
  try {
    const { actif, categorie, search } = req.query;
    
    let query = {};
    
    if (actif !== undefined) {
      query.actif = actif === 'true';
    }
    
    if (categorie) {
      query.categorie = categorie;
    }
    
    if (search) {
      query.nom = { $regex: search, $options: 'i' };
    }
    
    const modeles = await Modele.find(query).sort({ nom: 1 });
    
    res.json({ modeles });
  } catch (error) {
    console.error('Erreur récupération modèles:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/modeles/:id - Détails d'un modèle
router.get('/:id', async (req, res) => {
  try {
    const modele = await Modele.findById(req.params.id);
    
    if (!modele) {
      return res.status(404).json({ message: 'Modèle non trouvé' });
    }
    
    res.json({ modele });
  } catch (error) {
    console.error('Erreur récupération modèle:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/modeles - Créer un modèle (Admin/Gestionnaire)
router.post('/', authorize(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { nom, description, image, prixBase, categorie } = req.body;
    
    // Vérifier si le modèle existe déjà
    const existant = await Modele.findOne({ nom });
    if (existant) {
      return res.status(400).json({ message: 'Un modèle avec ce nom existe déjà' });
    }
    
    const modele = new Modele({
      nom,
      description,
      image,
      prixBase,
      categorie
    });
    
    await modele.save();
    
    res.status(201).json({ 
      message: 'Modèle créé avec succès',
      modele 
    });
  } catch (error) {
    console.error('Erreur création modèle:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT /api/modeles/:id - Modifier un modèle (Admin/Gestionnaire)
router.put('/:id', authorize(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { nom, description, image, prixBase, categorie, actif } = req.body;
    
    const modele = await Modele.findById(req.params.id);
    
    if (!modele) {
      return res.status(404).json({ message: 'Modèle non trouvé' });
    }
    
    // Vérifier unicité du nom si modifié
    if (nom && nom !== modele.nom) {
      const existant = await Modele.findOne({ nom });
      if (existant) {
        return res.status(400).json({ message: 'Un modèle avec ce nom existe déjà' });
      }
    }
    
    // Mise à jour
    if (nom) modele.nom = nom;
    if (description !== undefined) modele.description = description;
    if (image !== undefined) modele.image = image;
    if (prixBase !== undefined) modele.prixBase = prixBase;
    if (categorie) modele.categorie = categorie;
    if (actif !== undefined) modele.actif = actif;
    
    await modele.save();
    
    res.json({ 
      message: 'Modèle modifié avec succès',
      modele 
    });
  } catch (error) {
    console.error('Erreur modification modèle:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE /api/modeles/:id - Supprimer un modèle (Admin/Gestionnaire)
router.delete('/:id', authorize(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const modele = await Modele.findById(req.params.id);
    
    if (!modele) {
      return res.status(404).json({ message: 'Modèle non trouvé' });
    }
    
    // Au lieu de supprimer, on désactive
    modele.actif = false;
    await modele.save();
    
    res.json({ message: 'Modèle désactivé avec succès' });
  } catch (error) {
    console.error('Erreur suppression modèle:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

export default router;
