import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Package,
  Eye,
  Scissors,
  Shirt,
  CheckCircle,
  Truck,
  X,
  XCircle,
  LayoutGrid,
  List as ListIcon,
  Users,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/** Statuts affichés dans Préparation Colis (avant livraison) */
const STATUTS_PREPARATION = ['en_decoupe', 'en_couture', 'en_stock'];

/** Livraisons = colis déjà assignés (assignee = anciennes données) */
const LIVRAISON_STATUTS_ASSIGNES = ['assignee', 'en_cours', 'reportee'];

function commandeId(c) {
  return String(c?._id || c?.id || '');
}

function hasLivreurAssigne(c) {
  return !!(c?.livreur_id || c?.livreur?._id || c?.livreur?.id);
}

function isVisibleInPreparationColis(c, activeLivraisonCmdIds = new Set()) {
  if (!c || !STATUTS_PREPARATION.includes(c.statut)) return false;
  if (c.statut === 'en_livraison' || hasLivreurAssigne(c)) return false;
  const id = commandeId(c);
  if (id && activeLivraisonCmdIds.has(id)) return false;
  return true;
}

function collectAssignedLivraisonCommandeIds(livraisons) {
  const ids = new Set();
  for (const l of livraisons || []) {
    if (!LIVRAISON_STATUTS_ASSIGNES.includes(l.statut)) continue;
    const id =
      l.commande?._id ||
      l.commande?.id ||
      l.commande_id ||
      (typeof l.commande === 'string' ? l.commande : null);
    if (id) ids.add(String(id));
  }
  return ids;
}

