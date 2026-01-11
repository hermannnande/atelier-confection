import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Filter, AlertCircle, Eye, Edit, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Commandes = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterUrgence, setFilterUrgence] = useState('');
  const [sendingToAtelier, setSendingToAtelier] = useState(null);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchCommandes();
  }, [filterStatut, filterUrgence]);

  const fetchCommandes = async () => {
    try {
      const params = {};
      if (filterStatut) params.statut = filterStatut;
      if (filterUrgence) params.urgence = filterUrgence;

      const response = await api.get('/commandes', { params });
      
      // Filtrer pour afficher uniquement les commandes confirmées et en cours de traitement
      // Exclure: en_attente_validation, en_attente_paiement, annulee
      const commandesConfirmees = response.data.commandes.filter(cmd => 
        !['en_attente_validation', 'en_attente_paiement', 'annulee'].includes(cmd.statut)
      );
      
      // Trier par date de mise à jour (les plus récentes en haut)
      const commandesTriees = commandesConfirmees.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA; // Ordre décroissant (plus récent en premier)
      });
      
      setCommandes(commandesTriees);
    } catch (error) {
      toast.error('Erreur lors du chargement des commandes');
      console.error(error);
    } finally {
      setLoading(false);
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

  const peutEnvoyerAAtelier = () => {
    return user?.role === 'administrateur' || user?.role === 'gestionnaire';
  };

  const getStatutBadge = (statut) => {
    const badges = {
      nouvelle: 'badge-info',
      validee: 'badge-success',
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

  const filteredCommandes = commandes.filter((commande) => {
    const matchSearch = 
      commande.numeroCommande.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.modele.nom.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Commandes</h1>
          <p className="text-gray-600 mt-1">Gérez toutes les commandes clients</p>
        </div>
        <Link to="/commandes/nouvelle" className="btn btn-primary inline-flex items-center space-x-2">
          <Plus size={20} />
          <span>Nouvelle Commande</span>
        </Link>
      </div>

      {/* Filtres et recherche */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par numéro, client ou modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="input"
            >
              <option value="">Tous les statuts</option>
              <option value="nouvelle">Nouvelle</option>
              <option value="validee">Validée</option>
              <option value="en_attente_paiement">Attente Paiement</option>
              <option value="en_decoupe">En Découpe</option>
              <option value="en_couture">En Couture</option>
              <option value="en_stock">En Stock</option>
              <option value="en_livraison">En Livraison</option>
              <option value="livree">Livrée</option>
              <option value="refusee">Refusée</option>
              <option value="annulee">Annulée</option>
            </select>
          </div>
          <div>
            <select
              value={filterUrgence}
              onChange={(e) => setFilterUrgence(e.target.value)}
              className="input"
            >
              <option value="">Toutes les urgences</option>
              <option value="true">Urgentes</option>
              <option value="false">Non urgentes</option>
            </select>
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
            {searchTerm || filterStatut || filterUrgence
              ? 'Essayez de modifier vos filtres'
              : 'Créez votre première commande'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCommandes.map((commande) => (
            <div key={commande._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {commande.numeroCommande}
                    </h3>
                    <span className={`badge ${getStatutBadge(commande.statut)}`}>
                      {getStatutLabel(commande.statut)}
                    </span>
                    {commande.urgence && (
                      <span className="badge badge-danger">
                        <AlertCircle size={12} className="mr-1" />
                        Urgent
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Client</p>
                      <p className="font-medium text-gray-900">{commande.client.nom}</p>
                      <p className="text-gray-600">{commande.client.contact}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Modèle</p>
                      <p className="font-medium text-gray-900">{commande.modele.nom}</p>
                      <p className="text-gray-600">
                        {commande.taille} - {commande.couleur}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Ville</p>
                      <p className="font-medium text-gray-900">{commande.client.ville}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Prix</p>
                      <p className="font-bold text-primary-600 text-lg">
                        {commande.prix.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>

                  {commande.noteAppelant && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Note: </span>
                        {commande.noteAppelant}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {/* Bouton Envoyer à l'atelier - visible seulement pour gestionnaire/admin et commandes validées */}
                  {peutEnvoyerAAtelier() && commande.statut === 'validee' && (
                    <button
                      onClick={() => envoyerAAtelier(commande._id)}
                      disabled={sendingToAtelier === commande._id}
                      className="btn btn-primary btn-sm inline-flex items-center space-x-1 disabled:opacity-50"
                      title="Envoyer à l'atelier styliste"
                    >
                      <Send size={16} />
                      <span>{sendingToAtelier === commande._id ? 'Envoi...' : 'Envoyer à l\'atelier'}</span>
                    </button>
                  )}
                  
                  <Link
                    to={`/commandes/${commande._id}`}
                    className="btn btn-secondary btn-sm inline-flex items-center space-x-1"
                  >
                    <Eye size={16} />
                    <span>Voir</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Commandes;




