import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, User, CheckCircle, Eye, XCircle, Wallet, Phone, RotateCcw } from 'lucide-react';

const CaisseLivreurs = () => {
  const [livreurs, setLivreurs] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [markingReturned, setMarkingReturned] = useState(null);
  const [filterDate, setFilterDate] = useState(''); // Filtre par date d'assignation

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Récupérer tous les livreurs
      const usersResponse = await api.get('/users');
      const livreursActifs = usersResponse.data.users.filter(u => u.role === 'livreur' && u.actif);
      
      // Récupérer toutes les livraisons
      const livraisonsResponse = await api.get('/livraisons');
      
      setLivreurs(livreursActifs);
      setLivraisons(livraisonsResponse.data.livraisons);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getLivraisonsLivreur = (livreurId) => {
    return livraisons.filter(l => l.livreur?._id === livreurId || l.livreur?.id === livreurId);
  };

  const getLivraisonsLivrees = (livreurId) => {
    return getLivraisonsLivreur(livreurId).filter(l => l.statut === 'livree');
  };

  const getLivraisonsLivreesNonPayees = (livreurId) => {
    return getLivraisonsLivreur(livreurId).filter(l => l.statut === 'livree' && !l.paiement_recu && !l.paiementRecu);
  };

  const getMontantTotal = (livreurId) => {
    // Ne calculer que les livraisons livrées qui n'ont PAS encore été payées
    const livraisonsNonPayees = getLivraisonsLivreesNonPayees(livreurId);
    return livraisonsNonPayees.reduce((total, livraison) => {
      const prix = livraison.commande?.prix || 0;
      return total + prix;
    }, 0);
  };

  const handleMarquerPaiementRecu = async (livreurId, livreurNom) => {
    const montant = getMontantTotal(livreurId);
    const nombreLivraisons = getLivraisonsLivreesNonPayees(livreurId).length;

    if (nombreLivraisons === 0) {
      toast.error('Aucune livraison à marquer comme payée');
      return;
    }

    if (!window.confirm(`Confirmer la réception de l'argent de ${livreurNom} ?\n\n💰 Montant : ${montant.toLocaleString('fr-FR')} FCFA\n📦 ${nombreLivraisons} livraison(s)\n\nCette action marquera toutes les livraisons livrées comme payées.`)) {
      return;
    }

    try {
      const response = await api.post(`/livraisons/livreur/${livreurId}/marquer-paiement-recu`);
      toast.success(`✅ ${response.data.nombreLivraisons} livraison(s) marquées comme payées ! ${response.data.montantTotal.toLocaleString('fr-FR')} FCFA reçu.`);
      await fetchData(); // Rafraîchir les données
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du marquage');
      console.error(error);
    }
  };

  const handleVoirDetails = (livreur) => {
    setSelectedLivreur(livreur);
    setShowDetailsModal(true);
  };


  const handleMarquerRetourne = async (livraisonId, commande) => {
    const modele = typeof commande?.modele === 'object' ? commande.modele.nom : commande?.modele;
    const taille = commande?.taille;
    const couleur = commande?.couleur;
    
    if (!window.confirm(`Confirmer le retour de ce colis à la boutique ?\n\nLe stock sera automatiquement mis à jour :\n• ${modele} - ${taille} - ${couleur}\n• +1 unité au stock principal`)) {
      return;
    }

    setMarkingReturned(livraisonId);
    try {
      await api.post(`/livraisons/${livraisonId}/confirmer-retour`, {
        commentaire: 'Colis retourné par le livreur'
      });
      
      toast.success(`✅ Colis retourné ! Stock mis à jour (+1 ${modele}).`);
      await fetchData(); // Rafraîchir les données
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du retour');
      console.error(error);
    } finally {
      setMarkingReturned(null);
    }
  };

  const getStatutBadge = (statut) => {
    const badges = {
      en_cours: 'bg-blue-100 text-blue-800',
      livree: 'bg-green-100 text-green-800',
      refusee: 'bg-red-100 text-red-800',
      retournee: 'bg-gray-100 text-gray-800'
    };
    return badges[statut] || 'bg-gray-100 text-gray-800';
  };

  const getStatutLabel = (statut) => {
    const labels = {
      en_cours: '🚚 En cours',
      livree: '✅ Livrée',
      refusee: '❌ Refusée',
      retournee: '↩️ Retournée'
    };
    return labels[statut] || statut;
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

  const totalGeneral = livreurs.reduce((sum, livreur) => sum + getMontantTotal(livreur._id || livreur.id), 0);

  // Extraire toutes les dates d'assignation uniques
  const toutesLesDates = [...new Set(
    livraisons.map(l => {
      const date = new Date(l.dateAssignation || l.date_assignation);
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    })
  )].sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    return dateB - dateA; // Plus récent en premier
  });

  // Filtrer les livreurs selon la date sélectionnée
  const livreursAffiches = filterDate 
    ? livreurs.filter(livreur => {
        const livraisonsLivreur = getLivraisonsLivreur(livreur._id || livreur.id);
        return livraisonsLivreur.some(l => {
          const date = new Date(l.dateAssignation || l.date_assignation);
          const dateStr = date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
          });
          return dateStr === filterDate;
        });
      })
    : livreurs;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 sm:p-3 lg:p-4 rounded-2xl shadow-lg flex-shrink-0">
              <Wallet className="text-white" size={24} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent truncate">
                Caisse Livreurs
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium truncate">Suivi des encaissements et livraisons</p>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-500 uppercase">Total à Remettre</p>
          <p className="text-xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {totalGeneral.toLocaleString('fr-FR')} <span className="hidden sm:inline">FCFA</span><span className="sm:hidden">F</span>
          </p>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 max-w-full">
        <div className="bg-white rounded-xl p-2 sm:p-3 lg:p-4 shadow-sm max-w-full overflow-hidden">
          <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase mb-0.5 sm:mb-1 truncate">
            {filterDate ? `Livreurs (${filterDate})` : 'Livreurs Actifs'}
          </p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">{livreursAffiches.length}</p>
        </div>
        <div className="bg-white rounded-xl p-2 sm:p-3 lg:p-4 shadow-sm max-w-full overflow-hidden">
          <p className="text-[10px] sm:text-xs font-semibold text-blue-600 uppercase mb-0.5 sm:mb-1 truncate">En Cours</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-900">
            {livraisons.filter(l => l.statut === 'en_cours').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-2 sm:p-3 lg:p-4 shadow-sm max-w-full overflow-hidden">
          <p className="text-[10px] sm:text-xs font-semibold text-green-600 uppercase mb-0.5 sm:mb-1 truncate">Livrées</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-green-900">
            {livraisons.filter(l => l.statut === 'livree').length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-2 sm:p-3 lg:p-4 shadow-sm max-w-full overflow-hidden">
          <p className="text-[10px] sm:text-xs font-semibold text-white uppercase mb-0.5 sm:mb-1 truncate">💰 À Remettre</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
            {totalGeneral.toLocaleString('fr-FR')} F
          </p>
        </div>
      </div>

      {/* Filtre par date d'assignation */}
      {toutesLesDates.length > 0 && (
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Package className="text-indigo-600 flex-shrink-0" size={18} />
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase truncate">Filtrer par Date d'Assignation</h3>
            </div>
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
              >
                ✕ Réinitialiser
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterDate('')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filterDate === '' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📅 Toutes les dates ({livreurs.length})
            </button>
            {toutesLesDates.map((date) => {
              const livreursDate = livreurs.filter(livreur => {
                const livraisonsLivreur = getLivraisonsLivreur(livreur._id || livreur.id);
                return livraisonsLivreur.some(l => {
                  const d = new Date(l.dateAssignation || l.date_assignation);
                  const dateStr = d.toLocaleDateString('fr-FR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  });
                  return dateStr === date;
                });
              });
              
              return (
                <button
                  key={date}
                  onClick={() => setFilterDate(date)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    filterDate === date 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {date} ({livreursDate.length})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste des livreurs */}
      {livreursAffiches.length === 0 ? (
        <div className="card text-center py-12">
          <User className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filterDate ? 'Aucun livreur pour cette date' : 'Aucun livreur actif'}
          </h3>
          <p className="text-gray-600">
            {filterDate 
              ? `Aucun livreur n'a de colis assigné le ${filterDate}` 
              : 'Les livreurs actifs apparaîtront ici'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {livreursAffiches.map((livreur) => {
            const livraisonsLivreur = getLivraisonsLivreur(livreur._id || livreur.id);
            const livraisonsLivrees = getLivraisonsLivrees(livreur._id || livreur.id);
            const livraisonsEnCours = livraisonsLivreur.filter(l => l.statut === 'en_cours');
            const montantTotal = getMontantTotal(livreur._id || livreur.id);
            
            // Extraire les dates d'assignation uniques
            const datesAssignation = [...new Set(
              livraisonsLivreur.map(l => {
                const date = new Date(l.dateAssignation || l.date_assignation);
                return date.toLocaleDateString('fr-FR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                });
              })
            )].sort((a, b) => {
              const dateA = new Date(a.split('/').reverse().join('-'));
              const dateB = new Date(b.split('/').reverse().join('-'));
              return dateB - dateA; // Plus récent en premier
            });
            
            return (
              <div 
                key={livreur._id || livreur.id} 
                className="card bg-white hover:shadow-lg transition-all border-l-4 border-emerald-500"
              >
                {/* Header Livreur */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl">
                    <User className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{livreur.nom}</h3>
                    <p className="text-sm text-gray-600">{livreur.telephone}</p>
                  </div>
                </div>
                
                {/* Dates d'assignation */}
                {datesAssignation.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">📅 Dates d'assignation</p>
                    <div className="flex flex-wrap gap-2">
                      {datesAssignation.map((date, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-full shadow-sm"
                        >
                          {date}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistiques */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Package className="text-blue-600" size={16} />
                      <span className="text-sm font-semibold text-blue-900">En cours</span>
                    </div>
                    <span className="text-xl font-black text-blue-900">{livraisonsEnCours.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-green-600" size={16} />
                      <span className="text-sm font-semibold text-green-900">Livrées</span>
                    </div>
                    <span className="text-xl font-black text-green-900">{livraisonsLivrees.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <XCircle className="text-red-600" size={16} />
                      <span className="text-sm font-semibold text-red-900">Refusées</span>
                    </div>
                    <span className="text-xl font-black text-red-900">
                      {livraisonsLivreur.filter(l => l.statut === 'refusee').length}
                    </span>
                  </div>
                </div>

                {/* Montants */}
                <div className="space-y-2 mb-4">
                  {/* À remettre */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3">
                    <p className="text-white text-xs font-semibold mb-1 opacity-90">💰 À Remettre</p>
                    <p className="text-white text-2xl font-black">
                      {montantTotal.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="space-y-2">
                  {/* Bouton Argent Remis (uniquement si montant > 0) */}
                  {montantTotal > 0 && (
                    <button
                      onClick={() => handleMarquerPaiementRecu(livreur._id || livreur.id, livreur.nom)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-lg transition-all"
                    >
                      <Wallet size={18} />
                      <span>✅ Argent remis</span>
                    </button>
                  )}
                  
                  {/* Bouton Voir Détails */}
                  <button
                    onClick={() => handleVoirDetails(livreur)}
                    className="w-full btn btn-secondary flex items-center justify-center space-x-2"
                    disabled={livraisonsLivreur.length === 0}
                  >
                    <Eye size={16} />
                    <span>Voir Détails ({livraisonsLivreur.length})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Détails Livreur */}
      {showDetailsModal && selectedLivreur && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedLivreur.nom}</h2>
                  <p className="text-emerald-100">{selectedLivreur.telephone}</p>
                  {filterDate && (
                    <div className="mt-2">
                      <span className="inline-block bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">
                        📅 Filtré : {filterDate}
                      </span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold opacity-90 mb-1">Total</p>
                  <p className="text-2xl font-black">
                    {(() => {
                      let livraisons = getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id);
                      if (filterDate) {
                        livraisons = livraisons.filter(l => {
                          const dateAssignation = new Date(l.dateAssignation || l.date_assignation);
                          const dateStr = dateAssignation.toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          });
                          return dateStr === filterDate;
                        });
                      }
                      return livraisons.length;
                    })()}
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold opacity-90 mb-1">✅ Livrées</p>
                  <p className="text-2xl font-black">
                    {(() => {
                      let livraisons = getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id);
                      if (filterDate) {
                        livraisons = livraisons.filter(l => {
                          const dateAssignation = new Date(l.dateAssignation || l.date_assignation);
                          const dateStr = dateAssignation.toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          });
                          return dateStr === filterDate;
                        });
                      }
                      return livraisons.filter(l => l.statut === 'livree').length;
                    })()}
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold opacity-90 mb-1">❌ Refusées</p>
                  <p className="text-2xl font-black">
                    {(() => {
                      let livraisons = getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id);
                      if (filterDate) {
                        livraisons = livraisons.filter(l => {
                          const dateAssignation = new Date(l.dateAssignation || l.date_assignation);
                          const dateStr = dateAssignation.toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          });
                          return dateStr === filterDate;
                        });
                      }
                      return livraisons.filter(l => l.statut === 'refusee').length;
                    })()}
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold opacity-90 mb-1">À Remettre</p>
                  <p className="text-lg font-black">
                    {(() => {
                      let livraisons = getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id);
                      if (filterDate) {
                        livraisons = livraisons.filter(l => {
                          const dateAssignation = new Date(l.dateAssignation || l.date_assignation);
                          const dateStr = dateAssignation.toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          });
                          return dateStr === filterDate;
                        });
                      }
                      return livraisons
                        .filter(l => l.statut === 'livree' && !l.paiement_recu && !l.paiementRecu)
                        .reduce((sum, l) => sum + (l.commande?.prix || 0), 0)
                        .toLocaleString('fr-FR');
                    })()} F
                  </p>
                </div>
              </div>
            </div>

            {/* Liste des livraisons */}
            <div className="p-4">
              <h3 className="text-base font-bold text-gray-900 mb-3">Détails des Livraisons</h3>
              
              <div className="space-y-3">
                {(() => {
                  // Grouper les livraisons par date d'assignation
                  let livraisons = getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id);
                  
                  // Filtrer par date si une date est sélectionnée
                  if (filterDate) {
                    livraisons = livraisons.filter(livraison => {
                      const dateAssignation = new Date(livraison.dateAssignation || livraison.date_assignation);
                      const dateStr = dateAssignation.toLocaleDateString('fr-FR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      });
                      return dateStr === filterDate;
                    });
                  }
                  
                  const groupedByDate = {};
                  
                  livraisons.forEach(livraison => {
                    const dateAssignation = new Date(livraison.dateAssignation || livraison.date_assignation);
                    const dateKey = dateAssignation.toLocaleDateString('fr-FR', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit' 
                    });
                    
                    if (!groupedByDate[dateKey]) {
                      groupedByDate[dateKey] = [];
                    }
                    groupedByDate[dateKey].push(livraison);
                  });
                  
                  // Trier les groupes par date (plus récent en haut)
                  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                    const dateA = new Date(a.split('/').reverse().join('-'));
                    const dateB = new Date(b.split('/').reverse().join('-'));
                    return dateB - dateA;
                  });
                  
                  return sortedDates.map(dateKey => {
                    const livraisonsJour = groupedByDate[dateKey];
                    // Montant total du jour (toutes livraisons)
                    const montantTotalJour = livraisonsJour.reduce((sum, l) => sum + (l.commande?.prix || 0), 0);
                    // Montant à remettre (non payées uniquement)
                    const montantARemettre = livraisonsJour.filter(l => !l.paiement_recu && !l.paiementRecu).reduce((sum, l) => sum + (l.commande?.prix || 0), 0);
                    
                    // Trier les livraisons du jour : refusées en bas
                    const livraisonsTriees = livraisonsJour.sort((a, b) => {
                      const aRefused = a.statut === 'refusee' ? 1 : 0;
                      const bRefused = b.statut === 'refusee' ? 1 : 0;
                      return aRefused - bRefused;
                    });
                    
                    return (
                      <div key={dateKey} className="border-2 border-gray-300 rounded-lg overflow-hidden">
                        {/* Header du bloc journalier */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="bg-white/20 p-1.5 rounded">
                              <Package className="text-white" size={16} />
                            </div>
                            <div>
                              <p className="text-white font-black text-sm">📅 {dateKey}</p>
                              <p className="text-white/80 text-[10px] font-semibold">
                                {livraisonsJour.length} colis assigné{livraisonsJour.length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white/80 text-[10px] font-semibold">À Remettre</p>
                            <p className="text-white font-black text-lg">{montantARemettre.toLocaleString('fr-FR')} F</p>
                            {montantARemettre < montantTotalJour && (
                              <p className="text-white/60 text-[8px] font-semibold">Total: {montantTotalJour.toLocaleString('fr-FR')} F</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Liste des livraisons du jour */}
                        <div className="p-2 space-y-1.5 bg-gray-50">
                          {livraisonsTriees.map((livraison) => {
                            const isRefused = livraison.statut === 'refusee';
                            const isReturned = livraison.statut === 'retournee';
                            const isPaid = livraison.paiement_recu || livraison.paiementRecu;
                            const montant = livraison.commande?.prix || 0;
                            const clientNom = typeof livraison.commande?.client === 'object' 
                              ? livraison.commande.client.nom 
                              : livraison.commande?.client || 'N/A';
                            const clientContact = typeof livraison.commande?.client === 'object' 
                              ? livraison.commande.client.contact 
                              : '';
                            const modeleNom = typeof livraison.commande?.modele === 'object' 
                              ? livraison.commande.modele.nom 
                              : livraison.commande?.modele || 'N/A';
                            
                            let bgClass = 'bg-white border-2 border-gray-200 hover:shadow-md hover:border-emerald-300';
                            if (isPaid) bgClass = 'bg-gradient-to-r from-green-100 to-emerald-50 border-2 border-green-500';
                            if (isRefused) bgClass = 'bg-gradient-to-r from-red-100 to-red-50 border-2 border-red-500';
                            if (isReturned) bgClass = 'bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-400';
                            
                            return (
                              <div 
                                key={livraison._id || livraison.id} 
                                className={`relative border rounded-lg p-2 transition-all ${bgClass}`}
                              >
                                {/* Badges en coin */}
                                <div className="absolute top-1 right-1 flex flex-col gap-1">
                                  {isPaid && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-green-600 text-white flex items-center space-x-1 shadow-md">
                                      <Wallet size={9} strokeWidth={4} />
                                      <span>PAYÉ</span>
                                    </span>
                                  )}
                                  {isReturned && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gray-600 text-white flex items-center space-x-1 shadow-md">
                                      <RotateCcw size={9} strokeWidth={4} />
                                      <span>RETOURNÉ</span>
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-start justify-between gap-2">
                                  {/* Partie gauche - Infos commande */}
                                  <div className="flex-1 min-w-0">
                                    {/* Numéro et statut */}
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <h4 className="font-black text-gray-900 text-xs">
                                        {livraison.commande?.numeroCommande || 'N/A'}
                                      </h4>
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getStatutBadge(livraison.statut)}`}>
                                        {getStatutLabel(livraison.statut)}
                                      </span>
                                    </div>
                                    
                                    {/* Client avec contact */}
                                    <div className="bg-white/60 rounded p-1.5 mb-1.5">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase">Client</span>
                                        <span className="text-[11px] font-black text-gray-900">{clientNom}</span>
                                      </div>
                                      {clientContact && (
                                        <a
                                          href={`tel:${clientContact}`}
                                          className="flex items-center justify-end space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-[10px]"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Phone size={10} />
                                          <span>{clientContact}</span>
                                        </a>
                                      )}
                                    </div>
                                    
                                    {/* Modèle et ville */}
                                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                                      <div className="bg-gray-50 rounded px-1.5 py-0.5">
                                        <span className="text-gray-500 font-semibold">Modèle:</span>
                                        <p className="font-bold text-gray-900 truncate">{modeleNom}</p>
                                      </div>
                                      <div className="bg-gray-50 rounded px-1.5 py-0.5">
                                        <span className="text-gray-500 font-semibold">Ville:</span>
                                        <p className="font-bold text-gray-900 truncate">
                                          {livraison.adresseLivraison?.ville || livraison.adresse_livraison?.ville || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    
                                  </div>
                                  
                                  {/* Partie droite - Montant et action */}
                                  <div className="flex flex-col items-end justify-between min-w-[100px]">
                                    {/* Montant */}
                                    <div className="text-right">
                                      <p className="text-[8px] text-gray-400 font-bold uppercase mb-0.5">Montant</p>
                                      <p className="text-lg font-black text-emerald-600">
                                        {montant.toLocaleString('fr-FR')}
                                      </p>
                                      <p className="text-[9px] font-bold text-gray-500">FCFA</p>
                                    </div>
                                    
                                    {/* Bouton Retourné pour les colis refusés */}
                                    {isRefused && !isReturned && (
                                      <button
                                        onClick={() => handleMarquerRetourne(livraison._id || livraison.id, livraison.commande)}
                                        disabled={markingReturned === (livraison._id || livraison.id)}
                                        className="mt-1 w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-2 py-1 rounded text-[9px] font-black flex items-center justify-center space-x-0.5 transition-all disabled:opacity-50 shadow-md"
                                      >
                                        <RotateCcw size={10} strokeWidth={4} />
                                        <span>{markingReturned === (livraison._id || livraison.id) ? 'EN COURS' : 'RETOURNÉ'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaisseLivreurs;

