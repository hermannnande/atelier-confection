import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, AlertCircle, Eye, History, Download } from 'lucide-react';

const HistoriqueCommandes = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterUrgence, setFilterUrgence] = useState('');

  useEffect(() => {
    fetchCommandes();
  }, [filterStatut, filterUrgence]);

  const fetchCommandes = async () => {
    try {
      const params = {};
      if (filterStatut) params.statut = filterStatut;
      if (filterUrgence) params.urgence = filterUrgence;

      const response = await api.get('/commandes', { params });
      // Affiche TOUTES les commandes sans exception
      setCommandes(response.data.commandes);
    } catch (error) {
      toast.error('Erreur lors du chargement des commandes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatutBadge = (statut) => {
    const badges = {
      en_attente_validation: 'badge-warning',
      en_attente_paiement: 'badge-warning',
      validee: 'badge-success',
      en_decoupe: 'badge-primary',
      decoupee: 'badge-info',
      en_couture: 'badge-secondary',
      confectionnee: 'badge-success',
      en_livraison: 'badge-primary',
      livree: 'badge-success',
      refusee: 'badge-danger',
      annulee: 'badge-danger',
    };
    return badges[statut] || 'badge-secondary';
  };

  const getStatutLabel = (statut) => {
    const labels = {
      en_attente_validation: '📞 Attente Validation',
      en_attente_paiement: '⏳ Attente Paiement',
      validee: '✅ Validée',
      en_decoupe: '✂️ En Découpe',
      decoupee: '✂️ Découpée',
      en_couture: '🧵 En Couture',
      confectionnee: '✅ Confectionnée',
      en_livraison: '🚚 En Livraison',
      livree: '✅ Livrée',
      refusee: '❌ Refusée',
      annulee: '🚫 Annulée',
    };
    return labels[statut] || statut;
  };

  const filteredCommandes = commandes.filter((commande) => {
    const matchSearch = 
      commande.numeroCommande.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof commande.client === 'object' ? commande.client.nom : commande.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof commande.modele === 'object' ? commande.modele.nom : commande.modele || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchSearch;
  });

  // Statistiques rapides
  const stats = {
    total: commandes.length,
    enAttente: commandes.filter(c => ['en_attente_validation', 'en_attente_paiement'].includes(c.statut)).length,
    enCours: commandes.filter(c => ['validee', 'en_decoupe', 'decoupee', 'en_couture', 'confectionnee', 'en_livraison'].includes(c.statut)).length,
    terminees: commandes.filter(c => c.statut === 'livree').length,
    annulees: commandes.filter(c => ['annulee', 'refusee'].includes(c.statut)).length,
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
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl">
              <History className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Historique Complet</h1>
              <p className="text-gray-600 mt-1">Toutes les commandes avec tous les statuts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100">
          <p className="text-sm font-semibold text-blue-600 uppercase">Total</p>
          <p className="text-3xl font-black text-blue-900">{stats.total}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-yellow-50 to-yellow-100">
          <p className="text-sm font-semibold text-yellow-600 uppercase">En Attente</p>
          <p className="text-3xl font-black text-yellow-900">{stats.enAttente}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-indigo-50 to-indigo-100">
          <p className="text-sm font-semibold text-indigo-600 uppercase">En Cours</p>
          <p className="text-3xl font-black text-indigo-900">{stats.enCours}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-green-50 to-green-100">
          <p className="text-sm font-semibold text-green-600 uppercase">Livrées</p>
          <p className="text-3xl font-black text-green-900">{stats.terminees}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-red-50 to-red-100">
          <p className="text-sm font-semibold text-red-600 uppercase">Annulées</p>
          <p className="text-3xl font-black text-red-900">{stats.annulees}</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
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
              <option value="en_attente_validation">📞 Attente Validation</option>
              <option value="en_attente_paiement">⏳ Attente Paiement</option>
              <option value="validee">✅ Validée</option>
              <option value="en_decoupe">✂️ En Découpe</option>
              <option value="decoupee">✂️ Découpée</option>
              <option value="en_couture">🧵 En Couture</option>
              <option value="confectionnee">✅ Confectionnée</option>
              <option value="en_livraison">🚚 En Livraison</option>
              <option value="livree">✅ Livrée</option>
              <option value="refusee">❌ Refusée</option>
              <option value="annulee">🚫 Annulée</option>
            </select>
          </div>
          <div>
            <select
              value={filterUrgence}
              onChange={(e) => setFilterUrgence(e.target.value)}
              className="input"
            >
              <option value="">Toutes les urgences</option>
              <option value="true">🔥 Urgentes</option>
              <option value="false">Normal</option>
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
              : 'Aucune commande dans le système'}
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
                      <p className="font-medium text-gray-900">
                        {typeof commande.client === 'object' ? commande.client.nom : commande.client}
                      </p>
                      <p className="text-gray-600">
                        {typeof commande.client === 'object' ? commande.client.contact : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Modèle</p>
                      <p className="font-medium text-gray-900">
                        {typeof commande.modele === 'object' ? commande.modele.nom : commande.modele}
                      </p>
                      <p className="text-gray-600">
                        {commande.taille} - {commande.couleur}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Ville</p>
                      <p className="font-medium text-gray-900">
                        {typeof commande.client === 'object' ? commande.client.ville : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Prix</p>
                      <p className="font-bold text-primary-600 text-lg">
                        {commande.prix.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>

                  {(commande.noteAppelant || commande.note) && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg overflow-hidden">
                      <p className="text-sm text-gray-700 break-all max-w-full">
                        <span className="font-medium">Note: </span>
                        {commande.noteAppelant || commande.note}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
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

export default HistoriqueCommandes;