const PreparationColis = () => {
  const { user } = useAuthStore();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('');
  const [livreurs, setLivreurs] = useState([]);

  // Assignation simple (un seul colis)
  const [showModal, setShowModal] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [selectedLivreur, setSelectedLivreur] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Sélection multiple + vue + actions batch
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showBatchAssign, setShowBatchAssign] = useState(false);
  const [batchLivreur, setBatchLivreur] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    fetchCommandes();
    fetchLivreurs();
    const interval = setInterval(fetchCommandes, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCommandes = async () => {
    try {
      const [cmdRes, livRes] = await Promise.all([
        api.get('/commandes', { params: { preparationColis: true } }),
        api.get('/livraisons'),
      ]);
      const assignedLivraisonIds = collectAssignedLivraisonCommandeIds(livRes.data?.livraisons);
      const filtered = (cmdRes.data?.commandes || []).filter((c) =>
        isVisibleInPreparationColis(c, assignedLivraisonIds)
      );
      setCommandes(filtered);
    } catch (error) {
      console.error(error);
      toast.error('Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  };

  const fetchLivreurs = async () => {
    try {
      const response = await api.get('/users');
      const livreursOnly = response.data.users.filter((u) => u.role === 'livreur' && u.actif);
      setLivreurs(livreursOnly);
    } catch (error) {
      console.error('Erreur lors du chargement des livreurs', error);
    }
  };

  const handleAssignerLivreur = async () => {
    if (!selectedLivreur) {
      toast.error('Veuillez sélectionner un livreur');
      return;
    }

    setAssigning(true);
    try {
      await api.post(`/livraisons/assigner`, {
        commandeId: selectedCommande._id || selectedCommande.id,
        livreurId: selectedLivreur,
      });

      const assignedId = commandeId(selectedCommande);
      setCommandes((prev) => prev.filter((c) => commandeId(c) !== assignedId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(assignedId);
        return next;
      });

      toast.success('Commande assignée au livreur ! Elle quitte la préparation colis.');
      setShowModal(false);
      setSelectedCommande(null);
      setSelectedLivreur('');

      await fetchCommandes();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erreur lors de l'assignation");
      fetchCommandes();
    } finally {
      setAssigning(false);
    }
  };

  const getStatutInfo = (statut) => {
    const infos = {
      en_decoupe: {
        label: 'En Découpe',
        icon: Scissors,
        color: 'bg-gradient-to-r from-amber-500 to-orange-600',
        textColor: 'text-amber-900',
        bgLight: 'bg-amber-50',
        borderColor: 'border-amber-200',
        progress: 33,
        emoji: '✂️',
      },
      en_couture: {
        label: 'En Couture',
        icon: Shirt,
        color: 'bg-gradient-to-r from-orange-500 to-red-600',
        textColor: 'text-orange-900',
        bgLight: 'bg-orange-50',
        borderColor: 'border-orange-200',
        progress: 66,
        emoji: '🧵',
      },
      en_stock: {
        label: 'En Stock - Prêt à livrer',
        icon: CheckCircle,
        color: 'bg-gradient-to-r from-green-500 to-emerald-600',
        textColor: 'text-green-900',
        bgLight: 'bg-green-50',
        borderColor: 'border-green-200',
        progress: 100,
        emoji: '✅',
      },
    };
    return infos[statut] || infos.en_decoupe;
  };

  const filteredCommandes = filterStatut
    ? commandes.filter((c) => c.statut === filterStatut)
    : commandes;

  const commandesTriees = useMemo(() => {
    return [...filteredCommandes].sort((a, b) => {
      const prioriteA = a.statut === 'en_stock' ? 0 : a.statut === 'en_couture' ? 1 : 2;
      const prioriteB = b.statut === 'en_stock' ? 0 : b.statut === 'en_couture' ? 1 : 2;
      if (prioriteA !== prioriteB) return prioriteA - prioriteB;
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB - dateA;
    });
  }, [filteredCommandes]);

  // Sélection multiple
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected =
    commandesTriees.length > 0 && commandesTriees.every((c) => selectedIds.has(c._id || c.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(commandesTriees.map((c) => c._id || c.id)));
    }
  };

  const unselectAll = () => setSelectedIds(new Set());

  const selectedCount = selectedIds.size;
  const selectedCommandes = useMemo(
    () => commandesTriees.filter((c) => selectedIds.has(c._id || c.id)),
    [selectedIds, commandesTriees]
  );
  const selectedEnStock = useMemo(
    () => selectedCommandes.filter((c) => c.statut === 'en_stock' && !hasLivreurAssigne(c)),
    [selectedCommandes]
  );

  // Batch assign
  const handleBatchAssign = async () => {
    if (!batchLivreur) {
      toast.error('Sélectionne un livreur');
      return;
    }
    if (selectedEnStock.length === 0) {
      toast.error('Aucune commande "en stock" sélectionnée (seules les en stock peuvent être assignées)');
      return;
    }

    setBatchProcessing(true);
    let success = 0;
    let failed = 0;
    const errors = [];

    const results = await Promise.allSettled(
      selectedEnStock.map((cmd) =>
        api.post('/livraisons/assigner', {
          commandeId: cmd._id || cmd.id,
          livreurId: batchLivreur,
        })
      )
    );

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        success++;
      } else {
        failed++;
        errors.push({
          numero: selectedEnStock[idx].numeroCommande,
          msg: r.reason?.response?.data?.message || r.reason?.message || 'Erreur',
        });
      }
    });

    setBatchProcessing(false);

    if (success > 0 && failed === 0) {
      toast.success(`✅ ${success} commande(s) assignée(s) au livreur !`);
    } else if (success > 0) {
      toast.success(`${success} OK, ${failed} échecs (voir console)`);
      console.error('Échecs batch assign:', errors);
    } else {
      toast.error(`Aucune assignation réussie (${failed} échecs)`);
      console.error('Échecs batch assign:', errors);
    }

    setShowBatchAssign(false);
    setBatchLivreur('');
    setSelectedIds(new Set());
    fetchCommandes();
  };

  // Batch annulation (admin only)
  const handleBatchAnnuler = async () => {
    if (selectedCount === 0) return;
    if (!confirm(`Annuler définitivement ${selectedCount} commande(s) ?\n\nElles passeront en statut "annulée" et sortiront de la page Préparation Colis.`)) {
      return;
    }
    const motif = window.prompt("Motif d'annulation (optionnel) :") || 'Annulation en masse';

    setBatchProcessing(true);
    let success = 0;
    let failed = 0;
    const errors = [];

    const results = await Promise.allSettled(
      selectedCommandes.map((cmd) =>
        api.put(`/commandes/${cmd._id || cmd.id}`, {
          statut: 'annulee',
          motifRefus: motif,
        })
      )
    );

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        success++;
      } else {
        failed++;
        errors.push({
          numero: selectedCommandes[idx].numeroCommande,
          msg: r.reason?.response?.data?.message || r.reason?.message || 'Erreur',
        });
      }
    });

    setBatchProcessing(false);

    if (success > 0 && failed === 0) {
      toast.success(`🚫 ${success} commande(s) annulée(s)`);
    } else if (success > 0) {
      toast.success(`${success} OK, ${failed} échecs (voir console)`);
      console.error('Échecs batch annul:', errors);
    } else {
      toast.error(`Aucune annulation réussie`);
      console.error('Échecs batch annul:', errors);
    }

    setSelectedIds(new Set());
    fetchCommandes();
  };

  const stats = {
    total: commandes.length,
    enDecoupe: commandes.filter((c) => c.statut === 'en_decoupe').length,
    enCouture: commandes.filter((c) => c.statut === 'en_couture').length,
    enStock: commandes.filter((c) => c.statut === 'en_stock').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200/30 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden max-w-full">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
              <Package className="text-white" size={24} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent truncate">
                Préparation Colis
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium truncate">
                Suivi des commandes
              </p>
            </div>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase">En Traitement</p>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {commandes.length}
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
          <p className="text-2xl font-black text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase">✂️ Découpe</p>
          <p className="text-2xl font-black text-amber-900">{stats.enDecoupe}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-orange-600 uppercase">🧵 Couture</p>
          <p className="text-2xl font-black text-orange-900">{stats.enCouture}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-600 uppercase">✅ En Stock</p>
          <p className="text-2xl font-black text-green-900">{stats.enStock}</p>
        </div>
      </div>

      {/* Barre filtres + toggle vue */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatut('')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterStatut === '' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterStatut('en_decoupe')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterStatut === 'en_decoupe' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✂️ Découpe
          </button>
          <button
            onClick={() => setFilterStatut('en_couture')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterStatut === 'en_couture' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🧵 Couture
          </button>
          <button
            onClick={() => setFilterStatut('en_stock')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterStatut === 'en_stock' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✅ En Stock
          </button>
        </div>

        {/* Toggle vue Grille / Liste */}
        <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${
              viewMode === 'grid' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="Vue grille"
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Grille</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${
              viewMode === 'list' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="Vue liste"
          >
            <ListIcon size={16} />
            <span className="hidden sm:inline">Liste</span>
          </button>
        </div>
      </div>

      {/* Barre d'actions de sélection (sticky en haut quand items sélectionnés) */}
      {selectedCount > 0 && (
        <div className="sticky top-2 z-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-2xl shadow-purple-500/30 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 text-white">
            <span className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 font-black text-lg">
              {selectedCount}
            </span>
            <span className="text-sm font-medium">
              commande{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''}
              {selectedEnStock.length !== selectedCount && (
                <span className="block text-xs text-purple-100">
                  dont {selectedEnStock.length} prête{selectedEnStock.length > 1 ? 's' : ''} à assigner
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowBatchAssign(true)}
              disabled={selectedEnStock.length === 0 || batchProcessing}
              className="bg-white text-purple-700 hover:bg-purple-50 px-3 sm:px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Truck size={16} />
              <span className="hidden sm:inline">Assigner</span>
              <span>{selectedEnStock.length}</span>
              <span className="hidden sm:inline">à un livreur</span>
            </button>

            {user?.role === 'administrateur' && (
              <button
                type="button"
                onClick={handleBatchAnnuler}
                disabled={batchProcessing}
                className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Annuler</span>
                <span>{selectedCount}</span>
              </button>
            )}

            <button
              type="button"
              onClick={unselectAll}
              disabled={batchProcessing}
              className="bg-white/20 backdrop-blur hover:bg-white/30 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <X size={16} />
              <span className="hidden sm:inline">Désélectionner</span>
            </button>
          </div>
        </div>
      )}

      {/* Liste des commandes */}
      {commandesTriees.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commande en préparation</h3>
          <p className="text-gray-600">Les commandes en cours de confection apparaîtront ici</p>
        </div>
      ) : viewMode === 'grid' ? (
        <CardsView
          commandes={commandesTriees}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          isAllSelected={isAllSelected}
          toggleSelectAll={toggleSelectAll}
          getStatutInfo={getStatutInfo}
          onAssignOne={(cmd) => {
            setSelectedCommande(cmd);
            setShowModal(true);
          }}
        />
      ) : (
        <ListView
          commandes={commandesTriees}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          isAllSelected={isAllSelected}
          toggleSelectAll={toggleSelectAll}
          getStatutInfo={getStatutInfo}
          onAssignOne={(cmd) => {
            setSelectedCommande(cmd);
            setShowModal(true);
          }}
        />
      )}

      {/* Modal d'assignation simple (un seul colis) */}
      {showModal && selectedCommande && (
        <AssignSingleModal
          commande={selectedCommande}
          livreurs={livreurs}
          selectedLivreur={selectedLivreur}
          setSelectedLivreur={setSelectedLivreur}
          assigning={assigning}
          onClose={() => {
            if (!assigning) {
              setShowModal(false);
              setSelectedCommande(null);
              setSelectedLivreur('');
            }
          }}
          onConfirm={handleAssignerLivreur}
        />
      )}

      {/* Modal d'assignation multiple */}
      {showBatchAssign && (
        <BatchAssignModal
          count={selectedEnStock.length}
          totalSelected={selectedCount}
          livreurs={livreurs}
          batchLivreur={batchLivreur}
          setBatchLivreur={setBatchLivreur}
          processing={batchProcessing}
          onClose={() => {
            if (!batchProcessing) {
              setShowBatchAssign(false);
              setBatchLivreur('');
            }
          }}
          onConfirm={handleBatchAssign}
        />
      )}
    </div>
  );
};

// ====================== Sous-composants ======================

function CardsView({
  commandes,
  selectedIds,
  toggleSelect,
  isAllSelected,
  toggleSelectAll,
  getStatutInfo,
  onAssignOne,
}) {
  return (
    <>
      {/* Tout cocher */}
      <div className="flex items-center gap-2 pb-2">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={toggleSelectAll}
          className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
          aria-label="Tout sélectionner"
        />
        <span className="text-sm font-semibold text-gray-600">
          {isAllSelected ? 'Tout décocher' : 'Tout cocher'} ({commandes.length})
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {commandes.map((commande) => {
          const id = commande._id || commande.id;
          const checked = selectedIds.has(id);
          const statutInfo = getStatutInfo(commande.statut);
          const StatutIcon = statutInfo.icon;
          return (
            <div
              key={id}
              className={`card bg-white hover:shadow-lg transition-all relative ${
                checked ? 'ring-2 ring-purple-500 shadow-lg' : ''
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSelect(id)}
                className="absolute top-3 right-3 w-5 h-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer z-10"
                aria-label={`Sélectionner ${commande.numeroCommande}`}
              />

              <div className="flex items-center justify-between mb-3 pr-8">
                <h3 className="text-lg font-bold text-gray-900">{commande.numeroCommande}</h3>
                {commande.urgence && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                    🔥 URGENT
                  </span>
                )}
              </div>

              <div
                className={`${statutInfo.color} text-white px-3 py-2 rounded-lg mb-3 flex items-center justify-between`}
              >
                <div className="flex items-center space-x-2">
                  <StatutIcon size={18} />
                  <span className="font-bold text-sm">{statutInfo.label}</span>
                </div>
                <span className="text-sm font-bold">{statutInfo.progress}%</span>
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-500 uppercase font-semibold">Client</p>
                <p className="font-bold text-gray-900">
                  {typeof commande.client === 'object' ? commande.client.nom : commande.client}
                </p>
                <p className="text-sm text-gray-600">
                  {typeof commande.client === 'object' ? commande.client.ville : ''}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Modèle</p>
                <p className="font-bold text-gray-900">
                  {typeof commande.modele === 'object' ? commande.modele.nom : commande.modele}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="px-2 py-1 bg-white rounded text-xs font-semibold text-gray-700">
                    📏 {commande.taille}
                  </span>
                  <span className="px-2 py-1 bg-white rounded text-xs font-semibold text-gray-700">
                    🎨 {commande.couleur}
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-3 mb-3 flex justify-between items-center">
                <span className="text-white text-sm font-semibold">Prix Total</span>
                <span className="text-white text-xl font-black">
                  {commande.prix?.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {commande.noteAppelant && (
                <div className="bg-yellow-50 rounded-lg p-2 mb-3 overflow-hidden">
                  <p className="text-xs font-semibold text-yellow-800 mb-1">📝 Instructions</p>
                  <p className="text-xs text-gray-700 line-clamp-2 break-all">{commande.noteAppelant}</p>
                </div>
              )}

              <div className="space-y-2">
                {commande.statut === 'en_stock' && !hasLivreurAssigne(commande) && (
                  <button
                    onClick={() => onAssignOne(commande)}
                    className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 hover:shadow-lg transition-all"
                  >
                    <Truck size={16} />
                    <span>Assigner au livreur</span>
                  </button>
                )}

                <Link
                  to={`/commandes/${id}`}
                  className="btn btn-primary w-full flex items-center justify-center space-x-2 text-sm"
                >
                  <Eye size={16} />
                  <span>Voir les détails</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ListView({
  commandes,
  selectedIds,
  toggleSelect,
  isAllSelected,
  toggleSelectAll,
  getStatutInfo,
  onAssignOne,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  aria-label="Tout sélectionner"
                />
              </th>
              <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase text-xs">N°</th>
              <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase text-xs">Statut</th>
              <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase text-xs hidden sm:table-cell">
                Client
              </th>
              <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase text-xs">Modèle</th>
              <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase text-xs hidden md:table-cell">
                Taille
              </th>
              <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase text-xs hidden md:table-cell">
                Couleur
              </th>
              <th className="px-3 py-3 text-right font-bold text-gray-700 uppercase text-xs">Prix</th>
              <th className="px-3 py-3 text-right font-bold text-gray-700 uppercase text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commandes.map((commande) => {
              const id = commande._id || commande.id;
              const checked = selectedIds.has(id);
              const statutInfo = getStatutInfo(commande.statut);
              const StatutIcon = statutInfo.icon;
              return (
                <tr
                  key={id}
                  className={`hover:bg-purple-50/40 transition-colors cursor-pointer ${
                    checked ? 'bg-purple-50' : ''
                  }`}
                  onClick={() => toggleSelect(id)}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(id)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      aria-label={`Sélectionner ${commande.numeroCommande}`}
                    />
                  </td>
                  <td className="px-3 py-3 font-bold text-gray-900">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{commande.numeroCommande}</span>
                      {commande.urgence && <span className="text-red-500" title="Urgent">🔥</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] sm:text-xs font-bold text-white ${statutInfo.color}`}
                    >
                      <StatutIcon size={11} />
                      <span className="hidden sm:inline">{statutInfo.label}</span>
                      <span className="sm:hidden">{statutInfo.emoji}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700 hidden sm:table-cell truncate max-w-[140px]">
                    {typeof commande.client === 'object' ? commande.client.nom : commande.client}
                  </td>
                  <td className="px-3 py-3 text-gray-700 truncate max-w-[120px]">
                    {typeof commande.modele === 'object' ? commande.modele.nom : commande.modele}
                  </td>
                  <td className="px-3 py-3 text-gray-700 hidden md:table-cell">{commande.taille}</td>
                  <td className="px-3 py-3 text-gray-700 hidden md:table-cell">{commande.couleur}</td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                    {commande.prix?.toLocaleString('fr-FR')} F
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {commande.statut === 'en_stock' && !hasLivreurAssigne(commande) && (
                        <button
                          type="button"
                          onClick={() => onAssignOne(commande)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
                          title="Assigner à un livreur"
                        >
                          <Truck size={12} />
                          <span className="hidden lg:inline">Assigner</span>
                        </button>
                      )}
                      <Link
                        to={`/commandes/${id}`}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
                        title="Voir détails"
                      >
                        <Eye size={12} />
                        <span className="hidden lg:inline">Voir</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssignSingleModal({
  commande,
  livreurs,
  selectedLivreur,
  setSelectedLivreur,
  assigning,
  onClose,
  onConfirm,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Assigner au livreur</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" disabled={assigning}>
            <X size={20} />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-bold text-gray-900 mb-2">{commande.numeroCommande}</p>
          <p className="text-sm text-gray-600">
            {typeof commande.client === 'object' ? commande.client.nom : commande.client}
          </p>
          <p className="text-sm text-gray-600">
            {typeof commande.modele === 'object' ? commande.modele.nom : commande.modele} -{' '}
            {commande.taille} - {commande.couleur}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Sélectionner un livreur</label>
          <select
            value={selectedLivreur}
            onChange={(e) => setSelectedLivreur(e.target.value)}
            className="input w-full"
            disabled={assigning}
          >
            <option value="">Choisir un livreur...</option>
            {livreurs.map((livreur) => (
              <option key={livreur._id || livreur.id} value={livreur._id || livreur.id}>
                {livreur.nom} {livreur.telephone ? `- ${livreur.telephone}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            disabled={assigning}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={!selectedLivreur || assigning}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Truck size={20} />
            <span>{assigning ? 'Assignation...' : 'Assigner'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function BatchAssignModal({
  count,
  totalSelected,
  livreurs,
  batchLivreur,
  setBatchLivreur,
  processing,
  onClose,
  onConfirm,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Assigner plusieurs colis</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" disabled={processing}>
            <X size={20} />
          </button>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 text-white rounded-lg px-3 py-2 font-black text-2xl">
              {count}
            </div>
            <div>
              <p className="font-bold text-gray-900">
                commande{count > 1 ? 's' : ''} prête{count > 1 ? 's' : ''} à assigner
              </p>
              {count !== totalSelected && (
                <p className="text-xs text-gray-600">
                  ({totalSelected - count} ne sont pas encore en stock — seront ignorées)
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Users size={14} />
            Livreur destinataire
          </label>
          <select
            value={batchLivreur}
            onChange={(e) => setBatchLivreur(e.target.value)}
            className="input w-full"
            disabled={processing}
          >
            <option value="">Choisir un livreur...</option>
            {livreurs.map((livreur) => (
              <option key={livreur._id || livreur.id} value={livreur._id || livreur.id}>
                {livreur.nom} {livreur.telephone ? `- ${livreur.telephone}` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Les {count} commandes seront toutes assignées à ce livreur en une fois.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            disabled={processing}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={!batchLivreur || count === 0 || processing}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>En cours...</span>
              </>
            ) : (
              <>
                <Truck size={20} />
                <span>Assigner les {count}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreparationColis;
