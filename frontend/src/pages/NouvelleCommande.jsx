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
    
    if (!selectedVariation) {
      toast.error('Veuillez sélectionner une variation (taille + couleur)');
      return;
    }

    if (selectedVariation.quantitePrincipale <= 0) {
      toast.error('Cette variation n\'est pas en stock');
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

  // Créer la matrice taille × couleur
  const getVariationMatrix = () => {
    if (!selectedModel) return null;

    const tailles = Array.from(selectedModel.tailles).sort((a, b) => {
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL'];
      return order.indexOf(a) - order.indexOf(b);
    });
    const couleurs = Array.from(selectedModel.couleurs);

    return { tailles, couleurs };
  };

  const getVariationStock = (taille, couleur) => {
    if (!selectedModel) return null;
    return selectedModel.variations.find(v => v.taille === taille && v.couleur === couleur);
  };

  const matrix = getVariationMatrix();

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

        {/* Matrice Taille × Couleur */}
        {selectedModel && matrix && (
          <div className="stat-card animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <div className="w-1 h-8 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full"></div>
                <span>Sélectionner Taille & Couleur</span>
              </h2>
              {selectedVariation && (
                <span className="badge badge-success flex items-center space-x-2">
                  <Check size={14} />
                  <span>{selectedVariation.taille} • {selectedVariation.couleur}</span>
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase border-b-2 border-gray-200">
                      Taille / Couleur
                    </th>
                    {matrix.couleurs.map((couleur, i) => (
                      <th key={i} className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b-2 border-gray-200">
                        {couleur}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.tailles.map((taille, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-gray-900 text-sm">
                        {taille}
                      </td>
                      {matrix.couleurs.map((couleur, j) => {
                        const variation = getVariationStock(taille, couleur);
                        const isSelected = selectedVariation?._id === variation?._id;
                        const inStock = variation && variation.quantitePrincipale > 0;
                        
                        return (
                          <td key={j} className="px-2 py-2">
                            {variation ? (
                              <button
                                type="button"
                                onClick={() => handleVariationSelect(variation)}
                                disabled={!inStock}
                                className={`
                                  w-full px-3 py-2 rounded-xl text-sm font-bold transition-all duration-300
                                  ${isSelected
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                                    : inStock
                                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:shadow-md'
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }
                                `}
                              >
                                <div className="flex flex-col items-center space-y-1">
                                  <span className="text-base">{variation.quantitePrincipale}</span>
                                  <span className="text-xs opacity-80">{variation.prix.toLocaleString('fr-FR')} F</span>
                                </div>
                              </button>
                            ) : (
                              <div className="w-full px-3 py-2 rounded-xl bg-gray-50 text-center">
                                <span className="text-gray-300 text-xs">—</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Légende */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-200"></div>
                <span className="text-gray-600 font-medium">Disponible</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded"></div>
                <span className="text-gray-600 font-medium">Sélectionné</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 rounded"></div>
                <span className="text-gray-600 font-medium">Rupture</span>
              </div>
            </div>
          </div>
        )}

        {/* Résumé & Prix */}
        {selectedVariation && (
          <div className="stat-card animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
              <div className="w-1 h-8 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full"></div>
              <span>Résumé</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Modèle</p>
                <p className="text-lg font-black text-gray-900">{selectedModel.nom}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200/60">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Taille & Couleur</p>
                <p className="text-lg font-black text-gray-900">{selectedVariation.taille} • {selectedVariation.couleur}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/60">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Prix</p>
                <p className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {selectedVariation.prix.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Options & Notes */}
        {selectedVariation && (
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
            disabled={loading || !selectedVariation}
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
