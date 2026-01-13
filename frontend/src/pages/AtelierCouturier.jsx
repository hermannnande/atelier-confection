import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Shirt, CheckCircle, AlertCircle, Package, RefreshCw } from 'lucide-react';

const AtelierCouturier = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommandes();
    // Auto-refresh toutes les 5 secondes pour réception immédiate
    const interval = setInterval(fetchCommandes, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCommandes = async () => {
    try {
      const response = await api.get('/commandes');
      const filtered = response.data.commandes.filter(c => 
        c.statut === 'en_couture'
      );
      
      // Trier: urgentes en haut, puis les plus anciennes en haut (récentes en bas)
      const sorted = filtered.sort((a, b) => {
        // 1. Les urgentes avant les normales
        if (a.urgence && !b.urgence) return -1;
        if (!a.urgence && b.urgence) return 1;
        
        // 2. À urgence égale, trier par date (anciennes en haut, récentes en bas)
        const dateA = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at);
        const dateB = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at);
        return dateA - dateB; // Plus ancien en haut, plus récent en bas
      });
      
      setCommandes(sorted);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminerCouture = async (id, commande) => {
    if (!window.confirm(`Confirmer la fin de couture de cette commande ?\n\nCette action ajoutera automatiquement :\n• Modèle : ${commande.modele.nom}\n• Taille : ${commande.taille}\n• Couleur : ${commande.couleur}\n\nAu stock principal (+1 unité)`)) {
      return;
    }

    try {
      await api.post(`/commandes/${id}/terminer-couture`);
      toast.success(
        `✅ Couture terminée !\n📦 ${commande.modele.nom} (${commande.taille} - ${commande.couleur}) ajouté au stock.`,
        { duration: 5000 }
      );
      fetchCommandes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 sm:p-3 lg:p-4 rounded-2xl shadow-lg flex-shrink-0">
            <Shirt className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent truncate">
              Atelier - Couturier
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium truncate">Couture et finition des modèles</p>
          </div>
        </div>
        
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={fetchCommandes}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-xs sm:text-sm flex-shrink-0"
          >
            <RefreshCw size={14} />
            <span className="font-semibold hidden sm:inline">Actualiser</span>
            <span className="font-semibold sm:hidden">↻</span>
          </button>
          <div className="text-right flex-shrink-0">
            <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase">En cours</p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {commandes.length}
            </p>
          </div>
        </div>
      </div>

      {/* Commandes en couture */}
      {commandes.length === 0 ? (
        <div className="card text-center py-8 sm:py-12 lg:py-16 bg-gradient-to-br from-emerald-50 to-teal-50 max-w-full overflow-hidden">
          <CheckCircle className="mx-auto text-emerald-500 mb-3 sm:mb-4" size={48} />
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 px-4">✅ Aucune commande à coudre</h3>
          <p className="text-sm sm:text-base text-gray-600 px-4">Toutes les commandes sont traitées</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 max-w-full">
          {commandes.map((commande) => (
            <div 
              key={commande._id} 
              className={`relative overflow-hidden rounded-xl p-2 sm:p-3 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 max-w-full ${
                commande.urgence 
                  ? 'bg-gradient-to-br from-red-500 to-pink-600 ring-2 ring-red-300 animate-pulse' 
                  : 'bg-gradient-to-br from-orange-400 to-red-500'
              }`}
            >
              {/* Badge URGENT en haut */}
              {commande.urgence && (
                <div className="absolute top-0 right-0 bg-red-600 text-white px-1.5 sm:px-2 py-0.5 rounded-bl-lg font-black text-[9px] sm:text-[10px] flex items-center gap-0.5">
                  <AlertCircle size={9} />
                  <span>URGENT</span>
                </div>
              )}

              {/* Numéro de commande */}
              <div className="mb-1.5 sm:mb-2 min-w-0">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {commande.numeroCommande}
                </h3>
              </div>

              {/* Détails du modèle */}
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 mb-1.5 sm:mb-2 max-w-full overflow-hidden">
                <div className="flex items-center justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white/80 mb-0.5 sm:mb-1">MODÈLE</p>
                    <p className="text-xs sm:text-sm font-black text-white truncate">
                      {commande.modele.nom}
                    </p>
                  </div>
                  {/* Image du produit - Petite à droite */}
                  {(typeof commande.modele === 'object' && commande.modele?.image) ? (
                    <img 
                      src={commande.modele.image} 
                      alt={commande.modele.nom}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg shadow-md flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/30 rounded-lg shadow-md flex items-center justify-center flex-shrink-0">
                      <Package className="text-white" size={18} />
                    </div>
                  )}
                </div>
                
                {/* Taille & Couleur */}
                <div className="grid grid-cols-2 gap-1">
                  <div className="bg-white/30 rounded-md p-1 text-center">
                    <p className="text-[9px] sm:text-[10px] text-white/80 font-bold">TAILLE</p>
                    <p className="text-base sm:text-lg font-black text-white">{commande.taille}</p>
                  </div>
                  <div className="bg-white/30 rounded-md p-1 text-center min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-white/80 font-bold">COULEUR</p>
                    <p className="text-[11px] sm:text-xs font-black text-white truncate">{commande.couleur}</p>
                  </div>
                </div>
              </div>

              {/* Note */}
              {commande.noteAppelant && (
                <div className="bg-white/90 rounded-lg p-1.5 sm:p-2 mb-1.5 sm:mb-2 overflow-hidden max-w-full">
                  <p className="text-[9px] sm:text-[10px] font-bold text-gray-700 mb-0.5">📝</p>
                  <p className="text-[10px] sm:text-[11px] text-gray-800 line-clamp-2 break-words">{commande.noteAppelant}</p>
                </div>
              )}

              {/* Bouton d'action */}
              <button
                onClick={() => handleTerminerCouture(commande._id, commande)}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 font-black py-1.5 sm:py-2 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-1 text-[11px] sm:text-xs"
              >
                <CheckCircle size={12} strokeWidth={3} className="flex-shrink-0" />
                <span>TERMINER</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AtelierCouturier;




