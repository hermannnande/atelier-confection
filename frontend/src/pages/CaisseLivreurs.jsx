import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, Wallet, X, Calendar, CheckCircle, Clock, TrendingUp, AlertTriangle, Eye, History, Search, Filter, AlertOctagon, Phone, MapPin, Trash2, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

function CollapsibleClotureCard({ livreur, group, dateStr, montant, canDelete, onDelete }) {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    onDelete(group);
  };

  return (
    <div className="stat-card transition-all max-w-full border-2 border-red-400 shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600">
            {livreur.nom.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-gray-800 truncate">{livreur.nom}</h3>
            <p className="text-xs text-gray-500 truncate">{livreur.telephone}</p>
          </div>
        </div>
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 flex-shrink-0">
          Clôturée
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-3 border border-red-200 flex items-center justify-between hover:from-red-100 hover:to-orange-100 transition-colors"
      >
        <span className="text-xs font-bold text-red-700 flex items-center gap-1">
          <AlertOctagon size={14} className="flex-shrink-0" />
          Session du {dateStr}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
            {group.livraisons.length} colis · {montant.toLocaleString('fr-FR')} F
          </span>
          <ChevronDown size={16} className={`text-red-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {group.livraisons.map((livraison, idx) => {
            const commande = livraison.commande || {};
            const clientNom = typeof commande.client === 'object' ? commande.client?.nom : commande.client || 'N/A';
            const clientVille = typeof commande.client === 'object' ? commande.client?.ville : '';
            return (
              <div key={livraison._id || livraison.id || idx} className="bg-white rounded-lg p-2.5 border border-red-200">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{commande.numeroCommande || 'N/A'}</p>
                    <p className="text-xs text-gray-600 truncate">
                      {clientNom}{clientVille ? ` \u00b7 ${clientVille}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">EN COURS</span>
                    <p className="text-sm font-black text-gray-800 mt-0.5">
                      {(commande.prix || 0).toLocaleString('fr-FR')} F
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className="mt-3 w-full bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all border border-red-300"
        >
          <Trash2 size={18} />
          Supprimer cette session
        </button>
      )}
    </div>
  );
}

