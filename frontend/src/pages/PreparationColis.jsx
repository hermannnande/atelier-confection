import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, Eye, Scissors, Shirt, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const PreparationColis = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('');

  useEffect(() => {
    fetchCommandes();
    // Auto-refresh toutes les 15 secondes
    const interval = setInterval(fetchCommandes, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchCommandes = async () => {
    try {
      const response = await api.get('/commandes');
      // Filtre les commandes en cours de traitement à l'atelier
      const filtered = response.data.commandes.filter(c => 
        ['en_decoupe', 'en_couture', 'confectionnee'].includes(c.statut) || 
        (c.statut === 'en_stock')
      );
      setCommandes(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatutInfo = (statut) => {
    const infos = {
      en_decoupe: {
        label: 'En Découpe',
        icon: Scissors,
        color: 'bg-gradient-to-r from-amber-500 to-orange-600',
        textColor: 'text-amber-900',
        bgLight: 'bg-amber-50',
        borderColor: 'border-amber-200',
        progress: 33,
        emoji: '✂️'
      },
      en_couture: {
        label: 'En Couture',
        icon: Shirt,
        color: 'bg-gradient-to-r from-orange-500 to-red-600',
        textColor: 'text-orange-900',
        bgLight: 'bg-orange-50',
        borderColor: 'border-orange-200',
        progress: 66,
        emoji: '🧵'
      },
      confectionnee: {
        label: 'Confection Terminée',
        icon: CheckCircle,
        color: 'bg-gradient-to-r from-green-500 to-emerald-600',
        textColor: 'text-green-900',
        bgLight: 'bg-green-50',
        borderColor: 'border-green-200',
        progress: 100,
        emoji: '✅'
      },
      en_stock: {
        label: 'Confection Terminée',
        icon: CheckCircle,
        color: 'bg-gradient-to-r from-green-500 to-emerald-600',
        textColor: 'text-green-900',
        bgLight: 'bg-green-50',
        borderColor: 'border-green-200',
        progress: 100,
        emoji: '✅'
      }
    };
    return infos[statut] || infos.en_decoupe;
  };

  const filteredCommandes = filterStatut 
    ? (filterStatut === 'confectionnee' 
        ? commandes.filter(c => c.statut === 'confectionnee' || c.statut === 'en_stock')
        : commandes.filter(c => c.statut === filterStatut))
    : commandes;

  // Statistiques
  const stats = {
    total: commandes.length,
    enDecoupe: commandes.filter(c => c.statut === 'en_decoupe').length,
    enCouture: commandes.filter(c => c.statut === 'en_couture').length,
    terminees: commandes.filter(c => c.statut === 'confectionnee' || c.statut === 'en_stock').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200/30 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
              <Package className="text-white" size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Préparation Colis
              </h1>
              <p className="text-gray-600 font-medium">Suivi des commandes en cours de confection</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-500 uppercase">En Traitement</p>
          <p className="text-5xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {commandes.length}
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
          <p className="text-2xl font-black text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase">✂️ Découpe</p>
          <p className="text-2xl font-black text-amber-900">{stats.enDecoupe}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-orange-600 uppercase">🧵 Couture</p>
          <p className="text-2xl font-black text-orange-900">{stats.enCouture}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-600 uppercase">✅ Terminées</p>
          <p className="text-2xl font-black text-green-900">{stats.terminees}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilterStatut('')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === '' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => setFilterStatut('en_decoupe')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'en_decoupe' 
              ? 'bg-amber-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          ✂️ Découpe
        </button>
        <button
          onClick={() => setFilterStatut('en_couture')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'en_couture' 
              ? 'bg-orange-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          🧵 Couture
        </button>
        <button
          onClick={() => setFilterStatut('confectionnee')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'confectionnee' 
              ? 'bg-green-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          ✅ Terminées
        </button>
      </div>

      {/* Liste des commandes */}
      {filteredCommandes.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune commande en préparation
          </h3>
          <p className="text-gray-600">
            Les commandes en cours de confection apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCommandes.map((commande) => {
            const statutInfo = getStatutInfo(commande.statut);
            const StatutIcon = statutInfo.icon;
            
            return (
              <div 
                key={commande._id} 
                className="card bg-white hover:shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {commande.numeroCommande}
                  </h3>
                  {commande.urgence && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                      🔥 URGENT
                    </span>
                  )}
                </div>

                {/* Badge de statut */}
                <div className={`${statutInfo.color} text-white px-3 py-2 rounded-lg mb-3 flex items-center justify-between`}>
                  <div className="flex items-center space-x-2">
                    <StatutIcon size={18} />
                    <span className="font-bold text-sm">{statutInfo.label}</span>
                  </div>
                  <span className="text-sm font-bold">{statutInfo.progress}%</span>
                </div>

                {/* Client */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Client</p>
                  <p className="font-bold text-gray-900">
                    {typeof commande.client === 'object' ? commande.client.nom : commande.client}
                  </p>
                  <p className="text-sm text-gray-600">
                    {typeof commande.client === 'object' ? commande.client.ville : ''}
                  </p>
                </div>

                {/* Modèle */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Modèle</p>
                  <p className="font-bold text-gray-900">
                    {typeof commande.modele === 'object' ? commande.modele.nom : commande.modele}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="px-2 py-1 bg-white rounded text-xs font-semibold text-gray-700">
                      📏 {commande.taille}
                    </span>
                    <span className="px-2 py-1 bg-white rounded text-xs font-semibold text-gray-700">
                      🎨 {commande.couleur}
                    </span>
                  </div>
                </div>

                {/* Prix */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-3 mb-3 flex justify-between items-center">
                  <span className="text-white text-sm font-semibold">Prix Total</span>
                  <span className="text-white text-xl font-black">
                    {commande.prix?.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                {/* Équipe */}
                {(commande.styliste || commande.couturier) && (
                  <div className="bg-blue-50 rounded-lg p-2 mb-3">
                    <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Équipe</p>
                    <div className="text-xs text-gray-700">
                      {commande.couturier && (
                        <p>🧵 {commande.couturier.nom}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Note */}
                {commande.noteAppelant && (
                  <div className="bg-yellow-50 rounded-lg p-2 mb-3">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">📝 Instructions</p>
                    <p className="text-xs text-gray-700 line-clamp-2">{commande.noteAppelant}</p>
                  </div>
                )}

                {/* Bouton */}
                <Link
                  to={`/commandes/${commande._id}`}
                  className="btn btn-primary w-full flex items-center justify-center space-x-2 text-sm"
                >
                  <Eye size={16} />
                  <span>Voir les détails</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PreparationColis;

