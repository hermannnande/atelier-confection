import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, AlertCircle, Eye, Send, Package, Check, Pencil, Save, X, Ruler, Phone, BellRing, Truck, CalendarCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { formatOrderValidationDate, getOrderValidatedAt, isValidatedForAtLeastDays } from '../utils/orderValidationAge';
import { isConfirmedAfterReminder } from '../utils/orderReminderHighlight';
import OrderSupplementTags from '../components/OrderSupplementTags';
import { normalizeSize as canonicalSize } from '../utils/sizeNormalization';

const MARKED_CARD_CLASS = '!bg-amber-50 !border-amber-300';
const REMINDER_CONFIRMED_CARD_CLASS = '!bg-orange-100 !border-orange-500 ring-2 ring-orange-200 shadow-orange-200/60';
const AGED_VALIDATED_CARD_CLASS = '!bg-violet-100 !border-violet-500 ring-2 ring-violet-200 shadow-violet-200/60';
const AGED_VALIDATED_DAYS = 5;
const STATUTS_AVANT_ENVOI = new Set(['nouvelle', 'validee']);
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

const normalizeSize = (value) => canonicalSize(value).toUpperCase();
const modelLabel = (commande) => String(commande?.modele?.nom || commande?.modele || 'Modèle inconnu').trim();
const normalizeModel = (commande) => modelLabel(commande).toLocaleLowerCase('fr');
const phoneNumberForCall = (value) => {
  const phone = String(value || '').trim();
  return `${phone.startsWith('+') ? '+' : ''}${phone.replace(/\D/g, '')}`;
};

const compareSizes = (a, b) => {
  const rankA = SIZE_ORDER.indexOf(a);
  const rankB = SIZE_ORDER.indexOf(b);
  if (rankA !== -1 || rankB !== -1) {
    if (rankA === -1) return 1;
    if (rankB === -1) return -1;
    return rankA - rankB;
  }
  return a.localeCompare(b, 'fr', { numeric: true });
};