const CaisseLivreurs = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [livreurs, setLivreurs] = useState([]);
  const [sessions, setSessions] = useState({});
  const [colisRestantsMap, setColisRestantsMap] = useState({});
  const [historiques, setHistoriques] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [clotureContext, setClotureContext] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [processing, setProcessing] = useState(false);
  const [sessionDeleteModal, setSessionDeleteModal] = useState(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [showHistoriqueModal, setShowHistoriqueModal] = useState(false);
  const [historiqueComplet, setHistoriqueComplet] = useState([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [filtreHistorique, setFiltreHistorique] = useState({
    livreurId: '',
    dateDebut: '',
    dateFin: ''
  });
  const [searchHistorique, setSearchHistorique] = useState('');
  const [filterLivreur, setFilterLivreur] = useState('');
  const [filterDateAssignation, setFilterDateAssignation] = useState('');
  const [filterDateCloture, setFilterDateCloture] = useState('');
  const [quickFilter, setQuickFilter] = useState('today');

  const applyQuickFilter = (key) => {
    setQuickFilter(key);
    setFilterDateAssignation('');
    setFilterDateCloture('');
  };
  const matchQuickFilter = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const iso = d.toISOString().slice(0, 10);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (quickFilter === 'today') return iso === todayStr;
    if (quickFilter === 'yesterday') {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return iso === y.toISOString().slice(0, 10);
    }
    if (quickFilter === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo && d <= now;
    }
    if (quickFilter === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    return true;
  };

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

      const sessionsData = {};
      const colisRestantsData = {};
      const historiquesData = {};

      await Promise.all(
        livreursActifs.map(async (livreur) => {
          const lid = livreur._id || livreur.id;
          try {
            const { data: sessionRes } = await api.get(
              `/sessions-caisse/livreur/${lid}/session-active`
            );
            const ouvertes =
              Array.isArray(sessionRes.sessionsOuvertes) && sessionRes.sessionsOuvertes.length > 0
                ? sessionRes.sessionsOuvertes
                : sessionRes.session
                  ? [sessionRes.session]
                  : [];
            if (ouvertes.length > 0) {
              sessionsData[lid] = ouvertes;
            }
            if (sessionRes.colisRestants && sessionRes.colisRestants.length > 0) {
              colisRestantsData[lid] = sessionRes.colisRestants;
            }

            const { data: histRes } = await api.get(
              `/sessions-caisse/livreur/${lid}/historique?limit=3`
            );
            historiquesData[lid] = histRes.sessions || [];
          } catch (error) {
            console.error(`Erreur pour ${livreur.nom}:`, error);
          }
        })
      );

      setSessions(sessionsData);
      setColisRestantsMap(colisRestantsData);
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

  const handleCloturerTout = (livreur, sessionsArr) => {
    if (!sessionsArr || sessionsArr.length === 0) {
      toast.error('Aucune session active pour ce livreur');
      return;
    }
    setClotureContext({ livreur, sessions: sessionsArr });
    setSelectedLivreur(livreur);
    setShowModal(true);
  };

  const confirmCloture = async () => {
    if (!clotureContext?.sessions?.length) return;

    try {
      setProcessing(true);

      for (const sess of clotureContext.sessions) {
        const sid = sess._id || sess.id;
        await api.post(`/sessions-caisse/${sid}/cloturer`, {
          commentaire: commentaire.trim() || undefined
        });
      }

      toast.success('Session clôturée avec succès !');
      setShowModal(false);
      setCommentaire('');
      setSelectedLivreur(null);
      setClotureContext(null);

      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la clôture');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleVoirDetails = (_livreur, session) => {
    if (!session) {
      toast.error('Aucune session active pour ce livreur');
      return;
    }

    setSelectedSession(session);
    setShowDetailsModal(true);
  };

  const handleVoirHistoriqueComplet = async () => {
    setShowHistoriqueModal(true);
    setLoadingHistorique(true);
    
    try {
      const { data } = await api.get('/sessions-caisse?statut=cloturee');
      setHistoriqueComplet(data.sessions || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement de l\'historique');
      console.error(error);
    } finally {
      setLoadingHistorique(false);
    }
  };

  const canDeleteSessions = (user?.role || '').toLowerCase() === 'administrateur';

  const reloadHistoriqueComplet = async () => {
    try {
      const { data } = await api.get('/sessions-caisse?statut=cloturee');
      setHistoriqueComplet(data.sessions || []);
    } catch (error) {
      console.error(error);
    }
  };

  const confirmSupprimerSession = async () => {
    if (!sessionDeleteModal) return;
    const sid = sessionDeleteModal._id || sessionDeleteModal.id;
    try {
      setDeletingSession(true);
      await api.delete(`/sessions-caisse/session/${sid}`);
      toast.success('Session supprimée');
      setSessionDeleteModal(null);
      await fetchData();
      if (showHistoriqueModal) await reloadHistoriqueComplet();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingSession(false);
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
        <button
          onClick={handleVoirHistoriqueComplet}
          className="btn btn-secondary flex items-center gap-2"
        >
          <History size={20} />
          <span className="hidden sm:inline">Historique Complet</span>
        </button>
      </div>

      {/* Message info si aucune activité caisse sur aucun livreur */}
      {livreurs.length > 0 &&
        livreurs.every((l) => {
          const id = l._id || l.id;
          return !sessions[id]?.length && !(colisRestantsMap[id]?.length > 0);
        }) && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-start space-x-3">
          <AlertTriangle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900 mb-1">
              Aucune session active pour le moment
            </p>
            <p className="text-blue-700">
              Les sessions de caisse apparaîtront ici lorsque des livraisons seront assignées aux livreurs.
              Les colis non livrés après clôture restent visibles en rouge.
            </p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-gray-500" />
          <span className="text-sm font-bold text-gray-700">Filtres</span>
          {(filterLivreur || filterDateAssignation || filterDateCloture) && (
            <button
              type="button"
              onClick={() => { setFilterLivreur(''); setFilterDateAssignation(''); setFilterDateCloture(''); }}
              className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Livreur</label>
            <select
              value={filterLivreur}
              onChange={(e) => setFilterLivreur(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tous les livreurs</option>
              {livreurs.map((l) => (
                <option key={l._id || l.id} value={l._id || l.id}>{l.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date d'assignation</label>
            <input
              type="date"
              value={filterDateAssignation}
              onChange={(e) => { setFilterDateAssignation(e.target.value); setQuickFilter(''); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date de clôture</label>
            <input
              type="date"
              value={filterDateCloture}
              onChange={(e) => { setFilterDateCloture(e.target.value); setQuickFilter(''); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Filtres rapides */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 mr-1">Filtre rapide :</span>
        {[
          { key: 'today', label: "Aujourd'hui" },
          { key: 'yesterday', label: 'Hier' },
          { key: 'week', label: 'Cette semaine' },
          { key: 'month', label: 'Ce mois' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => applyQuickFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              quickFilter === key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applyQuickFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
            !quickFilter
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
          }`}
        >
          Tout
        </button>
      </div>

      {/* Grille des livreurs — cartes vertes (sessions actives) puis cartes rouges (restants) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {livreurs
          .filter((l) => !filterLivreur || (l._id || l.id) === filterLivreur)
          .flatMap((livreur) => {
          const livreurId = livreur._id || livreur.id;
          const allSessionsOuvertes = sessions[livreurId] || [];
          const allColisRestants = colisRestantsMap[livreurId] || [];
          const historique = historiques[livreurId] || [];

          const matchDateExact = (d, filter) => {
            if (!filter || !d) return !filter;
            return new Date(d).toISOString().slice(0, 10) === filter;
          };

          const filterSession = (dateVal) => {
            if (quickFilter) return matchQuickFilter(dateVal);
            if (filterDateAssignation) return matchDateExact(dateVal, filterDateAssignation);
            return true;
          };
          const filterCloture = (dateVal) => {
            if (quickFilter) return matchQuickFilter(dateVal);
            if (filterDateCloture) return matchDateExact(dateVal, filterDateCloture);
            return true;
          };

          const sessionsOuvertes = (quickFilter || filterDateAssignation)
            ? allSessionsOuvertes.filter((s) => filterSession(s.dateDebut || s.date_debut))
            : allSessionsOuvertes;

          const colisRestants = (quickFilter || filterDateCloture)
            ? allColisRestants.filter((l) => {
                const dc = l.session?.date_cloture || l.session?.dateCloture || l.session_caisse?.dateCloture;
                return filterCloture(dc);
              })
            : allColisRestants;

          const sessionColisCount = sessionsOuvertes.reduce((sum, s) => {
            const n = s.livraisons?.length ?? s.nombreLivraisons ?? s.nombre_livraisons ?? 0;
            return sum + n;
          }, 0);
          const hasActiveSession = sessionsOuvertes.length > 0 && sessionColisCount > 0;
          const hasColisRestants = colisRestants.length > 0;

          const cards = [];

          /* ───── CARTE VERTE : sessions actives ───── */
          if (hasActiveSession) {
            cards.push(
              <div key={`${livreurId}-active`} className="stat-card transition-all max-w-full border-2 border-emerald-400 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600">
                      {livreur.nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-gray-800 truncate">{livreur.nom}</h3>
                      <p className="text-xs text-gray-500 truncate">{livreur.telephone}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                    Nouvelle session
                  </span>
                </div>

                {sessionsOuvertes.map((sess, si) => {
                  const nLivres = sess.nombreLivres || 0;
                  const nEnCours = sess.nombreEnCours || 0;
                  const nRefuses = sess.nombreRefuses || 0;
                  const montant = sess.montantTotal || 0;
                  const dateS = sess.dateDebut || sess.date_debut;
                  return (
                    <div key={sess._id || sess.id || si} className="space-y-3 mb-3">
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-emerald-700 flex items-center">
                            <Clock size={14} className="mr-1 flex-shrink-0" />
                            <span className="truncate">
                              Session {sessionsOuvertes.length > 1 ? `${si + 1}/${sessionsOuvertes.length}` : 'en cours'}
                            </span>
                          </span>
                          <span className="text-xs text-gray-600 truncate ml-2">
                            depuis {formatDateCourte(dateS)}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-emerald-50 rounded-lg px-2 py-2 text-center border border-emerald-200">
                              <span className="text-xs font-semibold text-emerald-700 block mb-1">Livrés</span>
                              <span className="text-xl font-black text-emerald-600">{nLivres}</span>
                            </div>
                            <div className="bg-blue-50 rounded-lg px-2 py-2 text-center border border-blue-200">
                              <span className="text-xs font-semibold text-blue-700 block mb-1">En cours</span>
                              <span className="text-xl font-black text-blue-600">{nEnCours}</span>
                            </div>
                            <div className="bg-red-50 rounded-lg px-2 py-2 text-center border border-red-200">
                              <span className="text-xs font-semibold text-red-700 block mb-1">Refusés</span>
                              <span className="text-xl font-black text-red-600">{nRefuses}</span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">Montant total</span>
                              <span className="text-lg sm:text-xl font-black text-white truncate">
                                {montant.toLocaleString('fr-FR')} F
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleVoirDetails(livreur, sess)} className="px-4 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-lg transition-all flex-shrink-0" title="Voir les détails des colis">
                          <Eye size={18} />
                        </button>
                        <button type="button" onClick={() => handleCloturerTout(livreur, [sess])} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-md transition-all min-w-0">
                          <CheckCircle size={18} className="flex-shrink-0" />
                          <span className="truncate">Clôturer</span>
                        </button>
                        {canDeleteSessions && (
                          <button type="button" onClick={() => setSessionDeleteModal(sess)} className="px-4 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-all flex-shrink-0" title="Supprimer cette session (admin)">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {historique.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
                      <Calendar size={14} className="mr-1 flex-shrink-0" />
                      <span className="truncate">Historique ({historique.length} dernières)</span>
                    </p>
                    <div className="space-y-2">
                      {historique.map((session, index) => (
                        <div key={session._id || session.id || index} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-700 truncate">{session.nombreLivraisons} colis</p>
                            <p className="text-gray-500 truncate">{formatDateCourte(session.dateCloture)}</p>
                          </div>
                          <p className="font-bold text-gray-800 ml-2 flex-shrink-0">{(session.montantTotal || 0).toLocaleString('fr-FR')} F</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          /* ───── CARTES ROUGES : une carte par session clôturée ───── */
          if (hasColisRestants) {
            const grouped = {};
            colisRestants.forEach((l) => {
              const sid = l.session?.id || l.session?._id || l.session_caisse_id || l.session_caisse?._id || 'unknown';
              if (!grouped[sid]) {
                grouped[sid] = {
                  sessionId: sid,
                  dateCloture: l.session?.date_cloture || l.session?.dateCloture || l.session_caisse?.dateCloture || null,
                  livraisons: []
                };
              }
              grouped[sid].livraisons.push(l);
            });
            const sessionGroups = Object.values(grouped).sort((a, b) => {
              if (!a.dateCloture) return 1;
              if (!b.dateCloture) return -1;
              return new Date(b.dateCloture) - new Date(a.dateCloture);
            });

            sessionGroups.forEach((group) => {
              const dateStr = group.dateCloture
                ? new Date(group.dateCloture).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Date inconnue';
              const montant = group.livraisons.reduce((s, l) => s + (Number(l.commande?.prix) || 0), 0);

              cards.push(
                <CollapsibleClotureCard
                  key={`${livreurId}-cloture-${group.sessionId}`}
                  livreur={livreur}
                  group={group}
                  dateStr={dateStr}
                  montant={montant}
                  canDelete={canDeleteSessions}
                  onDelete={(g) => setSessionDeleteModal({
                    _id: g.sessionId,
                    id: g.sessionId,
                    livreur: { nom: livreur.nom },
                    montantTotal: g.livraisons.reduce((s, l) => s + (Number(l.commande?.prix) || 0), 0),
                    nombreLivraisons: g.livraisons.length,
                    dateCloture: g.dateCloture
                  })}
                />
              );
            });
          }

          /* ───── CARTE NEUTRE : aucune activité (masquée si un filtre date est actif) ───── */
          if (!hasActiveSession && !hasColisRestants && !filterDateAssignation && !filterDateCloture && !quickFilter) {
            cards.push(
              <div key={livreurId} className="stat-card transition-all max-w-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600">
                      {livreur.nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-gray-800 truncate">{livreur.nom}</h3>
                      <p className="text-xs text-gray-500 truncate">{livreur.telephone}</p>
                    </div>
                  </div>
                </div>
                <div className="text-center py-6">
                  <Package size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 mb-1 font-semibold">Aucune session active</p>
                  <p className="text-xs text-gray-400 mb-3">La session apparaît dès qu'un colis est assigné.</p>
                  <button type="button" onClick={() => fetchData()} className="btn btn-secondary text-sm">
                    <TrendingUp size={16} className="mr-2" />
                    Actualiser
                  </button>
                </div>
                {historique.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
                      <Calendar size={14} className="mr-1 flex-shrink-0" />
                      <span className="truncate">Historique ({historique.length} dernières)</span>
                    </p>
                    <div className="space-y-2">
                      {historique.map((session, index) => (
                        <div key={session._id || session.id || index} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-700 truncate">{session.nombreLivraisons} colis</p>
                            <p className="text-gray-500 truncate">{formatDateCourte(session.dateCloture)}</p>
                          </div>
                          <p className="font-bold text-gray-800 ml-2 flex-shrink-0">{(session.montantTotal || 0).toLocaleString('fr-FR')} F</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return cards;
        })}
      </div>

      {/* Modal de confirmation */}
      {showModal && selectedLivreur && clotureContext?.sessions?.length > 0 && (() => {
        const ctxSessions = clotureContext.sessions;
        const totLivres = ctxSessions.reduce((s, x) => s + (x.nombreLivres || 0), 0);
        const totEnCours = ctxSessions.reduce((s, x) => s + (x.nombreEnCours || 0), 0);
        const totRefuses = ctxSessions.reduce((s, x) => s + (x.nombreRefuses || 0), 0);
        const totMontant = ctxSessions.reduce((s, x) => s + (x.montantTotal || 0), 0);
        return (
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
                  setClotureContext(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Récapitulatif */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 mb-4 border border-emerald-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {selectedLivreur.nom}
              </p>
              
              {/* Compteurs de colis */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-emerald-50 rounded-lg px-2 py-2 text-center border border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-700 block mb-1">✅ Livrés</span>
                  <span className="text-xl font-black text-emerald-600">{totLivres}</span>
                </div>
                <div className="bg-blue-50 rounded-lg px-2 py-2 text-center border border-blue-200">
                  <span className="text-xs font-semibold text-blue-700 block mb-1">📦 En cours</span>
                  <span className="text-xl font-black text-blue-600">{totEnCours}</span>
                </div>
                <div className="bg-red-50 rounded-lg px-2 py-2 text-center border border-red-200">
                  <span className="text-xs font-semibold text-red-700 block mb-1">❌ Refusés</span>
                  <span className="text-xl font-black text-red-600">{totRefuses}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-600">Montant à recevoir</p>
                <p className="text-2xl font-black text-emerald-600">
                  {totMontant.toLocaleString('fr-FR')} F
                </p>
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
                  setClotureContext(null);
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
        );
      })()}

      {/* Modal Historique Complet */}
      {showHistoriqueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b z-10">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                <History size={28} className="mr-3 text-blue-600" />
                Historique des Sessions Clôturées
              </h3>
              <button
                onClick={() => {
                  setShowHistoriqueModal(false);
                  setSessionDeleteModal(null);
                  setFiltreHistorique({ livreurId: '', dateDebut: '', dateFin: '' });
                  setSearchHistorique('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={28} />
              </button>
            </div>

            {/* Filtres et Recherche */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Recherche par nom */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Search size={16} className="inline mr-1" />
                    Rechercher un livreur
                  </label>
                  <input
                    type="text"
                    value={searchHistorique}
                    onChange={(e) => setSearchHistorique(e.target.value)}
                    placeholder="Nom du livreur..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Filtre par livreur */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Filter size={16} className="inline mr-1" />
                    Livreur
                  </label>
                  <select
                    value={filtreHistorique.livreurId}
                    onChange={(e) => setFiltreHistorique({ ...filtreHistorique, livreurId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tous les livreurs</option>
                    {livreurs.map((livreur) => (
                      <option key={livreur._id || livreur.id} value={livreur._id || livreur.id}>
                        {livreur.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bouton reset */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFiltreHistorique({ livreurId: '', dateDebut: '', dateFin: '' });
                      setSearchHistorique('');
                    }}
                    className="w-full btn btn-secondary"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </div>

            {/* Liste des sessions */}
            {loadingHistorique ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                    <p className="text-3xl font-black text-blue-600">
                      {historiqueComplet.filter(s => {
                        const matchSearch = searchHistorique === '' || 
                          s.livreur?.nom?.toLowerCase().includes(searchHistorique.toLowerCase());
                        const matchLivreur = filtreHistorique.livreurId === '' || 
                          (s.livreurId || s.livreur_id) === filtreHistorique.livreurId;
                        return matchSearch && matchLivreur;
                      }).length}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-1">Total Colis</p>
                    <p className="text-3xl font-black text-emerald-600">
                      {historiqueComplet.filter(s => {
                        const matchSearch = searchHistorique === '' || 
                          s.livreur?.nom?.toLowerCase().includes(searchHistorique.toLowerCase());
                        const matchLivreur = filtreHistorique.livreurId === '' || 
                          (s.livreurId || s.livreur_id) === filtreHistorique.livreurId;
                        return matchSearch && matchLivreur;
                      }).reduce((sum, s) => sum + (s.nombreLivraisons || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Total Montant</p>
                    <p className="text-2xl font-black text-purple-600">
                      {historiqueComplet.filter(s => {
                        const matchSearch = searchHistorique === '' || 
                          s.livreur?.nom?.toLowerCase().includes(searchHistorique.toLowerCase());
                        const matchLivreur = filtreHistorique.livreurId === '' || 
                          (s.livreurId || s.livreur_id) === filtreHistorique.livreurId;
                        return matchSearch && matchLivreur;
                      }).reduce((sum, s) => sum + (s.montantTotal || 0), 0).toLocaleString('fr-FR')} F
                    </p>
                  </div>
                </div>

                {/* Table des sessions */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Livreur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Clôture
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Colis
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Montant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gestionnaire
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commentaire
                        </th>
                        {canDeleteSessions && (
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historiqueComplet
                        .filter(session => {
                          const matchSearch = searchHistorique === '' || 
                            session.livreur?.nom?.toLowerCase().includes(searchHistorique.toLowerCase());
                          const matchLivreur = filtreHistorique.livreurId === '' || 
                            (session.livreurId || session.livreur_id) === filtreHistorique.livreurId;
                          return matchSearch && matchLivreur;
                        })
                        .sort((a, b) => new Date(b.dateCloture || b.date_cloture) - new Date(a.dateCloture || a.date_cloture))
                        .map((session, index) => (
                          <tr key={session._id || session.id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
                                  {session.livreur?.nom?.charAt(0).toUpperCase() || 'L'}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {session.livreur?.nom || 'Inconnu'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {session.livreur?.telephone || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(session.dateCloture || session.date_cloture)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {session.nombreLivraisons || 0} colis
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {(session.montantTotal || 0).toLocaleString('fr-FR')} F
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {session.gestionnaire?.nom || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                              {session.commentaire || '-'}
                            </td>
                            {canDeleteSessions && (
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  type="button"
                                  onClick={() => setSessionDeleteModal(session)}
                                  className="inline-flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                  title="Supprimer cette session (admin)"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {historiqueComplet.filter(s => {
                  const matchSearch = searchHistorique === '' || 
                    s.livreur?.nom?.toLowerCase().includes(searchHistorique.toLowerCase());
                  const matchLivreur = filtreHistorique.livreurId === '' || 
                    (s.livreurId || s.livreur_id) === filtreHistorique.livreurId;
                  return matchSearch && matchLivreur;
                }).length === 0 && (
                  <div className="text-center py-12">
                    <History size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg font-semibold">Aucune session trouvée</p>
                    <p className="text-gray-400 text-sm mt-2">
                      {searchHistorique || filtreHistorique.livreurId 
                        ? 'Essayez de modifier vos filtres' 
                        : 'Les sessions clôturées apparaîtront ici'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setShowHistoriqueModal(false);
                  setSessionDeleteModal(null);
                  setFiltreHistorique({ livreurId: '', dateDebut: '', dateFin: '' });
                  setSearchHistorique('');
                }}
                className="btn btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression session (admin) */}
      {sessionDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Supprimer la session ?</h3>
            </div>
            <p className="text-gray-600 mb-2 text-sm">
              Cette action est irréversible. Les livraisons liées seront détachées de cette session (elles restent chez le livreur si toujours en cours).
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Session du livreur : <strong>{sessionDeleteModal.livreur?.nom || '—'}</strong>
              {' · '}
              {(sessionDeleteModal.montantTotal || 0).toLocaleString('fr-FR')} F · {sessionDeleteModal.nombreLivraisons || 0} colis
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSessionDeleteModal(null)}
                className="flex-1 btn btn-secondary"
                disabled={deletingSession}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmSupprimerSession}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
                disabled={deletingSession}
              >
                {deletingSession ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Suppression…
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Supprimer
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
