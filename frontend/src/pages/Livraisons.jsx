import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import {
  Truck, CheckCircle, XCircle, Package, Phone, MapPin,
  Plus, X, Search, Filter, FilterX, CalendarDays,
  ArrowUpDown, ChevronDown, AlertTriangle, RotateCcw
} from 'lucide-react';

const Livraisons = () => {
  const { user } = useAuthStore();
  const [livraisons, setLivraisons] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState('');
  const [selectedLivreur, setSelectedLivreur] = useState('');

  const [showRefusModal, setShowRefusModal] = useState(null);
  const [motifRefus, setMotifRefus] = useState('');

  const [showRetourModal, setShowRetourModal] = useState(null);
  const [commentaireRetour, setCommentaireRetour] = useState('');

  const [activeTab, setActiveTab] = useState('tous');
  const [filterLivreur, setFilterLivreur] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');

  const isAdmin = ['gestionnaire', 'administrateur'].includes(user?.role);

  useEffect(() => {
    fetchLivraisons();
    fetchLivreurs();
    if (isAdmin) fetchCommandesStock();
  }, [user]);

  const fetchLivraisons = async () => {
    try {
      const response = await api.get('/livraisons');
      setLivraisons(response.data.livraisons);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommandesStock = async () => {
    try {
      const response = await api.get('/commandes?statut=en_stock');
      setCommandes(response.data.commandes);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLivreurs = async () => {
    try {
      const response = await api.get('/users?role=livreur&actif=true');
      setLivreurs(response.data.users);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAssigner = async (e) => {
    e.preventDefault();
    try {
      await api.post('/livraisons/assigner', {
        commandeId: selectedCommande,
        livreurId: selectedLivreur
      });
      toast.success('Livraison assignée !');
      setShowAssignModal(false);
      setSelectedCommande('');
      setSelectedLivreur('');
      fetchLivraisons();
      fetchCommandesStock();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleLivree = async (id) => {
    try {
      await api.post(`/livraisons/${id}/livree`);
      toast.success('Livraison confirmée !');
      fetchLivraisons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleRefusee = async () => {
    if (!showRefusModal || !motifRefus.trim()) {
      toast.error('Veuillez indiquer le motif du refus');
      return;
    }
    try {
      await api.post(`/livraisons/${showRefusModal}/refusee`, { motifRefus: motifRefus.trim() });
      toast.success('Refus enregistré');
      setShowRefusModal(null);
      setMotifRefus('');
      fetchLivraisons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleConfirmerRetour = async () => {
    if (!showRetourModal) return;
    try {
      await api.post(`/livraisons/${showRetourModal}/confirmer-retour`, { commentaire: commentaireRetour.trim() || undefined });
      toast.success('Retour confirmé et stock mis à jour');
      setShowRetourModal(null);
      setCommentaireRetour('');
      fetchLivraisons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const clearFilters = () => {
    setFilterLivreur('');
    setSearchTerm('');
    setDateDebut('');
    setDateFin('');
  };

  const hasActiveFilters = filterLivreur || searchTerm || dateDebut || dateFin;

  const stats = {
    total: livraisons.length,
    en_cours: livraisons.filter(l => l.statut === 'en_cours').length,
    livree: livraisons.filter(l => l.statut === 'livree').length,
    refusee: livraisons.filter(l => l.statut === 'refusee').length,
    retournee: livraisons.filter(l => l.statut === 'retournee').length,
  };

  const tabs = [
    { key: 'tous', label: 'Tous', count: stats.total, color: 'blue' },
    { key: 'en_cours', label: 'En cours', count: stats.en_cours, color: 'blue' },
    { key: 'livree', label: 'Livrées', count: stats.livree, color: 'emerald' },
    { key: 'refusee', label: 'Refusées', count: stats.refusee, color: 'red' },
    { key: 'retournee', label: 'Retournées', count: stats.retournee, color: 'gray' },
  ];

  const filtered = livraisons
    .filter(l => {
      if (activeTab !== 'tous' && l.statut !== activeTab) return false;
      if (filterLivreur && (l.livreur?._id || l.livreur?.id) !== filterLivreur) return false;

      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matchNum = l.commande?.numeroCommande?.toLowerCase().includes(s);
        const matchClient = (typeof l.commande?.client === 'object' ? l.commande?.client?.nom : l.commande?.client || '').toLowerCase().includes(s);
        const matchLivreur = l.livreur?.nom?.toLowerCase().includes(s);
        if (!matchNum && !matchClient && !matchLivreur) return false;
      }

      const d = new Date(l.dateAssignation || l.date_assignation || l.createdAt || l.created_at);
      if (dateDebut && d < new Date(dateDebut)) return false;
      if (dateFin && d > new Date(dateFin + 'T23:59:59')) return false;

      return true;
    })
    .sort((a, b) => {
      const dA = new Date(a.dateAssignation || a.date_assignation || a.createdAt || a.created_at);
      const dB = new Date(b.dateAssignation || b.date_assignation || b.createdAt || b.created_at);
      return sortOrder === 'desc' ? dB - dA : dA - dB;
    });

  const getStatutStyle = (statut) => {
    const styles = {
      en_cours: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'En cours' },
      livree: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500', label: 'Livrée' },
      refusee: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Refusée' },
      retournee: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Retournée' },
    };
    return styles[statut] || styles.en_cours;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200/30 rounded-full" />
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-full px-2 sm:px-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-lg">
            <Truck className="text-white" size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Livraisons
            </h1>
            <p className="text-sm text-gray-500">Suivi et gestion des colis</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
          >
            <Plus size={18} />
            Assigner une livraison
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, gradient: 'from-slate-50 to-slate-100', color: 'text-slate-800' },
          { label: 'En cours', value: stats.en_cours, gradient: 'from-blue-50 to-blue-100', color: 'text-blue-700' },
          { label: 'Livrées', value: stats.livree, gradient: 'from-emerald-50 to-emerald-100', color: 'text-emerald-700' },
          { label: 'Refusées', value: stats.refusee, gradient: 'from-red-50 to-red-100', color: 'text-red-700' },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-xl p-3 sm:p-4`}>
            <p className={`text-xs font-bold ${s.color} uppercase`}>{s.label}</p>
            <p className={`text-2xl sm:text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 px-2 pt-2 gap-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-lg whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? `bg-${tab.color}-50 text-${tab.color}-700 border-b-2 border-${tab.color}-600`
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === tab.key ? `bg-${tab.color}-200 text-${tab.color}-800` : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Filter toggle */}
        <div className="p-3 sm:p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9 text-sm"
                placeholder="Rechercher par n°, client, livreur..."
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg border text-sm font-semibold flex items-center gap-1.5 transition-all ${
                showFilters || hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={16} />
              <span className="hidden sm:inline">Filtres</span>
              {hasActiveFilters && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold flex items-center gap-1.5 transition-all"
              title={sortOrder === 'desc' ? 'Plus récentes en premier' : 'Plus anciennes en premier'}
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Livreur</label>
                <select
                  value={filterLivreur}
                  onChange={(e) => setFilterLivreur(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">Tous les livreurs</option>
                  {livreurs.map(l => (
                    <option key={l._id || l.id} value={l._id || l.id}>{l.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  <CalendarDays size={11} className="inline mr-1" />Date début
                </label>
                <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  <CalendarDays size={11} className="inline mr-1" />Date fin
                </label>
                <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="input text-sm" />
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-3">
                  <button onClick={clearFilters} className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1">
                    <FilterX size={14} /> Effacer tous les filtres
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resultat count */}
      <p className="text-xs font-semibold text-gray-400 uppercase">{filtered.length} livraison{filtered.length !== 1 ? 's' : ''}</p>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
          <Truck className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-lg font-bold text-gray-700">Aucune livraison trouvée</p>
          <p className="text-sm text-gray-400 mt-1">
            {hasActiveFilters || activeTab !== 'tous' ? 'Modifiez vos filtres pour voir plus de résultats' : 'Les livraisons assignées apparaîtront ici'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((livraison) => {
            const lid = livraison._id || livraison.id;
            const cmd = livraison.commande || {};
            const clientNom = typeof cmd.client === 'object' ? cmd.client?.nom : cmd.client || 'N/A';
            const clientContact = typeof cmd.client === 'object' ? cmd.client?.contact : '';
            const clientVille = livraison.adresseLivraison?.ville || (typeof cmd.client === 'object' ? cmd.client?.ville : '') || '';
            const modeleNom = typeof cmd.modele === 'object' ? cmd.modele?.nom : cmd.modele || '';
            const st = getStatutStyle(livraison.statut);

            return (
              <div
                key={lid}
                className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
                  cmd.urgence ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-100'
                }`}
              >
                <div className="p-4">
                  {/* Top row: numero + statut + urgent */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm sm:text-base font-black text-gray-900 truncate">{cmd.numeroCommande}</span>
                      {cmd.urgence && (
                        <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-black flex-shrink-0">URGENT</span>
                      )}
                    </div>
                    <span className={`${st.bg} ${st.text} px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>

                  {/* Content grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    {/* Client */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Phone size={14} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{clientNom}</p>
                        {clientContact && (
                          <a href={`tel:${clientContact}`} className="text-xs text-blue-600 hover:underline truncate block">{clientContact}</a>
                        )}
                      </div>
                    </div>

                    {/* Modele + Ville */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin size={14} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{modeleNom || 'N/A'}</p>
                        <p className="text-xs text-gray-500 truncate">{clientVille || 'Ville non spécifiée'}</p>
                      </div>
                    </div>

                    {/* Prix + Livreur */}
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-black text-emerald-600">{(cmd.prix || 0).toLocaleString('fr-FR')} F</p>
                        <p className="text-xs text-gray-400">{livraison.livreur?.nom || 'Non assigné'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Motif refus */}
                  {livraison.motifRefus && (
                    <div className="mt-3 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-xs text-red-700"><span className="font-bold">Motif : </span>{livraison.motifRefus}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {(user?.role === 'livreur' && livraison.statut === 'en_cours') && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => handleLivree(lid)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16} /> Livrée
                      </button>
                      <button
                        onClick={() => setShowRefusModal(lid)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle size={16} /> Refusée
                      </button>
                    </div>
                  )}

                  {isAdmin && livraison.statut === 'refusee' && !livraison.verifieParGestionnaire && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => setShowRetourModal(lid)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={16} /> Confirmer le retour
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Assigner */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Assigner une livraison</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleAssigner} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Commande</label>
                <select value={selectedCommande} onChange={(e) => setSelectedCommande(e.target.value)} required className="input text-sm">
                  <option value="">Sélectionner une commande en stock</option>
                  {commandes.map((cmd) => (
                    <option key={cmd._id || cmd.id} value={cmd._id || cmd.id}>
                      {cmd.numeroCommande} - {typeof cmd.client === 'object' ? cmd.client?.nom : cmd.client} ({typeof cmd.modele === 'object' ? cmd.modele?.nom : cmd.modele})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Livreur</label>
                <select value={selectedLivreur} onChange={(e) => setSelectedLivreur(e.target.value)} required className="input text-sm">
                  <option value="">Sélectionner un livreur</option>
                  {livreurs.map((l) => (
                    <option key={l._id || l.id} value={l._id || l.id}>{l.nom} - {l.telephone}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 btn btn-secondary">Annuler</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all">Assigner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Refus */}
      {showRefusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowRefusModal(null); setMotifRefus(''); }}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 p-2 rounded-lg"><XCircle className="text-red-600" size={20} /></div>
                <h2 className="text-lg font-bold text-gray-900">Signaler un refus</h2>
              </div>
              <button onClick={() => { setShowRefusModal(null); setMotifRefus(''); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Motif du refus</label>
                <textarea
                  value={motifRefus}
                  onChange={(e) => setMotifRefus(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  rows="3"
                  placeholder="Client absent, mauvaise adresse, colis endommagé..."
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowRefusModal(null); setMotifRefus(''); }} className="flex-1 btn btn-secondary">Annuler</button>
                <button
                  onClick={handleRefusee}
                  disabled={!motifRefus.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-2.5 rounded-xl transition-all"
                >
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retour */}
      {showRetourModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowRetourModal(null); setCommentaireRetour(''); }}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-lg"><RotateCcw className="text-orange-600" size={20} /></div>
                <h2 className="text-lg font-bold text-gray-900">Confirmer le retour</h2>
              </div>
              <button onClick={() => { setShowRetourModal(null); setCommentaireRetour(''); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Le stock sera mis à jour automatiquement.</p>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Commentaire (optionnel)</label>
                <textarea
                  value={commentaireRetour}
                  onChange={(e) => setCommentaireRetour(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  rows="2"
                  placeholder="Commentaire sur le retour..."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowRetourModal(null); setCommentaireRetour(''); }} className="flex-1 btn btn-secondary">Annuler</button>
                <button onClick={handleConfirmerRetour} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-all">
                  Confirmer le retour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Livraisons;
