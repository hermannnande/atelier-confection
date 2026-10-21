import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ClipboardCheck, Minus, PackageCheck, PackageX, Plus, RefreshCw, Scissors, Truck, X,
} from 'lucide-react';
import api from '../services/api';
import { useCountryStore } from '../store/countryStore';
import { workshopOperation } from '../utils/workshopOperations';

const formatDay = value => (value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '');
const pieceId = colis => `${colis.commandeId}:${colis.articleKey}`;

// Comptage physique d'une tenue : le responsable dit, colis par colis, si la robe
// est là, puis compte les robes libres sur l'étagère. Les tenues refusées gardées
// par les livreurs sont ajoutées automatiquement.
export default function StockVerificationModal({ cle, onClose, onDone }) {
  const { currentCountry } = useCountryStore();
  const [view, setView] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState({});
  const [shelf, setShelf] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await api.get('/stock/verification', { params: { cle }, timeout: 20000 });
      setView(data);
      setAnswers({});
      setShelf('');
    } catch (error) {
      setLoadError(error.response?.data?.message || 'La vérification n’a pas pu être chargée. Réessayez.');
    }
  }, [cle]);

  useEffect(() => { load(); }, [load]);

  const colis = view?.colis || [];
  const livreurs = view?.livreurs || [];
  const enRoute = view?.enRoute || [];
  const present = colis.filter(c => answers[pieceId(c)] === true).length;
  const absent = colis.filter(c => answers[pieceId(c)] === false);
  const answered = colis.every(c => typeof answers[pieceId(c)] === 'boolean');
  const shelfCount = shelf === '' ? null : Number(shelf);
  const shelfValid = Number.isInteger(shelfCount) && shelfCount >= 0;
  const target = shelfValid ? shelfCount + present + livreurs.length + enRoute.length : null;
  const canSave = Boolean(view) && answered && shelfValid && !saving;

  const save = async () => {
    if (!canSave || lock.current) return;
    lock.current = true;
    setSaving(true);
    const reponses = colis.map(c => ({ commandeId: c.commandeId, articleKey: c.articleKey, present: answers[pieceId(c)] }));
    const signature = reponses.map(r => `${pieceId(r)}=${r.present ? 1 : 0}`).join(',');
    try {
      const { data } = await api.post('/stock/verification', {
        // Même identifiant si la même saisie est renvoyée : jamais compté deux fois.
        operationId: workshopOperation(`${currentCountry || 'CI'}:verification:${cle}:${view.revision}:${signature}:${shelfCount}`),
        cle,
        revision: view.revision,
        etagere: shelfCount,
        colis: reponses,
      }, { timeout: 30000 });
      const remis = data.colisRemisEnAttente || [];
      const aFinaliser = enRoute.map(item => item.numero).filter(Boolean);
      toast.success(`Stock vérifié : ${data.stockApres} robe(s).`
        + `${remis.length ? ` Remise(s) en attente de tenue : ${remis.join(', ')}.` : ''}`
        + `${aFinaliser.length ? ` Finalisez maintenant l’affectation de ${aFinaliser.join(', ')} dans Caisse Livreurs.` : ''}`, { duration: 8000 });
      onDone?.(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Vérification non confirmée. Rouvrez-la : si elle a réussi, le stock est déjà corrigé.', { duration: 8000 });
      if (error.response?.status === 409) await load();
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  const changeShelf = (step) => setShelf(value => String(Math.max(0, (Number(value) || 0) + step)));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="stock-verification-title">
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-amber-600 to-orange-600 p-4 text-white sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5 ring-1 ring-white/20"><ClipboardCheck size={22} /></div>
            <div className="min-w-0">
              <h2 id="stock-verification-title" className="text-lg font-black sm:text-xl">Vérifier le stock</h2>
              <p className="truncate text-xs font-semibold text-white/85 sm:text-sm">
                {view ? `${view.modele} · ${view.couleur} · ${view.taille}` : 'Chargement…'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 transition hover:bg-white/20" aria-label="Fermer">
            <X size={22} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-5">
          {loadError && (
            <div role="alert" className="flex flex-col gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-bold">{loadError}</span>
              <button type="button" onClick={load} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white">
                <RefreshCw size={14} /> Réessayer
              </button>
            </div>
          )}
          {!view && !loadError && (
            <div className="flex justify-center py-12"><div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" /></div>
          )}

          {view && (
            <>
              <p className="rounded-xl bg-white p-3 text-sm text-gray-700 ring-1 ring-gray-200">
                Le stock indique <b className="text-gray-950">{view.stock.total} robe(s)</b>.
                {colis.length > 0 && <> {colis.length} colis en préparation en retiennent une.</>}
                {livreurs.length > 0 && <> {livreurs.length} tenue(s) refusée(s) sont encore chez les livreurs.</>}
                {enRoute.length > 0 && <> {enRoute.length} est partie avec un livreur sans que l’affectation soit finalisée.</>}
                {' '}Comptez ce qui est réellement là.
              </p>
              {view.enCoursAtelier > 0 && (
                <p className="flex gap-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-900 ring-1 ring-blue-100 sm:text-sm">
                  <Scissors size={16} className="mt-0.5 flex-shrink-0" />
                  {view.enCoursAtelier} pièce(s) de cette tenue sont encore à l’atelier : ne les comptez pas tant qu’elles ne sont pas reçues dans « Tenues à recevoir ».
                </p>
              )}

              {colis.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-black text-gray-900">1. Ouvrez chaque colis : la robe est-elle dedans ?</h3>
                  <ul className="space-y-2">
                    {colis.map((c) => {
                      const answer = answers[pieceId(c)];
                      return (
                        <li key={pieceId(c)} className={`rounded-xl bg-white p-3 ring-1 ${answer === false ? 'ring-red-300' : answer === true ? 'ring-emerald-300' : 'ring-gray-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-black text-gray-950">
                                {c.numero || 'Commande'}
                                {c.articleKey !== 'principal' && <span className="ml-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700">article ajouté</span>}
                              </p>
                              <p className="truncate text-xs font-semibold text-gray-500">{[c.client?.nom, c.client?.ville].filter(Boolean).join(' · ')}</p>
                              {c.depuis && <p className="text-[11px] text-gray-400">En préparation depuis le {formatDay(c.depuis)}</p>}
                            </div>
                            {c.emballe && <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">Emballé</span>}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              aria-pressed={answer === true}
                              onClick={() => setAnswers(previous => ({ ...previous, [pieceId(c)]: true }))}
                              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-black transition sm:text-sm ${answer === true ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-emerald-50'}`}
                            >
                              <PackageCheck size={16} /> Robe présente
                            </button>
                            <button
                              type="button"
                              aria-pressed={answer === false}
                              onClick={() => setAnswers(previous => ({ ...previous, [pieceId(c)]: false }))}
                              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-black transition sm:text-sm ${answer === false ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-red-50'}`}
                            >
                              <PackageX size={16} /> Robe absente
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {livreurs.length > 0 && (
                <section className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                  <h3 className="flex items-center gap-1.5 text-sm font-black text-gray-900"><Truck size={16} className="text-amber-600" /> Chez les livreurs (comptées automatiquement)</h3>
                  <ul className="mt-1.5 space-y-1 text-xs font-semibold text-gray-600 sm:text-sm">
                    {livreurs.map((item, index) => <li key={index}>{item.livreur}{item.depuis ? ` — refus du ${formatDay(item.depuis)}` : ''}</li>)}
                  </ul>
                </section>
              )}

              {enRoute.length > 0 && (
                <section className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                  <h3 className="flex items-center gap-1.5 text-sm font-black text-amber-950"><AlertTriangle size={16} /> En route, affectation à finaliser (comptée automatiquement)</h3>
                  <ul className="mt-1.5 space-y-1 text-xs font-semibold text-amber-900 sm:text-sm">
                    {enRoute.map((item, index) => <li key={index}>{item.numero || 'Commande'} — {item.livreur}{item.depuis ? `, affectée le ${formatDay(item.depuis)}` : ''}</li>)}
                  </ul>
                  <p className="mt-1.5 text-xs text-amber-900">Après la vérification, finalisez cette affectation dans Caisse Livreurs.</p>
                </section>
              )}

              <section className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                <label htmlFor="stock-verification-shelf" className="text-sm font-black text-gray-900">
                  {colis.length > 0 ? '2. ' : ''}Robes libres sur l’étagère (hors colis)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={() => changeShelf(-1)} className="rounded-lg bg-gray-100 p-2.5 text-gray-700 hover:bg-gray-200" aria-label="Une de moins"><Minus size={18} /></button>
                  <input
                    id="stock-verification-shelf"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={shelf}
                    onChange={(event) => setShelf(event.target.value)}
                    placeholder="?"
                    className="input w-24 !py-2 text-center text-lg font-black"
                  />
                  <button type="button" onClick={() => changeShelf(1)} className="rounded-lg bg-gray-100 p-2.5 text-gray-700 hover:bg-gray-200" aria-label="Une de plus"><Plus size={18} /></button>
                </div>
              </section>

              <section className="rounded-xl bg-white p-3 ring-1 ring-emerald-200">
                <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">Nouveau stock</p>
                <p className="mt-1 text-xs font-bold text-gray-600 sm:text-sm">
                  {shelfValid ? shelfCount : '?'} sur l’étagère + {present} dans les colis{livreurs.length > 0 ? ` + ${livreurs.length} chez les livreurs` : ''}{enRoute.length > 0 ? ` + ${enRoute.length} en route` : ''}
                </p>
                <p className="mt-0.5 text-2xl font-black text-emerald-700">
                  = {target ?? '…'} <span className="text-sm font-bold text-gray-500">(actuellement {view.stock.total})</span>
                </p>
                {absent.length > 0 && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-bold text-red-800">
                    {absent.length} commande(s) repasseront en attente de tenue : {absent.map(c => c.numero).join(', ')}.
                    {' '}Elles seront servies par le stock si une robe est libre, sinon proposées à l’atelier, sans perdre leur date de validation.
                  </p>
                )}
              </section>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-white p-3 sm:flex-row sm:justify-end sm:p-4">
          <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-black text-gray-700 hover:bg-gray-200">Annuler</button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ClipboardCheck size={17} />
            {saving ? 'Enregistrement…' : !answered ? 'Répondez pour chaque colis' : !shelfValid ? 'Indiquez l’étagère' : 'Enregistrer la vérification'}
          </button>
        </div>
      </div>
    </div>
  );
}
