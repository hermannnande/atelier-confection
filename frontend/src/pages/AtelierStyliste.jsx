import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Scissors, CheckCircle, AlertCircle, Package, RefreshCw } from 'lucide-react';

const AtelierStyliste = () => {
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
      // Affiche uniquement les commandes envoyées par le gestionnaire (statut: en_decoupe)
      const filtered = response.data.commandes.filter(c => 
        c.statut === 'en_decoupe'
      );
      setCommandes(filtered);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnvoyerCouture = async (id) => {
    try {
      await api.post(`/commandes/${id}/couture`);
      toast.success('Envoyé en couture !');
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

  const commandesEnDecoupe = commandes.filter(c => c.statut === 'en_decoupe');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg">
            <Scissors className="text-white" size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Atelier - Styliste
            </h1>
            <p className="text-gray-600 font-medium">Découpe et préparation des modèles</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <button
            onClick={fetchCommandes}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
          >
            <RefreshCw size={16} />
            <span className="text-sm font-semibold">Actualiser</span>
          </button>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-500 uppercase">En cours</p>
            <p className="text-4xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              {commandesEnDecoupe.length}
            </p>
          </div>
        </div>
      </div>

      {/* Commandes en cours de découpe */}
      {commandesEnDecoupe.length === 0 ? (
        <div className="card text-center py-16 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CheckCircle className="mx-auto text-emerald-500 mb-4" size={64} />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">✅ Aucune commande en attente de découpe</h3>
          <p className="text-gray-600">Toutes les commandes sont traitées</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {commandesEnDecoupe.map((commande) => (
            <div 
              key={commande._id} 
              className={`relative overflow-hidden rounded-xl p-3 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                commande.urgence 
                  ? 'bg-gradient-to-br from-red-500 to-pink-600 ring-2 ring-red-300 animate-pulse' 
                  : 'bg-gradient-to-br from-amber-400 to-orange-500'
              }`}
            >
              {/* Badge URGENT en haut */}
              {commande.urgence && (
                <div className="absolute top-0 right-0 bg-red-600 text-white px-2 py-0.5 rounded-bl-lg font-black text-[10px] flex items-center space-x-0.5">
                  <AlertCircle size={10} />
                  <span>URGENT</span>
                </div>
              )}

              {/* Numéro de commande */}
              <div className="mb-2">
                <h3 className="text-lg font-black text-white">
                  {commande.numeroCommande}
                </h3>
              </div>

              {/* Détails du modèle */}
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white/80 mb-1">MODÈLE</p>
                    <p className="text-sm font-black text-white line-clamp-1">
                      {commande.modele.nom}
                    </p>
                  </div>
                  {/* Image du produit - Petite à droite */}
                  {(typeof commande.modele === 'object' && commande.modele?.image) ? (
                    <img 
                      src={commande.modele.image} 
                      alt={commande.modele.nom}
                      className="w-12 h-12 object-cover rounded-lg shadow-md ml-2"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white/30 rounded-lg shadow-md flex items-center justify-center ml-2">
                      <Package className="text-white" size={20} />
                    </div>
                  )}
                </div>
                
                {/* Taille & Couleur */}
                <div className="grid grid-cols-2 gap-1">
                  <div className="bg-white/30 rounded-md p-1 text-center">
                    <p className="text-[10px] text-white/80 font-bold">TAILLE</p>
                    <p className="text-lg font-black text-white">{commande.taille}</p>
                  </div>
                  <div className="bg-white/30 rounded-md p-1 text-center">
                    <p className="text-[10px] text-white/80 font-bold">COULEUR</p>
                    <p className="text-xs font-black text-white truncate">{commande.couleur}</p>
                  </div>
                </div>
              </div>

              {/* Note */}
              {commande.noteAppelant && (
                <div className="bg-white/90 rounded-lg p-2 mb-2 overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-700 mb-0.5">📝</p>
                  <p className="text-[11px] text-gray-800 line-clamp-2 break-all">{commande.noteAppelant}</p>
                </div>
              )}

              {/* Bouton d'action */}
              <button
                onClick={() => handleEnvoyerCouture(commande._id)}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 font-black py-2 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center space-x-1 text-xs"
              >
                <CheckCircle size={14} strokeWidth={3} />
                <span>TERMINER</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AtelierStyliste;