const Commandes = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterUrgence, setFilterUrgence] = useState('');
  const [filterTaille, setFilterTaille] = useState('');
  const [filterModele, setFilterModele] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [sendingToAtelier, setSendingToAtelier] = useState(null);
  const [sendingToPreparation, setSendingToPreparation] = useState(null);
  const [sendingToReminder, setSendingToReminder] = useState(null);
  const [assigningCourierId, setAssigningCourierId] = useState(null);
  const [stockDisponible, setStockDisponible] = useState({});
  const [savingColorId, setSavingColorId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNoteId, setSavingNoteId] = useState(null);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchCommandes();

    const intervalId = setInterval(() => fetchCommandes(true), 5000);
    return () => clearInterval(intervalId);
  }, [filterStatut, filterUrgence]);

  const fetchCommandes = async (silent = false) => {
    try {
      const params = { statut: filterStatut || 'nouvelle,validee' };
      if (filterUrgence) params.urgence = filterUrgence;

      const response = await api.get('/commandes', { params });
      
      const commandesNonEnvoyees = response.data.commandes.filter((cmd) => STATUTS_AVANT_ENVOI.has(cmd.statut));
      
      // Trier avec priorité : 
      // 1. Commandes "validee" URGENTES en PREMIER (pas encore envoyées à l'atelier)
      // 2. Commandes "validee" NON URGENTES
      // 3. Commandes "nouvelle" par date
      const commandesTriees = commandesNonEnvoyees.sort((a, b) => {
        const estValideeA = a.statut === 'validee';
        const estValideeB = b.statut === 'validee';
        
        // Priorité 1 : Commandes "validee" urgentes en haut
        if (estValideeA && a.urgence && !(estValideeB && b.urgence)) {
          return -1; // A urgente validee avant tout
        }
        if (estValideeB && b.urgence && !(estValideeA && a.urgence)) {
          return 1; // B urgente validee avant tout
        }
        
        // Priorité 2 : Commandes "validee" non urgentes avant les nouvelles
        if (estValideeA && !estValideeB) {
          return -1; // A validee avant B (en atelier)
        }
        if (estValideeB && !estValideeA) {
          return 1; // B validee avant A (en atelier)
        }
        
        // Priorité 3 : Au sein du même groupe, tri par date
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA; // Plus récent en premier
      });
      
      setCommandes(commandesTriees);
      // Réactualiser aussi les réservations : plusieurs utilisateurs peuvent agir en même temps.
      await verifierStockPourCommandes(commandesTriees);
    } catch (error) {
      if (!silent) toast.error('Erreur lors du chargement des commandes');
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const verifierStockPourCommandes = async (commandes) => {
    try {
      const response = await api.get('/stock/suivi-commandes');
      const couverture = response.data.couvertureCommandes || {};
      const disponibilite = {};

      commandes.forEach((commande) => {
        const commandeId = String(commande._id || commande.id);
        const reservation = couverture[commandeId];
        if (reservation?.couvertParStock) {
          disponibilite[commandeId] = reservation;
        }
      });

      setStockDisponible(disponibilite);
    } catch (error) {
      console.error('Erreur lors de la vérification du stock:', error);
    }
  };

  const envoyerAAtelier = async (commandeId) => {
    if (!window.confirm('Envoyer cette commande à l\'atelier styliste ?')) {
      return;
    }

    setSendingToAtelier(commandeId);
    try {
      await api.put(`/commandes/${commandeId}`, {
        statut: 'en_decoupe'
      });
      
      toast.success('Commande envoyée à l\'atelier styliste ! ✂️');
      fetchCommandes(); // Recharger la liste
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
      console.error(error);
    } finally {
      setSendingToAtelier(null);
    }
  };

  const envoyerEnPreparationColis = async (commandeId) => {
    if (!window.confirm('Envoyer cette commande directement en Préparation Colis ?\n\nMême sans stock disponible, elle sera envoyée. Si le client refuse le colis, la tenue sera automatiquement ajoutée au stock.')) {
      return;
    }

    setSendingToPreparation(commandeId);
    try {
      await api.put(`/commandes/${commandeId}`, {
        statut: 'en_stock',
        directPreparation: true,
      });
      
      toast.success('Commande envoyée en Préparation Colis ! 📦');
      fetchCommandes(); // Recharger la liste
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
      console.error(error);
    } finally {
      setSendingToPreparation(null);
    }
  };

  const envoyerEnRappel = async (commande) => {
    const commandeId = commande._id || commande.id;
    if (!window.confirm(`Envoyer la commande ${commande.numeroCommande} dans les rappels clients ?`)) {
      return;
    }

    setSendingToReminder(commandeId);
    try {
      await api.post(`/commandes/${commandeId}/envoyer-rappel`);
      setCommandes((current) => current.filter((item) => (item._id || item.id) !== commandeId));
      window.dispatchEvent(new Event('reminder-alerts-updated'));
      toast.success('Commande envoyée dans la page Rappels');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l’envoi en rappel');
      console.error(error);
    } finally {
      setSendingToReminder(null);
    }
  };

  const attribuerStockLivreur = async (commande, courier) => {
    const commandeId = commande._id || commande.id;
    if (!window.confirm(`Attribuer ${commande.numeroCommande} à ${courier.livreurNom} avec la tenue déjà disponible chez ce livreur ?`)) return;
    setAssigningCourierId(commandeId);
    try {
      await api.post('/livraisons/reaffecter-stock', { commandeId, livreurId: courier.livreurId });
      toast.success(`Commande attribuée à ${courier.livreurNom}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de réattribuer cette tenue');
    } finally {
      await fetchCommandes(true);
      setAssigningCourierId(null);
    }
  };

  const peutEnvoyerAAtelier = () => {
    return user?.role === 'administrateur' || user?.role === 'gestionnaire';
  };

  // Le gestionnaire principal et l'administrateur, pas le gestionnaire de stock.
  const peutEnvoyerEnRappel = ['administrateur', 'gestionnaire'].includes(user?.role);

  const canEditNote = ['administrateur', 'gestionnaire', 'appelant'].includes(user?.role);

  const startEditingNote = (commande) => {
    setEditingNoteId(commande._id || commande.id);
    setNoteDraft(commande.noteAppelant || '');
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setNoteDraft('');
  };

  const saveNote = async (commande) => {
    const commandeId = commande._id || commande.id;
    setSavingNoteId(commandeId);
    try {
      const response = await api.patch(`/commandes/${commandeId}/note`, { note: noteDraft });
      setCommandes((current) => current.map((item) => (
        (item._id || item.id) === commandeId ? response.data.commande : item
      )));
      cancelEditingNote();
      toast.success(noteDraft.trim() ? 'Note enregistrée' : 'Note supprimée');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification de la note');
      console.error(error);
    } finally {
      setSavingNoteId(null);
    }
  };

  const setCardColor = async (commande, colorId) => {
    const commandeId = commande._id || commande.id;
    const nextColor = colorId === 'none' ? null : 'yellow';
    const previousColor = {
      couleurOrganisation: commande.couleurOrganisation,
      couleurOrganisationStatut: commande.couleurOrganisationStatut,
      couleur_organisation: commande.couleur_organisation,
      couleur_organisation_statut: commande.couleur_organisation_statut,
    };

    setCommandes((current) => current.map((item) => (
      (item._id || item.id) === commandeId
        ? {
            ...item,
            couleurOrganisation: nextColor,
            couleurOrganisationStatut: nextColor ? commande.statut : null,
            couleur_organisation: nextColor,
            couleur_organisation_statut: nextColor ? commande.statut : null,
          }
        : item
    )));
    setSavingColorId(commandeId);

    try {
      const response = await api.patch(`/commandes/${commandeId}/couleur-organisation`, {
        couleur: nextColor,
      });
      setCommandes((current) => current.map((item) => (
        (item._id || item.id) === commandeId ? response.data.commande : item
      )));
      toast.success(colorId === 'none' ? 'Couleur retirée pour tous' : 'Couleur visible par tous');
    } catch (error) {
      setCommandes((current) => current.map((item) => (
        (item._id || item.id) === commandeId ? { ...item, ...previousColor } : item
      )));
      toast.error(error.response?.data?.message || 'Erreur lors de l’enregistrement de la couleur');
      console.error(error);
    } finally {
      setSavingColorId(null);
    }
  };

  const isCardMarked = (commande) => {
    const colorId = commande.couleurOrganisation ?? commande.couleur_organisation;
    const colorStatus = commande.couleurOrganisationStatut ?? commande.couleur_organisation_statut;
    return Boolean(colorId && colorStatus === commande.statut);
  };

  const getStatutBadge = (statut) => {
    const badges = {
      nouvelle: 'badge-info',
      validee: 'badge-success',
      a_rappeler: 'badge-warning',
      en_attente_paiement: 'badge-warning',
      en_decoupe: 'badge-primary',
      en_couture: 'badge-secondary',
      en_stock: 'badge-info',
      en_livraison: 'badge-primary',
      livree: 'badge-success',
      refusee: 'badge-danger',
      annulee: 'badge-danger',
    };
    return badges[statut] || 'badge-secondary';
  };

  const getStatutLabel = (statut) => {
    const labels = {
      nouvelle: 'Nouvelle',
      validee: 'Validée',
      a_rappeler: 'À rappeler',
      en_attente_paiement: 'Attente Paiement',
      en_decoupe: 'En Découpe',
      en_couture: 'En Couture',
      en_stock: 'En Stock',
      en_livraison: 'En Livraison',
      livree: 'Livrée',
      refusee: 'Refusée',
      annulee: 'Annulée',
    };
    return labels[statut] || statut;
  };

  const sizeCounts = commandes.reduce((counts, commande) => {
    const taille = normalizeSize(commande.taille);
    if (taille) counts.set(taille, (counts.get(taille) || 0) + 1);
    return counts;
  }, new Map());
  const modelLabels = commandes.reduce((labels, commande) => {
    const key = normalizeModel(commande);
    if (key && !labels.has(key)) labels.set(key, modelLabel(commande));
    return labels;
  }, new Map());
  const pendingSizeCounts = commandes.reduce((counts, commande) => {
    if (commande.statut !== 'validee' || (filterModele && normalizeModel(commande) !== filterModele)) return counts;
    const taille = normalizeSize(commande.taille);
    if (taille) counts.set(taille, (counts.get(taille) || 0) + 1);
    return counts;
  }, new Map());
  const pendingModelCounts = commandes.reduce((counts, commande) => {
    if (commande.statut !== 'validee' || (filterTaille && normalizeSize(commande.taille) !== filterTaille)) return counts;
    const modele = normalizeModel(commande);
    if (modele) counts.set(modele, (counts.get(modele) || 0) + 1);
    return counts;
  }, new Map());
  const pendingSizeTotal = commandes.filter((commande) => (
    commande.statut === 'validee' && (!filterModele || normalizeModel(commande) === filterModele)
  )).length;
  const pendingModelTotal = commandes.filter((commande) => (
    commande.statut === 'validee' && (!filterTaille || normalizeSize(commande.taille) === filterTaille)
  )).length;
  const availableSizes = Array.from(sizeCounts.keys()).sort(compareSizes);
  const availableModels = Array.from(modelLabels, ([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true }));
  // Même source que les badges « Réservée sur stock » et « Disponible chez … » des cartes.
  const isReservedOnStock = (commande) => Boolean(stockDisponible[String(commande._id || commande.id)]);
  const courierHolding = (commande) => stockDisponible[String(commande._id || commande.id)]?.disponibleChezLivreur;
  const stockFilterBase = commandes.filter((commande) => (
    commande.statut === 'validee'
    && (!filterModele || normalizeModel(commande) === filterModele)
    && (!filterTaille || normalizeSize(commande.taille) === filterTaille)
  ));
  const reservedOnStockTotal = stockFilterBase.filter(isReservedOnStock).length;
  const atCourierTotal = stockFilterBase.filter(courierHolding).length;
  const couriersHolding = Array.from(stockFilterBase.reduce((couriers, commande) => {
    const courier = courierHolding(commande);
    if (!courier) return couriers;
    const entry = couriers.get(courier.livreurId) || { id: courier.livreurId, nom: courier.livreurNom, total: 0 };
    entry.total += 1;
    return couriers.set(courier.livreurId, entry);
  }, new Map()).values()).sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
  const matchesStockFilter = (commande) => {
    if (!filterStock) return true;
    if (filterStock === 'reservee') return isReservedOnStock(commande);
    if (filterStock === 'livreur') return Boolean(courierHolding(commande));
    return courierHolding(commande)?.livreurId === filterStock.slice('livreur:'.length);
  };

  const filteredCommandes = commandes.filter((commande) => {
    const matchSearch =
      commande.numeroCommande.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.modele.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTaille = !filterTaille || normalizeSize(commande.taille) === filterTaille;
    const matchModele = !filterModele || normalizeModel(commande) === filterModele;
    return matchSearch && matchTaille && matchModele && matchesStockFilter(commande);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Gestion des Commandes</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">Gérez toutes les commandes clients</p>
        </div>
        <Link to="/commandes/nouvelle" className="btn btn-primary inline-flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-sm sm:text-base flex-shrink-0">
          <Plus size={18} className="sm:w-5 sm:h-5" />
          <span>Nouvelle Commande</span>
        </Link>
      </div>

      {/* Filtres et recherche */}
      <div className="card max-w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <div className="relative max-w-full">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-8 sm:pl-10 text-sm sm:text-base truncate"
              />
            </div>
          </div>
          <div className="max-w-full">
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="input text-sm sm:text-base truncate"
            >
              <option value="">Tous statuts</option>
              <option value="nouvelle">Nouvelle</option>
              <option value="validee">Validée</option>
            </select>
          </div>
          <div className="max-w-full">
            <select
              value={filterUrgence}
              onChange={(e) => setFilterUrgence(e.target.value)}
              className="input text-sm sm:text-base truncate"
            >
              <option value="">Toutes</option>
              <option value="true">Urgentes</option>
              <option value="false">Non urgentes</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block max-w-xl">
            <span className="text-sm font-bold text-gray-800 block mb-2">Trier par modèle <span className="font-medium text-gray-500">· nombres à envoyer</span></span>
            <select
              value={filterModele}
              onChange={(event) => setFilterModele(event.target.value)}
              className="input text-sm sm:text-base"
            >
              <option value="">Tous les modèles ({pendingModelTotal})</option>
              {availableModels.map((modele) => (
                <option key={modele.value} value={modele.value}>
                  {modele.label} ({pendingModelCounts.get(modele.value) || 0})
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2 mb-2 mt-4">
            <Ruler size={17} className="text-primary-600 flex-shrink-0" />
            <p className="text-sm font-bold text-gray-800">Trier par taille <span className="font-medium text-gray-500">· nombres à envoyer</span></p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filtrer les commandes par taille">
            <button
              type="button"
              onClick={() => setFilterTaille('')}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-bold border transition-all active:scale-95 ${
                !filterTaille
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'
              }`}
              aria-pressed={!filterTaille}
            >
              Toutes <span className="ml-1 opacity-80">({pendingSizeTotal})</span>
            </button>
            {availableSizes.map((taille) => (
              <button
                key={taille}
                type="button"
                onClick={() => setFilterTaille(taille)}
                className={`flex-shrink-0 min-w-14 rounded-full px-4 py-2 text-sm font-black border transition-all active:scale-95 ${
                  filterTaille === taille
                    ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'
                }`}
                aria-pressed={filterTaille === taille}
              >
                {taille} <span className="ml-1 opacity-80">({pendingSizeCounts.get(taille) || 0})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-2 mt-4">
            <Package size={17} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-bold text-gray-800">Trier par stock <span className="font-medium text-gray-500">· commandes validées</span></p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filtrer les commandes réservées sur stock">
            <button
              type="button"
              onClick={() => setFilterStock('')}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-bold border transition-all active:scale-95 ${
                !filterStock
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'
              }`}
              aria-pressed={!filterStock}
            >
              Toutes <span className="ml-1 opacity-80">({stockFilterBase.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStock('reservee')}
              className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold border transition-all active:scale-95 ${
                filterStock === 'reservee'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
              }`}
              aria-pressed={filterStock === 'reservee'}
            >
              <Package size={14} />
              Réservée sur stock <span className="opacity-80">({reservedOnStockTotal})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStock('livreur')}
              className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold border transition-all active:scale-95 ${
                filterStock === 'livreur'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
              }`}
              aria-pressed={filterStock === 'livreur'}
            >
              <Truck size={14} />
              Disponible chez un livreur <span className="opacity-80">({atCourierTotal})</span>
            </button>
            {couriersHolding.map((courier) => {
              const value = `livreur:${courier.id}`;
              return (
                <button
                  key={courier.id}
                  type="button"
                  onClick={() => setFilterStock(value)}
                  className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold border transition-all active:scale-95 ${
                    filterStock === value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-blue-50 border-blue-200 text-blue-800 hover:border-blue-300'
                  }`}
                  aria-pressed={filterStock === value}
                >
                  <Truck size={14} />
                  Chez {courier.nom} <span className="opacity-80">({courier.total})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Liste des commandes */}
      {filteredCommandes.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune commande trouvée
          </h3>
          <p className="text-gray-600">
            {searchTerm || filterStatut || filterUrgence || filterTaille || filterModele || filterStock
              ? 'Essayez de modifier vos filtres'
              : 'Créez votre première commande'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 max-w-full">
          {filteredCommandes.map((commande) => {
            const commandeId = commande._id || commande.id;
            const stockReservation = stockDisponible[commandeId];
            const stockLivreur = stockReservation?.disponibleChezLivreur;
            const isMarked = isCardMarked(commande);
            const isReminderConfirmed = isConfirmedAfterReminder(commande);
            const isAgedValidated = isValidatedForAtLeastDays(commande, AGED_VALIDATED_DAYS);
            const validatedAt = commande.statut === 'validee' ? getOrderValidatedAt(commande) : null;
            return (
              <div
                key={commandeId}
                className={`card relative hover:shadow-md transition-all max-w-full overflow-visible ${
                  isReminderConfirmed
                    ? REMINDER_CONFIRMED_CARD_CLASS
                    : (isAgedValidated ? AGED_VALIDATED_CARD_CLASS : (isMarked ? MARKED_CARD_CLASS : ''))
                }`}
              >
                {peutEnvoyerEnRappel && (
                  <button
                    type="button"
                    onClick={() => envoyerEnRappel(commande)}
                    disabled={assigningCourierId === commandeId || sendingToReminder === commandeId || sendingToAtelier === commandeId || sendingToPreparation === commandeId}
                    className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full border-2 border-orange-300 bg-orange-100 text-orange-700 shadow-sm flex items-center justify-center transition-all hover:bg-orange-200 active:scale-90 disabled:opacity-50"
                    title="Envoyer dans les rappels clients"
                    aria-label={`Envoyer ${commande.numeroCommande} dans les rappels clients`}
                  >
                    <BellRing size={17} className={sendingToReminder === commandeId ? 'animate-pulse' : ''} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCardColor(commande, isMarked ? 'none' : 'yellow')}
                  disabled={savingColorId === commandeId}
                  className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full border-2 shadow-sm flex items-center justify-center transition-transform active:scale-90 disabled:opacity-60 ${isMarked ? 'bg-amber-300 border-amber-400 text-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}
                  title={isMarked ? 'Retirer la couleur' : 'Colorer cette commande'}
                  aria-label={`${isMarked ? 'Retirer la couleur de' : 'Colorer'} ${commande.numeroCommande}`}
                  aria-pressed={isMarked}
                >
                  {isMarked
                    ? <Check size={17} />
                    : <span className="w-4 h-4 rounded-full bg-amber-300 border border-amber-400" />}
                </button>

                <div className="flex flex-col lg:flex-row items-start justify-between gap-3 lg:gap-4">
                <div className="flex-1 min-w-0 w-full pr-11 lg:pr-12">
                  <div className={`flex flex-wrap items-center gap-2 mb-2 sm:mb-3 ${peutEnvoyerEnRappel ? 'pl-11' : ''}`}>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate flex-shrink-0">
                      {commande.numeroCommande}
                    </h3>
                    <span className={`badge ${getStatutBadge(commande.statut)} text-xs flex-shrink-0`}>
                      {getStatutLabel(commande.statut)}
                    </span>
                    {commande.urgence && (
                      <span className="badge badge-danger text-xs flex-shrink-0">
                        <AlertCircle size={11} className="mr-0.5" />
                        Urgent
                      </span>
                    )}
                    {validatedAt && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 flex-shrink-0" title="Date de validation de la commande">
                        <CalendarCheck size={12} />
                        Validée le {formatOrderValidationDate(validatedAt)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm max-w-full">
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Client</p>
                      <p className="font-medium text-gray-900 truncate">{commande.client.nom}</p>
                      {commande.client.contact ? (
                        <a
                          href={`tel:${phoneNumberForCall(commande.client.contact)}`}
                          className="inline-flex max-w-full items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                          title={`Appeler ${commande.client.nom}`}
                        >
                          <Phone size={13} className="flex-shrink-0" />
                          <span className="truncate">{commande.client.contact}</span>
                        </a>
                      ) : <p className="text-gray-500">Aucun contact</p>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Modèle</p>
                      <p className="font-medium text-gray-900 truncate">{commande.modele.nom}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-gray-600 truncate">
                        {commande.taille} - {commande.couleur}
                      </p>
                        {stockReservation && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                            <Package size={10} className="mr-1" />
                            Réservée sur stock
                          </span>
                        )}
                        {stockLivreur && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <Truck size={12} /> Disponible chez {stockLivreur.livreurNom}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Ville</p>
                      <p className="font-medium text-gray-900 truncate">{commande.client.ville}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Prix</p>
                      <p className="font-bold text-primary-600 text-base sm:text-lg">
                        {commande.prix.toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  </div>

                  <OrderSupplementTags commande={commande} className="mt-3" />

                  {editingNoteId === commandeId ? (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl max-w-full">
                      <label className="text-xs font-bold text-gray-700 block mb-1.5" htmlFor={`note-${commandeId}`}>
                        Note de la commande
                      </label>
                      <textarea
                        id={`note-${commandeId}`}
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        autoFocus
                        className="input resize-y text-sm"
                        placeholder="Ajouter une précision sur cette commande..."
                      />
                      <div className="mt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-[11px] text-gray-500">{noteDraft.length}/1000 caractères</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={cancelEditingNote}
                            disabled={savingNoteId === commandeId}
                            className="btn btn-secondary btn-sm flex-1 sm:flex-none inline-flex items-center justify-center gap-1"
                          >
                            <X size={14} /> Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => saveNote(commande)}
                            disabled={savingNoteId === commandeId}
                            className="btn btn-primary btn-sm flex-1 sm:flex-none inline-flex items-center justify-center gap-1 disabled:opacity-60"
                          >
                            <Save size={14} /> {savingNoteId === commandeId ? 'Enregistrement...' : 'Enregistrer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (commande.noteAppelant || canEditNote) && (
                    <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-yellow-50 rounded-lg overflow-hidden max-w-full flex items-start justify-between gap-2">
                      <p className="text-xs sm:text-sm text-gray-700 break-words overflow-wrap-anywhere min-w-0">
                        <span className="font-medium">Note : </span>
                        {commande.noteAppelant || <span className="italic text-gray-500">Aucune note</span>}
                      </p>
                      {canEditNote && (
                        <button
                          type="button"
                          onClick={() => startEditingNote(commande)}
                          className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-yellow-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-yellow-100 active:scale-95 transition-all"
                          aria-label={`Modifier la note de ${commande.numeroCommande}`}
                        >
                          <Pencil size={13} /> Modifier
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto lg:ml-4 flex-shrink-0">
                  {/* Boutons d'action - visibles seulement pour gestionnaire/admin et commandes validées */}
                  {peutEnvoyerAAtelier() && commande.statut === 'validee' && (
                    <>
                      {stockLivreur && (
                        <button
                          type="button"
                          onClick={() => attribuerStockLivreur(commande, stockLivreur)}
                          disabled={assigningCourierId === commandeId || sendingToAtelier === commandeId || sendingToPreparation === commandeId || sendingToReminder === commandeId}
                          className="btn btn-sm bg-blue-100 text-blue-800 hover:bg-blue-200 inline-flex items-center justify-center gap-1 disabled:opacity-50 text-xs w-full sm:w-auto"
                          title="Utiliser la tenue refusée conservée chez ce livreur"
                        >
                          <Truck size={14} /> {assigningCourierId === commandeId ? 'Attribution...' : `Attribuer à ${stockLivreur.livreurNom}`}
                        </button>
                      )}
                      <button
                        onClick={() => envoyerAAtelier(commande._id)}
                        disabled={assigningCourierId === commandeId || sendingToAtelier === commande._id || sendingToPreparation === commande._id || sendingToReminder === commandeId}
                        className="btn btn-primary btn-sm inline-flex items-center justify-center space-x-1 disabled:opacity-50 text-xs sm:text-sm w-full sm:w-auto"
                        title="Envoyer à l'atelier styliste"
                      >
                        <Send size={14} className="flex-shrink-0" />
                        <span className="truncate">{sendingToAtelier === commande._id ? 'Envoi...' : 'Atelier'}</span>
                      </button>
                      
                      <button
                        onClick={() => envoyerEnPreparationColis(commande._id)}
                        disabled={assigningCourierId === commandeId || sendingToAtelier === commande._id || sendingToPreparation === commande._id || sendingToReminder === commandeId}
                        className="btn btn-success btn-sm inline-flex items-center justify-center space-x-1 disabled:opacity-50 text-xs sm:text-sm w-full sm:w-auto"
                        title="Envoyer directement en Préparation Colis, même sans stock disponible"
                      >
                        <Package size={14} className="flex-shrink-0" />
                        <span className="truncate">{sendingToPreparation === commande._id ? 'Envoi...' : 'Direct'}</span>
                      </button>
                    </>
                  )}
                  
                  <Link
                    to={`/commandes/${commande._id}`}
                    className="btn btn-secondary btn-sm inline-flex items-center justify-center space-x-1 text-xs sm:text-sm w-full sm:w-auto"
                  >
                    <Eye size={14} className="flex-shrink-0" />
                    <span>Voir</span>
                  </Link>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Commandes;
