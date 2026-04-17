import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, AlertCircle, Package, Scissors, RefreshCw } from 'lucide-react';

const ModelesEnAttente = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCommandes();
    const interval = setInterval(fetchCommandes, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchCommandes = async () => {
    try {
      const response = await api.get('/commandes');
      const enAttente = response.data.commandes
        .filter(cmd => cmd.statut === 'validee')
        .sort((a, b) => {
          if (a.urgence && !b.urgence) return -1;
          if (!a.urgence && b.urgence) return 1;
          const dateA = new Date(a.updated_at || a.created_at);
          const dateB = new Date(b.updated_at || b.created_at);
          return dateA - dateB;
        });
      setCommandes(enAttente);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCommandes = commandes.filter((commande) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nom = typeof commande.modele === 'object' ? commande.modele?.nom : commande.modele;
    return (
      nom?.toLowerCase().includes(term) ||
      commande.taille?.toLowerCase().includes(term) ||
      commande.couleur?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200/30 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 sm:p-3 lg:p-4 rounded-2xl shadow-lg flex-shrink-0">
            <Scissors className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
              Modèles en attente
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium truncate">
              Commandes validées pas encore envoyées en atelier
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={fetchCommandes}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-xs sm:text-sm"
          >
            <RefreshCw size={14} />
            <span className="font-semibold">Actualiser</span>
          </button>
          <div className="text-right">
            <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase">En attente</p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {filteredCommandes.length}
            </p>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="card max-w-full overflow-hidden">
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 flex-shrink-0" size={18} />
          <input
            type="text"
            placeholder="Rechercher par modèle, taille ou couleur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 sm:pl-12 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Grille de cartes */}
      {filteredCommandes.length === 0 ? (
        <div className="card text-center py-8 sm:py-12 lg:py-16 bg-gradient-to-br from-emerald-50 to-teal-50 max-w-full overflow-hidden">
          <Package className="mx-auto text-emerald-500 mb-3 sm:mb-4" size={48} />
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 px-4">
            Aucun modèle en attente
          </h3>
          <p className="text-sm sm:text-base text-gray-600 px-4">
            Toutes les commandes ont été envoyées en atelier ou en préparation
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 max-w-full">
          {filteredCommandes.map((commande) => {
            const modeleNom = typeof commande.modele === 'object' ? commande.modele?.nom : commande.modele;
            const modeleImage = typeof commande.modele === 'object' ? commande.modele?.image : null;

            return (
              <div
                key={commande._id || commande.id}
                className={`relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 max-w-full ${
                  commande.urgence ? 'ring-2 ring-red-400 ring-offset-1' : ''
                }`}
              >
                {/* Badge URGENT */}
                {commande.urgence && (
                  <div className="absolute top-0 right-0 bg-red-600 text-white px-1.5 sm:px-2 py-0.5 rounded-bl-lg font-black text-[9px] sm:text-[10px] flex items-center gap-0.5 z-10">
                    <AlertCircle size={9} />
                    <span>URGENT</span>
                  </div>
                )}

                {/* Image du modèle */}
                {modeleImage ? (
                  <div className="relative w-full aspect-square bg-gray-100">
                    <img
                      src={modeleImage}
                      alt={modeleNom}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 items-center justify-center hidden absolute inset-0">
                      <Package className="text-purple-400" size={40} />
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <Package className="text-purple-400" size={40} />
                  </div>
                )}

                {/* Infos du modèle */}
                <div className="p-1.5 sm:p-3 bg-white">
                  <p className="text-[10px] sm:text-sm font-black text-gray-900 truncate mb-1">
                    {modeleNom || 'N/A'}
                  </p>

                  <div className="grid grid-cols-2 gap-0.5 sm:gap-1">
                    <div className="bg-purple-50 rounded p-0.5 sm:p-1.5 text-center">
                      <p className="text-[8px] sm:text-[10px] text-purple-500 font-bold uppercase">Taille</p>
                      <p className="text-[11px] sm:text-base font-black text-purple-700">{commande.taille}</p>
                    </div>
                    <div className="bg-pink-50 rounded p-0.5 sm:p-1.5 text-center min-w-0">
                      <p className="text-[8px] sm:text-[10px] text-pink-500 font-bold uppercase">Couleur</p>
                      <p className="text-[10px] sm:text-xs font-black text-pink-700 truncate">{commande.couleur}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelesEnAttente;
