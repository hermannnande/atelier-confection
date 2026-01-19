import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { BarChart3, Calendar, Filter, TrendingUp, Award, Download, ChevronDown } from 'lucide-react';

const Performances = () => {
  const { user } = useAuthStore();
  const [appelants, setAppelants] = useState([]);
  const [couturiers, setCouturiers] = useState([]);
  const [stylistes, setStylistes] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  
  // État pour les filtres
  const [periode, setPeriode] = useState('mois'); // jour, semaine, mois, annee, personnalise
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Définir l'onglet actif par défaut selon le rôle
  const getDefaultTab = () => {
    if (user?.role === 'administrateur' || user?.role === 'gestionnaire') return 'appelants';
    if (user?.role === 'appelant') return 'appelants';
    if (user?.role === 'styliste') return 'stylistes';
    if (user?.role === 'couturier') return 'couturiers';
    if (user?.role === 'livreur') return 'livreurs';
    return 'appelants';
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [loading, setLoading] = useState(true);

  // Calculer les dates selon la période sélectionnée
  const getDateRange = () => {
    const now = new Date();
    let debut, fin;

    switch (periode) {
      case 'jour':
        debut = new Date(now.setHours(0, 0, 0, 0));
        fin = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'semaine':
        const premierJour = now.getDate() - now.getDay();
        debut = new Date(now.setDate(premierJour));
        debut.setHours(0, 0, 0, 0);
        fin = new Date();
        fin.setHours(23, 59, 59, 999);
        break;
      case 'mois':
        debut = new Date(now.getFullYear(), now.getMonth(), 1);
        fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'annee':
        debut = new Date(now.getFullYear(), 0, 1);
        fin = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'personnalise':
        if (dateDebut && dateFin) {
          debut = new Date(dateDebut);
          fin = new Date(dateFin);
          fin.setHours(23, 59, 59, 999);
        } else {
          return null;
        }
        break;
      default:
        return null;
    }

    return {
      dateDebut: debut.toISOString(),
      dateFin: fin.toISOString()
    };
  };

  useEffect(() => {
    fetchPerformances();
  }, [periode, dateDebut, dateFin]);

  const fetchPerformances = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange();
      const params = dateRange ? `?dateDebut=${dateRange.dateDebut}&dateFin=${dateRange.dateFin}` : '';

      const [appelRes, coutRes, stylRes, livrRes] = await Promise.all([
        api.get(`/performances/appelants${params}`),
        api.get(`/performances/couturiers${params}`),
        api.get(`/performances/stylistes${params}`),
        api.get(`/performances/livreurs${params}`)
      ]);

      // Filtrer les performances selon le rôle de l'utilisateur
      const isAdmin = user?.role === 'administrateur' || user?.role === 'gestionnaire';
      const userId = user?._id || user?.id;

      setAppelants(isAdmin ? appelRes.data.performances : 
        appelRes.data.performances.filter(p => (p.appelant._id || p.appelant.id) === userId));
      
      setCouturiers(isAdmin ? coutRes.data.performances : 
        coutRes.data.performances.filter(p => (p.couturier._id || p.couturier.id) === userId));
      
      setStylistes(isAdmin ? stylRes.data.performances : 
        stylRes.data.performances.filter(p => (p.styliste._id || p.styliste.id) === userId));
      
      setLivreurs(isAdmin ? livrRes.data.performances : 
        livrRes.data.performances.filter(p => (p.livreur._id || p.livreur.id) === userId));
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques globales pour la période
  const getGlobalStats = () => {
    let totalCommandes = 0;
    let totalCA = 0;
    let totalValidees = 0;

    if (activeTab === 'appelants') {
      appelants.forEach(p => {
        totalCommandes += p.totalCommandes;
        totalCA += p.chiffreAffaires;
        totalValidees += p.commandesValidees;
      });
    } else if (activeTab === 'couturiers') {
      couturiers.forEach(p => {
        totalCommandes += p.totalCommandesTraitees + p.commandesEnCours;
      });
    } else if (activeTab === 'stylistes') {
      stylistes.forEach(p => {
        totalCommandes += p.totalCommandesTraitees + p.commandesEnCours;
      });
    } else if (activeTab === 'livreurs') {
      livreurs.forEach(p => {
        totalCommandes += p.totalLivraisons;
        totalCA += p.chiffreAffaires;
        totalValidees += p.livraisonsReussies;
      });
    }

    return { totalCommandes, totalCA, totalValidees };
  };

  const stats = getGlobalStats();

  // Obtenir le label de la période
  const getPeriodeLabel = () => {
    switch (periode) {
      case 'jour': return "Aujourd'hui";
      case 'semaine': return 'Cette semaine';
      case 'mois': return 'Ce mois';
      case 'annee': return 'Cette année';
      case 'personnalise': 
        if (dateDebut && dateFin) {
          return `Du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}`;
        }
        return 'Période personnalisée';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Filtrer les onglets selon le rôle de l'utilisateur
  const getAllTabs = () => {
    const allTabs = [
      { id: 'appelants', name: 'Appelants', count: appelants.length, roles: ['administrateur', 'gestionnaire', 'appelant'] },
      { id: 'stylistes', name: 'Stylistes', count: stylistes.length, roles: ['administrateur', 'gestionnaire', 'styliste'] },
      { id: 'couturiers', name: 'Couturiers', count: couturiers.length, roles: ['administrateur', 'gestionnaire', 'couturier'] },
      { id: 'livreurs', name: 'Livreurs', count: livreurs.length, roles: ['administrateur', 'gestionnaire', 'livreur'] },
    ];
    
    // Si admin ou gestionnaire, afficher tous les onglets
    if (user?.role === 'administrateur' || user?.role === 'gestionnaire') {
      return allTabs;
    }
    
    // Sinon, afficher uniquement l'onglet correspondant au rôle
    return allTabs.filter(tab => tab.roles.includes(user?.role));
  };
  
  const tabs = getAllTabs();

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white max-w-full overflow-hidden shadow-xl">
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <BarChart3 size={32} className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 truncate">
                {user?.role === 'administrateur' || user?.role === 'gestionnaire' 
                  ? 'Tableau de Bord des Performances' 
                  : 'Mes Performances'}
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-purple-100 truncate">
                {getPeriodeLabel()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex-shrink-0"
          >
            <Filter size={20} />
            <span className="hidden sm:inline">Filtres</span>
            <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="card max-w-full">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Période d'analyse</h2>
          </div>
          
          <div className="space-y-4">
            {/* Sélecteur de période prédéfinie */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { value: 'jour', label: "Aujourd'hui" },
                { value: 'semaine', label: 'Cette semaine' },
                { value: 'mois', label: 'Ce mois' },
                { value: 'annee', label: 'Cette année' },
                { value: 'personnalise', label: 'Personnalisé' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriode(opt.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    periode === opt.value
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sélecteur de dates personnalisées */}
            {periode === 'personnalise' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistiques globales de la période */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.totalCommandes}</p>
              <p className="text-xs text-blue-600 mt-1">
                {activeTab === 'livreurs' ? 'Livraisons' : 'Commandes'}
              </p>
            </div>
            <div className="p-3 bg-blue-600 rounded-full">
              <BarChart3 size={24} className="text-white" />
            </div>
          </div>
        </div>

        {(activeTab === 'appelants' || activeTab === 'livreurs') && (
          <div className="card bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Réussies</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900">{stats.totalValidees}</p>
                <p className="text-xs text-green-600 mt-1">
                  {activeTab === 'livreurs' ? 'Livraisons validées' : 'Commandes validées'}
                </p>
              </div>
              <div className="p-3 bg-green-600 rounded-full">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'appelants' || activeTab === 'livreurs') && (
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Chiffre d'affaires</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900">
                  {stats.totalCA.toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-purple-600 mt-1">FCFA</p>
              </div>
              <div className="p-3 bg-purple-600 rounded-full">
                <Award size={24} className="text-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card max-w-full overflow-hidden">
        <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 sm:py-3 font-medium transition-colors relative text-xs sm:text-sm lg:text-base whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.name}
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded-full bg-gray-100">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu - Appelants */}
      {activeTab === 'appelants' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {user?.role === 'administrateur' || user?.role === 'gestionnaire' 
                ? 'Performances des Appelants' 
                : 'Mes Performances'}
            </h2>
            <button
              onClick={() => toast.success('Export en cours...')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>

          {appelants.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-gray-400 mb-3">
                <BarChart3 size={48} className="mx-auto" />
              </div>
              <p className="text-gray-600 font-medium">
                {user?.role === 'administrateur' || user?.role === 'gestionnaire'
                  ? 'Aucune performance disponible pour cette période'
                  : 'Vous n\'avez pas encore de statistiques pour cette période'}
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 max-w-full">
            {appelants.map((perf, index) => (
              <div key={perf.appelant.id} className="card hover:shadow-lg transition-all max-w-full overflow-hidden border-l-4 border-l-primary-600">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    {(user?.role === 'administrateur' || user?.role === 'gestionnaire') && index < 3 && (
                      <div className={`flex-shrink-0 p-2 rounded-full ${
                        index === 0 ? 'bg-yellow-100' :
                        index === 1 ? 'bg-gray-100' :
                        'bg-orange-100'
                      }`}>
                        <Award className={`${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-orange-600'
                        }`} size={20} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{perf.appelant.nom}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{perf.appelant.email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 bg-primary-50 px-4 py-2 rounded-lg">
                    <p className="text-2xl sm:text-3xl font-bold text-primary-600">{perf.totalCommandes}</p>
                    <p className="text-xs sm:text-sm text-primary-700 font-medium">commandes</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 font-medium mb-1">Validées</p>
                    <p className="text-xl font-bold text-green-700">{perf.commandesValidees}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-xs text-red-600 font-medium mb-1">Annulées</p>
                    <p className="text-xl font-bold text-red-700">{perf.commandesAnnulees}</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-xs text-yellow-600 font-medium mb-1">En attente</p>
                    <p className="text-xl font-bold text-yellow-700">{perf.commandesEnAttente}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">Taux validation</p>
                    <p className="text-xl font-bold text-blue-700">{perf.tauxValidation}%</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium mb-1">CA généré</p>
                    <p className="text-base sm:text-lg font-bold text-purple-700">
                      {perf.chiffreAffaires.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-purple-600">FCFA</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Contenu - Stylistes */}
      {activeTab === 'stylistes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {user?.role === 'administrateur' || user?.role === 'gestionnaire' 
                ? 'Performances des Stylistes' 
                : 'Mes Performances'}
            </h2>
            <button
              onClick={() => toast.success('Export en cours...')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>

          {stylistes.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-gray-400 mb-3">
                <BarChart3 size={48} className="mx-auto" />
              </div>
              <p className="text-gray-600 font-medium">Aucune performance disponible pour cette période</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4">
            {stylistes.map((perf, index) => (
              <div key={perf.styliste.id} className="card hover:shadow-lg transition-all border-l-4 border-l-yellow-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {(user?.role === 'administrateur' || user?.role === 'gestionnaire') && index < 3 && (
                      <div className={`p-2 rounded-full ${
                        index === 0 ? 'bg-yellow-100' :
                        index === 1 ? 'bg-gray-100' :
                        'bg-orange-100'
                      }`}>
                        <Award className={`${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-orange-600'
                        }`} size={24} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{perf.styliste.nom}</h3>
                      <p className="text-sm text-gray-600">{perf.styliste.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center bg-yellow-50 px-6 py-3 rounded-lg">
                      <p className="text-3xl font-bold text-yellow-600">{perf.totalCommandesTraitees}</p>
                      <p className="text-sm text-yellow-700 font-medium">Découpées</p>
                    </div>
                    <div className="text-center bg-orange-50 px-6 py-3 rounded-lg">
                      <p className="text-3xl font-bold text-orange-600">{perf.commandesEnCours}</p>
                      <p className="text-sm text-orange-700 font-medium">En cours</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Contenu - Couturiers */}
      {activeTab === 'couturiers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {user?.role === 'administrateur' || user?.role === 'gestionnaire' 
                ? 'Performances des Couturiers' 
                : 'Mes Performances'}
            </h2>
            <button
              onClick={() => toast.success('Export en cours...')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>

          {couturiers.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-gray-400 mb-3">
                <BarChart3 size={48} className="mx-auto" />
              </div>
              <p className="text-gray-600 font-medium">Aucune performance disponible pour cette période</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4">
            {couturiers.map((perf, index) => (
              <div key={perf.couturier.id} className="card hover:shadow-lg transition-all border-l-4 border-l-green-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {(user?.role === 'administrateur' || user?.role === 'gestionnaire') && index < 3 && (
                      <div className={`p-2 rounded-full ${
                        index === 0 ? 'bg-yellow-100' :
                        index === 1 ? 'bg-gray-100' :
                        'bg-orange-100'
                      }`}>
                        <Award className={`${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-orange-600'
                        }`} size={24} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{perf.couturier.nom}</h3>
                      <p className="text-sm text-gray-600">{perf.couturier.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center bg-green-50 px-6 py-3 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{perf.totalCommandesTraitees}</p>
                      <p className="text-sm text-green-700 font-medium">Terminées</p>
                    </div>
                    <div className="text-center bg-orange-50 px-6 py-3 rounded-lg">
                      <p className="text-3xl font-bold text-orange-600">{perf.commandesEnCours}</p>
                      <p className="text-sm text-orange-700 font-medium">En cours</p>
                    </div>
                    {perf.tempsMoyenConfection > 0 && (
                      <div className="text-center bg-primary-50 px-6 py-3 rounded-lg">
                        <p className="text-3xl font-bold text-primary-600">{perf.tempsMoyenConfection}</p>
                        <p className="text-sm text-primary-700 font-medium">Jours/pièce</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Contenu - Livreurs */}
      {activeTab === 'livreurs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {user?.role === 'administrateur' || user?.role === 'gestionnaire' 
                ? 'Performances des Livreurs' 
                : 'Mes Performances'}
            </h2>
            <button
              onClick={() => toast.success('Export en cours...')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>

          {livreurs.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-gray-400 mb-3">
                <BarChart3 size={48} className="mx-auto" />
              </div>
              <p className="text-gray-600 font-medium">Aucune performance disponible pour cette période</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4">
            {livreurs.map((perf, index) => (
              <div key={perf.livreur.id} className="card hover:shadow-lg transition-all max-w-full overflow-hidden border-l-4 border-l-blue-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {(user?.role === 'administrateur' || user?.role === 'gestionnaire') && index < 3 && (
                      <div className={`p-2 rounded-full ${
                        index === 0 ? 'bg-yellow-100' :
                        index === 1 ? 'bg-gray-100' :
                        'bg-orange-100'
                      }`}>
                        <Award className={`${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-orange-600'
                        }`} size={24} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{perf.livreur.nom}</h3>
                      <p className="text-sm text-gray-600">{perf.livreur.telephone}</p>
                    </div>
                  </div>
                  <div className="text-right bg-blue-50 px-4 py-2 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{perf.totalLivraisons}</p>
                    <p className="text-sm text-blue-700 font-medium">livraisons</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 font-medium mb-1">Réussies</p>
                    <p className="text-xl font-bold text-green-700">{perf.livraisonsReussies}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-xs text-red-600 font-medium mb-1">Refusées</p>
                    <p className="text-xl font-bold text-red-700">{perf.livraisonsRefusees}</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-xs text-yellow-600 font-medium mb-1">En cours</p>
                    <p className="text-xl font-bold text-yellow-700">{perf.livraisonsEnCours}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">Taux réussite</p>
                    <p className="text-xl font-bold text-blue-700">{perf.tauxReussite}%</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium mb-1">CA livré</p>
                    <p className="text-base sm:text-lg font-bold text-purple-700">
                      {perf.chiffreAffaires.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-purple-600">FCFA</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Performances;
