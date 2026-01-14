import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, Wallet, X, Calendar, CheckCircle, Clock, TrendingUp, AlertTriangle, Eye } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const CaisseLivreurs = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [livreurs, setLivreurs] = useState([]);
  const [sessions, setSessions] = useState({});
  const [historiques, setHistoriques] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Vérifier les permissions avant de charger les données
    if (user && !['gestionnaire', 'administrateur'].includes(user.role)) {
      toast.error('⛔ Accès refusé : Page réservée aux gestionnaires et administrateurs');
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Récupérer tous les livreurs
      const { data: usersData } = await api.get('/users?role=livreur');
      const livreursActifs = usersData.users.filter(u => u.actif);
      setLivreurs(livreursActifs);

      // Pour chaque livreur, récupérer sa session active et son historique
      const sessionsData = {};
      const historiquesData = {};

      await Promise.all(
        livreursActifs.map(async (livreur) => {
          try {
            // Session active
            const { data: sessionRes } = await api.get(
              `/sessions-caisse/livreur/${livreur._id || livreur.id}/session-active`
            );
            if (sessionRes.session) {
              sessionsData[livreur._id || livreur.id] = sessionRes.session;
            }

            // Historique (3 dernières sessions)
            const { data: histRes } = await api.get(
              `/sessions-caisse/livreur/${livreur._id || livreur.id}/historique?limit=3`
            );
            historiquesData[livreur._id || livreur.id] = histRes.sessions || [];
          } catch (error) {
            console.error(`Erreur pour ${livreur.nom}:`, error);
          }
        })
      );

      setSessions(sessionsData);
      setHistoriques(historiquesData);
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || '';
      
      console.error('Erreur CaisseLivreurs:', error.response?.data);
      
      if (status === 403) {
        toast.error('⛔ Accès refusé : Cette page est réservée aux gestionnaires et administrateurs');
        navigate('/dashboard');
      } else if (status === 401) {
        toast.error('🔒 Session expirée : Veuillez vous reconnecter');
      } else if (message.includes('relation') || message.includes('table') || message.includes('sessions_caisse')) {
        toast.error('⚠️ Migration non exécutée : Veuillez exécuter la migration SQL sur Supabase', {
          duration: 8000
        });
      } else {
        toast.error(message || 'Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloturerSession = async (livreur) => {
    const livreurId = livreur._id || livreur.id;
    const session = sessions[livreurId];

    if (!session) {
      toast.error('Aucune session active pour ce livreur');
      return;
    }

    setSelectedLivreur(livreur);
    setShowModal(true);
  };

  const confirmCloture = async () => {
    if (!selectedLivreur) return;

    const livreurId = selectedLivreur._id || selectedLivreur.id;
    const session = sessions[livreurId];

    try {
      setProcessing(true);
      const { data } = await api.post(`/sessions-caisse/${session._id || session.id}/cloturer`, {
        commentaire: commentaire.trim() || undefined
      });

      toast.success(data.message || '✅ Session clôturée avec succès !');
      setShowModal(false);
      setCommentaire('');
      setSelectedLivreur(null);

      // Rafraîchir les données
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la clôture');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleVoirDetails = (livreur) => {
    const livreurId = livreur._id || livreur.id;
    const session = sessions[livreurId];
    
    if (!session) {
      toast.error('Aucune session active pour ce livreur');
      return;
    }

    setSelectedSession(session);
    setShowDetailsModal(true);
  };

  const handleRafraichirLivraisons = async (livreurId) => {
    try {
      const { data } = await api.post(`/sessions-caisse/livreur/${livreurId}/ajouter-livraisons`);
      
      if (data.montantAjoute && data.montantAjoute > 0) {
        toast.success(`✅ ${data.message}\n💰 +${data.montantAjoute.toLocaleString('fr-FR')} FCFA`);
        fetchData();
      } else {
        toast.info(data.message || 'Aucune nouvelle livraison trouvée');
      }
    } catch (error) {
      const message = error.response?.data?.message || '';
      const errorDetails = error.response?.data?.error || '';
      
      console.error('Erreur rafraîchissement:', error.response?.data);
      
      if (message.includes('relation') || message.includes('table') || errorDetails.includes('sessions_caisse')) {
        toast.error('⚠️ Migration non exécutée : Veuillez exécuter la migration SQL sur Supabase', {
          duration: 6000
        });
      } else if (message.includes('Aucune')) {
        toast.info('ℹ️ Aucune nouvelle livraison à ajouter. Les livreurs doivent d\'abord marquer des colis comme "Livrée"');
      } else {
        toast.error(message || 'Erreur lors du rafraîchissement');
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateCourte = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Wallet className="mr-3" size={28} />
            Caisse Livreurs
          </h1>
          <p className="page-subtitle">
            Gestion des sessions de paiement par livreur
          </p>
        </div>
      </div>

      {/* Message info si aucune session */}
      {livreurs.length > 0 && Object.keys(sessions).length === 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-start space-x-3">
          <AlertTriangle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900 mb-1">
              ℹ️ Aucune session active pour le moment
            </p>
            <p className="text-blue-700">
              Les sessions se créent automatiquement quand les <strong>livreurs marquent des colis comme "Livrée"</strong> dans la page Livraisons.
            </p>
          </div>
        </div>
      )}

      {/* Grille des livreurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {livreurs.map((livreur) => {
          const livreurId = livreur._id || livreur.id;
          const sessionActive = sessions[livreurId];
          const historique = historiques[livreurId] || [];
          const hasActiveSession = sessionActive && sessionActive.nombreLivraisons > 0;

          return (
            <div
              key={livreurId}
              className={`stat-card transition-all max-w-full ${
                hasActiveSession ? 'border-2 border-emerald-400 shadow-lg' : ''
              }`}
            >
              {/* Header du livreur */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                    {livreur.nom.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-800 truncate">{livreur.nom}</h3>
                    <p className="text-xs text-gray-500 truncate">{livreur.telephone}</p>
                  </div>
                </div>
                {hasActiveSession && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex-shrink-0">
                    Active
                  </span>
                )}
              </div>

              {/* Session active */}
              {hasActiveSession ? (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-700 flex items-center">
                        <Clock size={14} className="mr-1 flex-shrink-0" />
                        <span className="truncate">Session en cours</span>
                      </span>
                      <span className="text-xs text-gray-600 truncate ml-2">
                        depuis {formatDateCourte(sessionActive.dateDebut)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Colis livrés</p>
                        <p className="text-xl font-black text-gray-800">
                          {sessionActive.nombreLivraisons}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Montant total</p>
                        <p className="text-lg sm:text-xl font-black text-emerald-600 truncate">
                          {(sessionActive.montantTotal || 0).toLocaleString('fr-FR')} F
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVoirDetails(livreur)}
                      className="px-4 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-lg transition-all flex-shrink-0"
                      title="Voir les détails des colis"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleCloturerSession(livreur)}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-md transition-all min-w-0"
                    >
                      <CheckCircle size={18} className="flex-shrink-0" />
                      <span className="truncate">Clôturer</span>
                    </button>
                    <button
                      onClick={() => handleRafraichirLivraisons(livreurId)}
                      className="px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-all flex-shrink-0"
                      title="Rafraîchir les livraisons"
                    >
                      <TrendingUp size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Package size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 mb-1 font-semibold">Aucune session active</p>
                  <p className="text-xs text-gray-400 mb-3">
                    Pas de livraisons "Livrée" pour ce livreur
                  </p>
                  <button
                    onClick={() => handleRafraichirLivraisons(livreurId)}
                    className="btn btn-secondary text-sm"
                    title="Vérifie s'il y a de nouvelles livraisons marquées comme 'Livrée'"
                  >
                    <TrendingUp size={16} className="mr-2" />
                    Vérifier nouvelles livraisons
                  </button>
                </div>
              )}

              {/* Historique */}
              {historique.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
                    <Calendar size={14} className="mr-1 flex-shrink-0" />
                    <span className="truncate">Historique ({historique.length} dernières)</span>
                  </p>
                  <div className="space-y-2">
                    {historique.map((session, index) => (
                      <div
                        key={session._id || session.id || index}
                        className="flex items-center justify-between text-xs bg-gray-50 rounded p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-700 truncate">
                            {session.nombreLivraisons} colis
                          </p>
                          <p className="text-gray-500 truncate">
                            {formatDateCourte(session.dateCloture)}
                          </p>
                        </div>
                        <p className="font-bold text-gray-800 ml-2 flex-shrink-0">
                          {(session.montantTotal || 0).toLocaleString('fr-FR')} F
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de confirmation */}
      {showModal && selectedLivreur && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <CheckCircle size={24} className="mr-2 text-emerald-600" />
                Clôturer la session
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setCommentaire('');
                  setSelectedLivreur(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Récapitulatif */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 mb-4 border border-emerald-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {selectedLivreur.nom}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-600">Colis livrés</p>
                  <p className="text-2xl font-black text-gray-800">
                    {sessions[selectedLivreur._id || selectedLivreur.id]?.nombreLivraisons || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Montant à recevoir</p>
                  <p className="text-2xl font-black text-emerald-600">
                    {(sessions[selectedLivreur._id || selectedLivreur.id]?.montantTotal || 0).toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>
            </div>

            {/* Commentaire optionnel */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Commentaire (optionnel)
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows="3"
                placeholder="Ex: Argent reçu en espèces, tout est bon..."
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setCommentaire('');
                  setSelectedLivreur(null);
                }}
                className="flex-1 btn btn-secondary"
                disabled={processing}
              >
                Annuler
              </button>
              <button
                onClick={confirmCloture}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-md transition-all"
                disabled={processing}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Confirmer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails des colis */}
      {showDetailsModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <Package size={24} className="mr-2 text-purple-600" />
                Détails de la session
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSession(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Résumé */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-4 border border-purple-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total colis</p>
                  <p className="text-3xl font-black text-gray-800">
                    {selectedSession.nombreLivraisons || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Montant total</p>
                  <p className="text-3xl font-black text-purple-600">
                    {(selectedSession.montantTotal || 0).toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>
            </div>

            {/* Liste des colis */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <Package size={18} className="mr-2" />
                Liste des colis ({selectedSession.livraisons?.length || 0})
              </h4>

              {selectedSession.livraisons && selectedSession.livraisons.length > 0 ? (
                selectedSession.livraisons.map((livraison, index) => {
                  const commande = livraison.commande || {};
                  const isLivree = livraison.statut === 'livree';
                  const isEnCours = livraison.statut === 'en_cours';
                  const isRefusee = livraison.statut === 'refusee';

                  return (
                    <div
                      key={livraison._id || livraison.id || index}
                      className={`border rounded-lg p-4 ${
                        isLivree
                          ? 'bg-emerald-50 border-emerald-200'
                          : isEnCours
                          ? 'bg-blue-50 border-blue-200'
                          : isRefusee
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {commande.numeroCommande || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {commande.modele?.nom || 'Modèle inconnu'} - {commande.taille} - {commande.couleur}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Client: {commande.client?.nom || 'N/A'} - {commande.client?.ville || 'N/A'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              isLivree
                                ? 'bg-emerald-500 text-white'
                                : isEnCours
                                ? 'bg-blue-500 text-white'
                                : isRefusee
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-500 text-white'
                            }`}
                          >
                            {isLivree ? '✅ Livrée' : isEnCours ? '📦 En cours' : isRefusee ? '❌ Refusée' : livraison.statut}
                          </span>
                          <p className="text-lg font-bold text-gray-800">
                            {(commande.prix || 0).toLocaleString('fr-FR')} F
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 py-8">Aucun colis dans cette session</p>
              )}
            </div>

            {/* Bouton fermer */}
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSession(null);
                }}
                className="w-full btn btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaisseLivreurs;
