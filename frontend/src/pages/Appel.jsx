import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Phone, CheckCircle, XCircle, Clock, AlertTriangle, User, MapPin, Package, DollarSign, X, RefreshCw, Plus, Search, Pin, PinOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const EPINGLES_STORAGE_KEY = 'appel_commandes_epinglees';

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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [noteAppelant, setNoteAppelant] = useState('');
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
  }, []);

  // Charger la note existante quand la modal s'ouvre
  useEffect(() => {
    if (selectedCommande) {
      // Si la commande a une note existante, la charger
      // Sinon, laisser le champ vide
      setNoteAppelant(selectedCommande.noteAppelant || '');
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

      // Pour confirmer ou urgent, utiliser la route /valider qui déclenche le SMS
      if (action === 'confirmer' || action === 'urgent') {
        await api.post(`/commandes/${commandeId}/valider`);
        
        // Si urgent, mettre à jour le flag urgence séparément
        if (action === 'urgent') {
          await api.put(`/commandes/${commandeId}`, { urgence: true, noteAppelant: noteAppelant.trim() });
        } else if (noteAppelant.trim()) {
          // Si pas urgent mais il y a une note, la sauvegarder
          await api.put(`/commandes/${commandeId}`, { noteAppelant: noteAppelant.trim() });
        }
      } else if (action === 'attente') {
        // Pour attente, utiliser la route /attente-depot qui déclenche le SMS
        await api.post(`/commandes/${commandeId}/attente-depot`);
        if (noteAppelant.trim()) {
          await api.put(`/commandes/${commandeId}`, { noteAppelant: noteAppelant.trim() });
        }
      } else {
        // Pour les autres actions (annuler, etc.), utiliser PUT classique
        const payload = { statut: newStatut };
        payload.noteAppelant = noteAppelant.trim();
        await api.put(`/commandes/${commandeId}`, payload);
      }
      
      toast.success(message);
      
      // Fermer la modal et réinitialiser la note
      setSelectedCommande(null);
      setNoteAppelant('');
      
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
              <Phone className="text-white" size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Appels à Traiter
              </h1>
              <p className="text-gray-600 font-medium">Nouvelles commandes en attente de validation</p>
              
              {/* Indicateur de rafraîchissement auto */}
              <div className="flex items-center space-x-3 mt-2">
                <button
                  onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                
                <span className="text-xs text-gray-500">
                  Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
                </span>
                
                <button
                  onClick={() => fetchCommandesAppel()}
                  className="flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                >
                  <RefreshCw size={14} />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-4">
          <Link
            to="/commandes/nouvelle"
            className="btn bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Nouvelle Commande</span>
          </Link>
          
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-500 uppercase">En attente</p>
          <p className="text-5xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            {commandesAppel.length}
          </p>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      {commandesAppel.length > 0 && (
        <div className="stat-card !p-3 sm:!p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par n°, client, téléphone, modèle ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 pr-10 text-sm sm:text-base w-full"
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
        <div className="stat-card text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-4">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun appel en attente</h3>
          <p className="text-gray-600">Toutes les commandes ont été traitées ! 🎉</p>
        </div>
      ) : filteredCommandes.length === 0 ? (
        <div className="stat-card text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-slate-100 rounded-full mb-4">
            <Search className="text-gray-500" size={40} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun résultat</h3>
          <p className="text-gray-600">Aucune commande ne correspond à « {searchTerm} »</p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
          >
            <X size={14} />
            <span>Effacer la recherche</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCommandes.map((commande, index) => {
            const enStock = isCommandeEnStock(commande);
            const estEnAttentePaiement = commande.statut === 'en_attente_paiement';
            const pinned = isPinned(commande);
            const dateSource =
              commande.dateCommande ||
              commande.createdAt || // Supabase mapCommande -> createdAt
              commande.created_at; // fallback éventuel
            const dateObj = dateSource ? new Date(dateSource) : null;
            const isValidDate = dateObj && !Number.isNaN(dateObj.getTime());
            
            // Déterminer le style de la carte selon le statut et la disponibilité en stock
            let cardStyle = 'relative stat-card hover:scale-105 transition-all cursor-pointer group';
            
            if (pinned) {
              // Commande epinglee : bordure jaune dorée prioritaire
              cardStyle += ' border-4 border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-xl shadow-amber-500/30 ring-2 ring-amber-200';
            } else if (estEnAttentePaiement) {
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
              onClick={() => setSelectedCommande(commande)}
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
                      : 'bg-white/90 text-gray-400 hover:text-amber-600 hover:bg-amber-50 shadow opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {pinned ? <PinOff size={14} strokeWidth={2.5} /> : <Pin size={14} strokeWidth={2.5} />}
                </button>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
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
                <div className="flex flex-col gap-1 mt-7">
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
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 mb-3 flex items-start space-x-3">
                {/* Infos Client */}
                <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="text-blue-600" size={16} />
                  <p className="font-bold text-gray-900 text-sm">{getClientNom(commande)}</p>
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
                  <p className="text-xs text-gray-700 font-medium">{getVille(commande)}</p>
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
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center space-x-1">
                    <Package size={14} />
                    <span>Modèle</span>
                  </span>
                  <span className="font-bold text-gray-900">{getModeleNom(commande.modele)}</span>
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

              {/* Prix */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs font-semibold">Prix Total</span>
                  <span className="text-white text-xl font-black">
                    {commande.prix?.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Bouton Traiter */}
              <button
                className="w-full btn btn-primary py-3 font-bold group-hover:shadow-xl transition-shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCommande(commande);
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!processing) {
              setSelectedCommande(null);
              setNoteAppelant('');
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header compact */}
            <div className={`${
              selectedCommande.statut === 'en_attente_paiement'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            } p-4 rounded-t-xl text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold">
                    {selectedCommande.numeroCommande || (selectedCommande._id || selectedCommande.id).slice(-6).toUpperCase()}
                  </h2>
                  {selectedCommande.statut === 'en_attente_paiement' && (
                    <span className="bg-white text-orange-700 text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                      ⏳ En Attente de Paiement
                    </span>
                  )}
                  {isCommandeEnStock(selectedCommande) && (
                    <span className="bg-white text-blue-700 text-xs px-3 py-1 rounded-full font-bold shadow-lg animate-pulse">
                      📦 Disponible en Stock
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (!processing) {
                      setSelectedCommande(null);
                      setNoteAppelant('');
                    }
                  }}
                  className="hover:bg-white/20 p-1 rounded transition-colors"
                  disabled={processing}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Contenu compact */}
            <div className="p-4 space-y-3">
              {/* Client avec Image du produit */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-start space-x-3">
                {/* Infos Client */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Nom</span>
                    <span className="font-bold text-gray-900">{getClientNom(selectedCommande)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Contact</span>
                    <a 
                      href={`tel:${getClientContact(selectedCommande)}`}
                      className="font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <Phone size={14} />
                      <span>{getClientContact(selectedCommande)}</span>
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Ville</span>
                    <span className="font-bold text-gray-900">{getVille(selectedCommande)}</span>
                  </div>
                </div>
                
                {/* Image du produit - À DROITE */}
                {(typeof selectedCommande.modele === 'object' && selectedCommande.modele?.image) ? (
                  <div className="flex-shrink-0">
                    <img 
                      src={selectedCommande.modele.image} 
                      alt={getModeleNom(selectedCommande.modele)}
                      className="w-20 h-20 object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-md flex items-center justify-center">
                    <Package className="text-white" size={32} />
                  </div>
                )}
              </div>

              {/* Détails Commande - Compact */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">📦 Détails de la commande</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Modèle</span>
                    <span className="font-bold text-gray-900">{getModeleNom(selectedCommande.modele)}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-2 py-1 bg-white rounded text-xs font-semibold">📏 {selectedCommande.taille}</span>
                    <span className="px-2 py-1 bg-white rounded text-xs font-semibold">🎨 {selectedCommande.couleur}</span>
                  </div>
                </div>
              </div>

              {/* Prix - Compact */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-3 flex justify-between items-center">
                <span className="text-white text-sm font-semibold">Prix Total</span>
                <span className="text-white text-2xl font-black">
                  {selectedCommande.prix?.toLocaleString('fr-FR')} FCFA
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="2"
                  disabled={processing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cette note sera visible par toute l'équipe de production
                </p>
                </div>

              {/* Actions - Compact en grille 2x2 */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleAction(selectedCommande._id || selectedCommande.id, 'confirmer')}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  <span>CONFIRMER</span>
                </button>

                <button
                  onClick={() => handleAction(selectedCommande._id || selectedCommande.id, 'urgent')}
                  disabled={processing}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  <AlertTriangle size={18} />
                  <span>URGENT</span>
                </button>

                <button
                  onClick={() => handleAction(selectedCommande._id || selectedCommande.id, 'attente')}
                  disabled={processing}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  <Clock size={18} />
                  <span>EN ATTENTE</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
                      handleAction(selectedCommande._id || selectedCommande.id, 'annuler');
                    }
                  }}
                  disabled={processing}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  <XCircle size={18} />
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
