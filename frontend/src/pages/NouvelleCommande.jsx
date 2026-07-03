import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Save,
  ArrowLeft,
  ArrowRight,
  Package,
  AlertCircle,
  Check,
  Search,
  X,
  User,
  Phone,
  MapPin,
  Palette,
  Ruler,
  FileText,
  Sparkles,
  Zap,
  ShoppingBag,
  Tag,
  Loader2,
} from 'lucide-react';

/* ---------- Constantes ---------- */

const TAILLES_DISPONIBLES = ['Standard', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const COULEURS_DE_BASE = [
  'Blanc', 'Noir', 'Rouge', 'Rouge Bordeaux', 'Bleu', 'Bleu ciel', 'Bleu bic',
  'Vert', 'Vert Treillis', 'Jaune', 'Jaune Moutarde', 'Rose', 'Saumon',
  'Violet', 'Violet clair', 'Orange', 'Grise', 'Beige', 'Marron',
  'Terracotta', 'Kaki', 'Multicolore',
];

const COULEUR_CLASS = {
  Blanc: 'bg-white border-2 border-gray-300',
  Noir: 'bg-gray-900',
  Rouge: 'bg-red-500',
  'Rouge Bordeaux': 'bg-red-900',
  Bleu: 'bg-blue-500',
  'Bleu ciel': 'bg-sky-300',
  'Bleu bic': 'bg-blue-600',
  Vert: 'bg-green-500',
  'Vert Treillis': 'bg-green-700',
  Jaune: 'bg-yellow-400',
  'Jaune Moutarde': 'bg-yellow-600',
  Rose: 'bg-pink-400',
  Saumon: 'bg-orange-300',
  Violet: 'bg-purple-500',
  'Violet clair': 'bg-purple-300',
  Orange: 'bg-orange-500',
  Grise: 'bg-gray-400',
  Beige: 'bg-amber-200',
  Marron: 'bg-amber-800',
  Terracotta: 'bg-orange-700',
  Kaki: 'bg-yellow-800',
  Multicolore: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500',
};

const VILLES_SUGGESTIONS = [
  'Abidjan', 'Yamoussoukro', 'Bouaké', 'Daloa', 'Korhogo', 'San Pedro',
  'Gagnoa', 'Man', 'Divo', 'Anyama', 'Abengourou',
  'Yopougon', 'Cocody', 'Plateau', 'Treichville', 'Marcory', 'Adjamé',
  'Abobo', 'Koumassi', 'Port-Bouët', 'Bingerville',
];

const STEPS = [
  { id: 1, label: 'Client', icon: User, color: 'from-blue-500 to-cyan-500' },
  { id: 2, label: 'Modèle', icon: Package, color: 'from-purple-500 to-pink-500' },
  { id: 3, label: 'Taille & Couleur', icon: Palette, color: 'from-emerald-500 to-teal-500' },
];

/* ---------- Sous-composants ---------- */

function ColorSwatch({ couleur, size = 'md' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const isBicolore = typeof couleur === 'string' && couleur.includes(' / ');
  if (isBicolore) {
    const [c1, c2] = couleur.split(' / ').map((c) => c.trim());
    return (
      <div className={`${sizes[size]} rounded-lg shadow-md flex-shrink-0 ring-2 ring-white overflow-hidden flex`}>
        <div className={`w-1/2 h-full ${COULEUR_CLASS[c1] || 'bg-gray-300'}`}></div>
        <div className={`w-1/2 h-full ${COULEUR_CLASS[c2] || 'bg-gray-300'}`}></div>
      </div>
    );
  }
  return (
    <div className={`${sizes[size]} rounded-lg ${COULEUR_CLASS[couleur] || 'bg-gray-300'} shadow-md flex-shrink-0 ring-2 ring-white`}></div>
  );
}

function Stepper({ currentStep, onJump, canJump }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-3 sm:p-4 border border-white/40">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const clickable = canJump(step.id);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => clickable && onJump(step.id)}
              disabled={!clickable}
              className={`flex-1 flex flex-col items-center gap-1.5 group ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            >
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div className={`h-1 flex-1 rounded-full ${currentStep >= step.id ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-200'}`}></div>
                )}
                <div
                  className={`
                    w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0
                    ${isCurrent ? `bg-gradient-to-br ${step.color} text-white shadow-lg scale-110 ring-4 ring-blue-100` : ''}
                    ${isDone ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md' : ''}
                    ${!isCurrent && !isDone ? 'bg-white border-2 border-gray-200 text-gray-400' : ''}
                  `}
                >
                  {isDone ? <Check size={20} strokeWidth={3} /> : <Icon size={18} strokeWidth={2.5} />}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-1 flex-1 rounded-full ${currentStep > step.id ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-200'}`}></div>
                )}
              </div>
              <span className={`text-[10px] sm:text-xs font-bold text-center leading-tight ${isCurrent || isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecapCard({ formData, selectedModel }) {
  const { client, modele, taille, couleur, prix, urgence } = formData;
  const hasClient = client.nom || client.contact || client.ville;
  const hasModel = !!selectedModel;
  const hasVariation = !!(taille && couleur);

  return (
    <div className="sticky top-4 space-y-3">
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl p-4 sm:p-5 shadow-2xl text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
              <ShoppingBag size={16} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-base sm:text-lg">Récapitulatif</h3>
          </div>

          {/* Client */}
          <div className="mb-3 pb-3 border-b border-white/20">
            <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Client</p>
            {hasClient ? (
              <>
                <p className="font-bold text-sm truncate">{client.nom || <span className="opacity-50">—</span>}</p>
                <p className="text-xs opacity-90 truncate">{client.contact || <span className="opacity-50">—</span>}</p>
                <p className="text-xs opacity-80 truncate">{client.ville || <span className="opacity-50">—</span>}</p>
              </>
            ) : (
              <p className="text-xs opacity-60 italic">Pas encore renseigné</p>
            )}
          </div>

          {/* Modèle */}
          <div className="mb-3 pb-3 border-b border-white/20">
            <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Modèle</p>
            {hasModel ? (
              <p className="font-bold text-sm truncate">{modele.nom}</p>
            ) : (
              <p className="text-xs opacity-60 italic">Pas encore choisi</p>
            )}
          </div>

          {/* Variation */}
          <div className="mb-3 pb-3 border-b border-white/20">
            <p className="text-[10px] uppercase font-bold opacity-70 mb-2">Taille & Couleur</p>
            {hasVariation ? (
              <div className="flex items-center gap-2">
                <ColorSwatch couleur={couleur} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{taille}</p>
                  <p className="text-xs opacity-90 truncate">{couleur}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs opacity-60 italic">Pas encore choisi</p>
            )}
          </div>

          {/* Prix */}
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase font-bold opacity-70">Total</p>
              {prix ? (
                <p className="font-black text-2xl sm:text-3xl">
                  {Number(prix).toLocaleString('fr-FR')} <span className="text-sm font-bold opacity-80">F</span>
                </p>
              ) : (
                <p className="text-xs opacity-60 italic">—</p>
              )}
            </div>
            {urgence && (
              <span className="bg-amber-400 text-amber-900 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">
                <Zap size={12} strokeWidth={3} />
                URGENT
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page principale ---------- */

const NouvelleCommande = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [libraryModels, setLibraryModels] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [villeFocused, setVilleFocused] = useState(false);

  const [modeBicolore, setModeBicolore] = useState(false);
  const [bicolore1, setBicolore1] = useState('');
  const [bicolore2, setBicolore2] = useState('');

  // Modal de finalisation (apparait apres l'etape 3)
  const [showFinaliser, setShowFinaliser] = useState(false);

  const [formData, setFormData] = useState({
    client: { nom: '', contact: '', ville: '' },
    modele: { nom: '', image: '', description: '' },
    taille: '',
    couleur: '',
    prix: '',
    urgence: false,
    noteAppelant: '',
  });

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const [stockRes, modelesRes] = await Promise.all([
        api.get('/stock'),
        api.get('/modeles', { params: { actif: 'true' } }).catch(() => ({ data: { modeles: [] } })),
      ]);
      setStockItems(stockRes.data.stock || []);
      setLibraryModels(modelesRes.data.modeles || []);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des modèles');
    } finally {
      setLoadingStock(false);
    }
  };

  const groupedStock = useMemo(() => {
    return stockItems.reduce((acc, item) => {
      const m = item.modele;
      if (!acc[m]) {
        acc[m] = {
          nom: m,
          image: item.image,
          variations: [],
          tailles: new Set(),
          couleurs: new Set(),
          quantiteTotal: 0,
          prixMin: item.prix,
          prixMax: item.prix,
        };
      }
      acc[m].variations.push(item);
      acc[m].tailles.add(item.taille);
      acc[m].couleurs.add(item.couleur);
      acc[m].quantiteTotal += item.quantitePrincipale || 0;
      acc[m].prixMin = Math.min(acc[m].prixMin, item.prix);
      acc[m].prixMax = Math.max(acc[m].prixMax, item.prix);
      return acc;
    }, {});
  }, [stockItems]);

  const models = useMemo(() => {
    // On part du stock groupé, puis on ajoute les modèles de la bibliothèque
    // qui n'ont aucune ligne de stock (commande sur mesure possible).
    const merged = { ...groupedStock };
    libraryModels.forEach((lm) => {
      const nom = lm.nom;
      if (!nom) return;
      if (!merged[nom]) {
        const prixBase = Number(lm.prix_base ?? lm.prixBase ?? 0) || 0;
        merged[nom] = {
          nom,
          image: lm.image || '',
          variations: [],
          tailles: new Set(),
          couleurs: new Set(),
          quantiteTotal: 0,
          prixMin: prixBase,
          prixMax: prixBase,
        };
      }
    });
    return Object.values(merged)
      .filter((m) => searchTerm === '' || m.nom.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.quantiteTotal - a.quantiteTotal);
  }, [groupedStock, libraryModels, searchTerm]);

  const couleursDispo = useMemo(() => {
    const set = new Set(COULEURS_DE_BASE);
    if (selectedModel) {
      selectedModel.variations.forEach((v) => v.couleur && set.add(v.couleur));
    }
    return Array.from(set);
  }, [selectedModel]);

  const villesFiltrees = useMemo(() => {
    const q = formData.client.ville.trim().toLowerCase();
    if (!q) return VILLES_SUGGESTIONS.slice(0, 8);
    return VILLES_SUGGESTIONS.filter((v) => v.toLowerCase().includes(q)).slice(0, 8);
  }, [formData.client.ville]);

  const getVariationStock = (taille, couleur) => {
    if (!selectedModel) return null;
    return selectedModel.variations.find((v) => v.taille === taille && v.couleur === couleur);
  };

  const variationActuelle = useMemo(() => {
    return formData.taille && formData.couleur ? getVariationStock(formData.taille, formData.couleur) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.taille, formData.couleur, selectedModel]);

  /* ---------- Handlers ---------- */

  const handleClientChange = (field, value) => {
    setFormData((prev) => ({ ...prev, client: { ...prev.client, [field]: value } }));
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setFormData((prev) => ({
      ...prev,
      modele: { nom: model.nom, image: model.image || '', description: '' },
      taille: '',
      couleur: '',
      prix: Math.round((model.prixMin + model.prixMax) / 2) || 0,
    }));
  };

  const handleTailleChange = (taille) => {
    setFormData((prev) => {
      const next = { ...prev, taille };
      if (next.couleur) {
        const v = getVariationStock(taille, next.couleur);
        if (v) next.prix = v.prix;
      }
      return next;
    });
  };

  const handleCouleurChange = (couleur) => {
    setFormData((prev) => {
      const next = { ...prev, couleur };
      if (next.taille) {
        const v = getVariationStock(next.taille, couleur);
        if (v) next.prix = v.prix;
      }
      return next;
    });
  };

  const handleAddBicolore = () => {
    if (bicolore1 && bicolore2 && bicolore1 !== bicolore2) {
      handleCouleurChange(`${bicolore1} / ${bicolore2}`);
      setBicolore1('');
      setBicolore2('');
      setModeBicolore(false);
    }
  };

  /* ---------- Validation ---------- */

  const isStep1Valid = formData.client.nom.trim() && formData.client.contact.trim() && formData.client.ville.trim();
  const isStep2Valid = !!selectedModel;
  const isStep3Valid = !!(formData.taille && formData.couleur);
  const isPriceValid = formData.prix && Number(formData.prix) > 0;
  const canGoNext =
    (currentStep === 1 && isStep1Valid) ||
    (currentStep === 2 && isStep2Valid) ||
    (currentStep === 3 && isStep3Valid);

  const canJumpToStep = (target) => {
    if (target <= currentStep) return true;
    if (target === 2) return isStep1Valid;
    if (target === 3) return isStep1Valid && isStep2Valid;
    return false;
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (currentStep < 3) {
      setCurrentStep((s) => s + 1);
    } else {
      // Etape 3 OK : on ouvre le modal de finalisation (note, urgence, prix)
      setShowFinaliser(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!isPriceValid) {
      toast.error('Vérifie le prix avant de créer la commande');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...formData, statut: 'validee' };
      const response = await api.post('/commandes', payload);
      toast.success('Commande créée et validée !', { icon: '✅' });
      navigate(`/commandes/${response.data.commande._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Rendu des étapes ---------- */

  const renderStep1 = () => (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 flex items-center gap-2">
          <User size={22} className="text-blue-600" />
          Qui est le client ?
        </h2>
        <p className="text-sm text-gray-500">Renseigne les coordonnées du client</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <User size={14} />
            Nom complet *
          </label>
          <input
            type="text"
            value={formData.client.nom}
            onChange={(e) => handleClientChange('nom', e.target.value)}
            autoFocus
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Ex : Aminata Diaby"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Phone size={14} />
            Téléphone *
          </label>
          <input
            type="tel"
            value={formData.client.contact}
            onChange={(e) => handleClientChange('contact', e.target.value)}
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="0707000000"
          />
        </div>

        <div className="relative">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MapPin size={14} />
            Ville / Quartier *
          </label>
          <input
            type="text"
            value={formData.client.ville}
            onChange={(e) => handleClientChange('ville', e.target.value)}
            onFocus={() => setVilleFocused(true)}
            onBlur={() => setTimeout(() => setVilleFocused(false), 150)}
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Ex : Cocody Riviera"
          />
          {villeFocused && villesFiltrees.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
              {villesFiltrees.map((v) => (
                <button
                  key={v}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleClientChange('ville', v);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <MapPin size={14} className="text-blue-500" />
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 flex items-center gap-2">
            <Package size={22} className="text-purple-600" />
            Quel modèle ?
          </h2>
          <p className="text-sm text-gray-500">Sélectionne un modèle dans le catalogue</p>
        </div>
        {selectedModel && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm font-bold shadow-md">
            <Check size={14} strokeWidth={3} />
            {selectedModel.nom}
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-base font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          placeholder="Rechercher un modèle..."
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={16} className="text-gray-500" />
          </button>
        )}
      </div>

      {loadingStock ? (
        <div className="space-y-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-3 sm:space-y-0">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 sm:h-28 rounded-2xl bg-gray-100 animate-pulse"></div>
          ))}
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
          <AlertCircle className="mx-auto text-amber-600 mb-3" size={40} />
          <p className="text-gray-700 font-bold">
            {searchTerm ? 'Aucun modèle ne correspond' : 'Aucun modèle en stock'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-3 sm:space-y-0 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
          {models.map((model) => {
            const isSelected = selectedModel?.nom === model.nom;
            const enStock = model.quantiteTotal > 0;
            return (
              <button
                key={model.nom}
                type="button"
                onClick={() => handleModelSelect(model)}
                className={`
                  relative w-full text-left p-3 sm:p-4 rounded-2xl transition-all duration-200
                  ${isSelected
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl shadow-purple-500/40 ring-4 ring-purple-200 sm:scale-[1.02]'
                    : 'bg-white border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg sm:hover:-translate-y-0.5'}
                `}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
                    <Check size={16} className="text-purple-600" strokeWidth={3} />
                  </div>
                )}

                {/* Mobile : layout horizontal compact */}
                <div className="flex sm:hidden items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20 backdrop-blur' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                    <Package className="text-white" size={22} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-black text-base leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`} style={{ wordBreak: 'break-word' }}>
                      {model.nom}
                    </h3>
                    <div className={`flex items-center gap-2 text-[11px] font-bold mt-1 ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                      <span className={`px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : enStock ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        Stock : {model.quantiteTotal}
                      </span>
                      <span className={`${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                        {model.tailles.size}T · {model.couleurs.size}C
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={18} className={`flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-300'}`} strokeWidth={2.5} />
                </div>

                {/* Desktop / tablette : layout vertical */}
                <div className="hidden sm:block">
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20 backdrop-blur' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                      <Package className="text-white" size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-black text-sm leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`} style={{ wordBreak: 'break-word' }}>
                        {model.nom}
                      </h3>
                      <p className={`text-[11px] font-bold mt-0.5 ${isSelected ? 'text-white/90' : enStock ? 'text-emerald-600' : 'text-amber-600'}`}>
                        Stock : {model.quantiteTotal}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center justify-between text-[11px] font-semibold ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                    <span>{model.tailles.size} tailles</span>
                    <span>•</span>
                    <span>{model.couleurs.size} couleurs</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 flex items-center gap-2">
          <Palette size={22} className="text-emerald-600" />
          Taille & Couleur
        </h2>
        <p className="text-sm text-gray-500">Choisis la taille puis la couleur</p>
      </div>

      {/* Tailles */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Ruler size={16} className="text-blue-600" />
          <span className="text-sm font-bold text-gray-700">Taille</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {TAILLES_DISPONIBLES.map((taille) => {
            const variation = formData.couleur ? getVariationStock(taille, formData.couleur) : null;
            const inStock = variation && variation.quantitePrincipale > 0;
            const isSelected = formData.taille === taille;
            return (
              <button
                key={taille}
                type="button"
                onClick={() => handleTailleChange(taille)}
                className={`
                  relative py-3 rounded-xl font-black text-base transition-all duration-200
                  ${isSelected
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 scale-105 ring-4 ring-emerald-200'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-400 hover:shadow-md'}
                `}
              >
                <div className="text-sm sm:text-base">{taille}</div>
                {inStock && formData.couleur && (
                  <div className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-white/90' : 'text-emerald-600'}`}>
                    {variation.quantitePrincipale} dispo
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Couleur */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-purple-600" />
            <span className="text-sm font-bold text-gray-700">Couleur</span>
          </div>
          <button
            type="button"
            onClick={() => setModeBicolore(!modeBicolore)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
              modeBicolore
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sparkles size={12} />
            Bicolore
          </button>
        </div>

        {modeBicolore && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-3 border-2 border-purple-200 animate-fade-in">
            <p className="text-xs font-bold text-purple-800 mb-2">Combine 2 couleurs :</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
              <select
                value={bicolore1}
                onChange={(e) => setBicolore1(e.target.value)}
                className="px-3 py-2 border-2 border-purple-200 rounded-lg font-semibold text-sm bg-white"
              >
                <option value="">Couleur 1...</option>
                {COULEURS_DE_BASE.map((c) => (
                  <option key={c} value={c} disabled={c === bicolore2}>{c}</option>
                ))}
              </select>
              <span className="text-center font-black text-purple-600">/</span>
              <select
                value={bicolore2}
                onChange={(e) => setBicolore2(e.target.value)}
                className="px-3 py-2 border-2 border-purple-200 rounded-lg font-semibold text-sm bg-white"
              >
                <option value="">Couleur 2...</option>
                {COULEURS_DE_BASE.map((c) => (
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
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
          {couleursDispo.map((couleur) => {
            const variation = formData.taille ? getVariationStock(formData.taille, couleur) : null;
            const inStock = variation && variation.quantitePrincipale > 0;
            const isBicolore = couleur.includes(' / ');
            const isSelected = formData.couleur === couleur;
            return (
              <button
                key={couleur}
                type="button"
                onClick={() => handleCouleurChange(couleur)}
                className={`
                  relative p-2.5 rounded-xl transition-all duration-200 text-left
                  ${isSelected
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 scale-[1.03] ring-4 ring-emerald-200'
                    : isBicolore
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-400 hover:shadow-md'
                      : 'bg-white border-2 border-gray-200 hover:border-emerald-400 hover:shadow-md'}
                `}
              >
                <div className="flex items-center gap-2">
                  <ColorSwatch couleur={couleur} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                      {couleur}
                    </p>
                    {inStock && formData.taille && (
                      <p className={`text-[10px] font-semibold ${isSelected ? 'text-white/90' : 'text-emerald-600'}`}>
                        {variation.quantitePrincipale} en stock
                      </p>
                    )}
                    {!inStock && formData.taille && isSelected && (
                      <p className="text-[10px] font-semibold text-white/90">Sur mesure</p>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                    <Check size={12} className="text-emerald-600" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Statut combinaison */}
      {formData.taille && formData.couleur && (
        <div
          className={`p-3 rounded-xl border-2 flex items-center gap-2 ${
            variationActuelle && variationActuelle.quantitePrincipale > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {variationActuelle && variationActuelle.quantitePrincipale > 0 ? (
            <>
              <Check size={18} strokeWidth={3} />
              <span className="font-bold text-sm">
                En stock — {variationActuelle.quantitePrincipale} unité(s) disponible(s)
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={18} />
              <span className="font-bold text-sm">
                Pas en stock — commande sur mesure
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderFinaliserModal = () => {
    if (!showFinaliser) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
              <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-gray-900">Dernière touche</h3>
              <p className="text-xs text-gray-500">Note optionnelle, puis on valide !</p>
            </div>
            <button
              type="button"
              onClick={() => setShowFinaliser(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Prix */}
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Tag size={14} />
                Prix de vente (FCFA) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.prix}
                  onChange={(e) => setFormData((p) => ({ ...p, prix: e.target.value }))}
                  min="0"
                  className="w-full px-4 py-3 pr-20 bg-white border-2 border-emerald-300 rounded-xl text-xl font-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="13000"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">FCFA</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {[10000, 13000, 15000, 18000, 20000, 25000].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, prix: p }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      Number(formData.prix) === p
                        ? 'bg-emerald-500 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-emerald-100'
                    }`}
                  >
                    {p.toLocaleString('fr-FR')} F
                  </button>
                ))}
              </div>
            </div>

            {/* Urgence */}
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, urgence: !p.urgence }))}
              className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 text-left ${
                formData.urgence
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-transparent text-white shadow-lg'
                  : 'bg-white border-gray-200 hover:border-amber-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${formData.urgence ? 'bg-white/20 backdrop-blur' : 'bg-amber-100'}`}>
                <Zap size={18} className={formData.urgence ? 'text-white' : 'text-amber-600'} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-sm ${formData.urgence ? 'text-white' : 'text-gray-900'}`}>
                  Commande urgente
                </p>
                <p className={`text-xs ${formData.urgence ? 'text-white/90' : 'text-gray-500'}`}>
                  {formData.urgence ? 'Sera priorisée' : 'Activer si urgent'}
                </p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-all relative ${formData.urgence ? 'bg-white/30' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${formData.urgence ? 'left-5' : 'left-0.5'}`}></div>
              </div>
            </button>

            {/* Note */}
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText size={14} />
                Note pour la confection (optionnel)
              </label>
              <textarea
                value={formData.noteAppelant}
                onChange={(e) => setFormData((p) => ({ ...p, noteAppelant: e.target.value }))}
                rows="3"
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"
                placeholder="Instructions, modifications particulières... (peut être laissé vide)"
              />
              <p className="text-[11px] text-gray-400 mt-1">Vous pouvez laisser vide et valider directement.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowFinaliser(false)}
              disabled={loading}
              className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50 sm:flex-shrink-0"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !isPriceValid}
              className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} strokeWidth={2.5} />}
              <span>{loading ? 'Création...' : 'Créer la commande'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/commandes')}
          className="p-2.5 bg-white/80 backdrop-blur rounded-xl border border-white/40 shadow-sm hover:shadow-md hover:scale-105 transition-all"
        >
          <ArrowLeft size={20} strokeWidth={2.5} className="text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
            Nouvelle Commande
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Étape {currentStep} sur 3</p>
        </div>
      </div>

      {/* Stepper */}
      <Stepper currentStep={currentStep} onJump={setCurrentStep} canJump={canJumpToStep} />

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form (2/3) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-5 sm:p-6 border border-white/40 min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          {/* Navigation */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-3 sm:p-4 border border-white/40 flex items-center gap-2 sticky bottom-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            <div className="flex-1 text-center">
              <span className="text-xs font-bold text-gray-500">
                {currentStep} / 3
              </span>
            </div>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                <span>Suivant</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext || loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                <Check size={16} strokeWidth={3} />
                <span>Valider la commande</span>
              </button>
            )}
          </div>
        </form>

        {/* Récap (1/3) */}
        <div className="lg:col-span-1">
          <RecapCard formData={formData} selectedModel={selectedModel} />
        </div>
      </div>

      {/* Modal de finalisation */}
      {renderFinaliserModal()}
    </div>
  );
};

export default NouvelleCommande;
