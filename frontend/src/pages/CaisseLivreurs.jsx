import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, User, CheckCircle, Eye, XCircle, Wallet, Phone, RotateCcw } from 'lucide-react';

const CaisseLivreurs = () => {
  const [livreurs, setLivreurs] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [markingReturned, setMarkingReturned] = useState(null);

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
    // Calculer le montant total de toutes les livraisons livrées
    return livraisonsLivrees.reduce((total, livraison) => {
      const prix = livraison.commande?.prix || 0;
      return total + prix;
    }, 0);
  };

  const handleVoirDetails = (livreur) => {
    setSelectedLivreur(livreur);
    setShowDetailsModal(true);
  };


  const handleMarquerRetourne = async (livraisonId, commande) => {
    const modele = typeof commande?.modele === 'object' ? commande.modele.nom : commande?.modele;
    const taille = commande?.taille;
    const couleur = commande?.couleur;
    
    if (!window.confirm(`Confirmer le retour de ce colis à la boutique ?\n\nLe stock sera automatiquement mis à jour :\n• ${modele} - ${taille} - ${couleur}\n• +1 unité au stock principal`)) {
      return;
    }

    setMarkingReturned(livraisonId);
    try {
      await api.post(`/livraisons/${livraisonId}/confirmer-retour`, {
        commentaire: 'Colis retourné par le livreur'
      });
      
      toast.success(`✅ Colis retourné ! Stock mis à jour (+1 ${modele}).`);
      await fetchData(); // Rafraîchir les données
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du retour');
      console.error(error);
    } finally {
      setMarkingReturned(null);
    }
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
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-white uppercase mb-1">💰 À Remettre</p>
          <p className="text-3xl font-black text-white">
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
                  
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <XCircle className="text-red-600" size={16} />
                      <span className="text-sm font-semibold text-red-900">Refusées</span>
                    </div>
                    <span className="text-xl font-black text-red-900">
                      {livraisonsLivreur.filter(l => l.statut === 'refusee').length}
                    </span>
                  </div>
                </div>

                {/* Montants */}
                <div className="space-y-2 mb-4">
                  {/* À remettre */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3">
                    <p className="text-white text-xs font-semibold mb-1 opacity-90">💰 À Remettre</p>
                    <p className="text-white text-2xl font-black">
                      {montantTotal.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="space-y-2">
                  {/* Bouton Voir Détails */}
                  <button
                    onClick={() => handleVoirDetails(livreur)}
                    className="w-full btn btn-secondary flex items-center justify-center space-x-2"
                    disabled={livraisonsLivreur.length === 0}
                  >
                    <Eye size={16} />
                    <span>Voir Détails ({livraisonsLivreur.length})</span>
                  </button>
                </div>
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
              
              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold opacity-90 mb-1">Total</p>
                  <p className="text-2xl font-black">
                    {getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id).length}
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold opacity-90 mb-1">✅ Livrées</p>
                  <p className="text-2xl font-black">
                    {getLivraisonsLivrees(selectedLivreur._id || selectedLivreur.id).length}
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold opacity-90 mb-1">❌ Refusées</p>
                  <p className="text-2xl font-black">
                    {getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id).filter(l => l.statut === 'refusee').length}
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-semibold opacity-90 mb-1">À Remettre</p>
                  <p className="text-lg font-black">
                    {getMontantTotal(selectedLivreur._id || selectedLivreur.id).toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>
            </div>

            {/* Liste des livraisons */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Détails des Livraisons</h3>
              
              <div className="space-y-2">
                {getLivraisonsLivreur(selectedLivreur._id || selectedLivreur.id).map((livraison) => {
                  const isRefused = livraison.statut === 'refusee';
                  const isReturned = livraison.statut === 'retournee';
                  const montant = livraison.commande?.prix || 0;
                  const clientNom = typeof livraison.commande?.client === 'object' 
                    ? livraison.commande.client.nom 
                    : livraison.commande?.client || 'N/A';
                  const clientContact = typeof livraison.commande?.client === 'object' 
                    ? livraison.commande.client.contact 
                    : '';
                  const modeleNom = typeof livraison.commande?.modele === 'object' 
                    ? livraison.commande.modele.nom 
                    : livraison.commande?.modele || 'N/A';
                  
                  let bgClass = 'bg-white border-gray-200 hover:shadow-md hover:border-emerald-300';
                  if (isRefused) bgClass = 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300';
                  if (isReturned) bgClass = 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-400';
                  
                  return (
                    <div 
                      key={livraison._id || livraison.id} 
                      className={`relative border rounded-lg p-3 transition-all ${bgClass}`}
                    >
                      {/* Badges en coin */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {isReturned && (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-gray-600 text-white flex items-center space-x-1 shadow-md">
                            <RotateCcw size={10} strokeWidth={4} />
                            <span>RETOURNÉ</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-start justify-between gap-3">
                        {/* Partie gauche - Infos commande */}
                        <div className="flex-1 min-w-0">
                          {/* Numéro et statut */}
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-black text-gray-900 text-sm">
                              {livraison.commande?.numeroCommande || 'N/A'}
                            </h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatutBadge(livraison.statut)}`}>
                              {getStatutLabel(livraison.statut)}
                            </span>
                          </div>
                          
                          {/* Client avec contact */}
                          <div className="bg-white/60 rounded-md p-2 mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-gray-500 uppercase">Client</span>
                              <span className="text-xs font-black text-gray-900">{clientNom}</span>
                            </div>
                            {clientContact && (
                              <a
                                href={`tel:${clientContact}`}
                                className="flex items-center justify-end space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone size={11} />
                                <span>{clientContact}</span>
                              </a>
                            )}
                          </div>
                          
                          {/* Modèle et ville */}
                          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <div className="bg-gray-50 rounded px-2 py-1">
                              <span className="text-gray-500 font-semibold">Modèle:</span>
                              <p className="font-bold text-gray-900 truncate">{modeleNom}</p>
                            </div>
                            <div className="bg-gray-50 rounded px-2 py-1">
                              <span className="text-gray-500 font-semibold">Ville:</span>
                              <p className="font-bold text-gray-900 truncate">
                                {livraison.adresseLivraison?.ville || livraison.adresse_livraison?.ville || 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                        </div>
                        
                        {/* Partie droite - Montant et action */}
                        <div className="flex flex-col items-end justify-between min-w-[120px]">
                          {/* Montant */}
                          <div className="text-right">
                            <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Montant</p>
                            <p className="text-xl font-black text-emerald-600">
                              {montant.toLocaleString('fr-FR')}
                            </p>
                            <p className="text-[10px] font-bold text-gray-500">FCFA</p>
                          </div>
                          
                          {/* Bouton Retourné pour les colis refusés */}
                          {isRefused && !isReturned && (
                            <button
                              onClick={() => handleMarquerRetourne(livraison._id || livraison.id, livraison.commande)}
                              disabled={markingReturned === (livraison._id || livraison.id)}
                              className="mt-2 w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-3 py-1.5 rounded-md text-[10px] font-black flex items-center justify-center space-x-1 transition-all disabled:opacity-50 shadow-md"
                            >
                              <RotateCcw size={12} strokeWidth={4} />
                              <span>{markingReturned === (livraison._id || livraison.id) ? 'EN COURS...' : 'RETOURNÉ'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaisseLivreurs;

