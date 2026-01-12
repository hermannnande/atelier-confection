import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Package, AlertCircle, Check, Eye, Search } from 'lucide-react';

const NouvelleCommande = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Listes complètes des tailles et couleurs disponibles
  const taillesDisponibles = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
  const couleursDisponibles = ['Blanc', 'Noir', 'Rouge', 'Bleu', 'Vert', 'Jaune', 'Rose', 'Violet', 'Orange', 'Gris', 'Beige', 'Marron', 'Terracotta', 'Multicolore'];
  
  const [formData, setFormData] = useState({
    client: {
      nom: '',
      contact: '',
      ville: ''
    },
    modele: {
      nom: '',
      image: '',
      description: ''
    },
    taille: '',
    couleur: '',
    prix: '',
    urgence: false,
    noteAppelant: ''
  });

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const response = await api.get('/stock');
      setStockItems(response.data.stock || []);
    } catch (error) {
      console.error('Erreur lors du chargement du stock:', error);
      toast.error('Erreur lors du chargement du stock');
    } finally {
      setLoadingStock(false);
    }
  };

  // Grouper le stock par modèle
  const groupedStock = stockItems.reduce((acc, item) => {
    const modelName = item.modele;
    if (!acc[modelName]) {
      acc[modelName] = {
        nom: modelName,
        image: item.image,
        variations: [],
        tailles: new Set(),
        couleurs: new Set(),
        quantiteTotal: 0,
        prixMin: item.prix,
        prixMax: item.prix
      };
    }
    
    acc[modelName].variations.push(item);
    acc[modelName].tailles.add(item.taille);
    acc[modelName].couleurs.add(item.couleur);
    acc[modelName].quantiteTotal += item.quantitePrincipale;
    acc[modelName].prixMin = Math.min(acc[modelName].prixMin, item.prix);
    acc[modelName].prixMax = Math.max(acc[modelName].prixMax, item.prix);
    
    return acc;
  }, {});

  const models = Object.values(groupedStock).filter(model => 
    searchTerm === '' || model.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setSelectedVariation(null);
    setFormData(prev => ({
      ...prev,
      modele: {
        nom: model.nom,
        image: model.image || '',
        description: ''
      },
      taille: '',
      couleur: '',
      prix: Math.round((model.prixMin + model.prixMax) / 2)
    }));
  };

  const handleVariationSelect = (variation) => {
    setSelectedVariation(variation);
    setFormData(prev => ({
      ...prev,
      taille: variation.taille,
      couleur: variation.couleur,
      prix: variation.prix
    }));
  };

  const handleTailleChange = (taille) => {
    setFormData(prev => ({
      ...prev,
      taille
    }));
    // Vérifier si une variation existe en stock pour cette combinaison
    if (selectedModel && formData.couleur) {
      const variation = getVariationStock(taille, formData.couleur);
      if (variation) {
        setFormData(prev => ({ ...prev, prix: variation.prix }));
      }
    }
  };

  const handleCouleurChange = (couleur) => {
    setFormData(prev => ({
      ...prev,
      couleur
    }));
    // Vérifier si une variation existe en stock pour cette combinaison
    if (selectedModel && formData.taille) {
      const variation = getVariationStock(formData.taille, couleur);
      if (variation) {
        setFormData(prev => ({ ...prev, prix: variation.prix }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('client.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        client: {
          ...prev.client,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.taille || !formData.couleur) {
      toast.error('Veuillez sélectionner une taille et une couleur');
      return;
    }

    if (!formData.prix || formData.prix <= 0) {
      toast.error('Veuillez saisir un prix valide');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/commandes', formData);
      toast.success('Commande créée avec succès !', {
        icon: '✅',
        style: {
          borderRadius: '16px',
          background: '#10b981',
          color: '#fff',
        },
      });
      navigate(`/commandes/${response.data.commande._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création', {
        style: {
          borderRadius: '16px',
          background: '#ef4444',
          color: '#fff',
        },
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getVariationStock = (taille, couleur) => {
    if (!selectedModel) return null;
    return selectedModel.variations.find(v => v.taille === taille && v.couleur === couleur);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/commandes')}
            className="p-3 text-gray-600 hover:bg-white/60 rounded-xl transition-all hover:scale-110 backdrop-blur-sm"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Nouvelle Commande
            </h1>
            <p className="text-gray-600 font-medium mt-1">Créer une nouvelle commande client</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations Client */}
        <div className="stat-card animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
            <span>Informations Client</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="client.nom" className="label">
                Nom du client *
              </label>
              <input
                type="text"
                id="client.nom"
                name="client.nom"
                value={formData.client.nom}
                onChange={handleChange}
                required
                className="input focus-ring"
                placeholder="Nom complet"
              />
            </div>
            <div>
              <label htmlFor="client.contact" className="label">
                Contact *
              </label>
              <input
                type="text"
                id="client.contact"
                name="client.contact"
                value={formData.client.contact}
                onChange={handleChange}
                required
                className="input focus-ring"
                placeholder="0777004562"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="client.ville" className="label">
                Ville *
              </label>
              <input
                type="text"
                id="client.ville"
                name="client.ville"
                value={formData.client.ville}
                onChange={handleChange}
                required
                className="input focus-ring"
                placeholder="Ville de livraison"
              />
            </div>
          </div>
        </div>

        {/* Sélection du Modèle */}
        <div className="stat-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
              <span>Sélectionner un Modèle</span>
            </h2>
            {selectedModel && (
              <span className="badge badge-success flex items-center space-x-2">
                <Check size={14} />
                <span>{selectedModel.nom}</span>
              </span>
            )}
          </div>

          {/* Barre de recherche */}
          <div className="mb-6">
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

          {loadingStock ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-32 rounded-2xl"></div>
              ))}
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60">
              <AlertCircle className="mx-auto text-amber-600 mb-4" size={48} />
              <p className="text-gray-700 font-semibold text-lg">
                {searchTerm ? 'Aucun modèle trouvé' : 'Aucun modèle en stock'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleModelSelect(model)}
                  className={`
                    group relative overflow-hidden p-5 rounded-2xl text-left transition-all duration-300
                    ${selectedModel?.nom === model.nom
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-xl shadow-blue-500/20 scale-105'
                      : 'bg-white/80 backdrop-blur-xl border border-gray-200/60 hover:shadow-xl hover:-translate-y-1'
                    }
                  `}
                >
                  {selectedModel?.nom === model.nom && (
                    <div className="absolute top-3 right-3 w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="text-white" size={16} strokeWidth={3} />
                    </div>
                  )}
                  
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 rounded-xl shadow-lg">
                      <Package className="text-white" size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-base mb-1 truncate">
                        {model.nom}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Stock: <span className="text-emerald-600 font-bold">{model.quantiteTotal}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-600">
                      {model.tailles.size} tailles • {model.couleurs.size} couleurs
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sélection Taille & Couleur */}
        {selectedModel && (
          <div className="stat-card animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <div className="w-1 h-8 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full"></div>
                <span>Sélectionner Taille & Couleur</span>
              </h2>
              {formData.taille && formData.couleur && (
                <span className="badge badge-success flex items-center space-x-2">
                  <Check size={14} />
                  <span>{formData.taille} • {formData.couleur}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sélection de la taille */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  📏 Taille *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {taillesDisponibles.map((taille) => {
                    const variation = formData.couleur ? getVariationStock(taille, formData.couleur) : null;
                    const inStock = variation && variation.quantitePrincipale > 0;
                    
                    return (
                      <button
                        key={taille}
                        type="button"
                        onClick={() => handleTailleChange(taille)}
                        className={`
                          px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300
                          ${formData.taille === taille
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:shadow-md'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-base">{taille}</span>
                          {inStock && (
                            <span className="text-xs opacity-80 mt-1">
                              Stock: {variation.quantitePrincipale}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sélection de la couleur */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  🎨 Couleur *
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                  {couleursDisponibles.map((couleur) => {
                    const variation = formData.taille ? getVariationStock(formData.taille, couleur) : null;
                    const inStock = variation && variation.quantitePrincipale > 0;
                    
                    return (
                      <button
                        key={couleur}
                        type="button"
                        onClick={() => handleCouleurChange(couleur)}
                        className={`
                          px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 text-left
                          ${formData.couleur === couleur
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                            : 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 hover:shadow-md'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span>{couleur}</span>
                          {inStock && (
                            <span className="text-xs opacity-80 bg-white/30 px-2 py-1 rounded">
                              {variation.quantitePrincipale}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Information sur le stock */}
            {formData.taille && formData.couleur && (
              <div className="mt-6">
                {(() => {
                  const variation = getVariationStock(formData.taille, formData.couleur);
                  if (variation && variation.quantitePrincipale > 0) {
                    return (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="flex items-center space-x-2">
                          <Check className="text-green-600" size={20} />
                          <p className="text-green-800 font-bold">
                            ✅ En stock : {variation.quantitePrincipale} unité(s) disponible(s)
                          </p>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="text-amber-600" size={20} />
                          <p className="text-amber-800 font-bold">
                            ⚠️ Cette combinaison n'est pas en stock - Commande sur mesure
                          </p>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        )}

        {/* Résumé & Prix */}
        {selectedModel && formData.taille && formData.couleur && (
          <div className="stat-card animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
              <div className="w-1 h-8 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full"></div>
              <span>Résumé & Prix</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Modèle</p>
                <p className="text-lg font-black text-gray-900">{selectedModel.nom}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200/60">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Taille & Couleur</p>
                <p className="text-lg font-black text-gray-900">{formData.taille} • {formData.couleur}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/60">
                <label htmlFor="prix" className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Prix *
                </label>
                <input
                  type="number"
                  id="prix"
                  name="prix"
                  value={formData.prix}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3 py-2 text-xl font-black bg-white border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="10000"
                />
                <p className="text-xs text-gray-500 mt-1">FCFA</p>
              </div>
            </div>
          </div>
        )}

        {/* Options & Notes */}
        {selectedModel && formData.taille && formData.couleur && (
          <div className="stat-card animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
              <div className="w-1 h-8 bg-gradient-to-b from-rose-600 to-pink-600 rounded-full"></div>
              <span>Options & Notes</span>
            </h2>
            <div className="space-y-6">
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/60">
                <input
                  type="checkbox"
                  id="urgence"
                  name="urgence"
                  checked={formData.urgence}
                  onChange={handleChange}
                  className="w-5 h-5 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="urgence" className="flex-1 cursor-pointer">
                  <span className="font-bold text-gray-900">Commande Urgente</span>
                  <p className="text-sm text-gray-600 mt-1">Le client a besoin de sa commande rapidement</p>
                </label>
              </div>

              <div>
                <label htmlFor="noteAppelant" className="label">
                  Note de l'appelant
                </label>
                <textarea
                  id="noteAppelant"
                  name="noteAppelant"
                  value={formData.noteAppelant}
                  onChange={handleChange}
                  rows="4"
                  className="input focus-ring"
                  placeholder="Instructions spéciales, modifications demandées, etc..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 sticky bottom-6 bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-white/40 shadow-xl">
          <button
            type="button"
            onClick={() => navigate('/commandes')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !selectedModel || !formData.taille || !formData.couleur || !formData.prix}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Save size={20} strokeWidth={2.5} />
            <span>{loading ? 'Création...' : 'Créer la commande'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default NouvelleCommande;
