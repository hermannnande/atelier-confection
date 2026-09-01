import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Search,
  Shirt,
  ShoppingBag,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const toInputDate = (date) => date.toISOString().slice(0, 10);

const shiftDate = (dateValue, days) => {
  const date = new Date(`${dateValue}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toInputDate(date);
};

const formatDate = (value, options = {}) => new Date(`${value}T12:00:00.000Z`)
  .toLocaleDateString('fr-FR', options);

const formatAmount = (value) => `${Number(value || 0).toLocaleString('fr-FR')} F`;

const Statistiques = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const today = toInputDate(new Date());
  const [dateDebut, setDateDebut] = useState(today);
  const [dateFin, setDateFin] = useState(today);
  const [modeleFilter, setModeleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user && !['gestionnaire', 'administrateur'].includes(user.role)) {
      toast.error('Accès refusé');
      navigate('/dashboard');
      return;
    }
    if (dateDebut && dateFin && dateDebut <= dateFin) fetchStats();
  }, [user, navigate, dateDebut, dateFin]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/commandes/statistiques/analyse', {
        params: { dateDebut, dateFin },
      });
      setStats(data);
      setModeleFilter((current) => (
        current && !(data.statistiquesParModele || []).some((item) => item.nom === current)
          ? ''
          : current
      ));
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const setRange = (start, end = start) => {
    setDateDebut(start);
    setDateFin(end);
  };

  const modeles = stats?.statistiquesParModele || [];
  const selectedModel = modeleFilter
    ? modeles.find((item) => item.nom === modeleFilter)
    : null;

  const displayedTotals = selectedModel || {
    recues: stats?.recues || 0,
    livrees: stats?.livrees || 0,
    annulees: stats?.annulees || 0,
    chiffreAffairesLivre: stats?.chiffreAffairesLivre || 0,
  };

  const chartData = useMemo(() => {
    const globalDays = stats?.commandesParJour || [];
    if (!selectedModel) return globalDays;
    const modelDays = new Map(
      (selectedModel.commandesParJour || []).map((item) => [item.date, item]),
    );
    return globalDays.map((day) => ({
      date: day.date,
      recues: modelDays.get(day.date)?.recues || 0,
      livrees: modelDays.get(day.date)?.livrees || 0,
      annulees: modelDays.get(day.date)?.annulees || 0,
    }));
  }, [stats, selectedModel]);

  const displayedModels = selectedModel ? [selectedModel] : modeles;
  const singleDay = dateDebut === dateFin;
  const periodLabel = singleDay
    ? formatDate(dateDebut, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `du ${formatDate(dateDebut)} au ${formatDate(dateFin)}`;

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <BarChart3 className="mr-3" size={28} />
            Statistiques réelles
          </h1>
          <p className="page-subtitle">Réceptions, livraisons et annulations selon leur date réelle</p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-black text-gray-800 flex items-center gap-2">
            <CalendarDays size={19} className="text-indigo-600" />
            Filtre de date
          </h2>
          {loading && <Loader2 className="animate-spin text-indigo-500" size={18} />}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
              <Search size={13} /> Modèle
            </span>
            <select
              value={modeleFilter}
              onChange={(event) => setModeleFilter(event.target.value)}
              className="input"
            >
              <option value="">Tous les modèles</option>
              {modeles.map((item) => <option key={item.nom} value={item.nom}>{item.nom}</option>)}
            </select>
          </label>
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-center">
            <p className="text-sm font-bold text-indigo-800 capitalize">
              {periodLabel}{selectedModel ? ` · ${selectedModel.nom}` : ''}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={ShoppingBag}
          label="Commandes reçues"
          value={displayedTotals.recues}
          color="from-indigo-500 to-purple-600"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Commandes livrées"
          value={displayedTotals.livrees}
          color="from-emerald-500 to-teal-600"
        />
        <KpiCard
          icon={XCircle}
          label="Commandes annulées"
          value={displayedTotals.annulees}
          color="from-rose-500 to-red-600"
        />
        <KpiCard
          icon={WalletCards}
          label="Montant livré"
          value={formatAmount(displayedTotals.chiffreAffairesLivre)}
          color="from-amber-500 to-orange-600"
          compact
        />
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
        <h2 className="font-black text-gray-800 mb-1">Activité réelle par jour</h2>
        <p className="text-xs text-gray-500 mb-4">
          Réception = date de création · Livraison = date de livraison · Annulation = date inscrite dans l’historique
        </p>
        {chartData.some((item) => item.recues || item.livrees || item.annulees) ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ left: -15, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatDate(value, { day: '2-digit', month: '2-digit' })}
                tick={{ fontSize: 10 }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(value) => formatDate(value, { day: 'numeric', month: 'long', year: 'numeric' })} />
              <Legend />
              <Bar dataKey="recues" name="Reçues" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="livrees" name="Livrées" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="annulees" name="Annulées" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400 py-12">Aucune activité pendant cette période</p>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-black text-gray-800 flex items-center gap-2">
              <Shirt size={19} className="text-purple-600" />
              Statistiques par modèle
            </h2>
            <p className="text-xs text-gray-500 mt-1">{displayedModels.length} modèle(s) sur la période choisie</p>
          </div>
        </div>

        {displayedModels.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                    <th className="py-3 pr-3">Modèle</th>
                    <th className="py-3 px-3 text-center">Reçues</th>
                    <th className="py-3 px-3 text-center">Livrées</th>
                    <th className="py-3 px-3 text-center">Annulées</th>
                    <th className="py-3 pl-3 text-right">Montant livré</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedModels.map((item) => (
                    <tr key={item.nom} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-3 font-bold text-gray-800">{item.nom}</td>
                      <td className="py-3 px-3 text-center font-black text-indigo-700">{item.recues}</td>
                      <td className="py-3 px-3 text-center font-black text-emerald-700">{item.livrees}</td>
                      <td className="py-3 px-3 text-center font-black text-rose-700">{item.annulees}</td>
                      <td className="py-3 pl-3 text-right font-bold text-gray-800">{formatAmount(item.chiffreAffairesLivre)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {displayedModels.map((item) => (
                <div key={item.nom} className="rounded-xl border border-gray-200 p-3">
                  <p className="font-black text-gray-900 mb-3">{item.nom}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Reçues" value={item.recues} className="bg-indigo-50 text-indigo-800" />
                    <MiniStat label="Livrées" value={item.livrees} className="bg-emerald-50 text-emerald-800" />
                    <MiniStat label="Annulées" value={item.annulees} className="bg-rose-50 text-rose-800" />
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-right">
                    Montant livré : <span className="font-black text-gray-800">{formatAmount(item.chiffreAffairesLivre)}</span>
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-gray-400 py-12">Aucun modèle pendant cette période</p>
        )}
      </section>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, color, compact = false }) => (
  <div className={`bg-gradient-to-br ${color} rounded-xl p-3 sm:p-4 text-white shadow-lg min-w-0`}>
    <div className="flex items-center gap-2 mb-1">
      <Icon size={18} className="flex-shrink-0" />
      <span className="text-[11px] sm:text-xs font-semibold opacity-90 truncate">{label}</span>
    </div>
    <p className={`${compact ? 'text-lg sm:text-xl' : 'text-2xl'} font-black truncate`}>{value}</p>
  </div>
);

const MiniStat = ({ label, value, className }) => (
  <div className={`rounded-lg py-2 px-1 ${className}`}>
    <p className="text-[10px] font-bold uppercase">{label}</p>
    <p className="text-lg font-black">{value}</p>
  </div>
);

export default Statistiques;
