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
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from 'lucide-react';

// ─── helpers date ────────────────────────────────────────────────────────────
function getJourKey(dateString) {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function todayKey() {
  return getJourKey(new Date().toISOString());
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getJourKey(d.toISOString());
}

function startOfWeekKey() {
  const d = new Date();
  const day = d.getDay(); // 0 = dim, 1 = lun ...
  const diff = (day === 0 ? -6 : 1) - day; // lundi de cette semaine
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return getJourKey(d.toISOString());
}

function formatJourLong(jourKey) {
  if (!jourKey) return '—';
  const d = new Date(`${jourKey}T12:00:00`);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatJourCourt(jourKey) {
  if (!jourKey) return '—';
  const d = new Date(`${jourKey}T12:00:00`);
  const today = todayKey();
  const yesterday = yesterdayKey();
  if (jourKey === today) return "Aujourd'hui";
  if (jourKey === yesterday) return 'Hier';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ─── composant principal ─────────────────────────────────────────────────────
const Livreurs = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [livreurs, setLivreurs] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [selectedTournee, setSelectedTournee] = useState(null); // { livreurId, jourKey, livreur, jourLabel }
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dateFilter, setDateFilter] = useState('today'); // today | yesterday | week | all | custom
  const [customDate, setCustomDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // desc | asc

  useEffect(() => {
    if (user && !['gestionnaire', 'administrateur'].includes(user.role)) {
      toast.error('⛔ Accès refusé : Page réservée aux gestionnaires et administrateurs');
      navigate('/dashboard');
      return;
    }
    fetchData();
    const interval = setInterval(() => fetchData(true), 15000);
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

  // ─── construction des tournées (livreur × jour) ────────────────────────────
  const tournees = useMemo(() => {
    const map = new Map(); // key = `${livreurId}|${jourKey}`
    for (const liv of livraisons) {
      const lid = liv.livreur?._id || liv.livreur?.id || liv.livreur_id;
      if (!lid) continue;
      const jourKey = getJourKey(liv.dateTournee || liv.dateAssignation || liv.date_tournee || liv.date_assignation);
      if (!jourKey) continue;
      const key = `${lid}|${jourKey}`;
      if (!map.has(key)) {
        const livreurObj = liv.livreur || livreurs.find((l) => (l._id || l.id) === lid) || { _id: lid };
        map.set(key, {
          key,
          livreurId: lid,
          livreur: livreurObj,
          jourKey,
          livraisons: [],
        });
      }
      map.get(key).livraisons.push(liv);
    }
    return Array.from(map.values());
  }, [livraisons, livreurs]);

  // ─── statistiques d'une tournée ────────────────────────────────────────────
  const getStatsTournee = (livs) => {
    const enCours = livs.filter((l) => l.statut === 'en_cours');
    const reportees = livs.filter((l) => l.statut === 'reportee');
    const livreesNonPayees = livs.filter((l) => l.statut === 'livree' && !l.paiementRecu);
    const livreesPayees = livs.filter((l) => l.statut === 'livree' && l.paiementRecu);
    const refusees = livs.filter((l) => l.statut === 'refusee' || l.statut === 'retournee');
    const argentDu = livreesNonPayees.reduce((s, l) => s + (l.commande?.prix || 0), 0);
    const argentDepose = livreesPayees.reduce((s, l) => s + (l.commande?.prix || 0), 0);
    return {
      total: livs.length,
      enCours: enCours.length,
      reportees: reportees.length,
      livreesNonPayees: livreesNonPayees.length,
      livreesPayees: livreesPayees.length,
      refusees: refusees.length,
      argentDu,
      argentDepose,
      soldee:
        enCours.length === 0 &&
        reportees.length === 0 &&
        livreesNonPayees.length === 0 &&
        livs.filter((l) => l.statut === 'refusee' && !l.verifieParGestionnaire).length === 0,
    };
  };

  // ─── stats globales ────────────────────────────────────────────────────────
  const statsGlobales = useMemo(() => {
    let colisDehors = 0;
    let argentDu = 0;
    for (const liv of livraisons) {
      if (liv.statut === 'en_cours' || liv.statut === 'reportee') colisDehors++;
      if (liv.statut === 'livree' && !liv.paiementRecu) argentDu += liv.commande?.prix || 0;
    }
    return { colisDehors, argentDu };
  }, [livraisons]);

  // ─── filtres date + recherche ──────────────────────────────────────────────
  const tourneesFiltres = useMemo(() => {
    const today = todayKey();
    const yesterday = yesterdayKey();
    const weekStart = startOfWeekKey();
    const term = searchTerm.trim().toLowerCase();

    let result = tournees.filter((t) => {
      // filtre date
      if (dateFilter === 'today' && t.jourKey !== today) return false;
      if (dateFilter === 'yesterday' && t.jourKey !== yesterday) return false;
      if (dateFilter === 'week' && t.jourKey < weekStart) return false;
      if (dateFilter === 'custom' && customDate && t.jourKey !== customDate) return false;

      // filtre livreur
      if (term) {
        const nom = (t.livreur?.nom || '').toLowerCase();
        const tel = (t.livreur?.telephone || '').toLowerCase();
        if (!nom.includes(term) && !tel.includes(term)) return false;
      }
      return true;
    });

    // tri par date puis nom livreur
    result.sort((a, b) => {
      if (a.jourKey !== b.jourKey) {
        return sortOrder === 'desc' ? b.jourKey.localeCompare(a.jourKey) : a.jourKey.localeCompare(b.jourKey);
      }
      return (a.livreur?.nom || '').localeCompare(b.livreur?.nom || '');
    });

    return result;
  }, [tournees, dateFilter, customDate, searchTerm, sortOrder]);

  // ─── tournée sélectionnée ──────────────────────────────────────────────────
  const livraisonsTourneeSelectionnee = useMemo(() => {
    if (!selectedTournee) return [];
    const t = tournees.find((x) => x.key === selectedTournee.key);
    return t?.livraisons || [];
  }, [selectedTournee, tournees]);

  const groupedSelected = useMemo(() => {
    const enCours = [];
    const reportees = [];
    const livreesNonPayees = [];
    const refuseesNonRetournees = [];
    for (const l of livraisonsTourneeSelectionnee) {
      if (l.statut === 'en_cours') enCours.push(l);
      else if (l.statut === 'reportee') reportees.push(l);
      else if (l.statut === 'livree' && !l.paiementRecu) livreesNonPayees.push(l);
      else if (l.statut === 'refusee' && !l.verifieParGestionnaire) refuseesNonRetournees.push(l);
    }
    return { enCours, reportees, livreesNonPayees, refuseesNonRetournees };
  }, [livraisonsTourneeSelectionnee]);

  const montantSelectionne = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    return groupedSelected.livreesNonPayees
      .filter((l) => selectedIds.has(l._id || l.id))
      .reduce((sum, l) => sum + (l.commande?.prix || 0), 0);
  }, [selectedIds, groupedSelected]);

  // ─── handlers ──────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const all = groupedSelected.livreesNonPayees.map((l) => l._id || l.id);
    setSelectedIds(new Set(all));
  };

  const unselectAll = () => setSelectedIds(new Set());

  const handleOpenTournee = (tournee) => {
    setSelectedTournee(tournee);
    setSelectedIds(new Set());
  };

  const handleDeposerArgent = async () => {
    if (selectedIds.size === 0) {
      toast.error('Sélectionne au moins une livraison');
      return;
    }
    if (
      !confirm(
        `Confirmer le dépôt de ${montantSelectionne.toLocaleString('fr-FR')} F pour ${selectedIds.size} livraison(s) ?`
      )
    ) {
      return;
    }
    setProcessing(true);
    try {
      const livraisonIds = Array.from(selectedIds);
      const { data } = await api.post('/livraisons/marquer-paiement-recu-batch', { livraisonIds });
      toast.success(
        `${data.nombreLivraisons} livraison(s) payée(s) — ${(data.montantTotal || 0).toLocaleString('fr-FR')} F`
      );
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

  const handleReprendre = async (livraisonId) => {
    if (!confirm("Reprendre cette livraison reportée ?\n\nElle basculera dans la tournée d'aujourd'hui pour ce livreur.")) {
      return;
    }
    setProcessing(true);
    try {
      await api.post(`/livraisons/${livraisonId}/reprendre`);
      toast.success("Livraison reprise — bascule dans la tournée du jour");
      await fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleSupprimerOrpheline = async (livraisonId) => {
    if (
      !confirm(
        "⚠️ Supprimer définitivement cette livraison orpheline ?\n\nElle pointe vers une commande qui n'existe plus."
      )
    ) {
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
              Tournées journalières · suivi des dépôts
            </p>
          </div>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="stat-card bg-gradient-to-br from-blue-50 to-indigo-50">
          <p className="text-xs sm:text-sm font-semibold text-blue-700 uppercase truncate">📦 Colis dehors</p>
          <p className="text-3xl sm:text-4xl font-black text-blue-900">{statsGlobales.colisDehors}</p>
          <p className="text-xs text-blue-600 mt-1">chez les livreurs</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-emerald-50 to-teal-50">
          <p className="text-xs sm:text-sm font-semibold text-emerald-700 uppercase truncate">💰 Argent dû</p>
          <p className="text-3xl sm:text-4xl font-black text-emerald-900">
            {statsGlobales.argentDu.toLocaleString('fr-FR')} F
          </p>
          <p className="text-xs text-emerald-600 mt-1">à déposer</p>
        </div>
      </div>

      {/* Filtres date + recherche */}
      <div className="stat-card !p-3 sm:!p-4 space-y-3">
        {/* Boutons filtre rapide */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'today', label: "📅 Aujourd'hui" },
            { id: 'yesterday', label: 'Hier' },
            { id: 'week', label: 'Cette semaine' },
            { id: 'all', label: 'Tout' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setDateFilter(f.id);
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                dateFilter === f.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Date picker */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                if (e.target.value) setDateFilter('custom');
              }}
              className="text-xs sm:text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Choisir une date précise"
            />
            {customDate && (
              <button
                type="button"
                onClick={() => {
                  setCustomDate('');
                  setDateFilter('today');
                }}
                className="text-xs text-gray-500 hover:text-gray-800 px-1"
                title="Effacer la date"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tri */}
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
            title="Inverser le tri"
          >
            {sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {sortOrder === 'desc' ? 'Récent' : 'Ancien'}
          </button>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un livreur (nom, téléphone)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 pr-10 text-sm sm:text-base w-full"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Liste des tournées */}
      {tourneesFiltres.length === 0 ? (
        <div className="stat-card text-center py-12">
          <CalendarDays className="mx-auto text-gray-400 mb-3" size={40} />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Aucune tournée trouvée</h3>
          <p className="text-sm text-gray-600">
            {dateFilter === 'today'
              ? "Aucun livreur n'a reçu de colis aujourd'hui"
              : dateFilter === 'yesterday'
              ? "Aucune tournée hier"
              : 'Essaie un autre filtre'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grouper visuellement par jour */}
          {groupParJour(tourneesFiltres, sortOrder).map(({ jourKey, items }) => (
            <div key={jourKey} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md uppercase tracking-wide">
                  {formatJourCourt(jourKey)}
                </div>
                <p className="text-xs text-gray-500 hidden sm:block">{formatJourLong(jourKey)}</p>
                <p className="text-xs text-gray-400 ml-auto">
                  {items.length} tournée{items.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((t) => {
                  const stats = getStatsTournee(t.livraisons);
                  return (
                    <TourneeCard
                      key={t.key}
                      tournee={t}
                      stats={stats}
                      onClick={() => handleOpenTournee(t)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal détail tournée */}
      {selectedTournee && (
        <TourneeDetailModal
          tournee={selectedTournee}
          grouped={groupedSelected}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          selectAll={selectAll}
          unselectAll={unselectAll}
          montantSelectionne={montantSelectionne}
          onClose={() => {
            setSelectedTournee(null);
            setSelectedIds(new Set());
          }}
          onDeposer={handleDeposerArgent}
          onConfirmerRetour={handleConfirmerRetourRefuse}
          onReprendre={handleReprendre}
          onSupprimerOrpheline={handleSupprimerOrpheline}
          processing={processing}
          userRole={user?.role}
        />
      )}
    </div>
  );
};

// ─── grouper les tournées par jour pour affichage en sections ───────────────
function groupParJour(tournees, sortOrder) {
  const map = new Map();
  for (const t of tournees) {
    if (!map.has(t.jourKey)) map.set(t.jourKey, []);
    map.get(t.jourKey).push(t);
  }
  const entries = Array.from(map.entries()).map(([jourKey, items]) => ({ jourKey, items }));
  entries.sort((a, b) =>
    sortOrder === 'desc' ? b.jourKey.localeCompare(a.jourKey) : a.jourKey.localeCompare(b.jourKey)
  );
  return entries;
}

// ─── carte tournée ───────────────────────────────────────────────────────────
function TourneeCard({ tournee, stats, onClick }) {
  const livreur = tournee.livreur;
  const borderColor = stats.soldee
    ? 'border-l-4 border-emerald-500'
    : stats.argentDu > 0
    ? 'border-l-4 border-amber-500'
    : 'border-l-4 border-blue-500';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`stat-card text-left hover:shadow-xl transition-all cursor-pointer ${borderColor} !p-3`}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-md flex-shrink-0">
          {livreur?.nom?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 truncate text-sm">{livreur?.nom || '—'}</h3>
          <p className="text-[11px] text-gray-500 truncate flex items-center gap-1">
            <Phone size={10} />
            {livreur?.telephone || '—'}
          </p>
        </div>
        {stats.soldee && (
          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold flex-shrink-0">
            ✓ Soldée
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1 text-[10px]">
        <div className="bg-blue-50 rounded p-1.5 text-center">
          <p className="text-blue-600 font-semibold uppercase text-[9px]">Total</p>
          <p className="text-lg font-black text-blue-900 leading-none">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded p-1.5 text-center">
          <p className="text-emerald-600 font-semibold uppercase text-[9px]">Livré</p>
          <p className="text-lg font-black text-emerald-900 leading-none">
            {stats.livreesNonPayees + stats.livreesPayees}
          </p>
        </div>
        <div className="bg-orange-50 rounded p-1.5 text-center">
          <p className="text-orange-600 font-semibold uppercase text-[9px]">Repor.</p>
          <p className="text-lg font-black text-orange-900 leading-none">{stats.reportees}</p>
        </div>
        <div className="bg-red-50 rounded p-1.5 text-center">
          <p className="text-red-600 font-semibold uppercase text-[9px]">Refusé</p>
          <p className="text-lg font-black text-red-900 leading-none">{stats.refusees}</p>
        </div>
      </div>

      {stats.enCours > 0 && (
        <p className="text-[11px] text-blue-700 mt-2 font-bold">📦 {stats.enCours} en cours</p>
      )}
      {stats.argentDu > 0 && (
        <p className="text-[11px] text-amber-700 mt-1 font-bold">
          💰 {stats.argentDu.toLocaleString('fr-FR')} F à déposer
        </p>
      )}
    </button>
  );
}

// ─── modal détail tournée ────────────────────────────────────────────────────
function TourneeDetailModal({
  tournee,
  grouped,
  selectedIds,
  toggleSelect,
  selectAll,
  unselectAll,
  montantSelectionne,
  onClose,
  onDeposer,
  onConfirmerRetour,
  onReprendre,
  onSupprimerOrpheline,
  processing,
  userRole,
}) {
  const totalLivreesNonPayees = grouped.livreesNonPayees.reduce(
    (sum, l) => sum + (l.commande?.prix || 0),
    0
  );
  const livreur = tournee.livreur;

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
              {livreur?.nom?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black truncate">{livreur?.nom || '—'}</h2>
              <p className="text-sm text-emerald-50 truncate flex items-center gap-1">
                <Calendar size={12} />
                {formatJourLong(tournee.jourKey)}
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
          {/* À LIVRER */}
          <section>
            <h3 className="text-sm font-black text-blue-700 uppercase mb-2 flex items-center gap-2">
              <Package size={16} />
              À LIVRER ({grouped.enCours.length})
            </h3>
            {grouped.enCours.length === 0 ? (
              <p className="text-xs text-gray-500 italic px-2">Aucun colis à livrer dans cette tournée</p>
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

          {/* REPORTÉES — À REPRENDRE */}
          {grouped.reportees.length > 0 && (
            <section>
              <h3 className="text-sm font-black text-orange-700 uppercase mb-2 flex items-center gap-2">
                <Calendar size={16} />
                REPORTÉES — À REPRENDRE ({grouped.reportees.length})
              </h3>
              <p className="text-[11px] text-orange-700 mb-2 italic">
                Ces colis attendent leur reprise. Quand le livreur clique "Reprendre", le colis basculera dans la tournée du jour.
              </p>
              <div className="space-y-2">
                {grouped.reportees.map((l) => (
                  <LivraisonRow
                    key={l._id || l.id}
                    livraison={l}
                    variant="reportee"
                    onReprendre={() => onReprendre(l._id || l.id)}
                    onSupprimerOrpheline={onSupprimerOrpheline}
                    processing={processing}
                    userRole={userRole}
                  />
                ))}
              </div>
            </section>
          )}

          {/* LIVRÉES — ARGENT DÛ */}
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
                      <p className="text-xs font-semibold text-emerald-700 uppercase">Sélectionné</p>
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
                      <span>{processing ? 'Dépôt...' : "DÉPOSER L'ARGENT"}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* REFUSÉES À CONFIRMER */}
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
                    onSupprimerOrpheline={onSupprimerOrpheline}
                    processing={processing}
                    userRole={userRole}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Note bas */}
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-bold mb-1">💡 Comment ça marche :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Cette carte = 1 tournée d'1 livreur 1 jour donné</li>
              <li>Les colis assignés un autre jour apparaissent dans une autre carte</li>
              <li>Les colis "Reportés" restent dans leur tournée d'origine avec étiquette orange</li>
              <li>Quand le livreur "Reprend" un colis reporté, il bascule dans la tournée du jour</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ligne livraison ─────────────────────────────────────────────────────────
function LivraisonRow({
  livraison,
  variant,
  checked,
  onToggle,
  onConfirmerRetour,
  onReprendre,
  onSupprimerOrpheline,
  processing,
  userRole,
}) {
  const commande = livraison.commande;
  const isOrphan = !commande || !commande.numeroCommande;

  // Cas orpheline
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

  const clientNom = commande.client?.nom || (typeof commande.client === 'string' ? commande.client : '—');
  const clientVille = commande.client?.ville || livraison.adresseLivraison?.ville || '—';
  const clientContact = commande.client?.contact || '';
  const motif = livraison.motifRefus || livraison.commentaireGestionnaire;

  const borderColor = {
    en_cours: 'border-blue-200 bg-blue-50/40',
    reportee: 'border-orange-300 bg-orange-50',
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
            <p className="font-bold text-sm text-gray-900 truncate">{commande.numeroCommande || '—'}</p>
            <p className="font-black text-sm text-gray-900 flex-shrink-0">
              {(commande.prix || 0).toLocaleString('fr-FR')} F
            </p>
          </div>
          {variant === 'reportee' && (
            <span className="inline-block bg-orange-200 text-orange-800 text-[10px] font-black px-2 py-0.5 rounded-full mb-1">
              🔄 À REPRENDRE
            </span>
          )}
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
              {typeof commande.modele === 'string' ? commande.modele : commande.modele.nom} · {commande.taille} ·{' '}
              {commande.couleur}
            </p>
          )}
          {clientContact && (variant === 'en_cours' || variant === 'reportee') && (
            <a
              href={`tel:${clientContact}`}
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              <Phone size={10} />
              {clientContact}
            </a>
          )}
          {motif && <p className="text-[11px] text-gray-600 italic mt-1 line-clamp-2">📝 {motif}</p>}
        </div>
      </div>

      {variant === 'reportee' && onReprendre && (
        <button
          type="button"
          onClick={onReprendre}
          disabled={processing}
          className="mt-2 w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <RotateCcw size={12} />
          Reprendre (basculer dans la tournée du jour)
        </button>
      )}

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
