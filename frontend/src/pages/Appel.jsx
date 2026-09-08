import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Phone, CheckCircle, XCircle, Clock, AlertTriangle, User, MapPin, Package, X, RefreshCw, Plus, Search, Pin, PinOff, Pencil, Save, Tag } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  getOrderBasePrice,
  getOrderTotal,
  normalizeOrderSupplements,
} from '../utils/orderSupplements';

const EPINGLES_STORAGE_KEY = 'appel_commandes_epinglees';

function buildOrderDraft(commande) {
  const client = commande?.client && typeof commande.client === 'object' ? commande.client : {};
  const modele = commande?.modele && typeof commande.modele === 'object'
    ? commande.modele
    : { nom: commande?.modele || '' };

  return {
    client: {
      nom: commande?.nomClient || client.nom || '',
      contact: commande?.contactClient || client.contact || '',
      ville: commande?.ville || client.ville || '',
    },
    modele: { ...modele, nom: modele.nom || modele.sku || '' },
    taille: commande?.taille || '',
    couleur: commande?.couleur || '',
    prixBase: getOrderBasePrice(commande),
    supplements: normalizeOrderSupplements(commande?.supplements),
  };
}

/**
 * Stockage : objet { id: timestampMs } -> permet de comparer la date d'epinglage
 * a la date de creation des autres commandes pour le tri.
 * Compatibilite : ancien format (array d'IDs) migre automatiquement.
 */
