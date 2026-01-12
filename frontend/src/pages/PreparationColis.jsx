import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, Eye, Scissors, Shirt, CheckCircle, Clock, AlertCircle, Truck, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const PreparationColis = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('');
  const [livreurs, setLivreurs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [selectedLivreur, setSelectedLivreur] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchCommandes();
    fetchLivreurs();
    // Auto-refresh toutes les 15 secondes
    const interval = setInterval(fetchCommandes, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchCommandes = async () => {
    try {
      const response = await api.get('/commandes');
      // Filtre les commandes en cours de traitement à l'atelier
      const filtered = response.data.commandes.filter(c => 
        ['en_decoupe', 'en_couture', 'en_stock'].includes(c.statut)
      );
      setCommandes(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLivreurs = async () => {
    try {
      const response = await api.get('/users');
      const livreursOnly = response.data.users.filter(u => u.role === 'livreur' && u.actif);
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
        commandeId: selectedCommande._id,
        livreurId: selectedLivreur
      });
      
      toast.success('Commande assignée au livreur ! 🚚 Visible dans "Livraisons"');
      setShowModal(false);
      setSelectedCommande(null);
      setSelectedLivreur('');
      fetchCommandes(); // Recharger pour retirer de la liste
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'assignation');
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
        emoji: '✂️'
      },
      en_couture: {
        label: 'En Couture',
        icon: Shirt,
        color: 'bg-gradient-to-r from-orange-500 to-red-600',
        textColor: 'text-orange-900',
        bgLight: 'bg-orange-50',
        borderColor: 'border-orange-200',
        progress: 66,
        emoji: '🧵'
      },
      en_stock: {
        label: 'En Stock - Prêt à livrer',
        icon: CheckCircle,
        color: 'bg-gradient-to-r from-green-500 to-emerald-600',
        textColor: 'text-green-900',
        bgLight: 'bg-green-50',
        borderColor: 'border-green-200',
        progress: 100,
        emoji: '✅'
      }
    };
    return infos[statut] || infos.en_decoupe;
  };

  const filteredCommandes = filterStatut 
    ? commandes.filter(c => c.statut === filterStatut)
    : commandes;

  // Tri : Les commandes "en_stock" en premier, puis par date de mise à jour
  const commandesTriees = [...filteredCommandes].sort((a, b) => {
    // Priorité 1 : Les commandes "en_stock" avant tout le reste
    const prioriteA = a.statut === 'en_stock' ? 0 : (a.statut === 'en_couture' ? 1 : 2);
    const prioriteB = b.statut === 'en_stock' ? 0 : (b.statut === 'en_couture' ? 1 : 2);

    if (prioriteA !== prioriteB) {
      return prioriteA - prioriteB; // Les "en_stock" (0) avant "en_couture" (1) avant "en_decoupe" (2)
    }

    // Priorité 2 : Au sein du même groupe de statut, tri par date de mise à jour
    // Les plus récentes en premier (ordre décroissant)
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateB - dateA; // dateB > dateA = dateB en premier
  });

  // Statistiques
  const stats = {
    total: commandes.length,
    enDecoupe: commandes.filter(c => c.statut === 'en_decoupe').length,
    enCouture: commandes.filter(c => c.statut === 'en_couture').length,
    enStock: commandes.filter(c => c.statut === 'en_stock').length,
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
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
              <Package className="text-white" size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Préparation Colis
              </h1>
              <p className="text-gray-600 font-medium">Suivi des commandes en cours de confection</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-500 uppercase">En Traitement</p>
          <p className="text-5xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
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

      {/* Filtres */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilterStatut('')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === '' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => setFilterStatut('en_decoupe')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'en_decoupe' 
              ? 'bg-amber-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          ✂️ Découpe
        </button>
        <button
          onClick={() => setFilterStatut('en_couture')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'en_couture' 
              ? 'bg-orange-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          🧵 Couture
        </button>
        <button
          onClick={() => setFilterStatut('en_stock')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            filterStatut === 'en_stock' 
              ? 'bg-green-600 text-white shadow-lg' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          ✅ En Stock
        </button>
      </div>

      {/* Liste des commandes */}
      {commandesTriees.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune commande en préparation
          </h3>
          <p className="text-gray-600">
            Les commandes en cours de confection apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {commandesTriees.map((commande) => {
            const statutInfo = getStatutInfo(commande.statut);
            const StatutIcon = statutInfo.icon;
            
            return (
              <div 
                key={commande._id} 
                className="card bg-white hover:shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {commande.numeroCommande}
                  </h3>
                  {commande.urgence && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                      🔥 URGENT
                    </span>
                  )}
                </div>

                {/* Badge de statut */}
                <div className={`${statutInfo.color} text-white px-3 py-2 rounded-lg mb-3 flex items-center justify-between`}>
                  <div className="flex items-center space-x-2">
                    <StatutIcon size={18} />
                    <span className="font-bold text-sm">{statutInfo.label}</span>
                  </div>
                  <span className="text-sm font-bold">{statutInfo.progress}%</span>
                </div>

                {/* Client */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Client</p>
                  <p className="font-bold text-gray-900">
                    {typeof commande.client === 'object' ? commande.client.nom : commande.client}
                  </p>
                  <p className="text-sm text-gray-600">
                    {typeof commande.client === 'object' ? commande.client.ville : ''}
                  </p>
                </div>

                {/* Modèle */}
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

                {/* Prix */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-3 mb-3 flex justify-between items-center">
                  <span className="text-white text-sm font-semibold">Prix Total</span>
                  <span className="text-white text-xl font-black">
                    {commande.prix?.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                {/* Note */}
                {commande.noteAppelant && (
                  <div className="bg-yellow-50 rounded-lg p-2 mb-3 overflow-hidden">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">📝 Instructions</p>
                    <p className="text-xs text-gray-700 line-clamp-2 break-all">{commande.noteAppelant}</p>
                  </div>
                )}

                {/* Boutons */}
                <div className="space-y-2">
                  {/* Bouton Assigner au livreur - visible seulement pour commandes en stock */}
                  {commande.statut === 'en_stock' && (
                    <button
                      onClick={() => {
                        setSelectedCommande(commande);
                        setShowModal(true);
                      }}
                      className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 hover:shadow-lg transition-all"
                    >
                      <Truck size={16} />
                      <span>Assigner au livreur</span>
                    </button>
                  )}
                  
                  <Link
                    to={`/commandes/${commande._id}`}
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
      )}

      {/* Modal d'assignation au livreur */}
      {showModal && selectedCommande && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !assigning && setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Assigner au livreur</h3>
              <button 
                onClick={() => !assigning && setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={assigning}
              >
                <X size={20} />
              </button>
            </div>

            {/* Info commande */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-bold text-gray-900 mb-2">
                {selectedCommande.numeroCommande}
              </p>
              <p className="text-sm text-gray-600">
                {typeof selectedCommande.client === 'object' ? selectedCommande.client.nom : selectedCommande.client}
              </p>
              <p className="text-sm text-gray-600">
                {typeof selectedCommande.modele === 'object' ? selectedCommande.modele.nom : selectedCommande.modele} - {selectedCommande.taille} - {selectedCommande.couleur}
              </p>
            </div>

            {/* Sélection livreur */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sélectionner un livreur
              </label>
              <select
                value={selectedLivreur}
                onChange={(e) => setSelectedLivreur(e.target.value)}
                className="input w-full"
                disabled={assigning}
              >
                <option value="">Choisir un livreur...</option>
                {livreurs.map((livreur) => (
                  <option key={livreur._id} value={livreur._id}>
                    {livreur.nom} {livreur.telephone ? `- ${livreur.telephone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Boutons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => !assigning && setShowModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                disabled={assigning}
              >
                Annuler
              </button>
              <button
                onClick={handleAssignerLivreur}
                disabled={!selectedLivreur || assigning}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Truck size={20} />
                <span>{assigning ? 'Assignation...' : 'Assigner'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationColis;

