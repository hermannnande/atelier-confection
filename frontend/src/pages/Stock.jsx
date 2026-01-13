import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, Plus, Search, Eye, X, Save, AlertTriangle, ChevronRight, Edit2 } from 'lucide-react';

const Stock = () => {
  const [stock, setStock] = useState([]);
  const [modeles, setModeles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedModeleDetails, setSelectedModeleDetails] = useState(null);
  const [selectedModele, setSelectedModele] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedVariations, setEditedVariations] = useState([]);
  
  // État pour les tailles/couleurs personnalisées
  const [customTailles, setCustomTailles] = useState([]);
  const [customCouleurs, setCustomCouleurs] = useState([]);
  const [newTaille, setNewTaille] = useState('');
  const [newCouleur, setNewCouleur] = useState('');
  
  // Suggestions
  const taillesSuggestions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL'];
  const couleursSuggestions = ['Blanc', 'Noir', 'Rouge', 'Bleu', 'Vert', 'Jaune', 'Rose', 'Violet', 'Orange', 'Gris', 'Beige', 'Marron', 'Terracotta', 'Multicolore'];

  const [variations, setVariations] = useState([]);

  useEffect(() => {
    fetchStock();
    fetchModeles();
  }, []);

  const fetchStock = async () => {
    try {
      const response = await api.get('/stock');
      setStock(response.data.stock || []);
    } catch (error) {
      toast.error('Erreur lors du chargement du stock');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModeles = async () => {
    try {
      const response = await api.get('/modeles');
      setModeles(response.data.modeles || []);
    } catch (error) {
      console.error('Erreur chargement modèles:', error);
    }
  };

  // Grouper le stock par modèle
  const groupedStock = stock.reduce((acc, item) => {
    const key = item.modele;
    if (!acc[key]) {
      // Chercher l'image depuis la bibliothèque de modèles si elle n'existe pas dans le stock
      let imageUrl = item.image;
      if (!imageUrl) {
        const modeleCorrespondant = modeles.find(m => m.nom === key);
        imageUrl = modeleCorrespondant?.image || null;
      }
      
      acc[key] = {
        modele: key,
        image: imageUrl,
        variations: [],
        quantiteTotal: 0,
        quantiteLivraison: 0,
        valeurTotal: 0,
        taillesUniques: new Set(),
        couleursUniques: new Set()
      };
    }
    acc[key].variations.push(item);
    acc[key].quantiteTotal += item.quantitePrincipale || item.quantite || 0;
    acc[key].quantiteLivraison += item.quantiteEnLivraison || 0;
    acc[key].valeurTotal += (item.quantitePrincipale || item.quantite || 0) * item.prix;
    acc[key].taillesUniques.add(item.taille);
    acc[key].couleursUniques.add(item.couleur);
    return acc;
  }, {});

  const stockGroupe = Object.values(groupedStock)
    .map(item => ({
      ...item,
      taillesUniques: Array.from(item.taillesUniques),
      couleursUniques: Array.from(item.couleursUniques)
    }))
    .filter(item =>
      searchTerm === '' || item.modele.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleModeleSelect = (modele) => {
    setSelectedModele(modele);
    setCustomTailles([]);
    setCustomCouleurs([]);
    setVariations([]);
  };

  const handleViewDetails = (modeleGroup) => {
    setSelectedModeleDetails(modeleGroup);
    setEditedVariations(modeleGroup.variations.map(v => ({
      ...v,
      quantitePrincipale: v.quantitePrincipale || v.quantite || 0,
      prix: v.prix
    })));
    setEditMode(false);
    setShowDetailsModal(true);
  };

  const handleEditVariation = (index, field, value) => {
    setEditedVariations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveChanges = async () => {
    try {
      let successCount = 0;
      
      for (const variation of editedVariations) {
        try {
          // Conserver TOUTES les données importantes, y compris l'image
          await api.put(`/stock/${variation._id || variation.id}`, {
            quantite: variation.quantitePrincipale,
            prix: variation.prix,
            modele: variation.modele,
            taille: variation.taille,
            couleur: variation.couleur,
            image: variation.image || selectedModeleDetails.image // Conserver l'image
          });
          successCount++;
        } catch (error) {
          console.error(`Erreur pour ${variation.taille} × ${variation.couleur}:`, error);
        }
      }
      
      toast.success(`${successCount} variation(s) mise(s) à jour !`);
      setEditMode(false);
      fetchStock();
      
      // Mettre à jour les données du modal
      const updatedGroup = {
        ...selectedModeleDetails,
        variations: editedVariations,
        quantiteTotal: editedVariations.reduce((sum, v) => sum + v.quantitePrincipale, 0),
        valeurTotal: editedVariations.reduce((sum, v) => sum + (v.quantitePrincipale * v.prix), 0)
      };
      setSelectedModeleDetails(updatedGroup);
      
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const addTaille = (taille) => {
    if (taille && !customTailles.includes(taille)) {
      setCustomTailles([...customTailles, taille]);
      generateVariations([...customTailles, taille], customCouleurs);
    }
  };

  const addCouleur = (couleur) => {
    if (couleur && !customCouleurs.includes(couleur)) {
      setCustomCouleurs([...customCouleurs, couleur]);
      generateVariations(customTailles, [...customCouleurs, couleur]);
    }
  };

  const removeTaille = (taille) => {
    const newTailles = customTailles.filter(t => t !== taille);
    setCustomTailles(newTailles);
    generateVariations(newTailles, customCouleurs);
  };

  const removeCouleur = (couleur) => {
    const newCouleurs = customCouleurs.filter(c => c !== couleur);
    setCustomCouleurs(newCouleurs);
    generateVariations(customTailles, newCouleurs);
  };

  const generateVariations = (tailles, couleurs) => {
    const newVariations = [];
    tailles.forEach(taille => {
      couleurs.forEach(couleur => {
        const existing = variations.find(v => v.taille === taille && v.couleur === couleur);
        newVariations.push({
          taille,
          couleur,
          quantite: existing?.quantite || 0,
          prix: existing?.prix || selectedModele?.prixBase || selectedModele?.prix_base || 0
        });
      });
    });
    setVariations(newVariations);
  };

  const updateVariation = (index, field, value) => {
    setVariations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitVariations = async () => {
    try {
      if (customTailles.length === 0 || customCouleurs.length === 0) {
        toast.error('Ajoutez au moins 1 taille et 1 couleur');
        return;
      }

      const validVariations = variations.filter(v => v.quantite > 0);
      
      if (validVariations.length === 0) {
        toast.error('Ajoutez au moins une variation avec une quantité');
        return;
      }

      for (const variation of validVariations) {
        await api.post('/stock', {
          modele: selectedModele.nom,
          taille: variation.taille,
          couleur: variation.couleur,
          quantite: variation.quantite,
          prix: variation.prix,
          image: selectedModele.image
        });
      }

      toast.success(`${validVariations.length} variation(s) ajoutée(s) au stock !`);
      setShowModal(false);
      setSelectedModele(null);
      setCustomTailles([]);
      setCustomCouleurs([]);
      setVariations([]);
      fetchStock();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200/30 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Gestion du Stock
          </h1>
          <p className="text-gray-600 font-medium mt-1">Suivez l'inventaire de l'atelier</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>Ajouter au Stock</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { name: 'Modèles', value: stockGroupe.length, gradient: 'from-blue-500 to-cyan-500' },
          { name: 'Stock Principal', value: stock.reduce((sum, item) => sum + (item.quantitePrincipale || item.quantite || 0), 0), gradient: 'from-emerald-500 to-teal-500' },
          { name: 'En Livraison', value: stock.reduce((sum, item) => sum + (item.quantiteEnLivraison || 0), 0), gradient: 'from-amber-500 to-orange-500' },
          { name: 'Valeur Totale', value: `${stock.reduce((sum, item) => sum + ((item.quantitePrincipale || item.quantite || 0) * item.prix), 0).toLocaleString('fr-FR')} F`, gradient: 'from-purple-500 to-pink-500' }
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">{stat.name}</p>
            <p className={`text-4xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {stock.filter(item => (item.quantitePrincipale || item.quantite || 0) <= 2).length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="text-amber-600" size={24} />
            <div>
              <p className="font-bold text-gray-900">Alertes de Stock</p>
              <p className="text-sm text-gray-600">
                {stock.filter(item => (item.quantitePrincipale || item.quantite || 0) <= 2).length} variation(s) en faible stock
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="stat-card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12"
            placeholder="Rechercher un modèle..."
          />
        </div>
      </div>

      {/* Grille de modèles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stockGroupe.map((item, index) => (
          <div
            key={item.modele}
            className="stat-card group cursor-pointer hover:scale-105"
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => handleViewDetails(item)}
          >
            {/* Image */}
            <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 overflow-hidden">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.modele}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="text-gray-400" size={48} />
                </div>
              )}
              <div className="absolute top-3 right-3">
                <span className="badge badge-primary px-3 py-1.5">
                  {item.variations.length} variations
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3">
              <div>
                <h3 className="font-black text-gray-900 text-xl mb-2">{item.modele}</h3>
                
                {/* Stats inline */}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold text-gray-500">Stock:</span>
                    <span className={`font-bold ${item.quantiteTotal <= 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {item.quantiteTotal}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold text-gray-500">Livraison:</span>
                    <span className="font-bold text-amber-600">{item.quantiteLivraison}</span>
                  </div>
                </div>
              </div>

              {/* Tailles & Couleurs */}
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Tailles disponibles:</p>
                  <div className="flex flex-wrap gap-1">
                    {item.taillesUniques.map(taille => (
                      <span key={taille} className="badge badge-secondary text-xs">{taille}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Couleurs disponibles:</p>
                  <div className="flex flex-wrap gap-1">
                    {item.couleursUniques.map(couleur => (
                      <span key={couleur} className="badge badge-info text-xs">{couleur}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Valeur */}
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Valeur totale</p>
                <p className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {item.valeurTotal.toLocaleString('fr-FR')} F
                </p>
              </div>

              {/* Bouton Voir Détails */}
              <button
                className="w-full btn btn-secondary btn-sm flex items-center justify-center space-x-2 group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-600 group-hover:text-white"
              >
                <Eye size={16} />
                <span>Voir les variations</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Détails Modèle */}
      {showDetailsModal && selectedModeleDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-black text-white">{selectedModeleDetails.modele}</h2>
                <p className="text-white/80 text-sm">{selectedModeleDetails.variations.length} variations</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedModeleDetails(null);
                }}
                className="p-2 text-white hover:bg-white/20 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats résumé */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-sm font-bold text-gray-600 mb-1">Stock Principal</p>
                  <p className="text-3xl font-black text-emerald-600">
                    {editMode 
                      ? editedVariations.reduce((sum, v) => sum + v.quantitePrincipale, 0)
                      : selectedModeleDetails.quantiteTotal
                    }
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-sm font-bold text-gray-600 mb-1">En Livraison</p>
                  <p className="text-3xl font-black text-amber-600">{selectedModeleDetails.quantiteLivraison}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-sm font-bold text-gray-600 mb-1">Valeur Totale</p>
                  <p className="text-2xl font-black text-purple-600">
                    {editMode
                      ? editedVariations.reduce((sum, v) => sum + (v.quantitePrincipale * v.prix), 0).toLocaleString('fr-FR')
                      : selectedModeleDetails.valeurTotal.toLocaleString('fr-FR')
                    } F
                  </p>
                </div>
              </div>

              {/* Boutons action */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">📦 Toutes les variations</h3>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Edit2 size={18} />
                    <span>Modifier</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEditedVariations(selectedModeleDetails.variations.map(v => ({
                          ...v,
                          quantitePrincipale: v.quantitePrincipale || v.quantite || 0,
                          prix: v.prix
                        })));
                      }}
                      className="btn btn-secondary"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      className="btn btn-success flex items-center space-x-2"
                    >
                      <Save size={18} />
                      <span>Sauvegarder</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Table des variations */}
              <div className="overflow-x-auto bg-white rounded-xl border-2 border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-blue-50 border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Taille</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Couleur</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Stock Principal</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">En Livraison</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Prix Unitaire</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editMode ? editedVariations : selectedModeleDetails.variations).map((variation, idx) => {
                      const qty = variation.quantitePrincipale || variation.quantite || 0;
                      const valeur = qty * variation.prix;
                      return (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="badge badge-secondary font-bold">{variation.taille}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="badge badge-info font-bold">{variation.couleur}</span>
                          </td>
                          <td className="px-4 py-3">
                            {editMode ? (
                              <input
                                type="number"
                                value={variation.quantitePrincipale}
                                onChange={(e) => handleEditVariation(idx, 'quantitePrincipale', parseInt(e.target.value) || 0)}
                                min="0"
                                className="input w-24 font-bold text-lg"
                              />
                            ) : (
                              <span className={`font-bold text-lg ${qty <= 2 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {qty}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-lg text-amber-600">
                              {variation.quantiteEnLivraison || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {editMode ? (
                              <input
                                type="number"
                                value={variation.prix}
                                onChange={(e) => handleEditVariation(idx, 'prix', parseInt(e.target.value) || 0)}
                                min="0"
                                step="100"
                                className="input w-32 font-bold"
                              />
                            ) : (
                              <span className="font-bold text-gray-900">
                                {variation.prix?.toLocaleString('fr-FR')} F
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-black text-purple-600">
                            {valeur.toLocaleString('fr-FR')} F
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter au Stock (reste identique) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-black text-white">
                Ajouter au Stock
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedModele(null);
                  setCustomTailles([]);
                  setCustomCouleurs([]);
                  setVariations([]);
                }}
                className="p-2 text-white hover:bg-white/20 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {!selectedModele ? (
                <>
                  <p className="text-gray-600 font-medium">Sélectionnez un modèle de la bibliothèque</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modeles.filter(m => m.actif !== false).map((modele, i) => (
                      <button
                        key={modele.id || modele._id}
                        type="button"
                        onClick={() => handleModeleSelect(modele)}
                        className="stat-card text-left hover:scale-105 group"
                        style={{ animationDelay: `${i * 0.05}s` }}
                      >
                        {modele.image && (
                          <div className="w-full h-32 mb-3 rounded-xl overflow-hidden">
                            <img src={modele.image} alt={modele.nom} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          </div>
                        )}
                        <div className="flex items-start space-x-3">
                          <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
                            <Package className="text-white" size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{modele.nom}</h3>
                            <p className="text-sm text-gray-500">{modele.categorie}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            {(modele.prixBase || modele.prix_base)?.toLocaleString('fr-FR')} F
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Modèle sélectionné */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase">Modèle sélectionné</p>
                        <h3 className="text-2xl font-black text-gray-900">{selectedModele.nom}</h3>
                        <p className="text-gray-600">Prix de base: {(selectedModele.prixBase || selectedModele.prix_base)?.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedModele(null);
                          setCustomTailles([]);
                          setCustomCouleurs([]);
                          setVariations([]);
                        }}
                        className="btn btn-secondary"
                      >
                        Changer
                      </button>
                    </div>
                  </div>

                  {/* Ajouter Tailles */}
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      ✂️ Tailles disponibles *
                    </h3>
                    
                    {customTailles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {customTailles.map(taille => (
                          <span key={taille} className="badge badge-primary px-4 py-2 flex items-center space-x-2">
                            <span className="font-bold">{taille}</span>
                            <button onClick={() => removeTaille(taille)} className="hover:text-red-600">
                              <X size={16} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mb-2">Suggestions rapides:</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {taillesSuggestions.map(taille => (
                        <button
                          key={taille}
                          type="button"
                          onClick={() => addTaille(taille)}
                          disabled={customTailles.includes(taille)}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            customTailles.includes(taille)
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-blue-500 hover:text-white'
                          }`}
                        >
                          {taille}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newTaille}
                        onChange={(e) => setNewTaille(e.target.value.toUpperCase())}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addTaille(newTaille);
                            setNewTaille('');
                          }
                        }}
                        placeholder="Taille personnalisée..."
                        className="input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          addTaille(newTaille);
                          setNewTaille('');
                        }}
                        className="btn btn-primary"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Ajouter Couleurs */}
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      🎨 Couleurs disponibles *
                    </h3>
                    
                    {customCouleurs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {customCouleurs.map(couleur => (
                          <span key={couleur} className="badge badge-info px-4 py-2 flex items-center space-x-2">
                            <span className="font-bold">{couleur}</span>
                            <button onClick={() => removeCouleur(couleur)} className="hover:text-red-600">
                              <X size={16} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mb-2">Suggestions rapides:</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {couleursSuggestions.map(couleur => (
                        <button
                          key={couleur}
                          type="button"
                          onClick={() => addCouleur(couleur)}
                          disabled={customCouleurs.includes(couleur)}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            customCouleurs.includes(couleur)
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-purple-500 hover:text-white'
                          }`}
                        >
                          {couleur}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newCouleur}
                        onChange={(e) => setNewCouleur(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addCouleur(newCouleur);
                            setNewCouleur('');
                          }
                        }}
                        placeholder="Couleur personnalisée..."
                        className="input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          addCouleur(newCouleur);
                          setNewCouleur('');
                        }}
                        className="btn btn-primary"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Matrice des variations */}
                  {customTailles.length > 0 && customCouleurs.length > 0 && (
                    <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        📦 Ajouter les quantités par taille et couleur
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                                Taille
                              </th>
                              <th className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                                Couleur
                              </th>
                              <th className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                                Quantité
                              </th>
                              <th className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-gray-200">
                                Prix (FCFA)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {variations.map((variation, index) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-blue-50/30">
                                <td className="px-4 py-3">
                                  <span className="badge badge-secondary">{variation.taille}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="badge badge-info">{variation.couleur}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={variation.quantite}
                                    onChange={(e) => updateVariation(index, 'quantite', parseInt(e.target.value) || 0)}
                                    min="0"
                                    className="input w-24"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={variation.prix}
                                    onChange={(e) => updateVariation(index, 'prix', parseInt(e.target.value) || 0)}
                                    min="0"
                                    step="100"
                                    className="input w-32"
                                    placeholder="0"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModele(null);
                        setCustomTailles([]);
                        setCustomCouleurs([]);
                        setVariations([]);
                      }}
                      className="btn btn-secondary"
                    >
                      Retour
                    </button>
                    <button
                      onClick={handleSubmitVariations}
                      disabled={customTailles.length === 0 || customCouleurs.length === 0 || variations.filter(v => v.quantite > 0).length === 0}
                      className="btn btn-success flex items-center space-x-2"
                    >
                      <Save size={20} />
                      <span>Ajouter au Stock</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
