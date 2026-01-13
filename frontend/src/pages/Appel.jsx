import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Phone, CheckCircle, XCircle, Clock, AlertTriangle, User, MapPin, Package, DollarSign, X, RefreshCw, Plus } from 'lucide-react';

const Appel = () => {
  const [commandesAppel, setCommandesAppel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [noteAppelant, setNoteAppelant] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchCommandesAppel();
  }, []);

  // Charger la note existante quand la modal s'ouvre
  useEffect(() => {
    if (selectedCommande) {
      // Si la commande a une note existante, la charger
      // Sinon, laisser le champ vide
      setNoteAppelant(selectedCommande.noteAppelant || '');
    }
  }, [selectedCommande]);

  // Auto-refresh toutes les 10 secondes
  useEffect(() => {
    if (isAutoRefreshing) {
      intervalRef.current = setInterval(() => {
        fetchCommandesAppel(true); // true = silent refresh
      }, 10000); // 10 secondes

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isAutoRefreshing]);

  const fetchCommandesAppel = async (silent = false) => {
    try {
      const response = await api.get('/commandes?statut=en_attente_validation,en_attente_paiement');
      const newCommandes = response.data.commandes || [];
      
      // Vérifier s'il y a de nouvelles commandes
      if (silent && newCommandes.length > commandesAppel.length) {
        const diff = newCommandes.length - commandesAppel.length;
        toast.success(`🔔 ${diff} nouvelle${diff > 1 ? 's' : ''} commande${diff > 1 ? 's' : ''} !`, {
          icon: '📞',
          duration: 4000,
        });
      }
      
      setCommandesAppel(newCommandes);
      setLastRefresh(new Date());
    } catch (error) {
      if (!silent) {
      toast.error('Erreur lors du chargement des appels');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (commandeId, action) => {
    setProcessing(true);
    
    try {
      let newStatut = '';
      let message = '';
      
      switch (action) {
        case 'confirmer':
          newStatut = 'validee';
          message = 'Commande confirmée et envoyée aux commandes !';
          break;
        case 'urgent':
          newStatut = 'validee';
          message = 'Commande marquée URGENTE et envoyée aux commandes !';
          break;
        case 'attente':
          newStatut = 'en_attente_paiement';
          message = 'Commande mise en attente';
          break;
        case 'annuler':
          newStatut = 'annulee';
          message = 'Commande annulée';
          break;
      }

      const payload = { statut: newStatut };
      if (action === 'urgent') {
        payload.urgence = true;
      }
      
      // Toujours envoyer la note de l'appelant (même si vide)
      // Si vide, cela efface la note automatique générée par le système
      payload.noteAppelant = noteAppelant.trim();

      await api.put(`/commandes/${commandeId}`, payload);
      
      toast.success(message);
      
      // Fermer la modal et réinitialiser la note
      setSelectedCommande(null);
      setNoteAppelant('');
      
      // Retirer de la liste si confirmé, urgent ou annulé
      if (['confirmer', 'urgent', 'annuler'].includes(action)) {
        setCommandesAppel(prev => prev.filter(c => (c._id || c.id) !== commandeId));
      } else {
        fetchCommandesAppel();
      }
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  // Fonction utilitaire pour afficher les données (string ou objet)
  const getModeleNom = (modele) => {
    if (!modele) return 'N/A';
    return typeof modele === 'string' ? modele : (modele.nom || modele.sku || 'N/A');
  };

  const getClientNom = (commande) => {
    if (commande.nomClient) return commande.nomClient;
    if (commande.client) {
      return typeof commande.client === 'string' ? commande.client : (commande.client.nom || 'N/A');
    }
    return 'N/A';
  };

  const getClientContact = (commande) => {
    if (commande.contactClient) return commande.contactClient;
    if (commande.client) {
      return typeof commande.client === 'object' ? (commande.client.contact || 'N/A') : 'N/A';
    }
    return 'N/A';
  };

  const getVille = (commande) => {
    if (commande.ville) return commande.ville;
    if (commande.client && typeof commande.client === 'object') {
      return commande.client.ville || 'Non spécifié';
    }
    return 'Non spécifié';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200/30 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
      </div>
    );
  }

  // Calcul de la pagination
  const totalPages = Math.ceil(commandesAppel.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const commandesAffichees = commandesAppel.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
              <Phone className="text-white" size={24} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Appels à Traiter
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium truncate">Nouvelles commandes en attente</p>
              
              {/* Indicateur de rafraîchissement auto */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
                  className={`flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${
                    isAutoRefreshing 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <RefreshCw 
                    size={12} 
                    className={isAutoRefreshing ? 'animate-spin' : ''} 
                  />
                  <span className="hidden sm:inline">{isAutoRefreshing ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
                  <span className="sm:hidden">{isAutoRefreshing ? 'ON' : 'OFF'}</span>
                </button>
                
                <span className="text-[10px] sm:text-xs text-gray-500 truncate">
                  {lastRefresh.toLocaleTimeString('fr-FR')}
                </span>
                
                <button
                  onClick={() => fetchCommandesAppel()}
                  className="flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                >
                  <RefreshCw size={12} />
                  <span className="hidden sm:inline">Actualiser</span>
                  <span className="sm:hidden">↻</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:items-end space-y-3 sm:space-y-4 w-full sm:w-auto">
          <Link
            to="/commandes/nouvelle"
            className="btn bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Nouvelle Commande</span>
          </Link>
          
        <div className="text-center sm:text-right">
          <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase">En attente</p>
          <p className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            {commandesAppel.length}
          </p>
          </div>
        </div>
      </div>

      {/* Info pagination */}
      {commandesAppel.length > 0 && (
        <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
          <p className="text-xs sm:text-sm font-semibold text-gray-700">
            {startIndex + 1}-{Math.min(endIndex, commandesAppel.length)} / {commandesAppel.length}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500">
            Page {currentPage} / {totalPages}
          </p>
        </div>
      )}

      {/* Grille des commandes */}
      {commandesAppel.length === 0 ? (
        <div className="stat-card text-center py-12 sm:py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Aucun appel</h3>
          <p className="text-sm sm:text-base text-gray-600">Toutes les commandes traitées ! 🎉</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {commandesAffichees.map((commande, index) => (
            <div
              key={commande._id || commande.id}
              className="stat-card hover:scale-105 transition-transform cursor-pointer group max-w-full"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => setSelectedCommande(commande)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-lg font-black text-gray-900 truncate">
                    #{commande.numeroCommande || (commande._id || commande.id).slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {new Date(commande.dateCommande || commande.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className="badge badge-warning text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 flex-shrink-0">
                  📞 Appel
                </span>
              </div>

              {/* Client avec image */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3 flex items-start space-x-2 sm:space-x-3 max-w-full">
                {/* Infos Client */}
                <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1 sm:space-x-2 mb-1.5 sm:mb-2">
                  <User className="text-blue-600 flex-shrink-0" size={14} />
                  <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">{getClientNom(commande)}</p>
                </div>
                <a 
                  href={`tel:${getClientContact(commande)}`}
                  className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center space-x-1 truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone size={11} className="flex-shrink-0" />
                  <span className="truncate">{getClientContact(commande)}</span>
                </a>
                <div className="flex items-center space-x-1 mt-1">
                  <MapPin className="text-emerald-600 flex-shrink-0" size={12} />
                  <p className="text-[10px] sm:text-xs text-gray-700 font-medium truncate">{getVille(commande)}</p>
                </div>
                </div>
                
                {/* Image du produit - Petite à droite */}
                {(typeof commande.modele === 'object' && commande.modele?.image) ? (
                  <div className="flex-shrink-0">
                    <img 
                      src={commande.modele.image} 
                      alt={getModeleNom(commande.modele)}
                      className="w-16 h-16 object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-md flex items-center justify-center">
                    <Package className="text-white" size={24} />
                  </div>
                )}
              </div>

              {/* Détails */}
              <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 max-w-full">
                <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                  <span className="text-gray-500 flex items-center space-x-1 flex-shrink-0">
                    <Package size={12} className="sm:w-3.5 sm:h-3.5" />
                    <span>Modèle</span>
                  </span>
                  <span className="font-bold text-gray-900 truncate">{getModeleNom(commande.modele)}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                  <span className="text-gray-500 flex-shrink-0">Taille</span>
                  <span className="font-bold text-gray-900">{commande.taille}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                  <span className="text-gray-500 flex-shrink-0">Couleur</span>
                  <span className="font-bold text-gray-900 truncate">{commande.couleur}</span>
                </div>
              </div>

              {/* Prix */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3 max-w-full">
                <div className="flex items-center justify-between">
                  <span className="text-white text-[10px] sm:text-xs font-semibold">Prix Total</span>
                  <span className="text-white text-lg sm:text-xl font-black">
                    {commande.prix?.toLocaleString('fr-FR')} F
                  </span>
                </div>
              </div>

              {/* Bouton Traiter */}
              <button
                className="w-full btn btn-primary py-2 sm:py-3 text-sm sm:text-base font-bold group-hover:shadow-xl transition-shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCommande(commande);
                }}
              >
                Traiter la commande
              </button>
            </div>
          ))}
        </div>

        {/* Contrôles de pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-lg p-2 sm:p-4 shadow-sm max-w-full overflow-x-hidden">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              {/* Bouton Précédent */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <span className="hidden sm:inline">← Précédent</span>
                <span className="sm:hidden">←</span>
              </button>

              {/* Numéros de pages */}
              <div className="flex items-center space-x-1 sm:space-x-2 flex-1 justify-center">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  // Afficher seulement certaines pages pour éviter trop de boutons
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 3 ||
                    pageNum === currentPage + 3
                  ) {
                    return <span key={pageNum} className="text-gray-400 text-xs">...</span>;
                  }
                  return null;
                })}
              </div>

              {/* Bouton Suivant */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <span className="hidden sm:inline">Suivant →</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>
          </div>
        )}
      </>
      )}

      {/* Modal de traitement */}
      {selectedCommande && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => {
            if (!processing) {
              setSelectedCommande(null);
              setNoteAppelant('');
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-[95vw] sm:max-w-lg w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header compact */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 sm:p-4 rounded-t-xl text-white flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base sm:text-xl font-bold">
                {selectedCommande.numeroCommande || (selectedCommande._id || selectedCommande.id).slice(-6).toUpperCase()}
                  </h2>
                <button 
                onClick={() => {
                  if (!processing) {
                    setSelectedCommande(null);
                    setNoteAppelant('');
                  }
                }}
                className="hover:bg-white/20 p-1 rounded transition-colors"
                  disabled={processing}
                >
                <X size={18} />
                </button>
            </div>

            {/* Contenu compact */}
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {/* Client avec Image du produit */}
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 flex items-start space-x-2 sm:space-x-3">
                {/* Infos Client */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Nom</span>
                    <span className="text-sm sm:text-base font-bold text-gray-900 truncate ml-2">{getClientNom(selectedCommande)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Contact</span>
                    <a 
                      href={`tel:${getClientContact(selectedCommande)}`}
                      className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <Phone size={12} className="sm:w-3.5 sm:h-3.5" />
                      <span className="truncate">{getClientContact(selectedCommande)}</span>
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Ville</span>
                    <span className="text-sm sm:text-base font-bold text-gray-900 truncate ml-2">{getVille(selectedCommande)}</span>
                  </div>
                </div>
                
                {/* Image du produit - À DROITE */}
                {(typeof selectedCommande.modele === 'object' && selectedCommande.modele?.image) ? (
                  <div className="flex-shrink-0">
                    <img 
                      src={selectedCommande.modele.image} 
                      alt={getModeleNom(selectedCommande.modele)}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-md flex items-center justify-center">
                    <Package className="text-white" size={24} />
                  </div>
                )}
              </div>

              {/* Détails Commande - Compact */}
              <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold mb-1.5">📦 Détails</p>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Modèle</span>
                    <span className="font-bold text-gray-900 truncate ml-2">{getModeleNom(selectedCommande.modele)}</span>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <span className="px-2 py-0.5 sm:py-1 bg-white rounded text-[10px] sm:text-xs font-semibold">📏 {selectedCommande.taille}</span>
                    <span className="px-2 py-0.5 sm:py-1 bg-white rounded text-[10px] sm:text-xs font-semibold">🎨 {selectedCommande.couleur}</span>
                  </div>
                </div>
              </div>

              {/* Prix - Compact */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-2 sm:p-3 flex justify-between items-center">
                <span className="text-white text-xs sm:text-sm font-semibold">Prix Total</span>
                <span className="text-white text-lg sm:text-2xl font-black">
                  {selectedCommande.prix?.toLocaleString('fr-FR')} F
                </span>
              </div>

              {/* Note - Compact */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                  📝 Note / Précisions
                </label>
                <textarea
                  value={noteAppelant}
                  onChange={(e) => setNoteAppelant(e.target.value)}
                  placeholder="Précisions pour l'atelier (optionnel)..."
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="2"
                  disabled={processing}
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                  Visible par l'équipe
                </p>
                </div>

              {/* Actions - Compact en grille 2x2 */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-2">
                <button
                  onClick={() => handleAction(selectedCommande._id || selectedCommande.id, 'confirmer')}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-2 sm:py-3 rounded-lg font-bold text-[11px] sm:text-sm transition-all flex items-center justify-center space-x-0.5 sm:space-x-1 disabled:opacity-50"
                >
                  <CheckCircle size={14} className="sm:w-[18px] sm:h-[18px]" />
                  <span>CONFIRMER</span>
                </button>

                <button
                  onClick={() => handleAction(selectedCommande._id || selectedCommande.id, 'urgent')}
                  disabled={processing}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-2 sm:py-3 rounded-lg font-bold text-[11px] sm:text-sm transition-all flex items-center justify-center space-x-0.5 sm:space-x-1 disabled:opacity-50"
                >
                  <AlertTriangle size={14} className="sm:w-[18px] sm:h-[18px]" />
                  <span>URGENT</span>
                </button>

                <button
                  onClick={() => handleAction(selectedCommande._id || selectedCommande.id, 'attente')}
                  disabled={processing}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-2 sm:px-3 py-2 sm:py-3 rounded-lg font-bold text-[11px] sm:text-sm transition-all flex items-center justify-center space-x-0.5 sm:space-x-1 disabled:opacity-50"
                >
                  <Clock size={14} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">EN ATTENTE</span>
                  <span className="sm:hidden">ATTENTE</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Annuler cette commande ?')) {
                      handleAction(selectedCommande._id || selectedCommande.id, 'annuler');
                    }
                  }}
                  disabled={processing}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-2 sm:px-3 py-2 sm:py-3 rounded-lg font-bold text-[11px] sm:text-sm transition-all flex items-center justify-center space-x-0.5 sm:space-x-1 disabled:opacity-50"
                >
                  <XCircle size={14} className="sm:w-[18px] sm:h-[18px]" />
                  <span>ANNULER</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appel;
