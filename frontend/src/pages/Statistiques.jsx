import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BarChart3, TrendingUp, Palette, Ruler, ShoppingBag, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from 'recharts';

const COULEURS_CHART = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#06b6d4'
];

const COULEURS_MAP = {
  'noir': '#1f2937', 'blanc': '#e5e7eb', 'rouge': '#ef4444', 'bleu': '#3b82f6',
  'vert': '#22c55e', 'jaune': '#eab308', 'rose': '#ec4899', 'violet': '#8b5cf6',
  'orange': '#f97316', 'gris': '#6b7280', 'marron': '#92400e', 'beige': '#d4a574',
};

const getCouleurHex = (nom, idx) => {
  const lower = (nom || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(COULEURS_MAP)) {
    if (lower.includes(key)) return val;
  }
  return COULEURS_CHART[idx % COULEURS_CHART.length];
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg rounded-lg px-3 py-2 border border-gray-200">
      <p className="text-xs font-bold text-gray-700">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.value} {p.name || 'commandes'}
        </p>
      ))}
    </div>
  );
};

const Statistiques = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [periode, setPeriode] = useState('mois');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user && !['gestionnaire', 'administrateur'].includes(user.role)) {
      toast.error('Accès refusé');
      navigate('/dashboard');
      return;
    }
    fetchStats();
  }, [user, navigate, periode]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/commandes/statistiques/analyse?periode=${periode}`);
      setStats(data);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  const {
    totalCommandes = 0,
    chiffreAffaires = 0,
    modelesPopulaires = [],
    couleursPopulaires = [],
    taillesPopulaires = [],
    commandesParPeriode = []
  } = stats || {};

  const periodeLabel = periode === 'jour' ? '30 derniers jours' : periode === 'semaine' ? '12 dernières semaines' : '12 derniers mois';

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <BarChart3 className="mr-3" size={28} />
            Statistiques
          </h1>
          <p className="page-subtitle">Analyse des commandes, modèles, couleurs et tailles</p>
        </div>
      </div>

      {/* Sélecteur de période */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 mr-1">
          <Calendar size={14} className="inline mr-1" />
          Période :
        </span>
        {[
          { key: 'jour', label: 'Par jour' },
          { key: 'semaine', label: 'Par semaine' },
          { key: 'mois', label: 'Par mois' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriode(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
              periode === key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2">({periodeLabel})</span>
        {loading && <Loader2 className="animate-spin text-indigo-400 ml-2" size={16} />}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={18} />
            <span className="text-xs font-semibold opacity-90">Total commandes</span>
          </div>
          <p className="text-2xl font-black">{totalCommandes.toLocaleString('fr-FR')}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={18} />
            <span className="text-xs font-semibold opacity-90">Chiffre d'affaires</span>
          </div>
          <p className="text-2xl font-black">{chiffreAffaires.toLocaleString('fr-FR')} F</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Palette size={18} />
            <span className="text-xs font-semibold opacity-90">Couleurs</span>
          </div>
          <p className="text-2xl font-black">{couleursPopulaires.length}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Ruler size={18} />
            <span className="text-xs font-semibold opacity-90">Tailles</span>
          </div>
          <p className="text-2xl font-black">{taillesPopulaires.length}</p>
        </div>
      </div>

      {/* Graphique : évolution des commandes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-500" />
          Évolution des commandes
        </h2>
        {commandesParPeriode.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={commandesParPeriode}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#colorCount)" name="Commandes" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400 py-10 text-sm">Aucune donnée pour cette période</p>
        )}
      </div>

      {/* Modèles populaires + Couleurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top modèles */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <ShoppingBag size={18} className="text-purple-500" />
            Modèles les plus commandés
          </h2>
          {modelesPopulaires.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelesPopulaires} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="nom" tick={{ fontSize: 11 }} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Commandes" radius={[0, 6, 6, 0]}>
                  {modelesPopulaires.map((_, i) => (
                    <Cell key={i} fill={COULEURS_CHART[i % COULEURS_CHART.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-10 text-sm">Aucune donnée</p>
          )}
        </div>

        {/* Couleurs appréciées */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Palette size={18} className="text-rose-500" />
            Couleurs les plus appréciées
          </h2>
          {couleursPopulaires.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={couleursPopulaires}
                    dataKey="count"
                    nameKey="nom"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ nom, percent }) => `${nom} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {couleursPopulaires.map((entry, i) => (
                      <Cell key={i} fill={getCouleurHex(entry.nom, i)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {couleursPopulaires.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded-full border">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: getCouleurHex(c.nom, i) }} />
                    {c.nom} ({c.count})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 py-10 text-sm">Aucune donnée</p>
          )}
        </div>
      </div>

      {/* Tailles les plus demandées */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Ruler size={18} className="text-amber-500" />
          Tailles les plus demandées
        </h2>
        {taillesPopulaires.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={taillesPopulaires}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nom" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Commandes" radius={[6, 6, 0, 0]}>
                  {taillesPopulaires.map((_, i) => (
                    <Cell key={i} fill={COULEURS_CHART[i % COULEURS_CHART.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {taillesPopulaires.map((t, i) => {
                const maxCount = taillesPopulaires[0]?.count || 1;
                const pct = Math.round((t.count / maxCount) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-gray-700">{t.nom}</span>
                      <span className="text-gray-500">{t.count} commandes ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: COULEURS_CHART[i % COULEURS_CHART.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-10 text-sm">Aucune donnée</p>
        )}
      </div>
    </div>
  );
};

export default Statistiques;
