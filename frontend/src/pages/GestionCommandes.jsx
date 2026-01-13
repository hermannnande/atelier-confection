import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { 
  Settings, 
  Trash2, 
  RotateCcw, 
  Eye, 
  X,
  AlertTriangle,
  Clock,
  User,
  Phone,
  Package,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Scissors,
  Shirt,
  Truck,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const GestionCommandes = () => {
  const { user } = useAuthStore();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showResetModal, setShowResetModal] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    try {
      const response = await api.get('/commandes');
      setCommandes(response.data.commandes || []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCommande = async (commandeId) => {
    try {
      await api.delete(`/commandes/${commandeId}`);
      toast.success('Commande supprimée avec succès !');
      setCommandes(prev => prev.filter(c => (c._id || c.id) !== commandeId));
      setShowDeleteModal(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleResetCommande = async (commandeId) => {
    try {
      await api.put(`/commandes/${commandeId}`, { 
        statut: 'en_attente_validation',
        urgence: false,
        renvoyee: true,
        dateRenvoi: new Date().toISOString(),
        noteAppelant: '⚠️ RENVOYÉE - Commande renvoyée en attente de traitement par un administrateur'
      });
      toast.success('Commande renvoyée en attente de traitement !');
      fetchCommandes();
      setShowResetModal(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la réinitialisation');
    }
  };

  // Gestion de la sélection
  const toggleSelectCommande = (commandeId) => {
    setSelectedIds(prev => 
      prev.includes(commandeId) 
        ? prev.filter(id => id !== commandeId)
        : [...prev, commandeId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === commandesFiltrees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(commandesFiltrees.map(cmd => cmd._id || cmd.id));
    }
  };

  // Suppression groupée
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(
        selectedIds.map(id => api.delete(`/commandes/${id}`))
      );
      
      toast.success(`✅ ${selectedIds.length} commande(s) supprimée(s) avec succès !`);
      setCommandes(prev => prev.filter(c => !selectedIds.includes(c._id || c.id)));
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression groupée');
    }
  };

  const getStatutBadge = (statut) => {
    const badges = {
      nouvelle: { class: 'bg-blue-500', text: 'Nouvelle', icon: AlertTriangle },
      en_attente_validation: { class: 'bg-yellow-500', text: 'En attente', icon: Clock },
      validee: { class: 'bg-green-500', text: 'Validée', icon: CheckCircle },
      en_attente_paiement: { class: 'bg-orange-500', text: 'Attente paiement', icon: Clock },
      en_decoupe: { class: 'bg-purple-500', text: 'En découpe', icon: Scissors },
      en_couture: { class: 'bg-indigo-500', text: 'En couture', icon: Shirt },
      en_stock: { class: 'bg-teal-500', text: 'En stock', icon: Package },
      en_livraison: { class: 'bg-cyan-500', text: 'En livraison', icon: Truck },
      livree: { class: 'bg-emerald-600', text: 'Livrée', icon: CheckCircle },
      refusee: { class: 'bg-red-600', text: 'Refusée', icon: XCircle },
      annulee: { class: 'bg-gray-600', text: 'Annulée', icon: XCircle },
    };
    return badges[statut] || { class: 'bg-gray-400', text: statut, icon: AlertTriangle };
  };

  const commandesFiltrees = commandes.filter(cmd => {
    const matchSearch = searchTerm === '' || 
      cmd.numeroCommande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof cmd.client === 'object' ? cmd.client.nom : cmd.nomClient)?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatut = filterStatut === '' || cmd.statut === filterStatut;
    
    return matchSearch && matchStatut;
  });

  const getClientNom = (commande) => {
    if (commande.nomClient) return commande.nomClient;
    if (commande.client) {
      return typeof commande.client === 'string' ? commande.client : (commande.client.nom || 'N/A');
    }
    return 'N/A';
  };

  const getClientContact = (commande) => {
    if (commande.contactClient) return commande.contactClient;
    if (commande.client && typeof commande.client === 'object') {
      return commande.client.contact || 'N/A';
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

  const getModeleNom = (modele) => {
    if (!modele) return 'N/A';
    return typeof modele === 'string' ? modele : (modele.nom || 'N/A');
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

  const statutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'nouvelle', label: 'Nouvelle' },
    { value: 'en_attente_validation', label: 'En attente validation' },
    { value: 'validee', label: 'Validée' },
    { value: 'en_attente_paiement', label: 'Attente paiement' },
    { value: 'en_decoupe', label: 'En découpe' },
    { value: 'en_couture', label: 'En couture' },
    { value: 'en_stock', label: 'En stock' },
    { value: 'en_livraison', label: 'En livraison' },
    { value: 'livree', label: 'Livrée' },
    { value: 'refusee', label: 'Refusée' },
    { value: 'annulee', label: 'Annulée' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="bg-gradient-to-br from-red-500 to-pink-600 p-2 sm:p-3 lg:p-4 rounded-2xl shadow-lg flex-shrink-0">
            <Settings className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent truncate">
              Gestion Avancée
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium truncate">
              Administration complète des commandes
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase">Total</p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
            {commandesFiltrees.length}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card max-w-full overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 flex-shrink-0" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 sm:pl-12 text-sm sm:text-base"
              placeholder="Rechercher par numéro ou client..."
            />
          </div>

          {/* Filtre statut */}
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="input text-sm sm:text-base"
          >
            {statutOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Barre d'actions groupées (Admin uniquement) */}
      {user?.role === 'administrateur' && commandesFiltrees.length > 0 && (
        <div className="card max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <input
                type="checkbox"
                checked={selectedIds.length === commandesFiltrees.length && commandesFiltrees.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">
                  {selectedIds.length > 0 
                    ? `${selectedIds.length} commande(s) sélectionnée(s)`
                    : 'Sélectionner tout'}
                </p>
                {selectedIds.length > 0 && (
                  <p className="text-xs text-gray-500">Cliquez sur "Supprimer la sélection" pour continuer</p>
                )}
              </div>
            </div>
            
            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="btn bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 flex-shrink-0 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto justify-center"
              >
                <Trash2 size={18} />
                <span>Supprimer la sélection ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Liste des commandes */}
      {commandesFiltrees.length === 0 ? (
        <div className="card text-center py-12">
          <AlertTriangle className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">Aucune commande trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 max-w-full">
          {commandesFiltrees.map((commande) => {
            const statutInfo = getStatutBadge(commande.statut);
            const StatutIcon = statutInfo.icon;
            
            const commandeId = commande._id || commande.id;
            const isSelected = selectedIds.includes(commandeId);
            
            return (
              <div 
                key={commandeId} 
                className={`card hover:shadow-lg transition-all max-w-full overflow-hidden ${isSelected && user?.role === 'administrateur' ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Checkbox (Admin uniquement) */}
                    {user?.role === 'administrateur' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCommande(commandeId)}
                        className="w-5 h-5 mt-1 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-black text-gray-900 truncate">
                          {commande.numeroCommande}
                        </h3>
                        {commande.urgence && (
                          <span className="badge bg-red-600 text-white text-xs px-2 py-1 flex-shrink-0">
                            🔥 URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {format(new Date(commande.createdAt || commande.dateCommande), 'PPP à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <span className={`${statutInfo.class} text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 flex-shrink-0`}>
                    <StatutIcon size={14} />
                    <span className="hidden sm:inline">{statutInfo.text}</span>
                  </span>
                </div>

                {/* Contenu principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3">
                  {/* Client */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 min-w-0">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">👤 Client</p>
                    <p className="font-bold text-sm text-gray-900 truncate">{getClientNom(commande)}</p>
                    <p className="text-xs text-gray-600 truncate">{getClientContact(commande)}</p>
                    <p className="text-xs text-gray-600 truncate flex items-center gap-1">
                      <MapPin size={10} className="flex-shrink-0" />
                      {getVille(commande)}
                    </p>
                  </div>

                  {/* Modèle */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 min-w-0">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">📦 Modèle</p>
                    <p className="font-bold text-sm text-gray-900 truncate">{getModeleNom(commande.modele)}</p>
                    <p className="text-xs text-gray-600">
                      Taille: <span className="font-bold">{commande.taille}</span>
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      Couleur: <span className="font-bold">{commande.couleur}</span>
                    </p>
                  </div>

                  {/* Prix */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">💰 Prix</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600">
                      {commande.prix?.toLocaleString('fr-FR')} F
                    </p>
                  </div>
                </div>

                {/* Workflow - Qui a travaillé dessus */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">👥 Workflow</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {commande.appelant && (
                      <div className="min-w-0">
                        <p className="text-gray-500">📞 Appelant</p>
                        <p className="font-bold text-gray-900 truncate">
                          {commande.appelant.nom || commande.appelant}
                        </p>
                      </div>
                    )}
                    {commande.styliste && (
                      <div className="min-w-0">
                        <p className="text-gray-500">✂️ Styliste</p>
                        <p className="font-bold text-gray-900 truncate">
                          {commande.styliste.nom || commande.styliste}
                        </p>
                      </div>
                    )}
                    {commande.couturier && (
                      <div className="min-w-0">
                        <p className="text-gray-500">👔 Couturier</p>
                        <p className="font-bold text-red-600 truncate">
                          {commande.couturier.nom || commande.couturier}
                        </p>
                      </div>
                    )}
                    {commande.livreur && (
                      <div className="min-w-0">
                        <p className="text-gray-500">🚚 Livreur</p>
                        <p className="font-bold text-gray-900 truncate">
                          {commande.livreur.nom || commande.livreur}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Admin */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCommande(commande)}
                    className="btn bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm px-3 py-1.5 flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                  >
                    <Eye size={14} className="flex-shrink-0" />
                    <span>Détails</span>
                  </button>
                  
                  {commande.statut !== 'en_attente_validation' && (
                    <button
                      onClick={() => setShowResetModal(commande)}
                      className="btn bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm px-3 py-1.5 flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                    >
                      <RotateCcw size={14} className="flex-shrink-0" />
                      <span>Renvoyer</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowDeleteModal(commande)}
                    className="btn bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm px-3 py-1.5 flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                  >
                    <Trash2 size={14} className="flex-shrink-0" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Détails */}
      {selectedCommande && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Détails de la commande</h2>
              <button
                onClick={() => setSelectedCommande(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Historique */}
              {selectedCommande.historique && selectedCommande.historique.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">📜 Historique des modifications</h3>
                  <div className="space-y-2">
                    {selectedCommande.historique.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{item.action}</p>
                          {item.commentaire && (
                            <p className="text-sm text-gray-600 mt-1">{item.commentaire}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(item.date), 'PPP à HH:mm', { locale: fr })}
                            {item.utilisateur && ` • ${item.utilisateur.nom}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              {selectedCommande.noteAppelant && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-gray-900 mb-1">📝 Note de l'appelant</p>
                  <p className="text-sm text-gray-700">{selectedCommande.noteAppelant}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Supprimer la commande ?</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la commande <strong>{showDeleteModal.numeroCommande}</strong> ? 
              Cette action est irréversible.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="btn btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteCommande(showDeleteModal._id || showDeleteModal.id)}
                className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Reset */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-3 rounded-full">
                <RotateCcw className="text-orange-600" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Renvoyer en attente ?</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Voulez-vous renvoyer la commande <strong>{showResetModal.numeroCommande}</strong> en page "Appel" 
              pour qu'elle soit retraitée ? Elle sera remise en statut "En attente de validation".
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(null)}
                className="btn btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={() => handleResetCommande(showResetModal._id || showResetModal.id)}
                className="btn bg-orange-500 hover:bg-orange-600 text-white flex-1"
              >
                Renvoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression Groupée */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Suppression groupée</h2>
            </div>
            
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-900 font-bold mb-2">⚠️ Attention !</p>
              <p className="text-sm text-red-800">
                Vous êtes sur le point de supprimer <strong>{selectedIds.length} commande(s)</strong>.
                Cette action est <strong>irréversible</strong>.
              </p>
            </div>
            
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment continuer ?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="btn btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn bg-red-600 hover:bg-red-700 text-white flex-1 font-bold flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Supprimer ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionCommandes;

