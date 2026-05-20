import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import {
  Users,
  Package,
  CheckCircle,
  Calendar,
  XCircle,
  Wallet,
  X,
  Phone,
  MapPin,
  Search,
  Loader2,
  RotateCcw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

const STATUTS_ACTIFS = ['en_cours', 'reportee', 'livree']; // colis encore sur le livreur ou argent dû

const Livreurs = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [livreurs, setLivreurs] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user && !['gestionnaire', 'administrateur'].includes(user.role)) {
      toast.error('⛔ Accès refusé : Page réservée aux gestionnaires et administrateurs');
      navigate('/dashboard');
      return;
    }
    fetchData();
    const interval = setInterval(() => fetchData(true), 15000); // refresh silencieux
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [usersRes, livraisonsRes] = await Promise.all([
        api.get('/users?role=livreur'),
        api.get('/livraisons'),
      ]);
      const livreursActifs = (usersRes.data.users || []).filter((u) => u.actif);
      setLivreurs(livreursActifs);
      setLivraisons(livraisonsRes.data.livraisons || []);
    } catch (error) {
      if (!silent) toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Grouper les livraisons par livreur
  const livraisonsByLivreur = useMemo(() => {
    const map = new Map();
    for (const liv of livraisons) {
      const lid = liv.livreur?._id || liv.livreur?.id || liv.livreur_id;
      if (!lid) continue;
      if (!map.has(lid)) map.set(lid, []);
      map.get(lid).push(liv);
    }
    return map;
  }, [livraisons]);

  const getStatsForLivreur = (lid) => {
    const all = livraisonsByLivreur.get(lid) || [];
    const enCours = all.filter((l) => l.statut === 'en_cours');
    const reportees = all.filter((l) => l.statut === 'reportee');
    const livreesNonPayees = all.filter((l) => l.statut === 'livree' && !l.paiementRecu);
    const refuseesNonRetournees = all.filter(
      (l) => l.statut === 'refusee' && !l.verifieParGestionnaire
    );
    const argentDu = livreesNonPayees.reduce((sum, l) => sum + (l.commande?.prix || 0), 0);

    return {
      sur_lui: enCours.length + reportees.length,
      enCours: enCours.length,
      reportees: reportees.length,
      livreesNonPayees: livreesNonPayees.length,
      refuseesNonRetournees: refuseesNonRetournees.length,
      argentDu,
      total: all.length,
    };
  };

  // Stats globales
  const statsGlobales = useMemo(() => {
    let colisDehors = 0;
    let argentDu = 0;
    for (const liv of livraisons) {
      if (liv.statut === 'en_cours' || liv.statut === 'reportee') colisDehors++;
      if (liv.statut === 'livree' && !liv.paiementRecu) argentDu += liv.commande?.prix || 0;
    }
    return { colisDehors, argentDu };
  }, [livraisons]);

  const livreursFiltres = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return livreurs;
    return livreurs.filter(
      (l) =>
        l.nom?.toLowerCase().includes(term) ||
        l.telephone?.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term)
    );
  }, [livreurs, searchTerm]);

  const livraisonsDuLivreurSelectionne = useMemo(() => {
    if (!selectedLivreur) return [];
    const lid = selectedLivreur._id || selectedLivreur.id;
    return livraisonsByLivreur.get(lid) || [];
  }, [selectedLivreur, livraisonsByLivreur]);

  const groupedSelectedLivreur = useMemo(() => {
    const enCours = [];
    const reportees = [];
    const livreesNonPayees = [];
    const refuseesNonRetournees = [];
    for (const l of livraisonsDuLivreurSelectionne) {
      if (l.statut === 'en_cours') enCours.push(l);
      else if (l.statut === 'reportee') reportees.push(l);
      else if (l.statut === 'livree' && !l.paiementRecu) livreesNonPayees.push(l);
      else if (l.statut === 'refusee' && !l.verifieParGestionnaire) refuseesNonRetournees.push(l);
    }
    return { enCours, reportees, livreesNonPayees, refuseesNonRetournees };
  }, [livraisonsDuLivreurSelectionne]);

  const montantSelectionne = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    return groupedSelectedLivreur.livreesNonPayees
      .filter((l) => selectedIds.has(l._id || l.id))
      .reduce((sum, l) => sum + (l.commande?.prix || 0), 0);
  }, [selectedIds, groupedSelectedLivreur]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const all = groupedSelectedLivreur.livreesNonPayees.map((l) => l._id || l.id);
    setSelectedIds(new Set(all));
  };

  const unselectAll = () => setSelectedIds(new Set());

  const handleOpenLivreur = (livreur) => {
    setSelectedLivreur(livreur);
    setSelectedIds(new Set());
  };

  const handleDeposerArgent = async () => {
    if (selectedIds.size === 0) {
      toast.error('Sélectionne au moins une livraison');
      return;
    }
    if (!confirm(`Confirmer le dépôt de ${montantSelectionne.toLocaleString('fr-FR')} F pour ${selectedIds.size} livraison(s) ?`)) {
      return;
    }
    setProcessing(true);
    try {
      const livraisonIds = Array.from(selectedIds);
      const { data } = await api.post('/livraisons/marquer-paiement-recu-batch', {
        livraisonIds,
      });
      toast.success(`${data.nombreLivraisons} livraison(s) payée(s) — ${(data.montantTotal || 0).toLocaleString('fr-FR')} F`);
      setSelectedIds(new Set());
      await fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du dépôt');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmerRetourRefuse = async (livraisonId) => {
    const commentaire = prompt('Commentaire (optionnel) :') || '';
    setProcessing(true);
    try {
      await api.post(`/livraisons/${livraisonId}/confirmer-retour`, { commentaire });
      toast.success('Retour confirmé, stock mis à jour');
      await fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleSupprimerOrpheline = async (livraisonId) => {
    if (!confirm('⚠️ Supprimer définitivement cette livraison orpheline ?\n\nElle pointe vers une commande qui n\'existe plus.')) {
      return;
    }
    setProcessing(true);
    try {
      await api.delete(`/livraisons/${livraisonId}`);
      toast.success('Livraison orpheline supprimée');
      await fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden max-w-full">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 sm:p-4 rounded-2xl shadow-lg flex-shrink-0">
            <Users className="text-white" size={28} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent truncate">
              Livreurs
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium truncate">
              Suivi colis + dépôt d'argent
            </p>
          </div>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="stat-card bg-gradient-to-br from-blue-50 to-indigo-50">
          <p className="text-xs sm:text-sm font-semibold text-blue-700 uppercase truncate">
            📦 Colis dehors
          </p>
          <p className="text-3xl sm:text-4xl font-black text-blue-900">{statsGlobales.colisDehors}</p>
          <p className="text-xs text-blue-600 mt-1">chez les livreurs</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-emerald-50 to-teal-50">
          <p className="text-xs sm:text-sm font-semibold text-emerald-700 uppercase truncate">
            💰 Argent dû
          </p>
          <p className="text-3xl sm:text-4xl font-black text-emerald-900">
            {statsGlobales.argentDu.toLocaleString('fr-FR')} F
          </p>
          <p className="text-xs text-emerald-600 mt-1">à déposer</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="stat-card !p-3 sm:!p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un livreur (nom, téléphone, email)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 pr-10 text-sm sm:text-base w-full"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Effacer la recherche"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Cartes livreurs */}
      {livreursFiltres.length === 0 ? (
        <div className="stat-card text-center py-12">
          <Users className="mx-auto text-gray-400 mb-3" size={40} />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Aucun livreur trouvé</h3>
          <p className="text-sm text-gray-600">
            {searchTerm ? 'Essaie une autre recherche' : 'Aucun livreur actif dans le système'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {livreursFiltres.map((livreur) => {
            const lid = livreur._id || livreur.id;
            const stats = getStatsForLivreur(lid);
            const aDeFait =
              stats.sur_lui === 0 &&
              stats.livreesNonPayees === 0 &&
              stats.refuseesNonRetournees === 0;
            return (
              <button
                key={lid}
                type="button"
                onClick={() => handleOpenLivreur(livreur)}
                className={`stat-card text-left hover:shadow-xl transition-all cursor-pointer ${
                  aDeFait
                    ? 'border-l-4 border-emerald-500'
                    : stats.argentDu > 0
                    ? 'border-l-4 border-amber-500'
                    : 'border-l-4 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0">
                    {livreur.nom?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 truncate">{livreur.nom}</h3>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <Phone size={11} />
                      {livreur.telephone || '—'}
                    </p>
                  </div>
                  {aDeFait && (
                    <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold flex-shrink-0">
                      ✓ À jour
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-blue-600 font-semibold uppercase text-[10px]">📦 Sur lui</p>
                    <p className="text-2xl font-black text-blue-900">{stats.sur_lui}</p>
                    {stats.reportees > 0 && (
                      <p className="text-[10px] text-orange-600 font-bold">{stats.reportees} reporté(s)</p>
                    )}
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="text-emerald-600 font-semibold uppercase text-[10px]">✅ Livrées</p>
                    <p className="text-2xl font-black text-emerald-900">{stats.livreesNonPayees}</p>
                    <p className="text-[10px] text-emerald-700 font-bold truncate">
                      {stats.argentDu.toLocaleString('fr-FR')} F
                    </p>
                  </div>
                </div>

                {stats.refuseesNonRetournees > 0 && (
                  <div className="mt-2 bg-red-50 rounded-lg p-2 text-xs">
                    <p className="text-red-700 font-bold flex items-center gap-1">
                      <XCircle size={12} />
                      {stats.refuseesNonRetournees} refusée(s) à confirmer
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Modal détail livreur */}
      {selectedLivreur && (
        <LivreurDetailModal
          livreur={selectedLivreur}
          grouped={groupedSelectedLivreur}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          selectAll={selectAll}
          unselectAll={unselectAll}
          montantSelectionne={montantSelectionne}
          onClose={() => {
            setSelectedLivreur(null);
            setSelectedIds(new Set());
          }}
          onDeposer={handleDeposerArgent}
          onConfirmerRetour={handleConfirmerRetourRefuse}
          onSupprimerOrpheline={handleSupprimerOrpheline}
          processing={processing}
          userRole={user?.role}
        />
      )}
    </div>
  );
};

function LivreurDetailModal({
  livreur,
  grouped,
  selectedIds,
  toggleSelect,
  selectAll,
  unselectAll,
  montantSelectionne,
  onClose,
  onDeposer,
  onConfirmerRetour,
  onSupprimerOrpheline,
  processing,
  userRole,
}) {
  const totalLivreesNonPayees = grouped.livreesNonPayees.reduce(
    (sum, l) => sum + (l.commande?.prix || 0),
    0
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => !processing && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {livreur.nom?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black truncate">{livreur.nom}</h2>
              <p className="text-sm text-emerald-50 truncate flex items-center gap-1">
                <Phone size={12} />
                {livreur.telephone || '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !processing && onClose()}
            disabled={processing}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 flex-1">
          {/* SECTION 1 - À LIVRER */}
          <section>
            <h3 className="text-sm font-black text-blue-700 uppercase mb-2 flex items-center gap-2">
              <Package size={16} />
              À LIVRER ({grouped.enCours.length})
            </h3>
            {grouped.enCours.length === 0 ? (
              <p className="text-xs text-gray-500 italic px-2">Aucun colis à livrer</p>
            ) : (
              <div className="space-y-2">
                {grouped.enCours.map((l) => (
                  <LivraisonRow
                    key={l._id || l.id}
                    livraison={l}
                    variant="en_cours"
                    onSupprimerOrpheline={onSupprimerOrpheline}
                    processing={processing}
                    userRole={userRole}
                  />
                ))}
              </div>
            )}
          </section>

          {/* SECTION 2 - REPORTÉES */}
          {grouped.reportees.length > 0 && (
            <section>
              <h3 className="text-sm font-black text-orange-700 uppercase mb-2 flex items-center gap-2">
                <Calendar size={16} />
                REPORTÉES ({grouped.reportees.length})
              </h3>
              <div className="space-y-2">
                {grouped.reportees.map((l) => (
                  <LivraisonRow
                    key={l._id || l.id}
                    livraison={l}
                    variant="reportee"
                    onSupprimerOrpheline={onSupprimerOrpheline}
                    processing={processing}
                    userRole={userRole}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 3 - LIVRÉES NON PAYÉES (sélection) */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-emerald-700 uppercase flex items-center gap-2">
                <CheckCircle size={16} />
                LIVRÉES — ARGENT DÛ ({grouped.livreesNonPayees.length})
              </h3>
              {grouped.livreesNonPayees.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[10px] sm:text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Tout cocher
                  </button>
                  <span className="text-xs text-gray-400">·</span>
                  <button
                    type="button"
                    onClick={unselectAll}
                    className="text-[10px] sm:text-xs font-bold text-gray-600 hover:underline"
                  >
                    Décocher
                  </button>
                </div>
              )}
            </div>

            {grouped.livreesNonPayees.length === 0 ? (
              <p className="text-xs text-gray-500 italic px-2">Aucun argent en attente</p>
            ) : (
              <>
                <div className="space-y-2">
                  {grouped.livreesNonPayees.map((l) => {
                    const id = l._id || l.id;
                    const checked = selectedIds.has(id);
                    return (
                      <LivraisonRow
                        key={id}
                        livraison={l}
                        variant="livree"
                        checked={checked}
                        onToggle={() => toggleSelect(id)}
                        onSupprimerOrpheline={onSupprimerOrpheline}
                        processing={processing}
                        userRole={userRole}
                      />
                    );
                  })}
                </div>

                {/* Récap dépôt */}
                <div className="mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 sm:p-4 border-2 border-emerald-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase">
                        Sélectionné
                      </p>
                      <p className="text-2xl font-black text-emerald-900">
                        {selectedIds.size} / {grouped.livreesNonPayees.length} ·{' '}
                        <span className="text-emerald-700">
                          {montantSelectionne.toLocaleString('fr-FR')} F
                        </span>
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        Total dû : {totalLivreesNonPayees.toLocaleString('fr-FR')} F
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onDeposer}
                      disabled={selectedIds.size === 0 || processing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
                    >
                      <Wallet size={18} />
                      <span>{processing ? 'Dépôt...' : 'DÉPOSER L\'ARGENT'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* SECTION 4 - REFUSÉES À CONFIRMER (rare car automatique maintenant) */}
          {grouped.refuseesNonRetournees.length > 0 && (
            <section>
              <h3 className="text-sm font-black text-red-700 uppercase mb-2 flex items-center gap-2">
                <XCircle size={16} />
                REFUSÉES À CONFIRMER ({grouped.refuseesNonRetournees.length})
              </h3>
              <div className="space-y-2">
                {grouped.refuseesNonRetournees.map((l) => (
                  <LivraisonRow
                    key={l._id || l.id}
                    livraison={l}
                    variant="refusee"
                    onConfirmerRetour={() => onConfirmerRetour(l._id || l.id)}
                    processing={processing}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Note bas de page */}
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-bold mb-1">💡 Comment ça marche :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Le livreur marque ses colis depuis son interface (Livrée / Reportée / Refusée)</li>
              <li>Les refus déclenchent un retour au stock automatique</li>
              <li>Coche les livraisons dont l'argent est déposé, puis clique <strong>DÉPOSER L'ARGENT</strong></li>
              <li>Les colis reportés restent chez le livreur pour le lendemain</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function LivraisonRow({
  livraison,
  variant,
  checked,
  onToggle,
  onConfirmerRetour,
  onSupprimerOrpheline,
  processing,
  userRole,
}) {
  const commande = livraison.commande;
  const isOrphan = !commande || !commande.numeroCommande;

  // Cas spécial : livraison orpheline (commande introuvable ou supprimée)
  if (isOrphan) {
    const livraisonId = livraison._id || livraison.id;
    return (
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 transition-all">
        <div className="flex items-start gap-3">
          {variant === 'livree' && (
            <input
              type="checkbox"
              checked={checked || false}
              onChange={onToggle}
              className="mt-1 w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
              disabled
              title="Désactivé : commande introuvable"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="text-red-600 flex-shrink-0" size={16} />
              <p className="font-bold text-sm text-red-800">Livraison orpheline</p>
            </div>
            <p className="text-xs text-red-700">
              La commande liée n'existe plus en base (supprimée ou ID corrompu).
            </p>
            <p className="text-[10px] text-red-600 mt-1 font-mono break-all">
              Livraison ID : {livraisonId?.slice(0, 13) || '?'}…
              {livraison.commande_id && (
                <>
                  <br />
                  Commande ID : {String(livraison.commande_id).slice(0, 13)}…
                </>
              )}
            </p>
            {livraison.adresseLivraison?.ville && (
              <p className="text-[11px] text-red-700 mt-1">
                Ville stockée : {livraison.adresseLivraison.ville}
              </p>
            )}
          </div>
        </div>

        {userRole === 'administrateur' && onSupprimerOrpheline && (
          <button
            type="button"
            onClick={() => onSupprimerOrpheline(livraisonId)}
            disabled={processing}
            className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Trash2 size={12} />
            Supprimer cette livraison
          </button>
        )}
      </div>
    );
  }

  // Cas normal
  const clientNom = commande.client?.nom || (typeof commande.client === 'string' ? commande.client : '—');
  const clientVille =
    commande.client?.ville ||
    livraison.adresseLivraison?.ville ||
    '—';
  const clientContact = commande.client?.contact || '';
  const motif = livraison.motifRefus || livraison.commentaireGestionnaire;

  const borderColor = {
    en_cours: 'border-blue-200 bg-blue-50/40',
    reportee: 'border-orange-200 bg-orange-50/40',
    livree: checked
      ? 'border-emerald-400 bg-emerald-50 shadow-sm'
      : 'border-gray-200 bg-white hover:border-emerald-300',
    refusee: 'border-red-200 bg-red-50/40',
  }[variant];

  return (
    <div className={`rounded-lg border-2 p-3 ${borderColor} transition-all`}>
      <div className="flex items-start gap-3">
        {variant === 'livree' && (
          <input
            type="checkbox"
            checked={checked || false}
            onChange={onToggle}
            className="mt-1 w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-bold text-sm text-gray-900 truncate">
              {commande.numeroCommande || '—'}
            </p>
            <p className="font-black text-sm text-gray-900 flex-shrink-0">
              {(commande.prix || 0).toLocaleString('fr-FR')} F
            </p>
          </div>
          <p className="text-xs text-gray-700 truncate">
            <span className="font-semibold">{clientNom}</span>
            {clientVille && (
              <>
                <span className="text-gray-400"> · </span>
                <span className="inline-flex items-center gap-0.5">
                  <MapPin size={10} />
                  {clientVille}
                </span>
              </>
            )}
          </p>
          {commande.modele && (
            <p className="text-[11px] text-gray-500 truncate">
              {typeof commande.modele === 'string' ? commande.modele : commande.modele.nom} · {commande.taille} · {commande.couleur}
            </p>
          )}
          {clientContact && variant === 'en_cours' && (
            <a
              href={`tel:${clientContact}`}
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              <Phone size={10} />
              {clientContact}
            </a>
          )}
          {motif && (
            <p className="text-[11px] text-gray-600 italic mt-1 line-clamp-2">
              📝 {motif}
            </p>
          )}
        </div>
      </div>

      {variant === 'refusee' && onConfirmerRetour && (
        <button
          type="button"
          onClick={onConfirmerRetour}
          disabled={processing}
          className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <RotateCcw size={12} />
          Confirmer retour stock
        </button>
      )}
    </div>
  );
}

export default Livreurs;
