import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Banknote,
  Check,
  ClipboardCheck,
  Coins,
  Loader2,
  Save,
  Shirt,
  Users,
  X,
} from 'lucide-react';

const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const money = (value) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;

const RemunerationsCouturiers = () => {
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [tarifs, setTarifs] = useState([]);
  const [draftTarifs, setDraftTarifs] = useState({});
  const [couturiers, setCouturiers] = useState([]);
  const [productions, setProductions] = useState([]);
  const [paiements, setPaiements] = useState([]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const today = localToday();
      const [tarifsRes, resumeRes, productionsRes, paiementsRes] = await Promise.all([
        api.get('/remunerations/tarifs'),
        api.get(`/remunerations/admin/resume?today=${today}`),
        api.get('/remunerations/admin/productions'),
        api.get('/remunerations/admin/paiements'),
      ]);
      const loadedTarifs = tarifsRes.data.tarifs || [];
      setTarifs(loadedTarifs);
      setDraftTarifs(Object.fromEntries(loadedTarifs.map((item) => [item.modeleId, item.montantUnitaire ?? ''])));
      setCouturiers(resumeRes.data.couturiers || []);
      setProductions(productionsRes.data.productions || []);
      setPaiements(paiementsRes.data.paiements || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de charger les rémunérations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const pendingProductions = useMemo(() => productions.filter((item) => item.statut === 'en_attente'), [productions]);
  const pendingPayments = useMemo(() => paiements.filter((item) => item.statut === 'en_attente'), [paiements]);

  const saveTarif = async (tarif) => {
    const amount = Number(draftTarifs[tarif.modeleId]);
    if (!Number.isFinite(amount) || amount < 0) return toast.error('Saisissez un tarif valide');
    setProcessingId(`tarif-${tarif.modeleId}`);
    try {
      await api.put(`/remunerations/tarifs/${tarif.modeleId}`, { montantUnitaire: amount, actif: true });
      toast.success(`Tarif de ${tarif.nom} enregistré`);
      await loadData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible d’enregistrer le tarif');
    } finally { setProcessingId(null); }
  };

  const handleProduction = async (item, action) => {
    let motif = null;
    if (action === 'refuser') {
      motif = window.prompt('Pourquoi refusez-vous cette production ?');
      if (!motif) return;
    }
    setProcessingId(item.id);
    try {
      await api.patch(`/remunerations/admin/productions/${item.id}`, { action, motif });
      toast.success(action === 'valider' ? 'Production validée' : 'Production refusée');
      await loadData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de traiter la production');
    } finally { setProcessingId(null); }
  };

  const handlePayment = async (item, action) => {
    let noteAdmin = null;
    if (action === 'payer') {
      if (!window.confirm(`Confirmer que ${money(item.montant)} a été remis à ${item.couturier?.nom || 'ce couturier'} ?`)) return;
      noteAdmin = window.prompt('Référence ou note de paiement (facultatif) :') || '';
    } else {
      noteAdmin = window.prompt('Pourquoi refusez-vous cette demande ?');
      if (!noteAdmin) return;
    }
    setProcessingId(item.id);
    try {
      await api.patch(`/remunerations/admin/paiements/${item.id}`, { action, noteAdmin });
      toast.success(action === 'payer' ? 'Paiement confirmé' : 'Demande refusée');
      await loadData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de traiter le paiement');
    } finally { setProcessingId(null); }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={46} /></div>;

  const totalDu = couturiers.reduce((sum, item) => sum + Number(item.resume?.soldeAvantDemandes || 0), 0);
  const totalPending = pendingPayments.reduce((sum, item) => sum + Number(item.montant || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-full overflow-x-hidden">
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/20">
        <div className="flex items-center gap-4"><div className="p-3 bg-white/20 rounded-2xl"><Coins size={32} /></div><div><h1 className="text-2xl sm:text-3xl font-black">Rémunération des couturiers</h1><p className="text-emerald-50 mt-1">Côte d’Ivoire · Tarifs, productions, paiements et performances en FCFA.</p></div></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard icon={Users} label="Couturiers" value={couturiers.length} color="blue" />
        <SummaryCard icon={ClipboardCheck} label="Productions à valider" value={pendingProductions.length} color="amber" />
        <SummaryCard icon={Banknote} label="Paiements demandés" value={money(totalPending)} color="purple" />
        <SummaryCard icon={Coins} label="Total encore dû" value={money(totalDu)} color="emerald" />
      </div>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7">
        <div className="flex items-center gap-3 mb-5"><div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl"><Shirt size={22} /></div><div><h2 className="text-xl font-black">Tarif de chaque tenue</h2><p className="text-sm text-gray-500">Ces montants seront copiés dans chaque nouvelle déclaration.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {tarifs.map((tarif) => (
            <div key={tarif.modeleId} className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
              <p className="font-black truncate">{tarif.nom}</p><p className="text-xs text-gray-500 mb-3">{tarif.categorie || 'Tenue'}</p>
              <div className="flex gap-2"><input type="number" min="0" value={draftTarifs[tarif.modeleId] ?? ''} onChange={(event) => setDraftTarifs((current) => ({ ...current, [tarif.modeleId]: event.target.value }))} placeholder="Tarif FCFA" className="input" /><button type="button" onClick={() => saveTarif(tarif)} disabled={processingId === `tarif-${tarif.modeleId}`} className="btn btn-primary px-3 disabled:opacity-50">{processingId === `tarif-${tarif.modeleId}` ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}</button></div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7">
        <h2 className="text-xl font-black mb-5 flex items-center gap-2"><ClipboardCheck className="text-amber-600" />Productions à valider</h2>
        {pendingProductions.length === 0 ? <Empty text="Aucune production en attente" /> : (
          <div className="space-y-3">{pendingProductions.map((item) => (
            <div key={item.id} className="border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
              <div className="min-w-0"><p className="font-black text-gray-900">{item.couturier?.nom || 'Couturier'} · {item.modele?.nom || 'Tenue'}</p><p className="text-sm text-gray-500">{item.date_production} · {item.quantite} pièce(s) × {money(item.tarif_unitaire)}</p></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2"><p className="font-black text-xl mr-2">{money(item.montant_total)}</p><button type="button" disabled={processingId === item.id} onClick={() => handleProduction(item, 'valider')} className="btn btn-success"><Check size={17} />Valider</button><button type="button" disabled={processingId === item.id} onClick={() => handleProduction(item, 'refuser')} className="btn btn-danger"><X size={17} />Refuser</button></div>
            </div>
          ))}</div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7">
        <h2 className="text-xl font-black mb-5 flex items-center gap-2"><Banknote className="text-purple-600" />Demandes de paiement</h2>
        {pendingPayments.length === 0 ? <Empty text="Aucune demande de paiement en attente" /> : (
          <div className="space-y-3">{pendingPayments.map((item) => (
            <div key={item.id} className="border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
              <div><p className="font-black">{item.couturier?.nom || 'Couturier'}</p><p className="text-sm text-gray-500">Demandé le {new Date(item.created_at).toLocaleDateString('fr-FR')}</p>{item.note_couturier && <p className="text-sm text-gray-600 mt-1">{item.note_couturier}</p>}</div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2"><p className="font-black text-2xl text-purple-700 mr-2">{money(item.montant)}</p><button type="button" disabled={processingId === item.id} onClick={() => handlePayment(item, 'payer')} className="btn btn-success"><Check size={17} />Confirmer payé</button><button type="button" disabled={processingId === item.id} onClick={() => handlePayment(item, 'refuser')} className="btn btn-danger"><X size={17} />Refuser</button></div>
            </div>
          ))}</div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7">
        <h2 className="text-xl font-black mb-5 flex items-center gap-2"><Users className="text-blue-600" />Performances des couturiers</h2>
        {couturiers.length === 0 ? <Empty text="Aucun couturier actif" /> : (
          <div className="overflow-x-auto"><table className="table-modern min-w-[850px] w-full"><thead><tr><th>Couturier</th><th>Aujourd’hui</th><th>Semaine</th><th>Mois</th><th>Total gagné</th><th>Déjà payé</th><th>Solde</th></tr></thead><tbody>{couturiers.map((item) => <tr key={item.id}><td><p className="font-black">{item.nom}</p><p className="text-xs text-gray-500">{item.actif ? 'Actif' : 'Inactif'}</p></td><td>{money(item.resume?.aujourdHui)}</td><td>{money(item.resume?.semaine)}</td><td>{money(item.resume?.mois)}</td><td className="font-bold">{money(item.resume?.totalGagne)}</td><td>{money(item.resume?.totalPaye)}</td><td className="font-black text-emerald-700">{money(item.resume?.soldeAvantDemandes)}</td></tr>)}</tbody></table></div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <HistoryPanel title="Historique des productions" items={productions.filter((item) => item.statut !== 'en_attente').slice(0, 30)} render={(item) => <div key={item.id} className="py-3 border-b last:border-0 flex justify-between gap-3"><div><p className="font-bold">{item.couturier?.nom} · {item.modele?.nom}</p><p className="text-xs text-gray-500">{item.date_production} · {item.quantite} pièce(s) · {item.statut}</p></div><p className="font-black">{money(item.montant_total)}</p></div>} />
        <HistoryPanel title="Historique des paiements" items={paiements.filter((item) => item.statut !== 'en_attente').slice(0, 30)} render={(item) => <div key={item.id} className="py-3 border-b last:border-0 flex justify-between gap-3"><div><p className="font-bold">{item.couturier?.nom}</p><p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString('fr-FR')} · {item.statut}</p></div><p className="font-black">{money(item.montant)}</p></div>} />
      </div>
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value, color }) {
  const styles = { blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700', purple: 'bg-purple-100 text-purple-700', emerald: 'bg-emerald-100 text-emerald-700' };
  return <div className="stat-card"><div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${styles[color]}`}><Icon size={22} /></div><p className="text-xs uppercase font-bold text-gray-500">{label}</p><p className="text-2xl font-black mt-1">{value}</p></div>;
}
function Empty({ text }) { return <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-2xl">{text}</div>; }
function HistoryPanel({ title, items, render }) { return <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-6"><h2 className="text-lg font-black mb-4">{title}</h2>{items.length === 0 ? <Empty text="Aucun historique" /> : items.map(render)}</section>; }

export default RemunerationsCouturiers;
