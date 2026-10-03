import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Banknote,
  CalendarRange,
  Check,
  ClipboardCheck,
  Coins,
  Loader2,
  Save,
  Search,
  Shirt,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_REMUNERATION_RULE, inTeam, teamLabel } from '../utils/team';
import { PERIOD_PRESETS, periodLabel, periodRange } from '../utils/periods';

const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const money = (value) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
const productionTotal = (item) => Number(item?.montant_total || 0) + Number(item?.montant_bonus || 0);

const RemunerationsCouturiers = () => {
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [tarifs, setTarifs] = useState([]);
  const [draftTarifs, setDraftTarifs] = useState({});
  const [selectedTarifId, setSelectedTarifId] = useState('');
  const [tarifSearch, setTarifSearch] = useState('');
  const [couturiers, setCouturiers] = useState([]);
  const [productions, setProductions] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [equipe, setEquipe] = useState(''); // '' = toutes les équipes, sinon jour ou nuit
  const [regles, setRegles] = useState({ jour: DEFAULT_REMUNERATION_RULE }); // règles de paie de chaque équipe
  // Gains sur une période (journées de production du … au …), calculés par le serveur.
  const [presetPeriode, setPresetPeriode] = useState('mois');
  const [periode, setPeriode] = useState(() => periodRange('mois'));
  const [gainsPeriode, setGainsPeriode] = useState([]);
  const [chargementPeriode, setChargementPeriode] = useState(false);
  const [detailOuvert, setDetailOuvert] = useState(null);
  const [versionDonnees, setVersionDonnees] = useState(0); // recalcule la période après une validation

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
      if (tarifsRes.data.regles) setRegles(tarifsRes.data.regles);
      setDraftTarifs(Object.fromEntries(loadedTarifs.map((item) => [item.modeleId, item.montantUnitaire ?? ''])));
      setSelectedTarifId((current) => (
        loadedTarifs.some((item) => item.modeleId === current) ? current : ''
      ));
      setCouturiers(resumeRes.data.couturiers || []);
      setProductions(productionsRes.data.productions || []);
      setPaiements(paiementsRes.data.paiements || []);
      if (silent) setVersionDonnees((version) => version + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de charger les rémunérations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!periode.du || !periode.au || periode.du > periode.au) return undefined;
    let annule = false;
    setChargementPeriode(true);
    api.get('/remunerations/admin/periode', { params: { du: periode.du, au: periode.au } })
      .then((response) => { if (!annule) setGainsPeriode(response.data.couturiers || []); })
      .catch((error) => { if (!annule) toast.error(error.response?.data?.message || 'Impossible de calculer les gains de la période'); })
      .finally(() => { if (!annule) setChargementPeriode(false); });
    return () => { annule = true; };
  }, [periode.du, periode.au, versionDonnees]);

  const gainsAffiches = useMemo(() => gainsPeriode.filter((item) => inTeam(equipe, item.equipe)), [gainsPeriode, equipe]);
  const totauxPeriode = useMemo(() => gainsAffiches.reduce((total, item) => ({
    pieces: total.pieces + item.piecesValidees,
    montant: total.montant + item.montantValide,
    bonus: total.bonus + item.bonusValide,
    piecesEnAttente: total.piecesEnAttente + item.piecesEnAttente,
    enAttente: total.enAttente + item.montantEnAttente,
  }), { pieces: 0, montant: 0, bonus: 0, piecesEnAttente: 0, enAttente: 0 }), [gainsAffiches]);

  const choisirPeriode = (preset) => {
    setPresetPeriode(preset);
    setDetailOuvert(null);
    if (preset !== 'personnalisee') setPeriode(periodRange(preset));
  };

  // Équipe choisie : seuls ses couturiers, leurs productions et leurs paiements sont affichés.
  const equipeParCouturier = useMemo(() => new Map(couturiers.map((item) => [item.id, item.equipe || 'jour'])), [couturiers]);
  const couturiersAffiches = useMemo(() => couturiers.filter((item) => inTeam(equipe, item.equipe)), [couturiers, equipe]);
  const productionsAffichees = useMemo(
    () => productions.filter((item) => !equipe || equipeParCouturier.get(item.couturier?.id) === equipe),
    [productions, equipe, equipeParCouturier],
  );
  const paiementsAffiches = useMemo(
    () => paiements.filter((item) => !equipe || equipeParCouturier.get(item.couturier?.id) === equipe),
    [paiements, equipe, equipeParCouturier],
  );
  const effectifs = useMemo(() => ({
    jour: couturiers.filter((item) => (item.equipe || 'jour') === 'jour').length,
    nuit: couturiers.filter((item) => item.equipe === 'nuit').length,
  }), [couturiers]);

  const pendingProductions = useMemo(() => productionsAffichees.filter((item) => item.statut === 'en_attente'), [productionsAffichees]);
  const pendingProductionGroups = useMemo(() => {
    const grouped = new Map();
    pendingProductions.forEach((item) => {
      const key = `${item.couturier?.id || 'inconnu'}-${item.date_production}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          couturier: item.couturier,
          date: item.date_production,
          items: [],
          pieces: 0,
          montant: 0,
        });
      }
      const group = grouped.get(key);
      group.items.push(item);
      group.pieces += Number(item.quantite || 0);
      group.montant += productionTotal(item);
    });
    return [...grouped.values()];
  }, [pendingProductions]);
  const pendingPayments = useMemo(() => paiementsAffiches.filter((item) => item.statut === 'en_attente'), [paiementsAffiches]);
  const filteredTarifs = useMemo(() => {
    const term = tarifSearch.trim().toLocaleLowerCase('fr-FR');
    const sorted = [...tarifs].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    if (!term) return sorted;
    return sorted.filter((item) => `${item.nom} ${item.categorie || ''}`.toLocaleLowerCase('fr-FR').includes(term));
  }, [tarifs, tarifSearch]);
  const selectedTarif = useMemo(
    () => tarifs.find((item) => item.modeleId === selectedTarifId) || null,
    [tarifs, selectedTarifId],
  );
  const selectableTarifs = useMemo(() => {
    if (!selectedTarif || filteredTarifs.some((item) => item.modeleId === selectedTarif.modeleId)) return filteredTarifs;
    return [selectedTarif, ...filteredTarifs];
  }, [filteredTarifs, selectedTarif]);
  const tarifsSansMontant = useMemo(() => tarifs.filter((item) => !item.configured), [tarifs]);
  const tarifsAvecMontant = useMemo(() => tarifs.filter((item) => item.configured), [tarifs]);
  const selectableSansMontant = useMemo(() => selectableTarifs.filter((item) => !item.configured), [selectableTarifs]);
  const selectableAvecMontant = useMemo(() => selectableTarifs.filter((item) => item.configured), [selectableTarifs]);

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
      window.dispatchEvent(new Event('remuneration-alerts-updated'));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de traiter la production');
    } finally { setProcessingId(null); }
  };

  const handleProductionGroup = async (group, action) => {
    let motif = null;
    if (action === 'valider') {
      const confirmed = window.confirm(`Valider les ${group.pieces} pièce(s) déclarée(s) par ${group.couturier?.nom || 'ce couturier'} pour un total de ${money(group.montant)} ?`);
      if (!confirmed) return;
    } else {
      motif = window.prompt(`Pourquoi refusez-vous les ${group.pieces} pièce(s) de cette journée ?`);
      if (!motif) return;
    }

    const processingKey = `groupe-${group.key}`;
    setProcessingId(processingKey);
    try {
      await api.patch('/remunerations/admin/productions/groupe', {
        ids: group.items.map((item) => item.id),
        action,
        motif,
      });
      toast.success(action === 'valider' ? 'Journée de production validée' : 'Journée de production refusée');
      await loadData(true);
      window.dispatchEvent(new Event('remuneration-alerts-updated'));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de traiter cette journée');
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
      window.dispatchEvent(new Event('remuneration-alerts-updated'));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de traiter le paiement');
    } finally { setProcessingId(null); }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={46} /></div>;

  const totalDu = couturiersAffiches.reduce((sum, item) => sum + Number(item.resume?.soldeAvantDemandes || 0), 0);
  const totalPending = pendingPayments.reduce((sum, item) => sum + Number(item.montant || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-full overflow-x-hidden">
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/20">
        <div className="flex items-center gap-4"><div className="p-3 bg-white/20 rounded-2xl"><Coins size={32} /></div><div><h1 className="text-2xl sm:text-3xl font-black">Rémunération des couturiers</h1><p className="text-emerald-50 mt-1">Côte d’Ivoire · Tarifs, productions, paiements et performances en FCFA.</p></div></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['', `Toutes les équipes (${couturiers.length})`, `Toutes (${couturiers.length})`],
          ['jour', `☀️ Équipe de jour (${effectifs.jour})`, `☀️ Jour (${effectifs.jour})`],
          ['nuit', `🌙 Équipe de nuit (${effectifs.nuit})`, `🌙 Nuit (${effectifs.nuit})`],
        ].map(([valeur, libelle, libelleCourt]) => (
          <button
            key={valeur || 'toutes'}
            type="button"
            onClick={() => setEquipe(valeur)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-black transition-all ${equipe === valeur ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
          >
            <span className="sm:hidden">{libelleCourt}</span>
            <span className="hidden sm:inline">{libelle}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard icon={Users} label={equipe ? `Couturiers · équipe de ${equipe}` : 'Couturiers'} value={couturiersAffiches.length} color="blue" />
        <SummaryCard icon={ClipboardCheck} label="Productions à valider" value={pendingProductions.length} color="amber" />
        <SummaryCard icon={Banknote} label="Paiements demandés" value={money(totalPending)} color="purple" />
        <SummaryCard icon={Coins} label="Total encore dû" value={money(totalDu)} color="emerald" />
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <p className="font-black">Règle du bonus de productivité</p>
        <p className="mt-1 text-sm">☀️ Équipe de jour : les {regles.jour.quota} premières tenues de chaque journée sont au tarif normal. De la {regles.jour.quota + 1}ᵉ tenue jusqu’aux suivantes : <strong>+{money(regles.jour.bonusUnitaire)} par tenue</strong>, tous modèles et tous tarifs confondus.</p>
        {regles.nuit && <p className="mt-1 text-sm">🌙 Équipe de nuit : chaque tenue est payée <strong>+{money(regles.nuit.supplementTenue)}</strong> de plus que son tarif, et <strong>+{money(regles.nuit.bonusUnitaire)} par tenue</strong> à partir de la {regles.nuit.quota + 1}ᵉ tenue de la nuit.</p>}
      </div>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3"><div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl"><Shirt size={22} /></div><div><h2 className="text-xl font-black">Tarif de chaque tenue</h2><p className="text-sm text-gray-500">Sélectionnez une tenue pour consulter ou modifier son tarif.</p></div></div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-black">{tarifsSansMontant.length} sans tarif</span>
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">{tarifsAvecMontant.length} tarifé{tarifsAvecMontant.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        {tarifs.length === 0 ? <Empty text="Aucun modèle disponible" /> : (
          <div className="max-w-3xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-bold text-gray-700 mb-2">Rechercher une tenue</span>
                <span className="relative block">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="search" value={tarifSearch} onChange={(event) => setTarifSearch(event.target.value)} placeholder="Nom ou catégorie..." className="input pl-10" />
                </span>
              </label>
              <label className="block">
                <span className="block text-sm font-bold text-gray-700 mb-2">Tenue à tarifer</span>
                <select value={selectedTarifId} onChange={(event) => setSelectedTarifId(event.target.value)} className="input bg-white">
                  <option value="">Sélectionner une tenue</option>
                  {selectableSansMontant.length > 0 && (
                    <optgroup label={`À TARIFER EN PRIORITÉ (${selectableSansMontant.length})`}>
                      {selectableSansMontant.map((tarif) => <option key={tarif.modeleId} value={tarif.modeleId}>{tarif.nom}{tarif.categorie ? ` · ${tarif.categorie}` : ''} — Sans tarif</option>)}
                    </optgroup>
                  )}
                  {selectableAvecMontant.length > 0 && (
                    <optgroup label={`TARIFS DÉJÀ AJOUTÉS (${selectableAvecMontant.length})`}>
                      {selectableAvecMontant.map((tarif) => <option key={tarif.modeleId} value={tarif.modeleId}>{tarif.nom}{tarif.categorie ? ` · ${tarif.categorie}` : ''} — {money(tarif.montantUnitaire)}</option>)}
                    </optgroup>
                  )}
                </select>
                {tarifSearch && <span className="block mt-1.5 text-xs text-gray-500">{filteredTarifs.length} résultat{filteredTarifs.length > 1 ? 's' : ''}</span>}
              </label>
            </div>

            {selectedTarif ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="min-w-0 sm:w-2/5">
                    <span className={`inline-flex mb-2 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wide font-black ${selectedTarif.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{selectedTarif.configured ? 'Tarif déjà ajouté' : 'Tarif à ajouter en priorité'}</span>
                    <p className="font-black text-lg text-gray-900 truncate">{selectedTarif.nom}</p>
                    <p className="text-sm text-gray-500">{selectedTarif.categorie || 'Tenue'}</p>
                  </div>
                  <label className="block flex-1">
                    <span className="block text-sm font-bold text-gray-700 mb-2">Montant par tenue confectionnée</span>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="number" min="0" value={draftTarifs[selectedTarif.modeleId] ?? ''} onChange={(event) => setDraftTarifs((current) => ({ ...current, [selectedTarif.modeleId]: event.target.value }))} placeholder="Tarif" className="input pr-16" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">FCFA</span>
                      </div>
                      <button type="button" onClick={() => saveTarif(selectedTarif)} disabled={processingId === `tarif-${selectedTarif.modeleId}`} className="btn btn-primary px-4 disabled:opacity-50">{processingId === `tarif-${selectedTarif.modeleId}` ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}<span className="hidden sm:inline">Enregistrer</span></button>
                    </div>
                    {regles.nuit?.supplementTenue > 0 && String(draftTarifs[selectedTarif.modeleId] ?? '') !== '' && (
                      <span className="block mt-1.5 text-xs font-bold text-indigo-700">🌙 Équipe de nuit : {money(Number(draftTarifs[selectedTarif.modeleId] || 0) + regles.nuit.supplementTenue)} par tenue (+{money(regles.nuit.supplementTenue)})</span>
                    )}
                  </label>
                </div>
              </div>
            ) : <Empty text="Choisissez une tenue dans le menu pour définir son tarif" />}
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7">
        <div className="mb-5"><h2 className="text-xl font-black flex items-center gap-2"><ClipboardCheck className="text-amber-600" />Productions à valider</h2><p className="text-sm text-gray-500 mt-1">Les déclarations sont regroupées par couturier et par journée.</p></div>
        {pendingProductions.length === 0 ? <Empty text="Aucune production en attente" /> : (
          <div className="space-y-4">{pendingProductionGroups.map((group) => {
            const groupProcessing = processingId === `groupe-${group.key}`;
            return (
              <div key={group.key} className="border border-amber-200 rounded-2xl overflow-hidden">
                <div className="bg-amber-50 p-4 flex flex-col xl:flex-row xl:items-center gap-4 justify-between">
                  <div><p className="font-black text-lg text-gray-900">{group.couturier?.nom || 'Couturier'}{equipeParCouturier.has(group.couturier?.id) && <span className="ml-2 text-xs font-bold text-gray-500">{teamLabel(equipeParCouturier.get(group.couturier?.id))}</span>}</p><p className="text-sm text-gray-600">Journée du {new Date(`${group.date}T12:00:00`).toLocaleDateString('fr-FR')} · {group.items.length} modèle{group.items.length > 1 ? 's' : ''} · {group.pieces} pièce(s)</p></div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2"><p className="font-black text-2xl text-amber-800 sm:mr-2">{money(group.montant)}</p><button type="button" disabled={groupProcessing} onClick={() => handleProductionGroup(group, 'valider')} className="btn btn-success disabled:opacity-50">{groupProcessing ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}Tout valider</button><button type="button" disabled={groupProcessing} onClick={() => handleProductionGroup(group, 'refuser')} className="btn btn-danger disabled:opacity-50"><X size={17} />Tout refuser</button></div>
                </div>
                <div className="divide-y divide-gray-100">{group.items.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                    <div className="min-w-0"><p className="font-bold text-gray-900">{item.modele?.nom || 'Tenue'}</p><p className="text-sm text-gray-500">{item.quantite} pièce(s) × {money(item.tarif_unitaire)}</p>{Number(item.montant_bonus || 0) > 0 && <p className="text-xs font-black text-emerald-700 mt-1">Bonus : +{money(item.montant_bonus)} sur {item.quantite_bonus} pièce(s)</p>}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2"><p className="font-black text-lg sm:mr-2">{money(productionTotal(item))}</p><button type="button" disabled={groupProcessing || processingId === item.id} onClick={() => handleProduction(item, 'valider')} className="btn btn-success disabled:opacity-50"><Check size={16} />Valider</button><button type="button" disabled={groupProcessing || processingId === item.id} onClick={() => handleProduction(item, 'refuser')} className="btn btn-danger disabled:opacity-50"><X size={16} />Refuser</button></div>
                  </div>
                ))}</div>
              </div>
            );
          })}</div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7">
        <h2 className="text-xl font-black mb-5 flex items-center gap-2"><Banknote className="text-purple-600" />Demandes de paiement</h2>
        {pendingPayments.length === 0 ? <Empty text="Aucune demande de paiement en attente" /> : (
          <div className="space-y-3">{pendingPayments.map((item) => (
            <div key={item.id} className="border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
              <div><p className="font-black">{item.couturier?.nom || 'Couturier'}{equipeParCouturier.has(item.couturier?.id) && <span className="ml-2 text-xs font-bold text-gray-500">{teamLabel(equipeParCouturier.get(item.couturier?.id))}</span>}</p><p className="text-sm text-gray-500">Demandé le {new Date(item.created_at).toLocaleDateString('fr-FR')}</p>{item.note_couturier && <p className="text-sm text-gray-600 mt-1">{item.note_couturier}</p>}</div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2"><p className="font-black text-2xl text-purple-700 mr-2">{money(item.montant)}</p><button type="button" disabled={processingId === item.id} onClick={() => handlePayment(item, 'payer')} className="btn btn-success"><Check size={17} />Confirmer payé</button><button type="button" disabled={processingId === item.id} onClick={() => handlePayment(item, 'refuser')} className="btn btn-danger"><X size={17} />Refuser</button></div>
            </div>
          ))}</div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7">
        <h2 className="text-xl font-black mb-5 flex items-center gap-2"><Users className="text-blue-600" />Performances des couturiers</h2>
        {couturiersAffiches.length === 0 ? <Empty text={equipe ? `Aucun couturier dans l’équipe de ${equipe}` : 'Aucun couturier actif'} /> : (
          <div className="overflow-x-auto"><table className="table-modern min-w-[950px] w-full"><thead><tr><th>Couturier</th><th>Équipe</th><th>Aujourd’hui</th><th>Semaine</th><th>Mois</th><th>Total gagné</th><th>Déjà payé</th><th>Solde</th></tr></thead><tbody>{couturiersAffiches.map((item) => <tr key={item.id}><td><p className="font-black">{item.nom}</p><p className="text-xs text-gray-500">{item.actif ? 'Actif' : 'Inactif'}</p></td><td className="whitespace-nowrap font-bold">{teamLabel(item.equipe || 'jour')}</td><td>{money(item.resume?.aujourdHui)}</td><td>{money(item.resume?.semaine)}</td><td>{money(item.resume?.mois)}</td><td className="font-bold">{money(item.resume?.totalGagne)}</td><td>{money(item.resume?.totalPaye)}</td><td className="font-black text-emerald-700">{money(item.resume?.soldeAvantDemandes)}</td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7">
        <div className="mb-4">
          <h2 className="text-xl font-black flex items-center gap-2"><CalendarRange className="text-teal-600" />Gains sur une période</h2>
          <p className="text-sm text-gray-500 mt-1">Productions validées {periodLabel(periode.du, periode.au)}{equipe ? ` · équipe de ${equipe}` : ''}.</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {PERIOD_PRESETS.map((item) => (
            <button key={item.id} type="button" onClick={() => choisirPeriode(item.id)} className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${presetPeriode === item.id ? 'bg-teal-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{item.label}</button>
          ))}
        </div>
        {presetPeriode === 'personnalisee' && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">Du<input type="date" value={periode.du} max={periode.au} onChange={(event) => setPeriode((current) => ({ ...current, du: event.target.value }))} className="input w-auto" /></label>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">au<input type="date" value={periode.au} min={periode.du} onChange={(event) => setPeriode((current) => ({ ...current, au: event.target.value }))} className="input w-auto" /></label>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <MiniStat label="Gagné (validé)" value={money(totauxPeriode.montant)} accent />
          <MiniStat label="Pièces validées" value={totauxPeriode.pieces} />
          <MiniStat label="Dont bonus" value={money(totauxPeriode.bonus)} />
          <MiniStat label="En attente de validation" value={totauxPeriode.enAttente > 0 ? `${money(totauxPeriode.enAttente)} · ${totauxPeriode.piecesEnAttente} p.` : money(0)} />
        </div>
        {chargementPeriode ? (
          <div className="h-24 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={30} /></div>
        ) : gainsAffiches.length === 0 ? <Empty text={equipe ? `Aucun couturier dans l’équipe de ${equipe}` : 'Aucun couturier'} /> : (
          <>
          <div className="sm:hidden space-y-2">
            {gainsAffiches.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black truncate">{item.nom}</p>
                    <p className="text-xs text-gray-500">{teamLabel(item.equipe || 'jour')} · {item.piecesValidees} pièce(s){item.bonusValide > 0 ? ` · bonus ${money(item.bonusValide)}` : ''}</p>
                  </div>
                  <p className="font-black text-emerald-700 whitespace-nowrap">{money(item.montantValide)}</p>
                </div>
                {item.montantEnAttente > 0 && <p className="text-xs font-bold text-amber-700 mt-1">En attente : {money(item.montantEnAttente)} · {item.piecesEnAttente} p.</p>}
                {item.jours.length > 0 && <button type="button" onClick={() => setDetailOuvert(detailOuvert === item.id ? null : item.id)} className="mt-2 text-xs font-black text-teal-700">{detailOuvert === item.id ? 'Masquer le détail' : `Voir par jour (${item.jours.length})`}</button>}
                {detailOuvert === item.id && <div className="mt-2"><JoursDetail jours={item.jours} /></div>}
              </div>
            ))}
            <div className="rounded-2xl bg-teal-50 p-3 flex items-center justify-between font-black"><span>Total · {totauxPeriode.pieces} p.</span><span className="text-emerald-700">{money(totauxPeriode.montant)}</span></div>
          </div>
          <div className="hidden sm:block overflow-x-auto"><table className="table-modern min-w-[780px] w-full">
            <thead><tr><th>Couturier</th><th>Équipe</th><th>Pièces validées</th><th>Dont bonus</th><th>Gagné</th><th>En attente</th><th>Détail</th></tr></thead>
            <tbody>{gainsAffiches.map((item) => (
              <Fragment key={item.id}>
                <tr>
                  <td><p className="font-black">{item.nom}</p><p className="text-xs text-gray-500">{item.actif ? 'Actif' : 'Inactif'}</p></td>
                  <td className="whitespace-nowrap font-bold">{teamLabel(item.equipe || 'jour')}</td>
                  <td>{item.piecesValidees}</td>
                  <td>{money(item.bonusValide)}</td>
                  <td className="font-black text-emerald-700">{money(item.montantValide)}</td>
                  <td>{item.montantEnAttente > 0 ? `${money(item.montantEnAttente)} · ${item.piecesEnAttente} p.` : '—'}</td>
                  <td>{item.jours.length > 0 ? <button type="button" onClick={() => setDetailOuvert(detailOuvert === item.id ? null : item.id)} className="text-xs font-black text-teal-700 whitespace-nowrap hover:underline">{detailOuvert === item.id ? 'Masquer' : `Par jour (${item.jours.length})`}</button> : <span className="text-xs text-gray-400">—</span>}</td>
                </tr>
                {detailOuvert === item.id && (
                  <tr><td colSpan={7} className="bg-gray-50"><JoursDetail jours={item.jours} /></td></tr>
                )}
              </Fragment>
            ))}</tbody>
            <tfoot><tr className="font-black bg-teal-50"><td>Total</td><td>{equipe ? teamLabel(equipe) : 'Toutes'}</td><td>{totauxPeriode.pieces}</td><td>{money(totauxPeriode.bonus)}</td><td className="text-emerald-700">{money(totauxPeriode.montant)}</td><td>{totauxPeriode.enAttente > 0 ? money(totauxPeriode.enAttente) : '—'}</td><td /></tr></tfoot>
          </table></div>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <HistoryPanel title="Historique des productions" items={productionsAffichees.filter((item) => item.statut !== 'en_attente').slice(0, 30)} render={(item) => <div key={item.id} className="py-3 border-b last:border-0 flex justify-between gap-3"><div><p className="font-bold">{item.couturier?.nom} · {item.modele?.nom}</p><p className="text-xs text-gray-500">{item.date_production} · {item.quantite} pièce(s) · {item.statut}</p>{Number(item.montant_bonus || 0) > 0 && <p className="text-xs font-black text-emerald-700">Bonus : +{money(item.montant_bonus)}</p>}</div><p className="font-black">{money(productionTotal(item))}</p></div>} />
        <HistoryPanel title="Historique des paiements" items={paiementsAffiches.filter((item) => item.statut !== 'en_attente').slice(0, 30)} render={(item) => <div key={item.id} className="py-3 border-b last:border-0 flex justify-between gap-3"><div><p className="font-bold">{item.couturier?.nom}</p><p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString('fr-FR')} · {item.statut}</p></div><p className="font-black">{money(item.montant)}</p></div>} />
      </div>
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value, color }) {
  const styles = { blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700', purple: 'bg-purple-100 text-purple-700', emerald: 'bg-emerald-100 text-emerald-700' };
  return <div className="stat-card"><div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${styles[color]}`}><Icon size={22} /></div><p className="text-xs uppercase font-bold text-gray-500">{label}</p><p className="text-2xl font-black mt-1">{value}</p></div>;
}
// Détail jour par jour des gains validés d'un couturier sur la période.
function JoursDetail({ jours }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 py-1">
      {jours.map((jour) => (
        <div key={jour.date} className="bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold capitalize">{new Date(`${jour.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
            <span className="font-black whitespace-nowrap">{money(jour.montant)}</span>
          </div>
          <p className="text-xs text-gray-500">{jour.pieces} pièce(s){jour.bonus > 0 ? ` · dont bonus ${money(jour.bonus)}` : ''}</p>
        </div>
      ))}
    </div>
  );
}
function MiniStat({ label, value, accent = false }) {
  return <div className={`rounded-2xl border p-3 ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}><p className="text-[11px] uppercase font-bold text-gray-500">{label}</p><p className={`text-lg sm:text-xl font-black mt-0.5 ${accent ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</p></div>;
}
function Empty({ text }) { return <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-2xl">{text}</div>; }
function HistoryPanel({ title, items, render }) { return <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-6"><h2 className="text-lg font-black mb-4">{title}</h2>{items.length === 0 ? <Empty text="Aucun historique" /> : items.map(render)}</section>; }

export default RemunerationsCouturiers;
