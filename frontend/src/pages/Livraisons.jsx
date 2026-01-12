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

  useEffect(() => {
    fetchLivraisons();
    if (['gestionnaire', 'administrateur'].includes(user?.role)) {
      fetchCommandesStock();
      fetchLivreurs();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Livraisons</h1>
          <p className="text-gray-600 mt-1">Suivez les livraisons en cours</p>
        </div>
        {['gestionnaire', 'administrateur'].includes(user?.role) && (
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary inline-flex items-center space-x-2"
          >
            <Truck size={20} />
            <span>Assigner Livraison</span>
          </button>
        )}
      </div>

      {/* Statistiques - Cliquables pour filtrer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button
          onClick={() => setFilterStatut('')}
          className={`card text-left hover:shadow-lg transition-all cursor-pointer ${
            filterStatut === '' ? 'ring-2 ring-primary-600 bg-primary-50' : ''
          }`}
        >
          <p className="text-gray-600 mb-2">Total</p>
          <p className="text-3xl font-bold text-primary-600">{livraisons.length}</p>
        </button>
        <button
          onClick={() => setFilterStatut('en_cours')}
          className={`card text-left hover:shadow-lg transition-all cursor-pointer ${
            filterStatut === 'en_cours' ? 'ring-2 ring-blue-600 bg-blue-50' : ''
          }`}
        >
          <p className="text-gray-600 mb-2">🚚 En cours</p>
          <p className="text-3xl font-bold text-blue-600">
            {livraisons.filter(l => l.statut === 'en_cours').length}
          </p>
        </button>
        <button
          onClick={() => setFilterStatut('livree')}
          className={`card text-left hover:shadow-lg transition-all cursor-pointer ${
            filterStatut === 'livree' ? 'ring-2 ring-green-600 bg-green-50' : ''
          }`}
        >
          <p className="text-gray-600 mb-2">✅ Livrées</p>
          <p className="text-3xl font-bold text-green-600">
            {livraisons.filter(l => l.statut === 'livree').length}
          </p>
        </button>
        <button
          onClick={() => setFilterStatut('refusee')}
          className={`card text-left hover:shadow-lg transition-all cursor-pointer ${
            filterStatut === 'refusee' ? 'ring-2 ring-red-600 bg-red-50' : ''
          }`}
        >
          <p className="text-gray-600 mb-2">❌ Refusées</p>
          <p className="text-3xl font-bold text-red-600">
            {livraisons.filter(l => l.statut === 'refusee').length}
          </p>
        </button>
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setFilterStatut('')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === '' 
              ? 'bg-primary-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => setFilterStatut('en_cours')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'en_cours' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          🚚 En cours
        </button>
        <button
          onClick={() => setFilterStatut('livree')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'livree' 
              ? 'bg-green-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          ✅ Livrées
        </button>
        <button
          onClick={() => setFilterStatut('refusee')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'refusee' 
              ? 'bg-red-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          ❌ Refusées
        </button>
        <button
          onClick={() => setFilterStatut('retournee')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'retournee' 
              ? 'bg-gray-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          ↩️ Retournées
        </button>
      </div>

      {/* Liste des livraisons */}
      {(filterStatut ? livraisons.filter(l => l.statut === filterStatut) : livraisons).length === 0 ? (
        <div className="card text-center py-12">
          <Truck className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filterStatut ? `Aucune livraison ${getStatutLabel(filterStatut).toLowerCase()}` : 'Aucune livraison'}
          </h3>
          <p className="text-gray-600">
            {filterStatut ? 'Aucune livraison ne correspond à ce filtre' : 'Les livraisons assignées apparaîtront ici'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {(filterStatut ? livraisons.filter(l => l.statut === filterStatut) : livraisons).map((livraison) => (
            <div key={livraison._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {livraison.commande?.numeroCommande}
                    </h3>
                    <span className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
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
                    {livraison.commande?.urgence && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                        <AlertCircle size={12} className="inline mr-1" />
                        URGENT
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Client</p>
                      <p className="font-bold text-gray-900 mb-1">{livraison.commande?.client.nom}</p>
                      <a 
                        href={`tel:${livraison.commande?.client.contact}`}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
                      >
                        <Phone size={14} />
                        <span>{livraison.commande?.client.contact}</span>
                      </a>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Ville</p>
                      <p className="font-bold text-gray-900">📍 {livraison.adresseLivraison.ville}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Livreur</p>
                      <p className="font-bold text-gray-900 mb-1">{livraison.livreur?.nom}</p>
                      <a 
                        href={`tel:${livraison.livreur?.telephone}`}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
                      >
                        <Phone size={14} />
                        <span>{livraison.livreur?.telephone}</span>
                      </a>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg p-3">
                      <p className="text-xs text-white uppercase font-semibold mb-2">Prix Total</p>
                      <p className="text-2xl font-black text-white">
                        {livraison.commande?.prix.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span>
                      </p>
                    </div>
                  </div>

                  {livraison.motifRefus && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700">
                        <span className="font-medium">Motif du refus: </span>
                        {livraison.motifRefus}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {user?.role === 'livreur' && livraison.statut === 'en_cours' && (
                    <>
                      <button
                        onClick={() => handleLivree(livraison._id)}
                        className="btn btn-success btn-sm"
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Livrée
                      </button>
                      <button
                        onClick={() => handleRefusee(livraison._id)}
                        className="btn btn-danger btn-sm"
                      >
                        <XCircle size={16} className="mr-1" />
                        Refusée
                      </button>
                    </>
                  )}

                  {['gestionnaire', 'administrateur'].includes(user?.role) && 
                   livraison.statut === 'refusee' && 
                   !livraison.verifieParGestionnaire && (
                    <button
                      onClick={() => handleConfirmerRetour(livraison._id)}
                      className="btn btn-primary btn-sm"
                    >
                      <Package size={16} className="mr-1" />
                      Confirmer Retour
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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




