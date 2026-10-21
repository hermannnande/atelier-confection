import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AtelierLots from '../components/AtelierLots';
import StockVerificationModal from '../components/StockVerificationModal';
import { workshopOperation } from '../utils/workshopOperations';
import { AlertCircle, ClipboardCheck, Package, RefreshCw, Scissors, Search, Sparkles, WifiOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCountryStore } from '../store/countryStore';
import {
  describeRequestError,
  isRetryableRequestError,
  retryDelayMs,
} from '../utils/requestErrors';
import {
  nextRefreshDelayMs,
  pendingModelsState,
  readPendingModelsSnapshot,
  savePendingModelsSnapshot,
} from '../utils/pendingModelsSnapshot';

// Au-delà, la requête est abandonnée : le bouton ne tourne jamais sans fin.
const REQUEST_TIMEOUT_MS = 15000;
// Une seule nouvelle tentative, et seulement après un échec rapide (serveur en
// redémarrage, réseau coupé), pour que l'attente reste courte.
const FAST_FAILURE_MS = 5000;

const formatTime = (value, withSeconds = false) => (value
  ? new Date(value).toLocaleTimeString('fr-FR', withSeconds
    ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' })
  : '');

const waitFor = (ms, signal) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(resolve, ms);
  signal.addEventListener('abort', () => {
    window.clearTimeout(timer);
    reject(signal.reason);
  }, { once: true });
});

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
  const { user } = useAuthStore();
  const { currentCountry } = useCountryStore();
  const country = currentCountry || user?.pays_code || 'CI';

  // Le dernier état connu s'affiche tout de suite, la mise à jour suit.
  const [suivi, setSuivi] = useState(() => readPendingModelsSnapshot(country));
  const [loading, setLoading] = useState(suivi === null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [starting, setStarting] = useState(null);
  const startLock = useRef(false);
  // Le responsable du stock débloque une tenue « à vérifier » ; le styliste lance la découpe.
  const canVerifyStock = ['gestionnaire_stock', 'gestionnaire', 'administrateur'].includes(user?.role);
  const canStartLots = ['styliste', 'gestionnaire', 'administrateur'].includes(user?.role);
  const [verifying, setVerifying] = useState(null);

  const requestRef = useRef(null);
  const timerRef = useRef(null);
  const failuresRef = useRef(0);
  const scheduleRef = useRef(() => {});

  // Une seule lecture à la fois : un clic pendant une mise à jour attend sa
  // réponse au lieu d'envoyer une deuxième requête. Le chargement se termine
  // toujours : réponse, erreur ou délai dépassé.
  const load = useCallback(({ manual = false } = {}) => {
    if (manual) setRefreshing(true);
    if (requestRef.current) {
      if (manual) requestRef.current.manual = true;
      return requestRef.current.promise;
    }

    window.clearTimeout(timerRef.current);
    const controller = new AbortController();
    const request = { controller, manual, promise: null };
    requestRef.current = request;
    setSyncing(true);

    const fetchSuivi = () => api.get('/commandes/modeles-en-attente/suivi', {
      signal: controller.signal,
      timeout: REQUEST_TIMEOUT_MS,
    });

    request.promise = (async () => {
      const startedAt = Date.now();
      try {
        let response;
        try {
          response = await fetchSuivi();
        } catch (error) {
          if (!isRetryableRequestError(error) || Date.now() - startedAt > FAST_FAILURE_MS) throw error;
          await waitFor(retryDelayMs(error), controller.signal);
          response = await fetchSuivi();
        }
        // Page quittée ou pays changé pendant la lecture.
        if (controller.signal.aborted) return;

        const next = pendingModelsState(response.data);
        setSuivi(next);
        savePendingModelsSnapshot(country, next);
        failuresRef.current = 0;
        setLoadError(null);
        if (request.manual) toast.success('Liste à jour', { id: 'modeles-en-attente', duration: 1500 });
      } catch (error) {
        if (controller.signal.aborted) return;
        failuresRef.current += 1;
        const message = describeRequestError(error);
        setLoadError({ message, at: Date.now() });
        if (request.manual) toast.error(message, { id: 'modeles-en-attente' });
        console.error('Modèles en attente :', error);
      } finally {
        if (requestRef.current === request) {
          requestRef.current = null;
          setSyncing(false);
          setRefreshing(false);
          setLoading(false);
          scheduleRef.current();
        }
      }
    })();
    return request.promise;
  }, [country]);

  useEffect(() => {
    const cached = readPendingModelsSnapshot(country);
    setSuivi(cached);
    setLoading(cached === null);
    setLoadError(null);
    failuresRef.current = 0;

    // Mise à jour automatique après chaque réponse, suspendue quand l'onglet
    // est caché (téléphone en veille, autre onglet) et reprise au retour.
    scheduleRef.current = () => {
      window.clearTimeout(timerRef.current);
      if (document.visibilityState === 'hidden') return;
      timerRef.current = window.setTimeout(() => load(), nextRefreshDelayMs(failuresRef.current));
    };
    const resume = () => {
      if (document.visibilityState === 'hidden') {
        window.clearTimeout(timerRef.current);
        return;
      }
      load();
    };

    load();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      scheduleRef.current = () => {};
      window.clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      const pending = requestRef.current;
      requestRef.current = null;
      pending?.controller.abort();
    };
  }, [country, load]);

  const groupes = useMemo(() => suivi?.groupes || [], [suivi]);
  const totalCommandes = suivi?.totalCommandes || 0;
  const totalValidees = suivi?.totalValidees || 0;
  const totalCouvertesStock = suivi?.totalCouvertesStock || 0;
  const lastRefresh = useMemo(() => new Date(suivi?.serverNow || Date.now()), [suivi]);
  const refreshManually = () => load({ manual: true });
  const startLot = async variation => {
    if (startLock.current || !variation.pieces?.length) return;
    startLock.current = true;
    setStarting(variation.key);
    try {
      const scope = variation.pieces.map(p => `${p.commandeId}:${p.articleKey}`).sort().join(',');
      await api.post('/commandes/modeles-en-attente/lots', {
        operationId: workshopOperation(`${country}:start:${scope}`), key: variation.key, pieces: variation.pieces,
      }, { timeout: 20000 });
      toast.success('C’est enregistré. Ces pièces restent dans « Mes tenues en cours » jusqu’à leur réception.');
      window.dispatchEvent(new Event('atelier-updated'));
      // Remove the exact displayed work immediately, without waiting for the cached summary.
      const selected = new Set(variation.pieces.map(p => `${p.commandeId}:${p.articleKey}`));
      setSuivi(previous => ({ ...previous,
        totalCommandes: Math.max(0, previous.totalCommandes - selected.size),
        totalEnCours: (previous.totalEnCours || 0) + selected.size,
        groupes: previous.groupes.map(g => {
          const variations = g.variations.map(v => {
            const pieces = (v.pieces || []).filter(p => !selected.has(`${p.commandeId}:${p.articleKey}`));
            return { ...v, pieces, quantite: pieces.length, urgentes: pieces.filter(p => p.urgence).length };
          }).filter(v => v.quantite > 0);
          return { ...g, variations, total: variations.reduce((n,v) => n + v.quantite, 0) };
        }).filter(g => g.variations.length) }));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action non confirmée. Actualisez : si elle a réussi, les pièces sont déjà en cours.');
      await load();
    } finally { startLock.current = false; setStarting(null); }
  };

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
              .map((variation) => ({ ...variation, quantite: variation.urgentes, pieces: variation.pieces?.filter(p => p.urgence) })),
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

  const header = (
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
            Commencez un groupe une seule fois. Il restera suivi jusqu’à sa réception.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={refreshManually}
        disabled={refreshing}
        aria-busy={refreshing}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-60 sm:w-auto sm:text-sm"
      >
        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Actualisation…' : 'Actualiser'}
      </button>
    </div>
  );

  // Premier chargement en échec et rien en mémoire : on le dit clairement au
  // lieu d'afficher « Aucun modèle en attente ».
  if (!suivi) {
    return (
      <div className="max-w-full space-y-4 overflow-x-hidden animate-fade-in sm:space-y-6">
        {header}
        <div className="card !p-8 text-center sm:!p-12">
          <WifiOff className="mx-auto mb-3 text-amber-500" size={42} />
          <h3 className="mb-1 text-lg font-bold text-gray-900 sm:text-xl">Impossible de charger les modèles en attente</h3>
          <p className="mb-4 text-sm text-gray-600">{loadError?.message || 'Réessayez dans quelques secondes.'}</p>
          <button
            type="button"
            onClick={refreshManually}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-4 overflow-x-hidden animate-fade-in sm:space-y-6">
      {header}

      <AtelierLots />
      {suivi.totalAVerifier > 0 && <p role="alert" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">Des pièces déjà reçues nécessitent une vérification du stock par le responsable. Elles ne sont pas redemandées à la découpe.</p>}

      {loadError && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <WifiOff size={18} className="mt-0.5 flex-shrink-0" />
            <div className="min-w-0 text-xs sm:text-sm">
              <p className="font-bold">{loadError.message}</p>
              <p className="text-amber-800">
                Données affichées : {formatTime(suivi.generatedAt, true)}. Nouvel essai automatique dans quelques secondes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshManually}
            disabled={refreshing}
            className="inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-60 sm:text-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Réessayer
          </button>
        </div>
      )}

      {suivi.stale && !loadError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Base de données lente : données de {formatTime(suivi.generatedAt, true)}, mises à jour dès qu’elle répond.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
        <div className="stat-card !rounded-xl !p-3 sm:!rounded-2xl sm:!p-5">
          <p className="text-[10px] font-bold uppercase text-gray-500 sm:text-xs">Modèles à préparer</p>
          <p className="mt-1 text-2xl font-black text-purple-700 sm:text-3xl">{groupes.length}</p>
        </div>
        <div className="stat-card !rounded-xl !p-3 sm:!rounded-2xl sm:!p-5">
          <p className="text-[10px] font-bold uppercase text-gray-500 sm:text-xs">Pièces à confectionner</p>
          <p className="mt-1 text-2xl font-black text-pink-700 sm:text-3xl">{totalCommandes}</p>
        </div>
        <div className="stat-card col-span-2 !rounded-xl !p-3 sm:col-span-1 sm:!rounded-2xl sm:!p-5">
          <p className="text-[10px] font-bold uppercase text-gray-500 sm:text-xs">Couvertes par le stock</p>
          <p className="mt-1 text-2xl font-black text-emerald-700 sm:text-3xl">{totalCouvertesStock}</p>
          <p className="text-[10px] text-gray-500 sm:text-xs">sur {totalValidees} commande(s) validée(s)</p>
        </div>
      </div>

      {groupes.length > 0 && (
        <div className="card !rounded-xl !p-2.5 sm:!rounded-2xl sm:!p-4">
          <div className="mb-2.5 grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              aria-pressed={filterMode === 'all'}
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
              aria-pressed={filterMode === 'recent'}
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
              aria-pressed={filterMode === 'urgent'}
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
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400 sm:text-xs">
            Nouveautés visibles 1 h · Mise à jour automatique · {formatTime(suivi.generatedAt)}
            {syncing && <RefreshCw size={10} className="animate-spin" aria-label="Mise à jour en cours" />}
          </p>
        </div>
      )}

      {filteredGroupes.length === 0 ? (
        <div className="card !p-8 text-center sm:!p-12">
          <Package className="mx-auto mb-3 text-emerald-500" size={42} />
          <h3 className="mb-1 text-lg font-bold text-gray-900 sm:text-xl">
            {groupes.length === 0
              ? 'Aucune nouvelle découpe à commencer'
              : filterMode === 'recent' && totalNouveautes === 0
                ? 'Aucune arrivée récente'
                : filterMode === 'urgent' && totalUrgences === 0
                ? 'Aucune urgence en attente'
                : 'Aucun résultat'}
          </h3>
          <p className="text-sm text-gray-600">
            {groupes.length === 0
              ? totalValidees > 0
                ? 'Les pièces sont déjà en cours ou disponibles. Consultez le suivi ci-dessus.'
                : 'Aucune commande ne nécessite actuellement de préparation.'
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
                    <img
                      src={groupe.image}
                      alt={groupe.nom}
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
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
                  <div key={variation.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
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
                    {variation.aVerifier && canVerifyStock ? (
                      <button
                        type="button"
                        onClick={() => setVerifying(variation)}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-3 font-bold text-white hover:bg-amber-600">
                        <ClipboardCheck size={18} /> Vérifier le stock
                      </button>
                    ) : canStartLots && <button
                      type="button" disabled={!!starting || !!loadError || suivi.stale || variation.aVerifier || !variation.pieces?.length}
                      onClick={() => startLot(variation)}
                      className="min-h-12 w-full rounded-xl bg-purple-700 px-3 py-3 font-bold text-white disabled:opacity-50">
                      {variation.aVerifier ? 'Stock à vérifier avec le responsable' : starting === variation.key ? 'Enregistrement…' : `Je commence ces ${variation.pieces?.length || variation.quantite} pièce(s)`}
                    </button>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {verifying && (
        <StockVerificationModal
          cle={verifying.key}
          onClose={() => setVerifying(null)}
          onDone={() => {
            const key = verifying.key;
            setVerifying(null);
            // Le serveur garde le calcul 4 s : la carte est débloquée tout de suite,
            // puis la liste est relue avec les quantités vérifiées.
            setSuivi(previous => ({ ...previous, groupes: previous.groupes.map(g => ({
              ...g, variations: g.variations.map(v => (v.key === key ? { ...v, aVerifier: false } : v)),
            })) }));
            window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => load({ manual: true }), 4500);
          }}
        />
      )}
    </div>
  );
};

export default ModelesEnAttente;
