import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { DollarSign, Package, User, CheckCircle, Eye, XCircle, Wallet } from 'lucide-react';

const CaisseLivreurs = () => {
  const [livreurs, setLivreurs] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Récupérer tous les livreurs
      const usersResponse = await api.get('/users');
      const livreursActifs = usersResponse.data.users.filter(u => u.role === 'livreur' && u.actif);
      
      // Récupérer toutes les livraisons
      const livraisonsResponse = await api.get('/livraisons');
      
      setLivreurs(livreursActifs);
      setLivraisons(livraisonsResponse.data.livraisons);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getLivraisonsLivreur = (livreurId) => {
    return livraisons.filter(l => l.livreur?._id === livreurId || l.livreur?.id === livreurId);
  };

  const getLivraisonsLivrees = (livreurId) => {
    return getLivraisonsLivreur(livreurId).filter(l => l.statut === 'livree');
  };

  const getMontantTotal = (livreurId) => {
    const livraisonsLivrees = getLivraisonsLivrees(livreurId);
    return livraisonsLivrees.reduce((total, livraison) => {
      const prix = livraison.commande?.prix || 0;
      return total + prix;
    }, 0);
  };

  const handleVoirDetails = (livreur) => {
    setSelectedLivreur(livreur);
    setShowDetailsModal(true);
  };

  const getStatutBadge = (statut) => {
    const badges = {
      en_cours: 'bg-blue-100 text-blue-800',
      livree: 'bg-green-100 text-green-800',
      refusee: 'bg-red-100 text-red-800',
      retournee: 'bg-gray-100 text-gray-800'
    };
    return badges[statut] || 'bg-gray-100 text-gray-800';
  };

  const getStatutLabel = (statut) => {
    const labels = {
      en_cours: '🚚 En cours',
      livree: '✅ Livrée',
      refusee: '❌ Refusée',
      retournee: '↩️ Retournée'
    };
    return labels[statut] || statut;
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

  const totalGeneral = livreurs.reduce((sum, livreur) => sum + getMontantTotal(livreur._id || livreur.id), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg">
              <Wallet className="text-white" size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Caisse Livreurs
              </h1>
              <p className="text-gray-600 font-medium">Suivi des encaissements et livraisons</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-500 uppercase">Total à Remettre</p>
          <p className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {totalGeneral.toLocaleString('fr-FR')} FCFA
          </p>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Livreurs Actifs</p>
          <p className="text-3xl font-black text-gray-900">{livreurs.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">En Cours</p>
          <p className="text-3xl font-black text-blue-900">
            {livraisons.filter(l => l.statut === 'en_cours').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-600 uppercase mb-1">Livrées</p>
          <p className="text-3xl font-black text-green-900">
            {livraisons.filter(l => l.statut === 'livree').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Total Collecté</p>
          <p className="text-2xl font-black text-emerald-900">
            {totalGeneral.toLocaleString('fr-FR')} F
          </p>
        </div>
      </div>

      {/* Liste des livreurs */}
      {livreurs.length === 0 ? (
        <div className="card text-center py-12">
          <User className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun livreur actif
          </h3>
          <p className="text-gray-600">
            Les livreurs actifs apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {livreurs.map((livreur) => {
            const livraisonsLivreur = getLivraisonsLivreur(livreur._id || livreur.id);
            const livraisonsLivrees = getLivraisonsLivrees(livreur._id || livreur.id);
            const livraisonsEnCours = livraisonsLivreur.filter(l => l.statut === 'en_cours');
            const montantTotal = getMontantTotal(livreur._id || livreur.id);
            
            return (
              <div 
                key={livreur._id || livreur.id} 
                className="card bg-white hover:shadow-lg transition-all border-l-4 border-emerald-500"
              >
                {/* Header Livreur */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl">
                    <User className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{livreur.nom}</h3>
                    <p className="text-sm text-gray-600">{livreur.telephone}</p>
                  </div>
                </div>

                {/* Statistiques */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Package className="text-blue-600" size={16} />
                      <span className="text-sm font-semibold text-blue-900">En cours</span>
                    </div>
                    <span className="text-xl font-black text-blue-900">{livraisonsEnCours.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-green-600" size={16} />
                      <span className="text-sm font-semibold text-green-900">Livrées</span>
                    </div>
                    <span className="text-xl font-black text-green-900">{livraisonsLivrees.length}</span>
                  </div>
                </div>

                {/* Montant à remettre */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 mb-4">
                  <p className="text-white text-sm font-semibold mb-1 opacity-90">À Remettre</p>
                  <p className="text-white text-3xl font-black">
                    {montantTotal.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>

                {/* Bouton Détails */}
                <button
                  onClick={() => handleVoirDetails(livreur)}
                  className="w-full btn btn-secondary flex items-center justify-center space-x-2"
                  disabled={livraisonsLivreur.length === 0}
                >
                  <Eye size={16} />
                  <span>Voir Détails ({livraisonsLivreur.length})</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Détails Livreur */}
      {showDetailsModal && selectedLivreur && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedLivreur.nom}</h2>
                  <p className="text-emerald-100">{selectedLivreur.telephone}</p>
                </div>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold opacity-90 mb-1">Total Livraisons</p>
                  <p className="text-2xl font-black">
                    {getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id).length}
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold opacity-90 mb-1">Livrées</p>
                  <p className="text-2xl font-black">
                    {getLivraisonsLivrees(selectedLivreur._id || selectedLivreur.id).length}
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold opacity-90 mb-1">À Remettre</p>
                  <p className="text-xl font-black">
                    {getMontantTotal(selectedLivreur._id || selectedLivreur.id).toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>
            </div>

            {/* Liste des livraisons */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Détails des Livraisons</h3>
              
              <div className="space-y-3">
                {getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id).map((livraison) => (
                  <div 
                    key={livraison._id || livraison.id} 
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-bold text-gray-900">
                            {livraison.commande?.numeroCommande || 'N/A'}
                          </h4>
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getStatutBadge(livraison.statut)}`}>
                            {getStatutLabel(livraison.statut)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <span className="font-semibold">Client:</span>{' '}
                            {typeof livraison.commande?.client === 'object' 
                              ? livraison.commande.client.nom 
                              : livraison.commande?.client || 'N/A'}
                          </p>
                          <p>
                            <span className="font-semibold">Modèle:</span>{' '}
                            {typeof livraison.commande?.modele === 'object' 
                              ? livraison.commande.modele.nom 
                              : livraison.commande?.modele || 'N/A'}
                          </p>
                          <p>
                            <span className="font-semibold">Ville:</span>{' '}
                            {livraison.adresseLivraison?.ville || livraison.adresse_livraison?.ville || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500 mb-1">Montant</p>
                        <p className="text-2xl font-black text-emerald-600">
                          {(livraison.commande?.prix || 0).toLocaleString('fr-FR')} F
                        </p>
                        {livraison.statut === 'livree' && (
                          <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                            💰 À collecter
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaisseLivreurs;

