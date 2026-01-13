import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';

const Performances = () => {
  const [appelants, setAppelants] = useState([]);
  const [couturiers, setCouturiers] = useState([]);
  const [stylistes, setStylistes] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const [activeTab, setActiveTab] = useState('appelants');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformances();
  }, []);

  const fetchPerformances = async () => {
    try {
      const [appelRes, coutRes, stylRes, livrRes] = await Promise.all([
        api.get('/performances/appelants'),
        api.get('/performances/couturiers'),
        api.get('/performances/stylistes'),
        api.get('/performances/livreurs')
      ]);

      setAppelants(appelRes.data.performances);
      setCouturiers(coutRes.data.performances);
      setStylistes(stylRes.data.performances);
      setLivreurs(livrRes.data.performances);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'appelants', name: 'Appelants', count: appelants.length },
    { id: 'stylistes', name: 'Stylistes', count: stylistes.length },
    { id: 'couturiers', name: 'Couturiers', count: couturiers.length },
    { id: 'livreurs', name: 'Livreurs', count: livreurs.length },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white max-w-full overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <BarChart3 size={28} className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 truncate">Tableau de Bord des Performances</h1>
            <p className="text-xs sm:text-sm lg:text-base text-purple-100 truncate">Suivez les performances de votre équipe</p>
          </div>
        </div>
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
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Performances des Appelants</h2>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 max-w-full">
            {appelants.map((perf, index) => (
              <div key={perf.appelant.id} className="card hover:shadow-md transition-shadow max-w-full overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    {index < 3 && (
                      <Award className={`flex-shrink-0 ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                        'text-orange-600'
                      }`} size={20} />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{perf.appelant.nom}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{perf.appelant.email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl sm:text-2xl font-bold text-primary-600">{perf.totalCommandes}</p>
                    <p className="text-xs sm:text-sm text-gray-600">commandes</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Validées</p>
                    <p className="font-medium text-green-600">{perf.commandesValidees}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Annulées</p>
                    <p className="font-medium text-red-600">{perf.commandesAnnulees}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">En attente</p>
                    <p className="font-medium text-yellow-600">{perf.commandesEnAttente}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Taux validation</p>
                    <p className="font-medium text-primary-600">{perf.tauxValidation}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">CA généré</p>
                    <p className="font-medium text-gray-900">
                      {perf.chiffreAffaires.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenu - Stylistes */}
      {activeTab === 'stylistes' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Performances des Stylistes</h2>
          <div className="grid grid-cols-1 gap-4">
            {stylistes.map((perf, index) => (
              <div key={perf.styliste.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {index < 3 && (
                      <Award className={`${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                        'text-orange-600'
                      }`} size={24} />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{perf.styliste.nom}</h3>
                      <p className="text-sm text-gray-600">{perf.styliste.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{perf.totalCommandesTraitees}</p>
                      <p className="text-sm text-gray-600">Découpées</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{perf.commandesEnCours}</p>
                      <p className="text-sm text-gray-600">En cours</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenu - Couturiers */}
      {activeTab === 'couturiers' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Performances des Couturiers</h2>
          <div className="grid grid-cols-1 gap-4">
            {couturiers.map((perf, index) => (
              <div key={perf.couturier.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {index < 3 && (
                      <Award className={`${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                        'text-orange-600'
                      }`} size={24} />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{perf.couturier.nom}</h3>
                      <p className="text-sm text-gray-600">{perf.couturier.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{perf.totalCommandesTraitees}</p>
                      <p className="text-sm text-gray-600">Terminées</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{perf.commandesEnCours}</p>
                      <p className="text-sm text-gray-600">En cours</p>
                    </div>
                    {perf.tempsMoyenConfection > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary-600">{perf.tempsMoyenConfection}</p>
                        <p className="text-sm text-gray-600">Jours/pièce</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenu - Livreurs */}
      {activeTab === 'livreurs' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Performances des Livreurs</h2>
          <div className="grid grid-cols-1 gap-4">
            {livreurs.map((perf, index) => (
              <div key={perf.livreur.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {index < 3 && (
                      <Award className={`${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                        'text-orange-600'
                      }`} size={24} />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{perf.livreur.nom}</h3>
                      <p className="text-sm text-gray-600">{perf.livreur.telephone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">{perf.totalLivraisons}</p>
                    <p className="text-sm text-gray-600">livraisons</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Réussies</p>
                    <p className="font-medium text-green-600">{perf.livraisonsReussies}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Refusées</p>
                    <p className="font-medium text-red-600">{perf.livraisonsRefusees}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">En cours</p>
                    <p className="font-medium text-yellow-600">{perf.livraisonsEnCours}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Taux réussite</p>
                    <p className="font-medium text-primary-600">{perf.tauxReussite}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">CA livré</p>
                    <p className="font-medium text-gray-900">
                      {perf.chiffreAffaires.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Performances;