function loadEpingles() {
  try {
    const raw = localStorage.getItem(EPINGLES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const now = Date.now();
      return parsed.reduce((acc, id) => {
        acc[id] = now;
        return acc;
      }, {});
    }
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveEpingles(obj) {
  try {
    localStorage.setItem(EPINGLES_STORAGE_KEY, JSON.stringify(obj));
  } catch (_) {}
}

const Appel = () => {
  const { user } = useAuthStore();
  const canPin = user?.role === 'administrateur' || user?.role === 'gestionnaire';

  const [commandesAppel, setCommandesAppel] = useState([]);
  const [stock, setStock] = useState([]);
  const [catalogueModeles, setCatalogueModeles] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [noteAppelant, setNoteAppelant] = useState('');
  const [orderDraft, setOrderDraft] = useState(null);
  const [isEditingCommande, setIsEditingCommande] = useState(false);
  const [supplementModeleId, setSupplementModeleId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [epingles, setEpingles] = useState(() => loadEpingles());
  const intervalRef = useRef(null);

  const isPinned = (commande) => {
    const id = String(commande?._id || commande?.id || '');
    return !!epingles[id];
  };

  const togglePin = (commande, e) => {
    if (e) e.stopPropagation();
    if (!canPin) return;
    const id = String(commande?._id || commande?.id || '');
    if (!id) return;
    setEpingles((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        toast.success('Commande désépinglée');
      } else {
        next[id] = Date.now();
        toast.success('Commande remontée', { icon: '📌' });
      }
      saveEpingles(next);
      return next;
    });
  };

  useEffect(() => {
    fetchCommandesAppel();
    fetchStock();
    fetchCatalogueModeles();
  }, []);

  // Charger la note existante quand la modal s'ouvre
  useEffect(() => {
    if (selectedCommande) {
      // Si la commande a une note existante, la charger
      // Sinon, laisser le champ vide
      setNoteAppelant(selectedCommande.noteAppelant || '');
      setOrderDraft(buildOrderDraft(selectedCommande));
      setIsEditingCommande(false);
      setSupplementModeleId('');
    }
  }, [selectedCommande]);

  // Auto-refresh toutes les 10 secondes
  useEffect(() => {
    if (isAutoRefreshing) {
      intervalRef.current = setInterval(() => {
        fetchCommandesAppel(true); // true = silent refresh
      }, 10000); // 10 secondes

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isAutoRefreshing]);

  const fetchStock = async () => {
    try {
      const response = await api.get('/stock');
      const stockData = response.data.stock || [];
      console.log('📦 Stock chargé:', stockData.length, 'modèles');
      console.log('📦 Détail du stock:', stockData.map(s => ({
        modele: typeof s.modele === 'string' ? s.modele : s.modele?.nom,
        variations: s.variations?.length || 0
      })));
      setStock(stockData);
    } catch (error) {
      console.error('❌ Erreur lors du chargement du stock:', error);
    }
  };

  const fetchCatalogueModeles = async () => {
    try {
      const response = await api.get('/modeles', { params: { actif: 'true' } });
      const modeles = response.data.modeles || [];
      setCatalogueModeles(
        [...modeles].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')),
      );
    } catch (error) {
      console.error('Erreur lors du chargement du catalogue:', error);
      toast.error('Impossible de charger le catalogue des modèles');
    } finally {
      setCatalogueLoading(false);
    }
  };

  const isCommandeEnStock = (commande) => {
    if (!commande || !stock || stock.length === 0) {
      console.log('❌ Vérification stock - Pas de commande ou stock vide');
      return false;
    }
    
    const modeleNom = getModeleNom(commande.modele);
    const taille = commande.taille;
    const couleur = commande.couleur;
    
    console.log('🔍 Vérification stock pour:', {
      modele: modeleNom,
      taille,
      couleur,
      stockLength: stock.length
    });
    
    // Dans Supabase, chaque ligne du stock est une variation individuelle (modele + taille + couleur)
    // Chercher une ligne qui correspond exactement
    const variationEnStock = stock.find(s => {
      const stockModeleNom = typeof s.modele === 'string' ? s.modele : (s.modele?.nom || '');
      
      const modeleMatch = stockModeleNom.toLowerCase() === modeleNom.toLowerCase();
      const tailleMatch = s.taille === taille;
      const couleurMatch = s.couleur === couleur;
      const quantiteMatch = (s.quantitePrincipale || 0) > 0;
      
      console.log('  📦 Comparaison:', {
        stockModele: stockModeleNom,
        stockTaille: s.taille,
        stockCouleur: s.couleur,
        stockQuantite: s.quantitePrincipale,
        modeleMatch,
        tailleMatch,
        couleurMatch,
        quantiteMatch
      });
      
      const match = modeleMatch && tailleMatch && couleurMatch && quantiteMatch;
      
      if (match) {
        console.log('  ✅ MATCH TROUVÉ !', s);
      }
      
      return match;
    });
    
    const result = !!variationEnStock;
    console.log('📊 Résultat final:', result ? '✅ EN STOCK' : '❌ PAS EN STOCK');
    
    return result;
  };

  const fetchCommandesAppel = async (silent = false) => {
    try {
      const response = await api.get('/commandes?statut=en_attente_validation,en_attente_paiement');
      const newCommandes = response.data.commandes || [];
      
      console.log('📞 Commandes chargées:', newCommandes.length);
      console.log('📞 Détail des commandes:', newCommandes.map(c => ({
        numero: c.numeroCommande,
        modele: getModeleNom(c.modele),
        taille: c.taille,
        couleur: c.couleur
      })));
      
      // Vérifier s'il y a de nouvelles commandes
      if (silent && newCommandes.length > commandesAppel.length) {
        const diff = newCommandes.length - commandesAppel.length;
        toast.success(`🔔 ${diff} nouvelle${diff > 1 ? 's' : ''} commande${diff > 1 ? 's' : ''} !`, {
          icon: '📞',
          duration: 4000,
        });
      }
      
      setCommandesAppel(newCommandes);
      setLastRefresh(new Date());
    } catch (error) {
      if (!silent) {
      toast.error('Erreur lors du chargement des appels');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCommandeModal = (commande) => {
    setSelectedCommande(commande);
    setNoteAppelant(commande?.noteAppelant || '');
    setOrderDraft(buildOrderDraft(commande));
    setIsEditingCommande(false);
    setSupplementModeleId('');
  };

  const closeCommandeModal = () => {
    setSelectedCommande(null);
    setNoteAppelant('');
    setOrderDraft(null);
    setIsEditingCommande(false);
    setSupplementModeleId('');
  };

  const buildDraftPayload = (extra = {}) => {
    if (!orderDraft) throw new Error('Commande indisponible');
    if (!orderDraft.client.nom.trim()) throw new Error('Le nom du client est obligatoire');
    if (!orderDraft.client.contact.trim()) throw new Error('Le contact du client est obligatoire');
    if (!orderDraft.modele.nom.trim()) throw new Error('Le modèle est obligatoire');
    if (!orderDraft.taille.trim()) throw new Error('La taille est obligatoire');
    if (!orderDraft.couleur.trim()) throw new Error('La couleur est obligatoire');
    if (!Number.isFinite(Number(orderDraft.prixBase)) || Number(orderDraft.prixBase) < 0) {
      throw new Error('Le prix de base est invalide');
    }

    return {
      client: {
        nom: orderDraft.client.nom.trim(),
        contact: orderDraft.client.contact.trim(),
        ville: orderDraft.client.ville.trim(),
      },
      modele: { ...orderDraft.modele, nom: orderDraft.modele.nom.trim() },
      taille: orderDraft.taille.trim(),
      couleur: orderDraft.couleur.trim(),
      prixBase: Number(orderDraft.prixBase),
      supplements: normalizeOrderSupplements(orderDraft.supplements),
      noteAppelant: noteAppelant.trim(),
      ...extra,
    };
  };

  const updateCommandeInList = (updatedCommande) => {
    if (!updatedCommande) return;
    const updatedId = updatedCommande._id || updatedCommande.id;
    setCommandesAppel((prev) =>
      prev.map((commande) =>
        (commande._id || commande.id) === updatedId ? updatedCommande : commande,
      ),
    );
  };

  const handleSaveCommande = async () => {
    const commandeId = selectedCommande?._id || selectedCommande?.id;
    if (!commandeId) return;

    setProcessing(true);
    try {
      const payload = buildDraftPayload();
      const { data } = await api.put(`/commandes/${commandeId}`, payload);
      const updated = data.commande;
      updateCommandeInList(updated);
      setSelectedCommande(updated);
      toast.success('Commande et suppléments enregistrés');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de la modification');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddSupplement = () => {
    const modele = catalogueModeles.find(
      (item) => String(item.id || item._id) === String(supplementModeleId),
    );
    if (!modele) {
      toast.error('Choisis un modèle dans le catalogue');
      return;
    }

    const montant = Math.round(Number(modele.prixBase ?? modele.prix_base));
    if (!Number.isFinite(montant) || montant <= 0) {
      toast.error(`Aucun tarif valide n’est défini pour ${modele.nom}`);
      return;
    }

    setOrderDraft((prev) => ({
      ...prev,
      supplements: [
        ...(prev?.supplements || []),
        {
          id: `modele-${modele.id || modele._id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          libelle: modele.nom,
          montant,
        },
      ],
    }));
    setSupplementModeleId('');
  };

  const handleRemoveSupplement = (supplementId) => {
    setOrderDraft((prev) => ({
      ...prev,
      supplements: (prev?.supplements || []).filter((item) => item.id !== supplementId),
    }));
  };

  const handleAction = async (commandeId, action) => {
    setProcessing(true);
    
    try {
      let newStatut = '';
      let message = '';
      
      switch (action) {
        case 'confirmer':
          newStatut = 'validee';
          message = 'Commande confirmée et envoyée aux commandes !';
          break;
        case 'urgent':
          newStatut = 'validee';
          message = 'Commande marquée URGENTE et envoyée aux commandes !';
          break;
        case 'attente':
          newStatut = 'en_attente_paiement';
          message = 'Commande mise en attente';
          break;
        case 'annuler':
          newStatut = 'annulee';
          message = 'Commande annulée';
          break;
      }

      // Enregistrer d'abord les corrections, la note et les suppléments.
      const detailsPayload = buildDraftPayload(action === 'urgent' ? { urgence: true } : {});

      // Pour confirmer ou urgent, utiliser ensuite la route /valider qui déclenche le SMS
      if (action === 'confirmer' || action === 'urgent') {
        await api.put(`/commandes/${commandeId}`, detailsPayload);
        await api.post(`/commandes/${commandeId}/valider`);
      } else if (action === 'attente') {
        await api.put(`/commandes/${commandeId}`, detailsPayload);
        await api.post(`/commandes/${commandeId}/attente-depot`);
      } else {
        await api.put(`/commandes/${commandeId}`, { ...detailsPayload, statut: newStatut });
      }
      
      toast.success(message);
      
      // Fermer la modal et réinitialiser la note
      closeCommandeModal();
      
      // Retirer de la liste si confirmé, urgent ou annulé
      if (['confirmer', 'urgent', 'annuler'].includes(action)) {
        setCommandesAppel(prev => prev.filter(c => (c._id || c.id) !== commandeId));
      } else {
        fetchCommandesAppel();
      }
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  // Fonction utilitaire pour afficher les données (string ou objet)
  const getModeleNom = (modele) => {
    if (!modele) return 'N/A';
    return typeof modele === 'string' ? modele : (modele.nom || modele.sku || 'N/A');
  };

  const getClientNom = (commande) => {
    if (commande.nomClient) return commande.nomClient;
    if (commande.client) {
      return typeof commande.client === 'string' ? commande.client : (commande.client.nom || 'N/A');
    }
    return 'N/A';
  };

  const getClientContact = (commande) => {
    if (commande.contactClient) return commande.contactClient;
    if (commande.client) {
      return typeof commande.client === 'object' ? (commande.client.contact || 'N/A') : 'N/A';
    }
    return 'N/A';
  };

  const getVille = (commande) => {
    if (commande.ville) return commande.ville;
    if (commande.client && typeof commande.client === 'object') {
      return commande.client.ville || 'Non spécifié';
    }
    return 'Non spécifié';
  };

  const normalizePhone = (str) => String(str || '').replace(/\D/g, '');

  const filteredCommandes = useMemo(() => {
    const matched = commandesAppel.filter((commande) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;

      const termDigits = normalizePhone(searchTerm);

      const numero = (commande.numeroCommande || '').toLowerCase();
      const nomClient = getClientNom(commande).toLowerCase();
      const contactRaw = String(getClientContact(commande) || '');
      const contactDigits = normalizePhone(contactRaw);
      const modele = getModeleNom(commande.modele).toLowerCase();
      const ville = getVille(commande).toLowerCase();

      return (
        numero.includes(term) ||
        nomClient.includes(term) ||
        modele.includes(term) ||
        ville.includes(term) ||
        contactRaw.toLowerCase().includes(term) ||
        (termDigits.length > 0 && contactDigits.includes(termDigits))
      );
    });

    /**
     * Tri par date "effective" decroissante :
     *  - commande epinglee = max(dateCreation, dateEpinglage)
     *  - commande normale  = dateCreation
     * => une nouvelle commande recente passe au-dessus d'une epinglee plus ancienne.
     */
    const getDateMs = (c) => {
      const src = c.dateCommande || c.createdAt || c.created_at;
      const d = src ? new Date(src).getTime() : 0;
      return Number.isFinite(d) ? d : 0;
    };

    return [...matched].sort((a, b) => {
      const aId = String(a._id || a.id || '');
      const bId = String(b._id || b.id || '');
      const aEff = Math.max(getDateMs(a), epingles[aId] || 0);
      const bEff = Math.max(getDateMs(b), epingles[bId] || 0);
      return bEff - aEff;
    });
  }, [commandesAppel, searchTerm, epingles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200/30 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-3 space-y-3 overflow-x-hidden animate-fade-in sm:mx-0 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-2 sm:items-center sm:gap-3">
            <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg sm:rounded-2xl sm:p-4">
              <Phone className="h-6 w-6 text-white sm:h-8 sm:w-8" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black leading-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent sm:text-4xl">
                Appels à Traiter
              </h1>
              <p className="text-xs font-medium leading-snug text-gray-600 sm:text-base">Nouvelles commandes en attente de validation</p>
              
              {/* Indicateur de rafraîchissement auto */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-3">
                <button
                  onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all sm:gap-2 sm:rounded-lg sm:px-3 sm:text-xs ${
                    isAutoRefreshing 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <RefreshCw 
                    size={14} 
                    className={isAutoRefreshing ? 'animate-spin' : ''} 
                  />
                  <span>{isAutoRefreshing ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
                </button>
                
                <span className="order-3 basis-full text-[10px] text-gray-500 sm:order-none sm:basis-auto sm:text-xs">
                  Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
                </span>
                
                <button
                  onClick={() => fetchCommandesAppel()}
                  className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700 transition-all hover:bg-blue-200 sm:rounded-lg sm:px-3 sm:text-xs"
                >
                  <RefreshCw size={14} />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:gap-4">
          <Link
            to="/commandes/nouvelle"
            className="btn flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 !px-3 !py-2 text-xs font-bold text-white shadow-lg transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl sm:gap-2 sm:rounded-xl sm:!px-6 sm:!py-3 sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
            <span>Nouvelle Commande</span>
          </Link>
          
        <div className="flex items-baseline gap-2 text-right sm:block">
          <p className="text-[10px] font-semibold uppercase text-gray-500 sm:text-sm">En attente</p>
          <p className="text-3xl font-black leading-none bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent sm:text-5xl">
            {commandesAppel.length}
          </p>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      {commandesAppel.length > 0 && (
        <div className="stat-card !rounded-xl !p-2.5 sm:!rounded-2xl sm:!p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par n°, client, téléphone, modèle ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input !py-2 pl-10 pr-10 text-sm sm:!py-3 sm:text-base w-full"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-xs text-gray-500 mt-2 font-medium">
              {filteredCommandes.length} résultat{filteredCommandes.length > 1 ? 's' : ''} sur {commandesAppel.length} commande{commandesAppel.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Grille des commandes */}
      {commandesAppel.length === 0 ? (
        <div className="stat-card !p-8 text-center sm:!p-16">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 sm:mb-4 sm:h-20 sm:w-20">
            <CheckCircle className="h-7 w-7 text-green-600 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">Aucun appel en attente</h3>
          <p className="text-sm text-gray-600 sm:text-base">Toutes les commandes ont été traitées ! 🎉</p>
        </div>
      ) : filteredCommandes.length === 0 ? (
        <div className="stat-card !p-8 text-center sm:!p-16">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-slate-100 sm:mb-4 sm:h-20 sm:w-20">
            <Search className="h-7 w-7 text-gray-500 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">Aucun résultat</h3>
          <p className="text-sm text-gray-600 sm:text-base">Aucune commande ne correspond à « {searchTerm} »</p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
          >
            <X size={14} />
            <span>Effacer la recherche</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
          {filteredCommandes.map((commande, index) => {
            const enStock = isCommandeEnStock(commande);
            const estEnAttentePaiement = commande.statut === 'en_attente_paiement';
            const cardSupplements = normalizeOrderSupplements(commande.supplements);
            const pinned = isPinned(commande);
            const dateSource =
              commande.dateCommande ||
              commande.createdAt || // Supabase mapCommande -> createdAt
              commande.created_at; // fallback éventuel
            const dateObj = dateSource ? new Date(dateSource) : null;
            const isValidDate = dateObj && !Number.isNaN(dateObj.getTime());
            
            // Déterminer le style de la carte selon le statut et la disponibilité en stock
            // (la couleur ne change PAS si la carte est epinglee : badge + icone suffisent)
            let cardStyle = 'relative stat-card !rounded-xl !p-3 sm:!rounded-2xl sm:!p-5 xl:!p-6 sm:hover:scale-[1.02] transition-all cursor-pointer group';

            if (estEnAttentePaiement) {
              // Commande en attente de paiement = bordure orange + fond orange clair
              cardStyle += ' border-4 border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-xl shadow-orange-500/30';
            } else if (enStock) {
              // Commande disponible en stock = bordure bleue
              cardStyle += ' border-4 border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-xl shadow-blue-500/30';
            }
            
            return (
            <div
              key={commande._id || commande.id}
              className={cardStyle}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => openCommandeModal(commande)}
            >
              {/* Badge "epinglee" */}
              {pinned && (
                <div className="absolute -top-3 -left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
                  <Pin size={10} fill="currentColor" strokeWidth={2.5} />
                  ÉPINGLÉE
                </div>
              )}

              {/* Bouton epingle (admin / gestionnaire uniquement) */}
              {canPin && (
                <button
                  type="button"
                  onClick={(e) => togglePin(commande, e)}
                  title={pinned ? 'Désépingler' : 'Faire remonter en haut'}
                  className={`absolute top-2 right-2 p-1.5 rounded-full transition-all z-10 ${
                    pinned
                      ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600'
                      : 'bg-white/90 text-gray-400 hover:text-amber-600 hover:bg-amber-50 shadow opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                  }`}
                >
                  {pinned ? <PinOff size={14} strokeWidth={2.5} /> : <Pin size={14} strokeWidth={2.5} />}
                </button>
              )}

              {/* Header */}
              <div className="mb-2.5 flex items-start justify-between gap-2 sm:mb-3">
                <div className={canPin ? 'min-w-0 pr-7' : 'min-w-0'}>
                  <h3 className="text-lg font-black text-gray-900">
                    #{commande.numeroCommande || (commande._id || commande.id).slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isValidDate ? dateObj.toLocaleDateString('fr-FR') : '—'}
                  </p>
                  <p className="text-xs text-gray-600 font-semibold flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="text-blue-600" />
                    {isValidDate ? dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <div className="mt-7 flex flex-shrink-0 flex-col gap-1">
                  {estEnAttentePaiement ? (
                    <span className="badge bg-gradient-to-r from-orange-600 to-amber-600 text-white text-xs px-2 py-1 font-bold shadow-lg">
                      ⏳ Attente Paiement
                    </span>
                  ) : (
                    <span className="badge badge-warning text-xs px-2 py-1">
                      📞 Appel
                    </span>
                  )}
                  {enStock && (
                    <span className="badge bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs px-2 py-1 font-bold shadow-lg animate-pulse">
                      📦 En Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Client avec image */}
              <div className="mb-2.5 flex items-start gap-2 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 p-2.5 sm:mb-3 sm:gap-3 sm:p-3">
                {/* Infos Client */}
                <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="text-blue-600" size={16} />
                  <p className="break-words text-sm font-bold text-gray-900">{getClientNom(commande)}</p>
                </div>
                <a 
                  href={`tel:${getClientContact(commande)}`}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center space-x-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone size={12} />
                  <span>{getClientContact(commande)}</span>
                </a>
                <div className="flex items-center space-x-1 mt-1">
                  <MapPin className="text-emerald-600" size={14} />
                  <p className="break-words text-xs font-medium text-gray-700">{getVille(commande)}</p>
                </div>
                </div>
                
                {/* Image du produit - Petite à droite */}
                {(typeof commande.modele === 'object' && commande.modele?.image) ? (
                  <div className="flex-shrink-0">
                    <img 
                      src={commande.modele.image} 
                      alt={getModeleNom(commande.modele)}
                      className="w-16 h-16 object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-md flex items-center justify-center">
                    <Package className="text-white" size={24} />
                  </div>
                )}
              </div>

              {/* Détails */}
              <div className="mb-3 space-y-1.5 sm:mb-4 sm:space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center space-x-1">
                    <Package size={14} />
                    <span>Modèle</span>
                  </span>
                  <span className="ml-3 min-w-0 break-words text-right font-bold text-gray-900">{getModeleNom(commande.modele)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Taille</span>
                  <span className="font-bold text-gray-900">{commande.taille}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Couleur</span>
                  <span className="font-bold text-gray-900">{commande.couleur}</span>
                </div>
              </div>

              {cardSupplements.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {cardSupplements.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-800 px-2 py-1 text-[10px] font-bold"
                    >
                      <Tag size={10} />
                      {item.libelle} +{item.montant.toLocaleString('fr-FR')} F
                    </span>
                  ))}
                </div>
              )}

              {/* Prix */}
              <div className="mb-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 p-2.5 sm:mb-3 sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs font-semibold">Prix Total</span>
                  <span className="text-lg font-black text-white sm:text-xl">
                    {commande.prix?.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Bouton Traiter */}
              <button
                className="btn btn-primary w-full !py-2 text-sm font-bold transition-shadow group-hover:shadow-xl sm:!py-3 sm:text-base"
                onClick={(e) => {
                  e.stopPropagation();
                  openCommandeModal(commande);
                }}
              >
                Traiter la commande
              </button>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal de traitement */}
      {selectedCommande && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-3"
          onClick={() => {
            if (!processing) closeCommandeModal();
          }}
        >
          <div 
            className="flex max-h-[calc(100dvh-0.5rem)] w-full max-w-md flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:max-h-[94vh] sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header compact */}
            <div className={`${
              selectedCommande.statut === 'en_attente_paiement'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            } px-3 py-2.5 rounded-t-xl text-white`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap sm:gap-2">
                  <h2 className="text-base font-bold sm:text-lg">
                    {selectedCommande.numeroCommande || (selectedCommande._id || selectedCommande.id).slice(-6).toUpperCase()}
                  </h2>
                  {selectedCommande.statut === 'en_attente_paiement' && (
                    <span className="bg-white text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold shadow">
                      ⏳ En Attente de Paiement
                    </span>
                  )}
                  {isCommandeEnStock(selectedCommande) && (
                    <span className="bg-white text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold shadow animate-pulse">
                      📦 Disponible en Stock
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => !processing && closeCommandeModal()}
                  className="ml-2 flex-shrink-0 hover:bg-white/20 p-1 rounded transition-colors"
                  disabled={processing}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Contenu compact */}
            <div className="space-y-2 overflow-y-auto overscroll-contain p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditingCommande((value) => !value)}
                  disabled={processing}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors ${
                    isEditingCommande
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <Pencil size={12} />
                  {isEditingCommande ? 'Terminer les modifications' : 'Modifier la commande'}
                </button>
              </div>

              {isEditingCommande && orderDraft ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-2.5 space-y-2">
                  <p className="text-xs font-black uppercase text-blue-800">Informations du client</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={orderDraft.client.nom}
                      onChange={(e) => setOrderDraft((prev) => ({
                        ...prev,
                        client: { ...prev.client, nom: e.target.value },
                      }))}
                      className="input !py-1.5 text-xs"
                      placeholder="Nom du client"
                      disabled={processing}
                    />
                    <input
                      type="tel"
                      value={orderDraft.client.contact}
                      onChange={(e) => setOrderDraft((prev) => ({
                        ...prev,
                        client: { ...prev.client, contact: e.target.value },
                      }))}
                      className="input !py-1.5 text-xs"
                      placeholder="Contact"
                      disabled={processing}
                    />
                    <input
                      type="text"
                      value={orderDraft.client.ville}
                      onChange={(e) => setOrderDraft((prev) => ({
                        ...prev,
                        client: { ...prev.client, ville: e.target.value },
                      }))}
                      className="input !py-1.5 text-xs sm:col-span-2"
                      placeholder="Ville / quartier"
                      disabled={processing}
                    />
                  </div>

                  <p className="text-xs font-black uppercase text-blue-800">Tenue principale</p>
                  <input
                    type="text"
                    value={orderDraft.modele.nom}
                    onChange={(e) => setOrderDraft((prev) => ({
                      ...prev,
                      modele: { ...prev.modele, nom: e.target.value },
                    }))}
                    className="input !py-1.5 text-xs"
                    placeholder="Modèle"
                    disabled={processing}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={orderDraft.taille}
                      onChange={(e) => setOrderDraft((prev) => ({ ...prev, taille: e.target.value }))}
                      className="input !py-1.5 text-xs"
                      placeholder="Taille"
                      disabled={processing}
                    />
                    <input
                      type="text"
                      value={orderDraft.couleur}
                      onChange={(e) => setOrderDraft((prev) => ({ ...prev, couleur: e.target.value }))}
                      className="input !py-1.5 text-xs"
                      placeholder="Couleur"
                      disabled={processing}
                    />
                  </div>
                  <label className="block text-xs font-bold text-gray-700">
                    Prix de la tenue principale
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="0"
                        value={orderDraft.prixBase}
                        onChange={(e) => setOrderDraft((prev) => ({ ...prev, prixBase: e.target.value }))}
                        className="input !py-1.5 pr-12 text-xs font-black"
                        placeholder="13500"
                        disabled={processing}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">F</span>
                    </div>
                  </label>
                </div>
              ) : (
                <>
                  {/* Client avec Image du produit */}
                  <div className="bg-gray-50 rounded-lg p-2.5 flex items-start space-x-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Nom</span>
                        <span className="min-w-0 break-words text-right text-xs font-bold text-gray-900 sm:text-sm">{getClientNom(selectedCommande)}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Contact</span>
                        <a
                          href={`tel:${getClientContact(selectedCommande)}`}
                          className="flex min-w-0 items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 sm:text-sm"
                        >
                          <Phone size={14} />
                          <span>{getClientContact(selectedCommande)}</span>
                        </a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Ville</span>
                        <span className="min-w-0 break-words text-right text-xs font-bold text-gray-900 sm:text-sm">{getVille(selectedCommande)}</span>
                      </div>
                    </div>

                    {(typeof selectedCommande.modele === 'object' && selectedCommande.modele?.image) ? (
                      <div className="flex-shrink-0">
                        <img
                          src={selectedCommande.modele.image}
                          alt={getModeleNom(selectedCommande.modele)}
                          className="w-16 h-16 object-cover rounded-lg shadow"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow flex items-center justify-center">
                        <Package className="text-white" size={26} />
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-200">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">📦 Détails de la commande</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Modèle</span>
                        <span className="ml-3 min-w-0 break-words text-right font-bold text-gray-900">{getModeleNom(selectedCommande.modele)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-white rounded text-[11px] font-semibold">📏 {selectedCommande.taille}</span>
                        <span className="px-2 py-0.5 bg-white rounded text-[11px] font-semibold">🎨 {selectedCommande.couleur}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Prix - Compact */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg px-2.5 py-2 flex justify-between items-center">
                <div>
                  <span className="text-white text-xs font-semibold">Prix Total</span>
                  {(orderDraft?.supplements?.length || 0) > 0 && (
                    <p className="text-[10px] text-emerald-50">
                      Base {Number(orderDraft?.prixBase || 0).toLocaleString('fr-FR')} F + suppléments
                    </p>
                  )}
                </div>
                <span className="ml-2 text-right text-lg font-black text-white sm:text-xl">
                  {getOrderTotal(orderDraft?.prixBase, orderDraft?.supplements).toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {/* Note - Compact */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  📝 Note / Précisions de l'appelant
                </label>
                <textarea
                  value={noteAppelant}
                  onChange={(e) => setNoteAppelant(e.target.value)}
                  placeholder="Ajouter des précisions pour l'atelier (optionnel)..."
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="1"
                  disabled={processing}
                />
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Cette note sera visible par toute l'équipe de production
                </p>
              </div>

              {/* Articles et suppléments sous forme d'étiquettes */}
              <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2 space-y-1.5">
                <div>
                  <p className="text-xs font-black text-violet-900 flex items-center gap-1.5">
                    <Tag size={12} />
                    Articles / suppléments ajoutés
                  </p>
                  <p className="text-[10px] text-violet-700 mt-0.5">
                    Choisis un modèle : son prix catalogue est ajouté automatiquement au total.
                  </p>
                </div>

                {(orderDraft?.supplements?.length || 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {orderDraft.supplements.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-600 text-white pl-2.5 pr-1 py-1 text-[11px] font-bold"
                      >
                        {item.libelle} +{item.montant.toLocaleString('fr-FR')} F
                        <button
                          type="button"
                          onClick={() => handleRemoveSupplement(item.id)}
                          disabled={processing}
                          className="p-1 rounded-full hover:bg-white/20 disabled:opacity-50"
                          title="Retirer ce supplément"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-[minmax(0,1fr)_32px] gap-1.5">
                  <select
                    value={supplementModeleId}
                    onChange={(e) => setSupplementModeleId(e.target.value)}
                    className="input min-w-0 !px-2 !py-1.5 text-[11px] font-semibold"
                    disabled={processing || catalogueLoading || catalogueModeles.length === 0}
                    aria-label="Modèle supplémentaire"
                  >
                    <option value="">
                      {catalogueLoading ? 'Chargement du catalogue…' : 'Choisir un modèle…'}
                    </option>
                    {catalogueModeles.map((modele) => {
                      const modeleId = modele.id || modele._id;
                      const prixCatalogue = Math.round(Number(modele.prixBase ?? modele.prix_base));
                      const tarifValide = Number.isFinite(prixCatalogue) && prixCatalogue > 0;
                      return (
                        <option key={modeleId} value={modeleId} disabled={!tarifValide}>
                          {modele.nom} — {tarifValide ? `${prixCatalogue.toLocaleString('fr-FR')} F` : 'tarif non défini'}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSupplement}
                    disabled={processing || !supplementModeleId}
                    className="w-8 h-8 rounded-md bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center disabled:opacity-50"
                    title="Ajouter ce modèle au total"
                    aria-label="Ajouter le modèle sélectionné"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {!catalogueLoading && catalogueModeles.length === 0 && (
                  <p className="text-[10px] font-semibold text-red-600">
                    Aucun modèle actif n’est disponible dans le catalogue.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCommande}
                  disabled={processing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={13} />
                  {processing ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
                </button>
              </div>

              {/* Actions - Compact en grille 2x2 */}
              <div className="grid grid-cols-2 gap-1 pt-0.5 sm:gap-1.5">
                <button
                  onClick={() => handleAction(selectedCommande._id || selectedCommande.id, 'confirmer')}
                  disabled={processing}
                  className="flex items-center justify-center gap-1 rounded-md bg-green-600 px-1 py-2 text-[10px] font-bold text-white transition-all hover:bg-green-700 disabled:opacity-50 sm:px-2 sm:text-xs"
                >
                  <CheckCircle size={15} />
                  <span>CONFIRMER</span>
                </button>

                <button
                  onClick={() => handleAction(selectedCommande._id || selectedCommande.id, 'urgent')}
                  disabled={processing}
                  className="flex items-center justify-center gap-1 rounded-md bg-red-600 px-1 py-2 text-[10px] font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50 sm:px-2 sm:text-xs"
                >
                  <AlertTriangle size={15} />
                  <span>URGENT</span>
                </button>

                <button
                  onClick={() => handleAction(selectedCommande._id || selectedCommande.id, 'attente')}
                  disabled={processing}
                  className="flex items-center justify-center gap-1 rounded-md bg-orange-600 px-1 py-2 text-[10px] font-bold text-white transition-all hover:bg-orange-700 disabled:opacity-50 sm:px-2 sm:text-xs"
                >
                  <Clock size={15} />
                  <span>EN ATTENTE</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
                      handleAction(selectedCommande._id || selectedCommande.id, 'annuler');
                    }
                  }}
                  disabled={processing}
                  className="flex items-center justify-center gap-1 rounded-md bg-gray-500 px-1 py-2 text-[10px] font-bold text-white transition-all hover:bg-gray-600 disabled:opacity-50 sm:px-2 sm:text-xs"
                >
                  <XCircle size={15} />
                  <span>ANNULER</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appel;
