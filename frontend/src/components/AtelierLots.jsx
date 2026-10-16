import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, PackageCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCountryStore } from '../store/countryStore';
import { workshopOperation } from '../utils/workshopOperations';

function Lots({ country, onReceived }) {
  const { user } = useAuthStore();
  const receive = ['gestionnaire_stock', 'gestionnaire', 'administrateur'].includes(user?.role);
  const manager = ['gestionnaire', 'administrateur'].includes(user?.role);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [partial, setPartial] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const lock = useRef(false);
  const alive = useRef(true);
  const loading = useRef(false);
  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const response = await api.get('/commandes/modeles-en-attente/lots', { timeout: 15000 });
      if (alive.current) { setData(response.data); setError(''); }
    } catch {
      if (alive.current) setError('La liste des lots n’a pas pu être actualisée. Réessayez avant de recevoir des pièces.');
    } finally { loading.current = false; }
  }, []);
  useEffect(() => {
    alive.current = true;
    load();
    const timer = window.setInterval(() => { if (document.visibilityState !== 'hidden') load(); }, 5000);
    window.addEventListener('atelier-updated', load);
    window.addEventListener('online', load);
    return () => { alive.current = false; clearInterval(timer); window.removeEventListener('atelier-updated', load); window.removeEventListener('online', load); };
  }, [load]);
  const confirm = async (lot, count) => {
    if (lock.current || !Number.isInteger(count) || count < 1 || count > lot.quantite - lot.recues) return;
    lock.current = true;
    setBusy(lot.id);
    try {
      const { data: result } = await api.post(`/commandes/modeles-en-attente/lots/${lot.id}/recevoir`, {
        operationId: workshopOperation(`${country}:receive:${lot.id}:${lot.recues}:${count}`),
        quantity: count, expectedReceived: lot.recues,
      }, { timeout: 20000 });
      if (!alive.current) return;
      setData(previous => ({ ...previous, lots: previous.lots.map(l => l.id === lot.id ? result.lot : l) }));
      setPartial(null);
      toast.success(`${count} pièce${count > 1 ? 's' : ''} reçue${count > 1 ? 's' : ''} et réservée${count > 1 ? 's' : ''} aux commandes.`);
      onReceived?.();
      window.dispatchEvent(new Event('atelier-updated'));
    } catch (e) {
      if (alive.current) toast.error(e.response?.data?.message || 'Réception non confirmée. Actualisez : si elle a réussi, elle sera déjà comptée.');
      await load();
    } finally { lock.current = false; if (alive.current) setBusy(null); }
  };
  const active = (data?.lots || []).filter(l => l.recues < l.quantite);
  const completed = (data?.lots || []).filter(l => l.recues === l.quantite);
  return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5" aria-label="Suivi des tenues à l’atelier">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black text-emerald-950"><PackageCheck />{receive ? 'Tenues à recevoir' : 'Mes tenues en cours'}</h2>
        <p className="mt-1 text-sm text-emerald-900">{receive ? 'Confirmez seulement les pièces que vous avez reçues. Le stock et les commandes se mettent à jour ensemble.' : 'Ces pièces sont déjà commencées. Ne les découpez pas une deuxième fois. Armanda confirmera leur réception ici.'}</p>
      </div>
      <button type="button" onClick={load} className="rounded-lg p-2 text-emerald-900 hover:bg-emerald-100" aria-label="Actualiser les lots"><RefreshCw size={20} /></button>
    </div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">{error}</p>}
    {!data && !error && <p className="mt-3 text-sm">Chargement des tenues…</p>}
    {data && active.length === 0 && <p className="mt-4 text-sm text-emerald-900">Aucun lot en attente de réception.</p>}
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {active.map(lot => <article key={lot.id} className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
        <div className="flex gap-3">
          {lot.article.image && <img src={lot.article.image} alt={lot.article.modele} className="h-24 w-20 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-gray-900">{lot.article.modele}</h3>
            <p className="text-sm text-gray-700">{lot.article.couleur} · Taille {lot.article.taille}</p>
            <p className="mt-2 text-xl font-black text-emerald-800">{lot.quantite - lot.recues} à recevoir</p>
            <p className="text-xs text-gray-500">{lot.recues} reçue{lot.recues > 1 ? 's' : ''} sur {lot.quantite} · commencé le {new Date(lot.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        {lot.aVerifier ? <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Une commande a changé. Le responsable doit vérifier ce lot. Ne recommencez pas la découpe.</p>
          : receive && <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!!busy || !!error} onClick={() => confirm(lot, lot.quantite - lot.recues)} className="min-h-12 flex-1 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50">{busy === lot.id ? 'Enregistrement…' : 'Tout reçu'}</button>
            {lot.quantite - lot.recues > 1 && <button type="button" disabled={!!busy || !!error} onClick={() => { setPartial(lot.id); setQuantity(1); }} className="min-h-12 flex-1 rounded-xl border border-emerald-700 px-4 py-3 font-bold text-emerald-800 disabled:opacity-50">Reçu une partie</button>}
          </div>}
        {partial === lot.id && !lot.aVerifier && <form onSubmit={e => { e.preventDefault(); confirm(lot, Number(quantity)); }} className="mt-3 rounded-xl bg-gray-50 p-3">
          <label className="block text-sm font-bold" htmlFor={`quantity-${lot.id}`}>Combien de pièces avez-vous reçues maintenant ?</label>
          <input id={`quantity-${lot.id}`} type="number" inputMode="numeric" min="1" max={lot.quantite - lot.recues} step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} className="my-2 w-full rounded-lg border p-3 text-xl" />
          <button type="submit" disabled={!!busy || !!error} className="rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50">Confirmer {quantity || 0} pièce(s) reçue(s)</button>
          <button type="button" onClick={() => setPartial(null)} className="ml-3 p-2 text-sm">Annuler</button>
        </form>}
      </article>)}
    </div>
    {completed.length > 0 && <details className="mt-4 text-sm text-emerald-900"><summary className="cursor-pointer font-bold">{completed.length} lot(s) entièrement reçu(s) depuis hier</summary>
      {completed.map(l => <p key={l.id} className="mt-2 flex items-center gap-2"><CheckCircle2 size={16} />{l.article.modele} · {l.article.couleur} · {l.article.taille} : {l.recues} reçues</p>)}
    </details>}
    {manager && data?.anciens?.length > 0 && <details className="mt-4 rounded-xl bg-amber-100 p-3 text-sm text-amber-950"><summary className="cursor-pointer font-bold">{data.anciens.length} anciennes commandes à vérifier</summary>
      <p className="mt-2">Ces commandes étaient déjà en découpe ou en couture avant le suivi par lots. Vérifiez les pièces présentes et leur historique avant toute nouvelle entrée de stock.</p>
      {data.anciens.map(o => <p key={o.id} className="mt-2">{o.numero} — {o.modele} · {o.couleur} · {o.taille}</p>)}
    </details>}
  </section>;
}
export default function AtelierLots(props) {
  const country = useCountryStore(s => s.currentCountry);
  return <Lots key={country} country={country} {...props} />;
}
