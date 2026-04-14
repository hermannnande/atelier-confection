import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Package, AlertCircle, Check, Eye, Search, Plus, X } from 'lucide-react';

const NouvelleCommande = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Mode bicolore
  const [modeBicolore, setModeBicolore] = useState(false);
  const [bicolore1, setBicolore1] = useState('');
  const [bicolore2, setBicolore2] = useState('');
  
  // Listes complètes des tailles et couleurs disponibles
  const taillesDisponibles = ['Standard', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  const couleursDeBase = [
    'Blanc',
    'Noir',
    'Rouge',
    'Rouge Bordeaux',
    'Bleu',
    'Bleu ciel',
    'Bleu bic',
    'Vert',
    'Vert Treillis',
    'Jaune',
    'Jaune Moutarde',
    'Rose',
    'Saumon',
    'Violet',
    'Violet clair',
    'Orange',
    'Grise',
    'Beige',
    'Marron',
    'Terracotta',
    'Multicolore'
  ];

  // Couleurs enrichies : base + bicolores du stock du modele selectionne
  const couleursDisponibles = (() => {
    const set = new Set(couleursDeBase);
    if (selectedModel) {
      selectedModel.variations.forEach(v => {
        if (v.couleur) set.add(v.couleur);
      });
    }
    return Array.from(set);
  })();

  const handleAddBicolore = () => {
    if (bicolore1 && bicolore2 && bicolore1 !== bicolore2) {
      const combined = `${bicolore1} / ${bicolore2}`;
      handleCouleurChange(combined);
      setBicolore1('');
      setBicolore2('');
      setModeBicolore(false);
    }
  };
  
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
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={() => navigate('/commandes')}
            className="p-2 sm:p-3 text-gray-600 hover:bg-white/60 rounded-xl transition-all hover:scale-110 backdrop-blur-sm flex-shrink-0"
          >
            <ArrowLeft size={20} className="sm:hidden" strokeWidth={2.5} />
            <ArrowLeft size={24} className="hidden sm:block" strokeWidth={2.5} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
              Nouvelle Commande
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium mt-1 truncate">Créer une nouvelle commande client</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Informations Client */}
        <div className="stat-card animate-slide-up max-w-full overflow-hidden">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full flex-shrink-0"></div>
            <span className="truncate">Informations Client</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
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
        <div className="stat-card animate-slide-up max-w-full overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full flex-shrink-0"></div>
              <span className="truncate">Sélectionner un Modèle</span>
            </h2>
            {selectedModel && (
              <span className="badge badge-success flex items-center gap-2 text-xs sm:text-sm flex-shrink-0">
                <Check size={12} className="sm:hidden" />
                <Check size={14} className="hidden sm:block" />
                <span className="truncate max-w-[150px]">{selectedModel.nom}</span>
              </span>
            )}
          </div>

          {/* Barre de recherche */}
          <div className="mb-4 sm:mb-6">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 flex-shrink-0" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 sm:pl-12 text-sm sm:text-base"
                placeholder="Rechercher un modèle..."
              />
            </div>
          </div>

          {loadingStock ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-24 sm:h-32 rounded-2xl"></div>
              ))}
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 max-w-full overflow-hidden">
              <AlertCircle className="mx-auto text-amber-600 mb-3 sm:mb-4" size={36} />
              <p className="text-gray-700 font-semibold text-sm sm:text-base lg:text-lg px-4">
                {searchTerm ? 'Aucun modèle trouvé' : 'Aucun modèle en stock'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full">
              {models.map((model, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleModelSelect(model)}
                  className={`
                    group relative overflow-hidden p-3 sm:p-4 lg:p-5 rounded-2xl text-left transition-all duration-300 max-w-full
                    ${selectedModel?.nom === model.nom
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-xl shadow-blue-500/20 scale-105'
                      : 'bg-white/80 backdrop-blur-xl border border-gray-200/60 hover:shadow-xl hover:-translate-y-1'
                    }
                  `}
                >
                  {selectedModel?.nom === model.nom && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="text-white" size={14} strokeWidth={3} />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3 min-w-0">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 sm:p-2.5 rounded-xl shadow-lg flex-shrink-0">
                      <Package className="text-white" size={16} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1 truncate">
                        {model.nom}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Stock: <span className="text-emerald-600 font-bold">{model.quantiteTotal}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs min-w-0">
                    <span className="font-semibold text-gray-600 truncate">
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
          <div className="stat-card animate-scale-in max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
              <h2 className="text-xl lg:text-2xl font-black text-gray-900 flex items-center gap-3 min-w-0">
                <div className="w-1.5 h-8 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full flex-shrink-0 shadow-lg"></div>
                <span className="truncate bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Taille & Couleur
                </span>
              </h2>
              {formData.taille && formData.couleur && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl shadow-lg animate-scale-in">
                  <Check size={18} strokeWidth={3} />
                  <span className="font-bold">{formData.taille} • {formData.couleur}</span>
                </div>
              )}
            </div>

            {/* Sélection de la taille */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <span className="text-sm font-bold">📏</span>
                </div>
                <label className="text-sm font-bold text-gray-700">
                  Choisissez la taille
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                {taillesDisponibles.map((taille) => {
                  const variation = formData.couleur ? getVariationStock(taille, formData.couleur) : null;
                  const inStock = variation && variation.quantitePrincipale > 0;
                  
                  return (
                    <button
                      key={taille}
                      type="button"
                      onClick={() => handleTailleChange(taille)}
                      className={`
                        relative px-5 py-3 rounded-xl font-black text-base transition-all duration-300
                        ${formData.taille === taille
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/40 scale-110 -translate-y-1'
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-400 hover:shadow-lg hover:scale-105'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{taille}</span>
                        {inStock && formData.couleur && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            formData.taille === taille ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {variation.quantitePrincipale} dispo
                          </span>
                        )}
                      </div>
                      {formData.taille === taille && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <Check size={14} className="text-emerald-600" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sélection de la couleur */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                    <span className="text-sm font-bold">🎨</span>
                  </div>
                  <label className="text-sm font-bold text-gray-700">
                    Choisissez la couleur
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setModeBicolore(!modeBicolore)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    modeBicolore
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>🎨🎨</span>
                  <span>Bicolore</span>
                </button>
              </div>

              {/* Panneau bicolore */}
              {modeBicolore && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4 border-2 border-purple-200 animate-scale-in">
                  <p className="text-sm font-bold text-purple-800 mb-3">
                    Combiner 2 couleurs pour un modele bicolore :
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={bicolore1}
                      onChange={(e) => setBicolore1(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg font-semibold text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Couleur 1...</option>
                      {couleursDeBase.map(c => (
                        <option key={c} value={c} disabled={c === bicolore2}>{c}</option>
                      ))}
                    </select>
                    <span className="text-center font-black text-purple-600 text-lg">/</span>
                    <select
                      value={bicolore2}
                      onChange={(e) => setBicolore2(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg font-semibold text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Couleur 2...</option>
                      {couleursDeBase.map(c => (
                        <option key={c} value={c} disabled={c === bicolore1}>{c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddBicolore}
                      disabled={!bicolore1 || !bicolore2 || bicolore1 === bicolore2}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold text-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      Valider
                    </button>
                  </div>
                  {bicolore1 && bicolore2 && bicolore1 !== bicolore2 && (
                    <p className="text-sm text-purple-700 mt-2 font-semibold">
                      Sera enregistre comme : <span className="font-black">{bicolore1} / {bicolore2}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {couleursDisponibles.map((couleur) => {
                  const variation = formData.taille ? getVariationStock(formData.taille, couleur) : null;
                  const inStock = variation && variation.quantitePrincipale > 0;
                  const isBicolore = couleur.includes(' / ');
                  
                  const couleurMap = {
                    'Blanc': 'bg-white border-2 border-gray-300',
                    'Noir': 'bg-gray-900',
                    'Rouge': 'bg-red-500',
                    'Rouge Bordeaux': 'bg-red-900',
                    'Bleu': 'bg-blue-500',
                    'Bleu ciel': 'bg-sky-300',
                    'Bleu bic': 'bg-blue-600',
                    'Vert': 'bg-green-500',
                    'Vert Treillis': 'bg-green-700',
                    'Jaune': 'bg-yellow-400',
                    'Jaune Moutarde': 'bg-yellow-600',
                    'Rose': 'bg-pink-400',
                    'Saumon': 'bg-orange-300',
                    'Violet': 'bg-purple-500',
                    'Violet clair': 'bg-purple-300',
                    'Orange': 'bg-orange-500',
                    'Grise': 'bg-gray-400',
                    'Beige': 'bg-amber-200',
                    'Marron': 'bg-amber-800',
                    'Terracotta': 'bg-orange-700',
                    'Multicolore': 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500'
                  };

                  const renderColorSwatch = () => {
                    if (isBicolore) {
                      const [c1, c2] = couleur.split(' / ').map(c => c.trim());
                      return (
                        <div className="w-8 h-8 rounded-lg shadow-md flex-shrink-0 ring-2 ring-white overflow-hidden flex">
                          <div className={`w-1/2 h-full ${couleurMap[c1] || 'bg-gray-300'}`}></div>
                          <div className={`w-1/2 h-full ${couleurMap[c2] || 'bg-gray-300'}`}></div>
                        </div>
                      );
                    }
                    return (
                      <div className={`w-8 h-8 rounded-lg ${couleurMap[couleur] || 'bg-gray-300'} shadow-md flex-shrink-0 ring-2 ring-white`}></div>
                    );
                  };
                  
                  return (
                    <button
                      key={couleur}
                      type="button"
                      onClick={() => handleCouleurChange(couleur)}
                      className={`
                        relative p-3 rounded-xl transition-all duration-300 text-left
                        ${formData.couleur === couleur
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/40 scale-105 -translate-y-1'
                          : isBicolore
                            ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 hover:border-purple-500 hover:shadow-lg hover:scale-105'
                            : 'bg-white border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg hover:scale-105'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {renderColorSwatch()}
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${
                            formData.couleur === couleur ? 'text-white' : 'text-gray-800'
                          }`}>
                            {couleur}
                          </p>
                          {isBicolore && formData.couleur !== couleur && (
                            <p className="text-[10px] font-bold text-purple-600">2 tons</p>
                          )}
                          {inStock && formData.taille && (
                            <p className={`text-xs font-semibold ${
                              formData.couleur === couleur ? 'text-white/90' : 'text-emerald-600'
                            }`}>
                              {variation.quantitePrincipale} en stock
                            </p>
                          )}
                        </div>
                      </div>
                      {formData.couleur === couleur && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <Check size={16} className="text-emerald-600" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Information sur le stock */}
            {formData.taille && formData.couleur && (
              <div className="mt-4 sm:mt-6">
                {(() => {
                  const variation = getVariationStock(formData.taille, formData.couleur);
                  if (variation && variation.quantitePrincipale > 0) {
                    return (
                      <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 max-w-full overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                          <Check className="text-green-600 flex-shrink-0" size={18} />
                          <p className="text-green-800 font-bold text-xs sm:text-sm break-words">
                            ✅ En stock : {variation.quantitePrincipale} unité(s) disponible(s)
                          </p>
                        </div>
              </div>
                    );
                  } else {
                    return (
                      <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 max-w-full overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                          <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
                          <p className="text-amber-800 font-bold text-xs sm:text-sm break-words">
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
          <div className="stat-card animate-scale-in max-w-full overflow-hidden" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full flex-shrink-0"></div>
              <span className="truncate">Résumé & Prix</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-full">
              <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 max-w-full overflow-hidden">
                <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Modèle</p>
                <p className="text-sm sm:text-base lg:text-lg font-black text-gray-900 truncate">{selectedModel.nom}</p>
              </div>
              <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200/60 max-w-full overflow-hidden">
                <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Taille & Couleur</p>
                <p className="text-sm sm:text-base lg:text-lg font-black text-gray-900 truncate">{formData.taille} • {formData.couleur}</p>
              </div>
              <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/60 max-w-full overflow-hidden">
                <label htmlFor="prix" className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-2">
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
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-base sm:text-lg lg:text-xl font-black bg-white border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="10000"
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1"><span className="hidden sm:inline">FCFA</span><span className="sm:hidden">F</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Options & Notes */}
        {selectedModel && formData.taille && formData.couleur && (
          <div className="stat-card animate-scale-in max-w-full overflow-hidden" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-rose-600 to-pink-600 rounded-full flex-shrink-0"></div>
              <span className="truncate">Options & Notes</span>
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 max-w-full overflow-hidden">
                <input
                  type="checkbox"
                  id="urgence"
                  name="urgence"
                  checked={formData.urgence}
                  onChange={handleChange}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 border-orange-300 rounded focus:ring-orange-500 flex-shrink-0"
                />
                <label htmlFor="urgence" className="flex-1 cursor-pointer min-w-0">
                  <span className="font-bold text-sm sm:text-base text-gray-900">Commande Urgente</span>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 break-words">Le client a besoin de sa commande rapidement</p>
                </label>
              </div>

              <div className="max-w-full overflow-hidden">
                <label htmlFor="noteAppelant" className="label text-xs sm:text-sm">
                  Note de l'appelant
                </label>
                <textarea
                  id="noteAppelant"
                  name="noteAppelant"
                  value={formData.noteAppelant}
                  onChange={handleChange}
                  rows="4"
                  className="input focus-ring text-xs sm:text-sm"
                  placeholder="Instructions spéciales, modifications demandées, etc..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-4 sticky bottom-3 sm:bottom-6 bg-white/80 backdrop-blur-xl p-3 sm:p-6 rounded-2xl border border-white/40 shadow-xl max-w-full overflow-hidden">
          <button
            type="button"
            onClick={() => navigate('/commandes')}
            className="btn btn-secondary text-sm sm:text-base w-full sm:w-auto"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !selectedModel || !formData.taille || !formData.couleur || !formData.prix}
            className="btn btn-primary flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
          >
            <Save size={18} strokeWidth={2.5} className="flex-shrink-0" />
            <span className="truncate">{loading ? 'Création...' : 'Créer la commande'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default NouvelleCommande;
