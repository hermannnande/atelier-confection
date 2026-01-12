import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Phone, CheckCircle, XCircle, Clock, AlertTriangle, User, MapPin, Package, DollarSign, X, RefreshCw, Plus } from 'lucide-react';

const Appel = () => {
  const [commandesAppel, setCommandesAppel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [noteAppelant, setNoteAppelant] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchCommandesAppel();
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

  const fetchCommandesAppel = async (silent = false) => {
    try {
      const response = await api.get('/commandes?statut=en_attente_validation,en_attente_paiement');
      const newCommandes = response.data.commandes || [];
      
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

      const payload = { statut: newStatut };
      if (action === 'urgent') {
        payload.urgence = true;
      }
      
      // Toujours envoyer la note de l'appelant (même si vide)
      // Si vide, cela efface la note automatique générée par le système
      payload.noteAppelant = noteAppelant.trim();

      await api.put(`/commandes/${commandeId}`, payload);
      
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

      {/* Grille des commandes */}
      {commandesAppel.length === 0 ? (
        <div className="stat-card text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-4">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun appel en attente</h3>
          <p className="text-gray-600">Toutes les commandes ont été traitées ! 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {commandesAppel.map((commande, index) => (
            <div
              key={commande._id || commande.id}
              className="stat-card hover:scale-105 transition-transform cursor-pointer group"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => setSelectedCommande(commande)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    #{commande.numeroCommande || (commande._id || commande.id).slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {new Date(commande.dateCommande || commande.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className="badge badge-warning text-xs px-2 py-1">
                  📞 Appel
                </span>
              </div>

              {/* Client */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 mb-3">
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
          ))}
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
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-t-xl text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {selectedCommande.numeroCommande || (selectedCommande._id || selectedCommande.id).slice(-6).toUpperCase()}
              </h2>
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

            {/* Contenu compact */}
            <div className="p-4 space-y-3">
              {/* Client - Une seule ligne */}
              <div className="bg-gray-50 rounded-lg p-3">
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
