import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Award,
  BarChart3,
  CalendarDays,
  Coins,
  Loader2,
  Scissors,
  Search,
  Truck,
  Users,
} from 'lucide-react';

const toInputDate = (date) => date.toISOString().slice(0, 10);

const shiftDate = (dateValue, days) => {
  const date = new Date(`${dateValue}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toInputDate(date);
};

const formatDate = (value, options = {}) => new Date(`${value}T12:00:00.000Z`)
  .toLocaleDateString('fr-FR', options);

const money = (value) => `${Number(value || 0).toLocaleString('fr-FR')} F`;

const TAB_CONFIG = {
  appelants: {
    label: 'Appelants',
    title: 'Performances des appelants',
    icon: Users,
    primary: 'recues',
    metrics: [
      { key: 'recues', label: 'Reçues', color: 'text-indigo-700 bg-indigo-50' },
      { key: 'validees', label: 'Validées', color: 'text-blue-700 bg-blue-50' },
      { key: 'livrees', label: 'Livrées', color: 'text-emerald-700 bg-emerald-50' },
      { key: 'annulees', label: 'Annulées', color: 'text-rose-700 bg-rose-50' },
      { key: 'montantLivre', label: 'Montant livré', color: 'text-amber-800 bg-amber-50', money: true },
    ],
    modelMetrics: [
      { key: 'recues', label: 'reçues' },
      { key: 'validees', label: 'validées' },
      { key: 'livrees', label: 'livrées' },
      { key: 'annulees', label: 'annulées' },
    ],
  },
  stylistes: {
    label: 'Stylistes',
    title: 'Performances des stylistes',
    icon: Scissors,
    primary: 'terminees',
    metrics: [
      { key: 'demarrees', label: 'Découpes démarrées', color: 'text-amber-700 bg-amber-50' },
      { key: 'terminees', label: 'Découpes terminées', color: 'text-emerald-700 bg-emerald-50' },
    ],
    modelMetrics: [
      { key: 'demarrees', label: 'démarrées' },
      { key: 'terminees', label: 'terminées' },
    ],
  },
  couturiers: {
    label: 'Couturiers',
    title: 'Performances des couturiers',
    icon: Coins,
    primary: 'piecesValidees',
    source: 'Source : productions validées dans Rémunération',
    metrics: [
      { key: 'piecesValidees', label: 'Pièces validées', color: 'text-emerald-700 bg-emerald-50' },
      { key: 'piecesEnAttente', label: 'Pièces à valider', color: 'text-amber-700 bg-amber-50' },
      { key: 'gainsBase', label: 'Gains de base', color: 'text-blue-700 bg-blue-50', money: true },
      { key: 'bonus', label: 'Bonus', color: 'text-purple-700 bg-purple-50', money: true },
      { key: 'totalGagne', label: 'Total gagné', color: 'text-emerald-800 bg-emerald-100', money: true },
    ],
    modelMetrics: [
      { key: 'piecesValidees', label: 'pièces validées' },
      { key: 'piecesEnAttente', label: 'en attente' },
      { key: 'montant', label: 'gagné', money: true },
      { key: 'bonus', label: 'bonus', money: true },
    ],
  },
  livreurs: {
    label: 'Livreurs',
    title: 'Performances des livreurs',
    icon: Truck,
    primary: 'livrees',
    metrics: [
      { key: 'assignees', label: 'Colis assignés', color: 'text-blue-700 bg-blue-50' },
      { key: 'livrees', label: 'Livrés', color: 'text-emerald-700 bg-emerald-50' },
      { key: 'refusees', label: 'Refusés', color: 'text-rose-700 bg-rose-50' },
      { key: 'tauxReussite', label: 'Taux de réussite', color: 'text-indigo-700 bg-indigo-50', percent: true },
      { key: 'montantLivre', label: 'Montant livré', color: 'text-amber-800 bg-amber-50', money: true },
    ],
    modelMetrics: [
      { key: 'assignees', label: 'assignés' },
      { key: 'livrees', label: 'livrés' },
      { key: 'refusees', label: 'refusés' },
    ],
  },
};

const Performances = () => {
  const today = toInputDate(new Date());
  const [dateDebut, setDateDebut] = useState(today);
  const [dateFin, setDateFin] = useState(today);
  const [activeTab, setActiveTab] = useState('appelants');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dateDebut && dateFin && dateDebut <= dateFin) fetchPerformances();
  }, [dateDebut, dateFin]);

  const fetchPerformances = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/performances/analyse', {
        params: { dateDebut, dateFin },
      });
      setStats(data);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des performances');
    } finally {
      setLoading(false);
    }
  };

  const setRange = (start, end = start) => {
    setDateDebut(start);
    setDateFin(end);
  };

  const config = TAB_CONFIG[activeTab];
  const performances = stats?.[activeTab] || [];
  const filteredPerformances = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return performances;
    return performances.filter((item) => (
      item.personne.nom.toLowerCase().includes(term)
      || String(item.personne.email || item.personne.telephone || '').toLowerCase().includes(term)
    ));
  }, [performances, search]);

  const singleDay = dateDebut === dateFin;
  const periodLabel = singleDay
    ? formatDate(dateDebut, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `du ${formatDate(dateDebut)} au ${formatDate(dateFin)}`;

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-full overflow-x-hidden">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 sm:p-7 text-white">
        <div className="flex items-center gap-3">
          <BarChart3 size={30} className="flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black">Performances réelles</h1>
            <p className="text-sm text-purple-100 mt-1">Résultats de l’équipe selon les dates réelles de chaque activité</p>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-black text-gray-800 flex items-center gap-2">
            <CalendarDays size={19} className="text-purple-600" />
            Jour ou période
          </h2>
          {loading && <Loader2 className="animate-spin text-purple-500" size={18} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRange(today)} className="btn btn-primary btn-sm">Aujourd’hui</button>
          <button type="button" onClick={() => setRange(shiftDate(today, -1))} className="btn btn-secondary btn-sm">Hier</button>
          <button type="button" onClick={() => setRange(shiftDate(today, -6), today)} className="btn btn-secondary btn-sm">7 derniers jours</button>
          <button type="button" onClick={() => setRange(`${today.slice(0, 8)}01`, today)} className="btn btn-secondary btn-sm">Ce mois</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-bold text-gray-600">Jour précis</span>
            <input
              type="date"
              value={singleDay ? dateDebut : ''}
              onChange={(event) => event.target.value && setRange(event.target.value)}
              className="input"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-gray-600">Date de début</span>
            <input
              type="date"
              value={dateDebut}
              max={dateFin}
              onChange={(event) => setDateDebut(event.target.value)}
              className="input"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-gray-600">Date de fin</span>
            <input
              type="date"
              value={dateFin}
              min={dateDebut}
              onChange={(event) => setDateFin(event.target.value)}
              className="input"
            />
          </label>
        </div>

        <p className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3 text-sm font-bold text-purple-800 capitalize">
          {periodLabel}
        </p>
      </section>

      <nav className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {Object.entries(TAB_CONFIG).map(([key, tab]) => {
            const Icon = tab.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                  activeTab === key
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                <span className={`text-xs rounded-full px-2 py-0.5 ${activeTab === key ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {(stats?.[key] || []).length}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900">{config.title}</h2>
            {config.source && <p className="text-xs font-bold text-emerald-700 mt-1">{config.source}</p>}
          </div>
          <label className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une personne..."
              className="input pl-9"
            />
          </label>
        </div>

        {filteredPerformances.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredPerformances.map((performance, index) => (
              <PerformanceCard
                key={performance.personne.id}
                performance={performance}
                index={index}
                config={config}
              />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12 text-gray-500">Aucune performance pour cette recherche</div>
        )}
      </section>
    </div>
  );
};

const PerformanceCard = ({ performance, index, config }) => (
  <article className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
    <div className="flex items-center gap-3 mb-4">
      {index < 3 && Number(performance[config.primary] || 0) > 0 && (
        <Award
          size={24}
          className={index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-600'}
        />
      )}
      <div className="min-w-0">
        <h3 className="font-black text-gray-900 truncate">{performance.personne.nom}</h3>
        <p className="text-xs text-gray-500 truncate">
          {performance.personne.email || performance.personne.telephone || 'Aucun contact'}
        </p>
      </div>
    </div>

    <div className={`grid grid-cols-2 ${config.metrics.length > 2 ? 'lg:grid-cols-5' : 'sm:grid-cols-2'} gap-2 sm:gap-3`}>
      {config.metrics.map((metric) => (
        <div key={metric.key} className={`rounded-xl px-3 py-3 ${metric.color}`}>
          <p className="text-[10px] sm:text-xs font-bold uppercase leading-tight">{metric.label}</p>
          <p className={`${metric.money ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} font-black mt-1 truncate`}>
            {metric.money
              ? money(performance[metric.key])
              : metric.percent
                ? `${performance[metric.key] || 0}%`
                : Number(performance[metric.key] || 0).toLocaleString('fr-FR')}
          </p>
        </div>
      ))}
    </div>

    {performance.detailsParModele?.length > 0 && (
      <details className="mt-4 group">
        <summary className="cursor-pointer rounded-xl bg-gray-50 hover:bg-gray-100 px-4 py-3 text-sm font-black text-gray-700">
          Voir le détail par modèle ({performance.detailsParModele.length})
        </summary>
        <div className="mt-2 divide-y divide-gray-100 border border-gray-100 rounded-xl px-3">
          {performance.detailsParModele.map((modele) => (
            <div key={modele.nom} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="font-bold text-gray-900">{modele.nom}</p>
              <div className="flex flex-wrap gap-1.5">
                {config.modelMetrics
                  .filter((metric) => Number(modele[metric.key] || 0) > 0)
                  .map((metric) => (
                    <span key={metric.key} className="text-xs font-bold bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
                      {metric.money ? money(modele[metric.key]) : modele[metric.key]} {metric.label}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    )}
  </article>
);

export default Performances;
