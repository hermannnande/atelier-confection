import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AlertCircle, Package, RefreshCw, Scissors, Search, Sparkles } from 'lucide-react';

const relativeArrival = (value, now) => {
  if (!value) return '';
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 60000));
  if (elapsedMinutes < 1) return "à l'instant";
  if (elapsedMinutes < 60) return `il y a ${elapsedMinutes} min`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `il y a ${elapsedHours} h`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `il y a ${elapsedDays} j`;
};

const ModelesEnAttente = () => {
  const [groupes, setGroupes] = useState([]);
  const [totalCommandes, setTotalCommandes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchSuivi = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await api.get('/commandes/modeles-en-attente/suivi');
      setGroupes(response.data.groupes || []);
      setTotalCommandes(response.data.totalCommandes || 0);
      setLastRefresh(new Date(response.data.serverNow || Date.now()));
    } catch (error) {
      if (!silent) toast.error(error.response?.data?.message || 'Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuivi();
    const intervalId = setInterval(() => fetchSuivi(true), 5000);
    return () => clearInterval(intervalId);
  }, []);

  const totalUrgences = useMemo(
    () => groupes.reduce((total, groupe) => total + (groupe.urgentes || 0), 0),
    [groupes],
  );
  const totalNouveautes = useMemo(
    () => groupes.reduce((total, groupe) => total + (groupe.nouveau || 0), 0),
    [groupes],
  );

  const filteredGroupes = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('fr');
    return groupes
      .filter((groupe) => (
        filterMode === 'all' ||
        (filterMode === 'recent' && groupe.nouveau > 0) ||
        (filterMode === 'urgent' && groupe.urgentes > 0)
      ))
      .map((groupe) => {
        if (filterMode === 'urgent') {
          return {
            ...groupe,
            total: groupe.urgentes,
            variations: groupe.variations
              .filter((variation) => variation.urgentes > 0)
              .map((variation) => ({ ...variation, quantite: variation.urgentes })),
          };
        }
        if (filterMode === 'recent') {
          return {
            ...groupe,
            variations: groupe.variations.filter((variation) => variation.nouveau > 0),
          };
        }
        return groupe;
      })
      .filter((groupe) => (
        !term ||
        groupe.nom.toLocaleLowerCase('fr').includes(term) ||
        groupe.variations.some((variation) => (
          variation.couleur.toLocaleLowerCase('fr').includes(term) ||
          variation.taille.toLocaleLowerCase('fr').includes(term)
        ))
      ));
  }, [filterMode, groupes, searchTerm]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-4 overflow-x-hidden animate-fade-in sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 shadow-lg sm:rounded-2xl sm:p-4">
            <Scissors className="h-6 w-6 text-white sm:h-8 sm:w-8" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent sm:text-3xl lg:text-4xl">
              Modèles en attente
            </h1>
            <p className="text-xs font-medium text-gray-600 sm:text-sm lg:text-base">
              Commandes validées à préparer, regroupées par modèle
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchSuivi()}
          disabled={refreshing}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-60 sm:w-auto sm:text-sm"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <div className="stat-card !rounded-xl !p-3 sm:!rounded-2xl sm:!p-5">
          <p className="text-[10px] font-bold uppercase text-gray-500 sm:text-xs">Modèles à préparer</p>
          <p className="mt-1 text-2xl font-black text-purple-700 sm:text-3xl">{groupes.length}</p>
        </div>
        <div className="stat-card !rounded-xl !p-3 sm:!rounded-2xl sm:!p-5">
          <p className="text-[10px] font-bold uppercase text-gray-500 sm:text-xs">Pièces attendues</p>
          <p className="mt-1 text-2xl font-black text-pink-700 sm:text-3xl">{totalCommandes}</p>
        </div>
      </div>

      {groupes.length > 0 && (
        <div className="card !rounded-xl !p-2.5 sm:!rounded-2xl sm:!p-4">
          <div className="mb-2.5 grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-lg px-2 py-2 text-[11px] font-black transition-colors sm:px-3 sm:text-sm ${
                filterMode === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Toutes ({totalCommandes})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('recent')}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-black transition-colors sm:gap-1.5 sm:px-3 sm:text-sm ${
                filterMode === 'recent'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Sparkles size={14} /> Récents ({totalNouveautes})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('urgent')}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-black transition-colors sm:gap-1.5 sm:px-3 sm:text-sm ${
                filterMode === 'urgent'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <AlertCircle size={15} /> Urgences ({totalUrgences})
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Rechercher un modèle, une couleur ou une taille…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="input !py-2 pl-10 pr-3 text-sm sm:!py-3 sm:text-base"
            />
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400 sm:text-xs">
            Nouveautés visibles 1 h · Mise à jour automatique · {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}

      {filteredGroupes.length === 0 ? (
        <div className="card !p-8 text-center sm:!p-12">
          <Package className="mx-auto mb-3 text-emerald-500" size={42} />
          <h3 className="mb-1 text-lg font-bold text-gray-900 sm:text-xl">
            {groupes.length === 0
              ? 'Aucun modèle en attente'
              : filterMode === 'recent' && totalNouveautes === 0
                ? 'Aucune arrivée récente'
                : filterMode === 'urgent' && totalUrgences === 0
                ? 'Aucune urgence en attente'
                : 'Aucun résultat'}
          </h3>
          <p className="text-sm text-gray-600">
            {groupes.length === 0
              ? 'Aucune commande ne nécessite actuellement de préparation.'
              : filterMode === 'recent' && totalNouveautes === 0
                ? 'Aucune nouvelle commande validée au cours de la dernière heure.'
                : filterMode === 'urgent' && totalUrgences === 0
                ? 'Toutes les commandes à préparer sont actuellement normales.'
                : 'Modifiez votre recherche pour retrouver un modèle.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {filteredGroupes.map((groupe) => (
            <article
              key={groupe.id}
              className={`overflow-hidden rounded-xl border bg-white shadow-md transition-shadow hover:shadow-lg ${
                groupe.nouveau > 0
                  ? 'border-emerald-400 ring-2 ring-emerald-100'
                  : groupe.urgentes > 0
                    ? 'border-red-300'
                    : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 p-3">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 sm:h-16 sm:w-16">
                  {groupe.image ? (
                    <img src={groupe.image} alt={groupe.nom} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="text-purple-400" size={26} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-black leading-tight text-gray-900 sm:text-lg">{groupe.nom}</h2>
                  <p className="mt-1 text-xs font-bold text-purple-700">
                    {groupe.total} pièce{groupe.total > 1 ? 's' : ''} {filterMode === 'urgent' ? 'urgente' : 'à préparer'}{filterMode === 'urgent' && groupe.total > 1 ? 's' : ''}
                  </p>
                  {groupe.nouveau > 0 && groupe.derniereArrivee && (
                    <p className="mt-0.5 text-[10px] font-semibold text-emerald-700 sm:text-xs">
                      Dernière arrivée {relativeArrival(groupe.derniereArrivee, lastRefresh)}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  {groupe.nouveau > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                      +{groupe.nouveau} récente{groupe.nouveau > 1 ? 's' : ''}
                    </span>
                  )}
                  {groupe.urgentes > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-700" title="Commandes urgentes">
                      <AlertCircle size={11} /> {groupe.urgentes}
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-100 px-3">
                {groupe.variations.map((variation) => (
                  <div key={variation.id} className="flex items-center gap-2 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-bold text-gray-800">{variation.couleur}</p>
                      <p className="text-xs font-semibold text-gray-500">Taille {variation.taille}</p>
                    </div>
                    {variation.nouveau > 0 && (
                      <span
                        className="flex-shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-black leading-none text-emerald-700"
                        title={`${variation.nouveau} arrivée${variation.nouveau > 1 ? 's' : ''} récente${variation.nouveau > 1 ? 's' : ''}`}
                        aria-label="Ajout récent"
                      >
                        +{variation.nouveau}
                      </span>
                    )}
                    {variation.urgentes > 0 && (
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" title="Urgent" />
                    )}
                    <span className="min-w-9 rounded-lg bg-purple-100 px-2 py-1 text-center text-sm font-black text-purple-800">
                      ({variation.quantite})
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelesEnAttente;
