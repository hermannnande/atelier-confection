import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Wallet, X, CheckCircle, Clock, TrendingUp, AlertTriangle,
  Eye, History, Search, Package, RefreshCw, ChevronRight,
  CalendarDays, FilterX, Users, Banknote, BarChart3
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const CaisseLivreurs = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [livreurs, setLivreurs] = useState([]);
  const [sessions, setSessions] = useState({});
  const [historiques, setHistoriques] = useState({});
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState('actives');

  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const [processing, setProcessing] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const [historiqueComplet, setHistoriqueComplet] = useState([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [searchHistorique, setSearchHistorique] = useState('');
  const [filtreHistLivreur, setFiltreHistLivreur] = useState('');
  const [histDateDebut, setHistDateDebut] = useState('');
  const [histDateFin, setHistDateFin] = useState('');

  useEffect(() => {
    if (user && !['gestionnaire', 'administrateur'].includes(user.role)) {
      toast.error('Accès refusé : page réservée aux gestionnaires et administrateurs');
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: usersData } = await api.get('/users?role=livreur');
      const livreursActifs = usersData.users.filter(u => u.actif);
      setLivreurs(livreursActifs);

      const sessionsData = {};
      const historiquesData = {};

      await Promise.all(
        livreursActifs.map(async (livreur) => {
          const lid = livreur._id || livreur.id;
          try {
            const { data: sessionRes } = await api.get(`/sessions-caisse/livreur/${lid}/session-active`);
            if (sessionRes.session) sessionsData[lid] = sessionRes.session;

            const { data: histRes } = await api.get(`/sessions-caisse/livreur/${lid}/historique?limit=5`);
            historiquesData[lid] = histRes.sessions || [];
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
      if (status === 403) {
        toast.error('Accès refusé');
        navigate('/dashboard');
      } else if (message.includes('relation') || message.includes('sessions_caisse')) {
        toast.error('Migration non exécutée : veuillez exécuter la migration SQL');
      } else {
        toast.error(message || 'Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloturerSession = (livreur) => {
    const lid = livreur._id || livreur.id;
    if (!sessions[lid]) {
      toast.error('Aucune session active');
      return;
    }
    setSelectedLivreur(livreur);
    setShowClotureModal(true);
  };

  const confirmCloture = async () => {
    if (!selectedLivreur) return;
    const lid = selectedLivreur._id || selectedLivreur.id;
    const session = sessions[lid];
    try {
      setProcessing(true);
      const { data } = await api.post(`/sessions-caisse/${session._id || session.id}/cloturer`, {
        commentaire: commentaire.trim() || undefined
      });
      toast.success(data.message || 'Session clôturée avec succès !');
      setShowClotureModal(false);
      setCommentaire('');
      setSelectedLivreur(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la clôture');
    } finally {
      setProcessing(false);
    }
  };

  const handleVoirDetails = (livreur) => {
    const lid = livreur._id || livreur.id;
    if (!sessions[lid]) return;
    setSelectedSession(sessions[lid]);
    setShowDetailsModal(true);
  };

  const handleRefresh = async (livreurId) => {
    try {
      const { data } = await api.post(`/sessions-caisse/livreur/${livreurId}/ajouter-livraisons`);
      if (data.montantAjoute && data.montantAjoute > 0) {
        toast.success(`${data.message} (+${data.montantAjoute.toLocaleString('fr-FR')} F)`);
        fetchData();
      } else {
        toast.success(data.message || 'Aucune nouvelle livraison');
      }
    } catch (error) {
      const msg = error.response?.data?.message || '';
      if (msg.includes('Aucune')) {
        toast.success('Pas de nouvelle livraison à ajouter');
      } else {
        toast.error(msg || 'Erreur lors du rafraîchissement');
      }
    }
  };

  const loadHistorique = async () => {
    setLoadingHistorique(true);
    try {
      const { data } = await api.get('/sessions-caisse?statut=cloturee');
      setHistoriqueComplet(data.sessions || []);
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoadingHistorique(false);
    }
  };

  useEffect(() => {
    if (activeView === 'historique' && historiqueComplet.length === 0) {
      loadHistorique();
    }
  }, [activeView]);

  const clearHistFilters = () => {
    setSearchHistorique('');
    setFiltreHistLivreur('');
    setHistDateDebut('');
    setHistDateFin('');
  };

  const hasHistFilters = searchHistorique || filtreHistLivreur || histDateDebut || histDateFin;

  const filteredHistorique = useMemo(() => {
    return historiqueComplet
      .filter(s => {
        if (searchHistorique) {
          const q = searchHistorique.toLowerCase();
          if (!s.livreur?.nom?.toLowerCase().includes(q)) return false;
        }
        if (filtreHistLivreur && (s.livreurId || s.livreur_id) !== filtreHistLivreur) return false;
        const d = new Date(s.dateCloture || s.date_cloture);
        if (histDateDebut && d < new Date(histDateDebut)) return false;
        if (histDateFin && d > new Date(histDateFin + 'T23:59:59')) return false;
        return true;
      })
      .sort((a, b) => new Date(b.dateCloture || b.date_cloture) - new Date(a.dateCloture || a.date_cloture));
  }, [historiqueComplet, searchHistorique, filtreHistLivreur, histDateDebut, histDateFin]);

  const histStats = useMemo(() => ({
    sessions: filteredHistorique.length,
    colis: filteredHistorique.reduce((s, h) => s + (h.nombreLivraisons || 0), 0),
    montant: filteredHistorique.reduce((s, h) => s + (h.montantTotal || 0), 0),
  }), [filteredHistorique]);

  const livreursAvecSession = livreurs.filter(l => {
    const lid = l._id || l.id;
    return sessions[lid] && sessions[lid].nombreLivraisons > 0;
  });
  const livreursSansSession = livreurs.filter(l => {
    const lid = l._id || l.id;
    return !sessions[lid] || sessions[lid].nombreLivraisons === 0;
  });

  const totalActif = livreursAvecSession.reduce((sum, l) => {
    const s = sessions[l._id || l.id];
    return sum + (s?.montantTotal || 0);
  }, 0);

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-200/30 rounded-full" />
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin absolute top-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-full px-2 sm:px-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-2xl shadow-lg">
            <Wallet className="text-white" size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Caisse Livreurs
            </h1>
            <p className="text-sm text-gray-500">Gestion des sessions de paiement</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveView('actives')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeView === 'actives' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} />
          Sessions actives
          {livreursAvecSession.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              activeView === 'actives' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
            }`}>
              {livreursAvecSession.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveView('historique')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeView === 'historique' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={16} />
          Historique
        </button>
      </div>

      {/* ============ VUE SESSIONS ACTIVES ============ */}
      {activeView === 'actives' && (
        <div className="space-y-5">
          {/* Resume global */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 uppercase">Sessions actives</p>
              <p className="text-3xl font-black text-emerald-700">{livreursAvecSession.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-bold text-blue-600 uppercase">Livreurs total</p>
              <p className="text-3xl font-black text-blue-700">{livreurs.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <p className="text-xs font-bold text-purple-600 uppercase">Montant en cours</p>
              <p className="text-2xl sm:text-3xl font-black text-purple-700 truncate">{totalActif.toLocaleString('fr-FR')} F</p>
            </div>
          </div>

          {/* Info si aucune session */}
          {livreursAvecSession.length === 0 && livreurs.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-900 text-sm">Aucune session active</p>
                <p className="text-xs text-blue-700 mt-1">
                  Les sessions se créent automatiquement quand les livreurs marquent des colis comme "Livrée".
                </p>
              </div>
            </div>
          )}

          {/* Livreurs avec session active */}
          {livreursAvecSession.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-400 uppercase">Sessions en cours</h2>
              {livreursAvecSession.map((livreur) => {
                const lid = livreur._id || livreur.id;
                const session = sessions[lid];
                return (
                  <div key={lid} className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
                    <div className="p-4">
                      {/* Header livreur */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow">
                            {livreur.nom.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{livreur.nom}</h3>
                            <p className="text-xs text-gray-400">{livreur.telephone} · depuis {formatDateShort(session.dateDebut || session.date_debut)}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span>
                      </div>

                      {/* Compteurs */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase">Livrés</p>
                          <p className="text-xl font-black text-emerald-700">{session.nombreLivres || 0}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] font-bold text-blue-600 uppercase">En cours</p>
                          <p className="text-xl font-black text-blue-700">{session.nombreEnCours || 0}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] font-bold text-red-600 uppercase">Refusés</p>
                          <p className="text-xl font-black text-red-700">{session.nombreRefuses || 0}</p>
                        </div>
                      </div>

                      {/* Montant */}
                      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-3 flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-emerald-100">Montant à recevoir</span>
                        <span className="text-xl font-black text-white">{(session.montantTotal || 0).toLocaleString('fr-FR')} F</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVoirDetails(livreur)}
                          className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all flex items-center gap-1.5 text-sm font-semibold"
                        >
                          <Eye size={16} /> Détails
                        </button>
                        <button
                          onClick={() => handleRefresh(lid)}
                          className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all flex items-center gap-1.5 text-sm font-semibold"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={() => handleCloturerSession(livreur)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow"
                        >
                          <CheckCircle size={16} /> Clôturer la session
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Livreurs sans session */}
          {livreursSansSession.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-400 uppercase">Sans session active</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {livreursSansSession.map((livreur) => {
                  const lid = livreur._id || livreur.id;
                  const hist = historiques[lid] || [];
                  return (
                    <div key={lid} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                          {livreur.nom.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-700 truncate">{livreur.nom}</h3>
                          <p className="text-xs text-gray-400 truncate">{livreur.telephone}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRefresh(lid)}
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs mb-3"
                      >
                        <RefreshCw size={14} /> Vérifier nouvelles livraisons
                      </button>

                      {hist.length > 0 && (
                        <div className="border-t border-gray-50 pt-2 space-y-1.5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Dernières sessions</p>
                          {hist.slice(0, 3).map((s, i) => (
                            <div key={s._id || s.id || i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                              <span className="text-gray-500">{s.nombreLivraisons} colis · {formatDateShort(s.dateCloture || s.date_cloture)}</span>
                              <span className="font-bold text-gray-700">{(s.montantTotal || 0).toLocaleString('fr-FR')} F</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ VUE HISTORIQUE ============ */}
      {activeView === 'historique' && (
        <div className="space-y-4">
          {/* Stats historique */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-bold text-blue-600 uppercase">Sessions</p>
              <p className="text-3xl font-black text-blue-700">{histStats.sessions}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 uppercase">Colis total</p>
              <p className="text-3xl font-black text-emerald-700">{histStats.colis}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <p className="text-xs font-bold text-purple-600 uppercase">Montant total</p>
              <p className="text-2xl sm:text-3xl font-black text-purple-700 truncate">{histStats.montant.toLocaleString('fr-FR')} F</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchHistorique}
                  onChange={(e) => setSearchHistorique(e.target.value)}
                  className="input pl-9 text-sm"
                  placeholder="Rechercher un livreur..."
                />
              </div>
              <select
                value={filtreHistLivreur}
                onChange={(e) => setFiltreHistLivreur(e.target.value)}
                className="input text-sm w-auto min-w-[140px]"
              >
                <option value="">Tous les livreurs</option>
                {livreurs.map((l) => (
                  <option key={l._id || l.id} value={l._id || l.id}>{l.nom}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  <CalendarDays size={11} className="inline mr-1" />Date début
                </label>
                <input type="date" value={histDateDebut} onChange={(e) => setHistDateDebut(e.target.value)} className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  <CalendarDays size={11} className="inline mr-1" />Date fin
                </label>
                <input type="date" value={histDateFin} onChange={(e) => setHistDateFin(e.target.value)} className="input text-sm" />
              </div>
              {hasHistFilters && (
                <div className="flex items-end">
                  <button onClick={clearHistFilters} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                    <FilterX size={14} /> Effacer les filtres
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Liste historique */}
          {loadingHistorique ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredHistorique.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
              <History className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-lg font-bold text-gray-700">Aucune session trouvée</p>
              <p className="text-sm text-gray-400 mt-1">
                {hasHistFilters ? 'Modifiez vos filtres pour voir plus de résultats' : 'Les sessions clôturées apparaîtront ici'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredHistorique.map((session, index) => (
                <div key={session._id || session.id || index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {session.livreur?.nom?.charAt(0).toUpperCase() || 'L'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{session.livreur?.nom || 'Inconnu'}</p>
                        <p className="text-xs text-gray-400 truncate">
                          Clôturée le {formatDate(session.dateCloture || session.date_cloture)}
                          {session.gestionnaire?.nom && ` · par ${session.gestionnaire.nom}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-gray-900">{(session.montantTotal || 0).toLocaleString('fr-FR')} F</p>
                      <p className="text-xs text-gray-400">{session.nombreLivraisons || 0} colis</p>
                    </div>
                  </div>
                  {session.commentaire && (
                    <div className="mt-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 truncate">{session.commentaire}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bouton recharger */}
          <div className="text-center pt-2">
            <button
              onClick={loadHistorique}
              disabled={loadingHistorique}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 mx-auto"
            >
              <RefreshCw size={14} className={loadingHistorique ? 'animate-spin' : ''} />
              Actualiser l'historique
            </button>
          </div>
        </div>
      )}

      {/* ============ MODALS ============ */}

      {/* Modal Clôture */}
      {showClotureModal && selectedLivreur && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowClotureModal(false); setCommentaire(''); setSelectedLivreur(null); }}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 p-2 rounded-lg"><CheckCircle className="text-emerald-600" size={20} /></div>
                <h2 className="text-lg font-bold text-gray-900">Clôturer la session</h2>
              </div>
              <button onClick={() => { setShowClotureModal(false); setCommentaire(''); setSelectedLivreur(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Recap */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <p className="font-bold text-gray-800 mb-3">{selectedLivreur.nom}</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-[10px] font-bold text-emerald-600">Livrés</p>
                    <p className="text-xl font-black text-emerald-700">{sessions[selectedLivreur._id || selectedLivreur.id]?.nombreLivres || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-[10px] font-bold text-blue-600">En cours</p>
                    <p className="text-xl font-black text-blue-700">{sessions[selectedLivreur._id || selectedLivreur.id]?.nombreEnCours || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-[10px] font-bold text-red-600">Refusés</p>
                    <p className="text-xl font-black text-red-700">{sessions[selectedLivreur._id || selectedLivreur.id]?.nombreRefuses || 0}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-100">Montant à recevoir</span>
                  <span className="text-xl font-black text-white">{(sessions[selectedLivreur._id || selectedLivreur.id]?.montantTotal || 0).toLocaleString('fr-FR')} F</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Commentaire (optionnel)</label>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  rows="2"
                  placeholder="Ex: Argent reçu en espèces..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowClotureModal(false); setCommentaire(''); setSelectedLivreur(null); }}
                  className="flex-1 btn btn-secondary"
                  disabled={processing}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmCloture}
                  disabled={processing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Traitement...</>
                  ) : (
                    <><CheckCircle size={16} /> Confirmer</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails colis */}
      {showDetailsModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDetailsModal(false); setSelectedSession(null); }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-purple-100 p-2 rounded-lg"><Package className="text-purple-600" size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Détails de la session</h2>
                  <p className="text-xs text-gray-400">{selectedSession.nombreLivraisons || 0} colis · {(selectedSession.montantTotal || 0).toLocaleString('fr-FR')} F</p>
                </div>
              </div>
              <button onClick={() => { setShowDetailsModal(false); setSelectedSession(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2.5">
              {selectedSession.livraisons && selectedSession.livraisons.length > 0 ? (
                selectedSession.livraisons.map((livraison, index) => {
                  const commande = livraison.commande || {};
                  const isLivree = livraison.statut === 'livree';
                  const isRefusee = livraison.statut === 'refusee';
                  return (
                    <div
                      key={livraison._id || livraison.id || index}
                      className={`rounded-xl p-3 border ${
                        isLivree ? 'bg-emerald-50 border-emerald-100' : isRefusee ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{commande.numeroCommande || 'N/A'}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {commande.client?.nom || 'N/A'} · {commande.client?.ville || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isLivree ? 'bg-emerald-200 text-emerald-800' : isRefusee ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800'
                          }`}>
                            {isLivree ? 'Livrée' : isRefusee ? 'Refusée' : 'En cours'}
                          </span>
                          <p className="text-sm font-black text-gray-800 mt-0.5">{(commande.prix || 0).toLocaleString('fr-FR')} F</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-400 py-8">Aucun colis dans cette session</p>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => { setShowDetailsModal(false); setSelectedSession(null); }}
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
