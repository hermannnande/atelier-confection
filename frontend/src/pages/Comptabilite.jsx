import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import {
  Wallet,
  Calendar,
  Users,
  TrendingUp,
  Search,
  X,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  Package,
  CheckCircle,
  MapPin,
  Phone,
  CalendarDays,
  LayoutGrid,
  List,
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
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return getJourKey(d.toISOString());
}

function startOfMonthKey() {
  const d = new Date();
  d.setDate(1);
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
  const today = todayKey();
  const yesterday = yesterdayKey();
  if (jourKey === today) return "Aujourd'hui";
  if (jourKey === yesterday) return 'Hier';
  const d = new Date(`${jourKey}T12:00:00`);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ─── composant principal ─────────────────────────────────────────────────────
const Comptabilite = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [livreurs, setLivreurs] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [livreurFilter, setLivreurFilter] = useState(''); // id livreur ou ''
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('jour'); // 'jour' | 'livreur'
  const [selectedCluster, setSelectedCluster] = useState(null); // { jourKey, livreurId, items }

  useEffect(() => {
    if (user && !['gestionnaire', 'administrateur'].includes(user.role)) {
      toast.error('⛔ Accès refusé : Page réservée aux gestionnaires et administrateurs');
      navigate('/dashboard');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, livraisonsRes] = await Promise.all([
        api.get('/users?role=livreur'),
        api.get('/livraisons'),
      ]);
      setLivreurs((usersRes.data.users || []).filter((u) => u.actif));
      setLivraisons(livraisonsRes.data.livraisons || []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ─── filtrer uniquement les dépôts (livraisons payées) ─────────────────────
  const depots = useMemo(
    () =>
      livraisons.filter(
        (l) => l.statut === 'livree' && l.paiementRecu === true && l.datePaiement
      ),
    [livraisons]
  );

  // ─── appliquer les filtres date + livreur ──────────────────────────────────
  const depotsFiltres = useMemo(() => {
    const today = todayKey();
    const yesterday = yesterdayKey();
    const weekStart = startOfWeekKey();
    const monthStart = startOfMonthKey();
    const term = searchTerm.trim().toLowerCase();

    return depots.filter((d) => {
      const jourKey = getJourKey(d.datePaiement);
      if (!jourKey) return false;

      if (dateFilter === 'today' && jourKey !== today) return false;
      if (dateFilter === 'yesterday' && jourKey !== yesterday) return false;
      if (dateFilter === 'week' && jourKey < weekStart) return false;
      if (dateFilter === 'month' && jourKey < monthStart) return false;
      if (dateFilter === 'custom' && customDate && jourKey !== customDate) return false;

      if (livreurFilter) {
        const lid = d.livreur?._id || d.livreur?.id || d.livreur_id;
        if (lid !== livreurFilter) return false;
      }

      if (term) {
        const lnom = (d.livreur?.nom || '').toLowerCase();
        const num = (d.commande?.numeroCommande || '').toLowerCase();
        const client = (d.commande?.client?.nom || '').toLowerCase();
        if (!lnom.includes(term) && !num.includes(term) && !client.includes(term)) return false;
      }

      return true;
    });
  }, [depots, dateFilter, customDate, livreurFilter, searchTerm]);

  // ─── stats globales (sur la période filtrée) ───────────────────────────────
  const statsPeriode = useMemo(() => {
    const total = depotsFiltres.reduce((s, d) => s + (d.commande?.prix || 0), 0);
    const livreursActifsSet = new Set(
      depotsFiltres.map((d) => d.livreur?._id || d.livreur?.id || d.livreur_id).filter(Boolean)
    );
    const moyenne = depotsFiltres.length > 0 ? Math.round(total / depotsFiltres.length) : 0;
    return {
      totalArgent: total,
      nbLivraisons: depotsFiltres.length,
      nbLivreurs: livreursActifsSet.size,
      moyenne,
    };
  }, [depotsFiltres]);

  // ─── groupage : par jour > par livreur ─────────────────────────────────────
  const clustersByJour = useMemo(() => {
    const map = new Map(); // jourKey -> Map(livreurId -> { livreur, jourKey, items, total })
    for (const d of depotsFiltres) {
      const jourKey = getJourKey(d.datePaiement);
      const lid = d.livreur?._id || d.livreur?.id || d.livreur_id;
      if (!jourKey || !lid) continue;
      if (!map.has(jourKey)) map.set(jourKey, new Map());
      const livMap = map.get(jourKey);
      if (!livMap.has(lid)) {
        const livreurObj =
          d.livreur || livreurs.find((u) => (u._id || u.id) === lid) || { _id: lid };
        livMap.set(lid, { jourKey, livreurId: lid, livreur: livreurObj, items: [], total: 0 });
      }
      const cluster = livMap.get(lid);
      cluster.items.push(d);
      cluster.total += d.commande?.prix || 0;
    }
    // convertir en tableau ordonné desc
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([jourKey, livMap]) => ({
        jourKey,
        clusters: Array.from(livMap.values()).sort((a, b) => b.total - a.total),
        total: Array.from(livMap.values()).reduce((s, c) => s + c.total, 0),
      }));
  }, [depotsFiltres, livreurs]);

  // ─── groupage : par livreur > par jour ─────────────────────────────────────
  const clustersByLivreur = useMemo(() => {
    const map = new Map(); // livreurId -> Map(jourKey -> { ... })
    for (const d of depotsFiltres) {
      const jourKey = getJourKey(d.datePaiement);
      const lid = d.livreur?._id || d.livreur?.id || d.livreur_id;
      if (!jourKey || !lid) continue;
      if (!map.has(lid)) map.set(lid, new Map());
      const jourMap = map.get(lid);
      if (!jourMap.has(jourKey)) {
        const livreurObj =
          d.livreur || livreurs.find((u) => (u._id || u.id) === lid) || { _id: lid };
        jourMap.set(jourKey, { jourKey, livreurId: lid, livreur: livreurObj, items: [], total: 0 });
      }
      const cluster = jourMap.get(jourKey);
      cluster.items.push(d);
      cluster.total += d.commande?.prix || 0;
    }
    return Array.from(map.entries())
      .map(([lid, jourMap]) => {
        const items = Array.from(jourMap.values());
        const livreur = items[0]?.livreur || livreurs.find((u) => (u._id || u.id) === lid) || { _id: lid };
        const total = items.reduce((s, c) => s + c.total, 0);
        return {
          livreurId: lid,
          livreur,
          jours: items.sort((a, b) => b.jourKey.localeCompare(a.jourKey)),
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [depotsFiltres, livreurs]);

  // ─── export CSV ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (depotsFiltres.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    const headers = ['Date dépôt', 'Livreur', 'N° Commande', 'Client', 'Ville', 'Montant'];
    const rows = depotsFiltres.map((d) => [
      new Date(d.datePaiement).toLocaleString('fr-FR'),
      d.livreur?.nom || '—',
      d.commande?.numeroCommande || '—',
      d.commande?.client?.nom || '—',
      d.commande?.client?.ville || '—',
      d.commande?.prix || 0,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comptabilite_${todayKey()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
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
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 sm:p-4 rounded-2xl shadow-lg flex-shrink-0">
            <Wallet className="text-white" size={28} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent truncate">
              Comptabilité
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium truncate">
              Bilan des dépôts d'argent par jour et par livreur
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={depotsFiltres.length === 0}
          className="btn btn-secondary inline-flex items-center gap-2 text-sm w-full sm:w-auto justify-center disabled:opacity-50"
        >
          <Download size={16} />
          Exporter CSV
        </button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="stat-card bg-gradient-to-br from-amber-50 to-orange-50">
          <p className="text-xs sm:text-sm font-semibold text-amber-700 uppercase truncate">
            💰 Total déposé
          </p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-900 truncate">
            {statsPeriode.totalArgent.toLocaleString('fr-FR')} F
          </p>
          <p className="text-[10px] sm:text-xs text-amber-600 mt-1">sur la période</p>
        </div>

        <div className="stat-card bg-gradient-to-br from-blue-50 to-indigo-50">
          <p className="text-xs sm:text-sm font-semibold text-blue-700 uppercase truncate">
            📦 Livraisons payées
          </p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-900">
            {statsPeriode.nbLivraisons}
          </p>
          <p className="text-[10px] sm:text-xs text-blue-600 mt-1">colis encaissés</p>
        </div>

        <div className="stat-card bg-gradient-to-br from-emerald-50 to-teal-50">
          <p className="text-xs sm:text-sm font-semibold text-emerald-700 uppercase truncate">
            👥 Livreurs actifs
          </p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-900">
            {statsPeriode.nbLivreurs}
          </p>
          <p className="text-[10px] sm:text-xs text-emerald-600 mt-1">ont déposé</p>
        </div>

        <div className="stat-card bg-gradient-to-br from-purple-50 to-pink-50">
          <p className="text-xs sm:text-sm font-semibold text-purple-700 uppercase truncate">
            📊 Moyenne / livraison
          </p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-purple-900 truncate">
            {statsPeriode.moyenne.toLocaleString('fr-FR')} F
          </p>
          <p className="text-[10px] sm:text-xs text-purple-600 mt-1">par colis livré</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="stat-card !p-3 sm:!p-4 space-y-3">
        {/* Filtres date */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { id: 'today', label: "📅 Aujourd'hui" },
            { id: 'yesterday', label: 'Hier' },
            { id: 'week', label: 'Cette semaine' },
            { id: 'month', label: 'Ce mois' },
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
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                if (e.target.value) setDateFilter('custom');
              }}
              className="text-xs sm:text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Toggle vue */}
          <div className="ml-auto flex items-center bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('jour')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'jour' ? 'bg-white shadow text-amber-700' : 'text-gray-600'
              }`}
              title="Grouper par jour"
            >
              <CalendarDays size={12} />
              Par jour
            </button>
            <button
              type="button"
              onClick={() => setViewMode('livreur')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'livreur' ? 'bg-white shadow text-amber-700' : 'text-gray-600'
              }`}
              title="Grouper par livreur"
            >
              <Users size={12} />
              Par livreur
            </button>
          </div>
        </div>

        {/* Filtre livreur + recherche */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={livreurFilter}
            onChange={(e) => setLivreurFilter(e.target.value)}
            className="input text-sm"
          >
            <option value="">— Tous les livreurs —</option>
            {livreurs.map((l) => (
              <option key={l._id || l.id} value={l._id || l.id}>
                {l.nom} {l.telephone ? `· ${l.telephone}` : ''}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher livreur, N° cmd, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9 pr-9 text-sm w-full"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des dépôts */}
      {depotsFiltres.length === 0 ? (
        <div className="stat-card text-center py-12">
          <Wallet className="mx-auto text-gray-400 mb-3" size={40} />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Aucun dépôt sur cette période</h3>
          <p className="text-sm text-gray-600">
            Les dépôts apparaîtront ici une fois que les livreurs auront déposé l'argent des
            livraisons payées (via la page Livreurs).
          </p>
        </div>
      ) : viewMode === 'jour' ? (
        <div className="space-y-4">
          {clustersByJour.map(({ jourKey, clusters, total }) => (
            <div key={jourKey} className="stat-card !p-3 sm:!p-4">
              <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black px-3 py-1 rounded-full shadow uppercase tracking-wide">
                    {formatJourCourt(jourKey)}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block truncate">
                    {formatJourLong(jourKey)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">Total</p>
                  <p className="text-lg sm:text-2xl font-black text-amber-700">
                    {total.toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {clusters.map((c) => (
                  <ClusterCard
                    key={`${c.jourKey}-${c.livreurId}`}
                    cluster={c}
                    onClick={() => setSelectedCluster(c)}
                    showDate={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {clustersByLivreur.map(({ livreurId, livreur, jours, total }) => (
            <div key={livreurId} className="stat-card !p-3 sm:!p-4">
              <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow flex-shrink-0">
                    {livreur?.nom?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{livreur?.nom || '—'}</h3>
                    <p className="text-[11px] text-gray-500 truncate">
                      {livreur?.telephone || '—'} · {jours.length} jour(s)
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">Total</p>
                  <p className="text-lg sm:text-2xl font-black text-amber-700">
                    {total.toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {jours.map((c) => (
                  <ClusterCard
                    key={`${c.livreurId}-${c.jourKey}`}
                    cluster={c}
                    onClick={() => setSelectedCluster(c)}
                    showLivreur={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal détail */}
      {selectedCluster && (
        <ClusterDetailModal
          cluster={selectedCluster}
          onClose={() => setSelectedCluster(null)}
        />
      )}
    </div>
  );
};

// ─── carte cluster ───────────────────────────────────────────────────────────
function ClusterCard({ cluster, onClick, showDate = true, showLivreur = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all p-3 bg-white"
    >
      {showLivreur && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
            {cluster.livreur?.nom?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{cluster.livreur?.nom || '—'}</p>
            <p className="text-[10px] text-gray-500 truncate">{cluster.livreur?.telephone || ''}</p>
          </div>
        </div>
      )}
      {showDate && (
        <p className="text-[11px] text-gray-600 mb-1 font-semibold">
          📅 {formatJourCourt(cluster.jourKey)}
        </p>
      )}
      <div className="flex items-end justify-between mt-2">
        <p className="text-xs text-gray-500">
          <span className="font-bold text-gray-900">{cluster.items.length}</span> livraison
          {cluster.items.length > 1 ? 's' : ''}
        </p>
        <p className="text-base sm:text-lg font-black text-amber-700">
          {cluster.total.toLocaleString('fr-FR')} F
        </p>
      </div>
    </button>
  );
}

// ─── modal détail ────────────────────────────────────────────────────────────
function ClusterDetailModal({ cluster, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {cluster.livreur?.nom?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black truncate">
                {cluster.livreur?.nom || '—'}
              </h2>
              <p className="text-sm text-orange-50 truncate flex items-center gap-1">
                <Calendar size={12} />
                Dépôt du {formatJourLong(cluster.jourKey)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-3 flex-1">
          {/* Récap */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border-2 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase">Total déposé</p>
                <p className="text-3xl font-black text-amber-900">
                  {cluster.total.toLocaleString('fr-FR')} F
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-amber-700 uppercase">Livraisons</p>
                <p className="text-3xl font-black text-amber-900">{cluster.items.length}</p>
              </div>
            </div>
          </div>

          {/* Liste */}
          <h3 className="text-sm font-black text-gray-700 uppercase pt-2">
            Détail des livraisons
          </h3>
          <div className="space-y-2">
            {cluster.items
              .sort((a, b) => new Date(b.datePaiement) - new Date(a.datePaiement))
              .map((l) => {
                const c = l.commande;
                const isOrphan = !c || !c.numeroCommande;
                if (isOrphan) {
                  return (
                    <div
                      key={l._id || l.id}
                      className="rounded-lg border-2 border-red-200 bg-red-50 p-3"
                    >
                      <p className="text-xs text-red-700 font-bold">⚠️ Commande introuvable</p>
                      <p className="text-[10px] text-red-600 font-mono">
                        Livraison : {(l._id || l.id || '').slice(0, 13)}…
                      </p>
                      <p className="text-base font-black text-red-900 mt-1">
                        {(l.commande?.prix || 0).toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  );
                }
                return (
                  <div
                    key={l._id || l.id}
                    className="rounded-lg border-2 border-gray-200 bg-white p-3 hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-bold text-sm text-gray-900 truncate">
                        {c.numeroCommande || '—'}
                      </p>
                      <p className="font-black text-sm text-amber-700 flex-shrink-0">
                        {(c.prix || 0).toLocaleString('fr-FR')} F
                      </p>
                    </div>
                    <p className="text-xs text-gray-700 truncate">
                      <span className="font-semibold">{c.client?.nom || '—'}</span>
                      {c.client?.ville && (
                        <>
                          <span className="text-gray-400"> · </span>
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin size={10} />
                            {c.client.ville}
                          </span>
                        </>
                      )}
                    </p>
                    {c.client?.contact && (
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                        <Phone size={10} />
                        {c.client.contact}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      Payé le {new Date(l.datePaiement).toLocaleString('fr-FR')}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Comptabilite;
