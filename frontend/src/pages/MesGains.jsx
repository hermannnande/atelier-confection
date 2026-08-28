import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Banknote,
  CalendarDays,
  CheckCircle,
  Clock,
  Coins,
  History,
  Loader2,
  Minus,
  Plus,
  Send,
  Shirt,
  Trash2,
  XCircle,
} from 'lucide-react';

const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const money = (value) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;

const statusStyles = {
  en_attente: 'bg-amber-100 text-amber-800',
  validee: 'bg-emerald-100 text-emerald-800',
  payee: 'bg-emerald-100 text-emerald-800',
  refusee: 'bg-red-100 text-red-800',
};

const statusLabels = {
  en_attente: 'En attente',
  validee: 'Validée',
  payee: 'Payée',
  refusee: 'Refusée',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusStyles[status] || 'bg-gray-100 text-gray-700'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

const MesGains = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [tarifs, setTarifs] = useState([]);
  const [resume, setResume] = useState({});
  const [productions, setProductions] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [dateProduction, setDateProduction] = useState(localToday());
  const [lignes, setLignes] = useState([{ modeleId: '', quantite: 1 }]);
  const [montantDemande, setMontantDemande] = useState('');
  const [notePaiement, setNotePaiement] = useState('');

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const today = localToday();
      const [tarifsResponse, resumeResponse] = await Promise.all([
        api.get('/remunerations/tarifs'),
        api.get(`/remunerations/me/resume?today=${today}`),
      ]);
      setTarifs((tarifsResponse.data.tarifs || []).filter((item) => item.configured && item.actif));
      setResume(resumeResponse.data.resume || {});
      setProductions(resumeResponse.data.productions || []);
      setPaiements(resumeResponse.data.paiements || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de charger vos gains');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tarifMap = useMemo(() => new Map(tarifs.map((item) => [item.modeleId, item])), [tarifs]);
  const totalSaisi = useMemo(() => lignes.reduce((sum, ligne) => {
    const tarif = tarifMap.get(ligne.modeleId);
    return sum + Number(tarif?.montantUnitaire || 0) * Number(ligne.quantite || 0);
  }, 0), [lignes, tarifMap]);

  const updateLigne = (index, key, value) => {
    setLignes((current) => current.map((ligne, i) => (i === index ? { ...ligne, [key]: value } : ligne)));
  };

  const addLigne = () => setLignes((current) => [...current, { modeleId: '', quantite: 1 }]);
  const removeLigne = (index) => setLignes((current) => current.filter((_, i) => i !== index));

  const submitProductions = async () => {
    const items = lignes
      .filter((ligne) => ligne.modeleId)
      .map((ligne) => ({ modeleId: ligne.modeleId, quantite: Number(ligne.quantite) }));
    if (items.length === 0) return toast.error('Sélectionnez au moins une tenue');
    if (new Set(items.map((item) => item.modeleId)).size !== items.length) {
      return toast.error('Une tenue ne peut apparaître qu’une seule fois');
    }

    setSaving(true);
    try {
      await api.post('/remunerations/me/productions', { dateProduction, items });
      toast.success('Production envoyée à l’administrateur');
      setLignes([{ modeleId: '', quantite: 1 }]);
      await loadData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible d’enregistrer la production');
    } finally {
      setSaving(false);
    }
  };

  const requestPayment = async () => {
    const amount = Number(montantDemande);
    if (!amount || amount <= 0) return toast.error('Saisissez un montant valide');
    if (amount > Number(resume.soldeDisponible || 0)) return toast.error('Le montant dépasse votre solde disponible');
    setRequesting(true);
    try {
      await api.post('/remunerations/me/paiements', { montant: amount, note: notePaiement });
      toast.success('Demande envoyée à l’administrateur');
      setMontantDemande('');
      setNotePaiement('');
      await loadData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible d’envoyer la demande');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-orange-600" size={46} /></div>;
  }

  const cards = [
    { label: "Aujourd’hui", value: resume.aujourdHui, pieces: resume.piecesAujourdHui, icon: CalendarDays, colors: 'from-orange-500 to-amber-500' },
    { label: 'Cette semaine', value: resume.semaine, pieces: resume.piecesSemaine, icon: CalendarDays, colors: 'from-violet-500 to-purple-600' },
    { label: 'Ce mois', value: resume.mois, pieces: resume.piecesMois, icon: History, colors: 'from-blue-500 to-indigo-600' },
    { label: 'Disponible', value: resume.soldeDisponible, pieces: null, icon: Coins, colors: 'from-emerald-500 to-teal-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-full overflow-x-hidden">
      <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white rounded-3xl p-6 sm:p-8 shadow-2xl shadow-orange-500/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl"><Coins size={32} /></div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Mes gains de couture</h1>
            <p className="text-orange-50 mt-1">Côte d’Ivoire · Déclarez vos tenues et suivez chaque paiement en FCFA.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, pieces, icon: Icon, colors }) => (
          <div key={label} className="stat-card">
            <div className={`w-11 h-11 bg-gradient-to-br ${colors} text-white rounded-xl flex items-center justify-center mb-4`}><Icon size={22} /></div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{money(value)}</p>
            {pieces !== null && <p className="text-xs text-gray-500 mt-1">{Number(pieces || 0)} pièce(s) validée(s)</p>}
          </div>
        ))}
      </div>

      {Number(resume.paiementEnAttente || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900">
          <Clock className="flex-shrink-0" />
          <p><strong>{money(resume.paiementEnAttente)}</strong> est réservé dans une demande en attente de validation.</p>
        </div>
      )}

      <section className="bg-white rounded-3xl border border-gray-100 shadow-xl p-5 sm:p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-orange-100 text-orange-700 rounded-xl"><Shirt size={22} /></div>
          <div><h2 className="text-xl font-black text-gray-900">Déclarer ma production</h2><p className="text-sm text-gray-500">Le tarif est fixé par l’administrateur.</p></div>
        </div>

        {tarifs.length === 0 ? (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-4">Aucun tarif n’est encore configuré. Contactez l’administrateur.</div>
        ) : (
          <>
            <label className="block text-sm font-bold text-gray-700 mb-2">Journée de production</label>
            <input type="date" max={localToday()} value={dateProduction} onChange={(event) => setDateProduction(event.target.value)} className="input max-w-xs mb-5" />

            <div className="space-y-3">
              {lignes.map((ligne, index) => {
                const tarif = tarifMap.get(ligne.modeleId);
                const subtotal = Number(tarif?.montantUnitaire || 0) * Number(ligne.quantite || 0);
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_150px_180px_44px] gap-3 items-end bg-gray-50 rounded-2xl p-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Tenue</label>
                      <select value={ligne.modeleId} onChange={(event) => updateLigne(index, 'modeleId', event.target.value)} className="input">
                        <option value="">Sélectionner une tenue</option>
                        {tarifs.map((item) => <option key={item.modeleId} value={item.modeleId}>{item.nom} — {money(item.montantUnitaire)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Quantité</label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => updateLigne(index, 'quantite', Math.max(1, Number(ligne.quantite || 1) - 1))} className="p-2 rounded-lg bg-white border"><Minus size={16} /></button>
                        <input type="number" min="1" max="1000" value={ligne.quantite} onChange={(event) => updateLigne(index, 'quantite', event.target.value)} className="input text-center" />
                        <button type="button" onClick={() => updateLigne(index, 'quantite', Number(ligne.quantite || 0) + 1)} className="p-2 rounded-lg bg-white border"><Plus size={16} /></button>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border p-3">
                      <p className="text-xs text-gray-500">Sous-total</p><p className="font-black text-orange-700">{money(subtotal)}</p>
                    </div>
                    <button type="button" disabled={lignes.length === 1} onClick={() => removeLigne(index)} className="h-11 flex items-center justify-center rounded-xl text-red-600 bg-red-50 disabled:opacity-30"><Trash2 size={18} /></button>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <button type="button" onClick={addLigne} className="btn btn-secondary"><Plus size={18} /> Ajouter une tenue</button>
              <div className="text-right"><p className="text-xs uppercase font-bold text-gray-500">Total saisi</p><p className="text-3xl font-black text-orange-700">{money(totalSaisi)}</p></div>
            </div>
            <button type="button" disabled={saving || totalSaisi <= 0} onClick={submitProductions} className="btn btn-primary w-full mt-5 justify-center disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Envoyer pour validation
            </button>
          </>
        )}
      </section>

      <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex items-center gap-3 mb-5"><Banknote size={28} /><div><h2 className="text-xl font-black">Demander un paiement</h2><p className="text-emerald-50 text-sm">Disponible : {money(resume.soldeDisponible)}</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div><label className="text-xs font-bold block mb-1">Montant</label><input type="number" min="1" max={resume.soldeDisponible || 0} value={montantDemande} onChange={(event) => setMontantDemande(event.target.value)} className="input text-gray-900" /></div>
          <div><label className="text-xs font-bold block mb-1">Note facultative</label><input value={notePaiement} onChange={(event) => setNotePaiement(event.target.value)} placeholder="Ex. paiement de la semaine" className="input text-gray-900" /></div>
          <button type="button" onClick={requestPayment} disabled={requesting || Number(resume.soldeDisponible || 0) <= 0} className="bg-white text-emerald-700 font-black px-5 py-3 rounded-xl disabled:opacity-50 flex justify-center gap-2">
            {requesting ? <Loader2 className="animate-spin" size={18} /> : <Banknote size={18} />} Recevoir
          </button>
        </div>
        <button type="button" disabled={Number(resume.soldeDisponible || 0) <= 0} onClick={() => setMontantDemande(String(resume.soldeDisponible || ''))} className="text-sm font-bold underline mt-3 disabled:opacity-40">Demander tout le solde</button>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <HistoryList title="Historique des productions" empty="Aucune production déclarée">
          {productions.slice(0, 20).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3 border-b last:border-0">
              <div className="min-w-0"><p className="font-bold truncate">{item.modele?.nom || 'Tenue'}</p><p className="text-xs text-gray-500">{item.date_production} · {item.quantite} pièce(s) × {money(item.tarif_unitaire)}</p>{item.motif_refus && <p className="text-xs text-red-600 mt-1">{item.motif_refus}</p>}</div>
              <div className="text-right flex-shrink-0"><p className="font-black">{money(item.montant_total)}</p><StatusBadge status={item.statut} /></div>
            </div>
          ))}
        </HistoryList>
        <HistoryList title="Historique des paiements" empty="Aucune demande de paiement">
          {paiements.slice(0, 20).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3 border-b last:border-0">
              <div><p className="font-bold">{new Date(item.created_at).toLocaleDateString('fr-FR')}</p><p className="text-xs text-gray-500">{item.note_couturier || 'Demande de paiement'}</p>{item.note_admin && <p className="text-xs text-gray-600 mt-1">Admin : {item.note_admin}</p>}</div>
              <div className="text-right"><p className="font-black">{money(item.montant)}</p><StatusBadge status={item.statut} /></div>
            </div>
          ))}
        </HistoryList>
      </div>
    </div>
  );
};

function HistoryList({ title, empty, children }) {
  const items = Array.isArray(children) ? children : [children].filter(Boolean);
  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-xl p-5 sm:p-6">
      <h2 className="text-lg font-black flex items-center gap-2 mb-4"><History size={20} />{title}</h2>
      {items.length === 0 ? <p className="text-gray-500 text-sm py-6 text-center">{empty}</p> : <div>{children}</div>}
    </section>
  );
}

export default MesGains;
