import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Truck, CheckCircle, XCircle, AlertCircle, Package, Phone } from 'lucide-react';

const Livraisons = () => {
  const { user } = useAuthStore();
  const [livraisons, setLivraisons] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState('');
  const [selectedLivreur, setSelectedLivreur] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterLivreur, setFilterLivreur] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');

  useEffect(() => {
    fetchLivraisons();
    fetchLivreurs(); // Charger les livreurs pour le filtre
    if (['gestionnaire', 'administrateur'].includes(user?.role)) {
      fetchCommandesStock();
    }
  }, [user]);

  const fetchLivraisons = async () => {
    try {
      const response = await api.get('/livraisons');
      setLivraisons(response.data.livraisons);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
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
      setShowModal(false);
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

  const handleRefusee = async (id) => {
    const motif = prompt('Motif du refus:');
    if (!motif) return;

    try {
      await api.post(`/livraisons/${id}/refusee`, { motifRefus: motif });
      toast.success('Refus enregistré');
      fetchLivraisons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleConfirmerRetour = async (id) => {
    const commentaire = prompt('Commentaire sur le retour:');
    try {
      await api.post(`/livraisons/${id}/confirmer-retour`, { commentaire });
      toast.success('Retour confirmé et stock mis à jour');
      fetchLivraisons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const getStatutBadge = (statut) => {
    const badges = {
      en_cours: 'badge-primary',
      livree: 'badge-success',
      refusee: 'badge-danger',
      retournee: 'badge-secondary'
    };
    return badges[statut] || 'badge-secondary';
  };

  const getStatutLabel = (statut) => {
    const labels = {
      en_cours: 'En cours',
      livree: 'Livrée',
      refusee: 'Refusée',
      retournee: 'Retournée'
    };
    return labels[statut] || statut;
  };

  // Fonction de filtrage combinée
  const getFilteredLivraisons = () => {
    let filtered = [...livraisons];

    // Filtre par statut
    if (filterStatut) {
      filtered = filtered.filter(l => l.statut === filterStatut);
    }

    // Filtre par livreur
    if (filterLivreur) {
      filtered = filtered.filter(l => l.livreur?._id === filterLivreur);
    }

    // Filtre par date de début
    if (filterDateDebut) {
      filtered = filtered.filter(l => {
        const dateAssignation = new Date(l.dateAssignation);
        const dateDebut = new Date(filterDateDebut);
        return dateAssignation >= dateDebut;
      });
    }

    // Filtre par date de fin
    if (filterDateFin) {
      filtered = filtered.filter(l => {
        const dateAssignation = new Date(l.dateAssignation);
        const dateFin = new Date(filterDateFin);
        dateFin.setHours(23, 59, 59, 999); // Inclure toute la journée
        return dateAssignation <= dateFin;
      });
    }

    return filtered;
  };

  const livraisonsFiltered = getFilteredLivraisons();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
            <Truck className="text-white" size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Livraisons
            </h1>
            <p className="text-gray-600 font-medium">Suivi des colis en cours</p>
          </div>
        </div>
        {['gestionnaire', 'administrateur'].includes(user?.role) && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
          >
            <Truck size={20} strokeWidth={2.5} />
            <span>ASSIGNER</span>
          </button>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total</p>
          <p className="text-2xl font-black text-gray-900">{livraisons.length}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">🚚 En cours</p>
          <p className="text-2xl font-black text-blue-900">
            {livraisons.filter(l => l.statut === 'en_cours').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs font-semibold text-green-600 uppercase mb-1">✅ Livrées</p>
          <p className="text-2xl font-black text-green-900">
            {livraisons.filter(l => l.statut === 'livree').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase mb-1">❌ Refusées</p>
          <p className="text-2xl font-black text-red-900">
            {livraisons.filter(l => l.statut === 'refusee').length}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        {/* Filtres par statut */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setFilterStatut('')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              filterStatut === '' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📦 Tous ({livraisons.length})
          </button>
          <button
            onClick={() => setFilterStatut('en_cours')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              filterStatut === 'en_cours' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚚 En cours ({livraisons.filter(l => l.statut === 'en_cours').length})
          </button>
          <button
            onClick={() => setFilterStatut('livree')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              filterStatut === 'livree' 
                ? 'bg-green-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ✅ Livrées ({livraisons.filter(l => l.statut === 'livree').length})
          </button>
          <button
            onClick={() => setFilterStatut('refusee')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              filterStatut === 'refusee' 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ❌ Refusées ({livraisons.filter(l => l.statut === 'refusee').length})
          </button>
          <button
            onClick={() => setFilterStatut('retournee')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              filterStatut === 'retournee' 
                ? 'bg-gray-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ↩️ Retournées ({livraisons.filter(l => l.statut === 'retournee').length})
          </button>
        </div>

        {/* Filtres avancés */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Filtre par livreur */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              👤 LIVREUR
            </label>
            <select
              value={filterLivreur}
              onChange={(e) => setFilterLivreur(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous</option>
              {livreurs.map(livreur => (
                <option key={livreur._id} value={livreur._id}>
                  {livreur.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par date de début */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              📅 DATE DÉBUT
            </label>
            <input
              type="date"
              value={filterDateDebut}
              onChange={(e) => setFilterDateDebut(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtre par date de fin */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              📅 DATE FIN
            </label>
            <input
              type="date"
              value={filterDateFin}
              onChange={(e) => setFilterDateFin(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Bouton réinitialiser */}
        {(filterStatut || filterLivreur || filterDateDebut || filterDateFin) && (
          <div className="mt-3">
            <button
              onClick={() => {
                setFilterStatut('');
                setFilterLivreur('');
                setFilterDateDebut('');
                setFilterDateFin('');
              }}
              className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline"
            >
              ✕ Réinitialiser tous les filtres
            </button>
          </div>
        )}
      </div>

      {/* Liste des livraisons en grille */}
      {livraisonsFiltered.length === 0 ? (
        <div className="card text-center py-12">
          <Truck className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune livraison trouvée
          </h3>
          <p className="text-gray-600">
            {(filterStatut || filterLivreur || filterDateDebut || filterDateFin)
              ? 'Aucune livraison ne correspond aux filtres sélectionnés'
              : 'Les livraisons assignées apparaîtront ici'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {livraisonsFiltered.map((livraison) => {
            return (
              <div 
                key={livraison._id} 
                className={`relative bg-white rounded-lg shadow-sm hover:shadow-lg transition-all p-3 border-2 ${
                  livraison.commande?.urgence 
                    ? 'border-red-500 animate-pulse' 
                    : livraison.statut === 'livree' 
                      ? 'border-green-200' 
                      : livraison.statut === 'refusee' 
                        ? 'border-red-200' 
                        : 'border-gray-200'
                }`}
              >
                {/* Badge urgent en haut à droite */}
                {livraison.commande?.urgence && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-black shadow-lg">
                      ⚡ URGENT
                    </span>
                  </div>
                )}

                {/* Numéro de commande */}
                <div className="mb-2">
                  <h3 className="text-sm font-black text-gray-900 truncate">
                    {livraison.commande?.numeroCommande}
                  </h3>
                  <p className="text-xs text-gray-600 truncate">
                    {livraison.commande?.modele?.nom}
                  </p>
                </div>

                {/* Badge statut */}
                <div className="mb-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                    livraison.statut === 'livree' ? 'bg-green-100 text-green-800' :
                    livraison.statut === 'refusee' ? 'bg-red-100 text-red-800' :
                    livraison.statut === 'retournee' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {livraison.statut === 'livree' && '✅ '}
                    {livraison.statut === 'refusee' && '❌ '}
                    {livraison.statut === 'retournee' && '↩️ '}
                    {livraison.statut === 'en_cours' && '🚚 '}
                    {getStatutLabel(livraison.statut)}
                  </span>
                </div>

                {/* Informations client */}
                <div className="space-y-2 mb-3">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500 font-semibold mb-1">👤 CLIENT</p>
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {livraison.commande?.client.nom}
                    </p>
                    <a 
                      href={`tel:${livraison.commande?.client.contact}`}
                      className="text-xs text-blue-600 hover:underline flex items-center space-x-1 mt-1"
                    >
                      <Phone size={12} />
                      <span className="truncate">{livraison.commande?.client.contact}</span>
                    </a>
                  </div>

                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500 font-semibold mb-1">📍 VILLE</p>
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {livraison.adresseLivraison.ville}
                    </p>
                  </div>
                </div>

                {/* Prix */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg p-2 mb-3">
                  <p className="text-xs text-white font-semibold mb-1">💰 PRIX</p>
                  <p className="text-lg font-black text-white">
                    {livraison.commande?.prix.toLocaleString('fr-FR')} F
                  </p>
                </div>

                {/* Motif de refus si applicable */}
                {livraison.motifRefus && (
                  <div className="p-2 bg-red-50 rounded mb-3">
                    <p className="text-xs text-red-700">
                      <span className="font-bold">Refus: </span>
                      <span className="line-clamp-2">{livraison.motifRefus}</span>
                    </p>
                  </div>
                )}

                {/* Boutons d'action */}
                {user?.role === 'livreur' && livraison.statut === 'en_cours' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleLivree(livraison._id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <CheckCircle size={14} />
                      <span>LIVRÉE</span>
                    </button>
                    <button
                      onClick={() => handleRefusee(livraison._id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <XCircle size={14} />
                      <span>REFUSÉE</span>
                    </button>
                  </div>
                )}

                {['gestionnaire', 'administrateur'].includes(user?.role) && 
                 livraison.statut === 'refusee' && 
                 !livraison.verifieParGestionnaire && (
                  <button
                    onClick={() => handleConfirmerRetour(livraison._id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                  >
                    <Package size={14} />
                    <span>RETOUR</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'assignation */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Assigner une Livraison</h2>
            <form onSubmit={handleAssigner} className="space-y-4">
              <div>
                <label className="label">Commande *</label>
                <select
                  value={selectedCommande}
                  onChange={(e) => setSelectedCommande(e.target.value)}
                  required
                  className="input"
                >
                  <option value="">Sélectionner une commande</option>
                  {commandes.map((cmd) => (
                    <option key={cmd._id} value={cmd._id}>
                      {cmd.numeroCommande} - {cmd.client.nom} ({cmd.modele.nom})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Livreur *</label>
                <select
                  value={selectedLivreur}
                  onChange={(e) => setSelectedLivreur(e.target.value)}
                  required
                  className="input"
                >
                  <option value="">Sélectionner un livreur</option>
                  {livreurs.map((livreur) => (
                    <option key={livreur._id} value={livreur._id}>
                      {livreur.nom} - {livreur.telephone}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Assigner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Livraisons;




