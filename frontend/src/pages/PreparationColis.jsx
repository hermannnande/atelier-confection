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
    ? commandes.filter(c => c.statut === filterStatut)
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card bg-gradient-to-br from-purple-50 to-indigo-50">
          <p className="text-sm font-semibold text-purple-600 uppercase">Total</p>
          <p className="text-3xl font-black text-purple-900">{stats.total}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-amber-50 to-orange-50">
          <p className="text-sm font-semibold text-amber-600 uppercase flex items-center">
            <Scissors size={16} className="mr-1" /> En Découpe
          </p>
          <p className="text-3xl font-black text-amber-900">{stats.enDecoupe}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-orange-50 to-red-50">
          <p className="text-sm font-semibold text-orange-600 uppercase flex items-center">
            <Shirt size={16} className="mr-1" /> En Couture
          </p>
          <p className="text-3xl font-black text-orange-900">{stats.enCouture}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-green-50 to-emerald-50">
          <p className="text-sm font-semibold text-green-600 uppercase flex items-center">
            <CheckCircle size={16} className="mr-1" /> Terminées
          </p>
          <p className="text-3xl font-black text-green-900">{stats.terminees}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-semibold text-gray-700">Filtrer par statut :</label>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="input"
          >
            <option value="">Tous les statuts</option>
            <option value="en_decoupe">✂️ En Découpe</option>
            <option value="en_couture">🧵 En Couture</option>
            <option value="confectionnee">✅ Confection Terminée</option>
            <option value="en_stock">✅ Confection Terminée</option>
          </select>
        </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCommandes.map((commande) => {
            const statutInfo = getStatutInfo(commande.statut);
            const StatutIcon = statutInfo.icon;
            
            return (
              <div 
                key={commande._id} 
                className={`card ${statutInfo.bgLight} ${statutInfo.borderColor} border-2 hover:shadow-xl transition-all`}
              >
                {/* Header avec badge de statut */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">
                      {commande.numeroCommande}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  
                  {/* Badge de statut avec animation */}
                  <div className={`${statutInfo.color} text-white px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2`}>
                    <StatutIcon size={20} strokeWidth={2.5} />
                    <span className="font-bold text-sm">{statutInfo.label}</span>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                    <span>Progression</span>
                    <span>{statutInfo.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full ${statutInfo.color} transition-all duration-500`}
                      style={{ width: `${statutInfo.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Urgence */}
                {commande.urgence && (
                  <div className="mb-4 p-2 bg-red-100 border border-red-300 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="text-red-600" size={20} />
                    <span className="text-sm font-bold text-red-900">🔥 COMMANDE URGENTE</span>
                  </div>
                )}

                {/* Détails de la commande */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Client</p>
                    <p className="font-bold text-gray-900">
                      {typeof commande.client === 'object' ? commande.client.nom : commande.client}
                    </p>
                    <p className="text-sm text-gray-600">
                      {typeof commande.client === 'object' ? commande.client.contact : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Ville</p>
                    <p className="font-bold text-gray-900">
                      {typeof commande.client === 'object' ? commande.client.ville : ''}
                    </p>
                  </div>
                </div>

                {/* Modèle avec image */}
                <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
                  <div className="flex items-center space-x-4">
                    {commande.modele?.image && (
                      <img
                        src={commande.modele.image}
                        alt={commande.modele.nom}
                        className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Modèle</p>
                      <p className="font-bold text-gray-900 text-lg">
                        {typeof commande.modele === 'object' ? commande.modele.nom : commande.modele}
                      </p>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">
                          📏 {commande.taille}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">
                          🎨 {commande.couleur}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prix */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 mb-4 flex justify-between items-center">
                  <span className="text-white font-semibold">Prix Total</span>
                  <span className="text-white text-2xl font-black">
                    {commande.prix?.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                {/* Équipe */}
                {(commande.styliste || commande.couturier) && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-600 uppercase font-semibold mb-2">Équipe assignée</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {commande.styliste && (
                        <div>
                          <span className="text-gray-500">✂️ Styliste:</span>
                          <p className="font-semibold text-gray-900">{commande.styliste.nom}</p>
                        </div>
                      )}
                      {commande.couturier && (
                        <div>
                          <span className="text-gray-500">🧵 Couturier:</span>
                          <p className="font-semibold text-gray-900">{commande.couturier.nom}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Note */}
                {commande.noteAppelant && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">📝 Instructions</p>
                    <p className="text-sm text-gray-700">{commande.noteAppelant}</p>
                  </div>
                )}

                {/* Bouton voir détails */}
                <Link
                  to={`/commandes/${commande._id}`}
                  className="btn btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <Eye size={20} />
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

