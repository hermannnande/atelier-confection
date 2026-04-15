import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, AlertCircle, Eye, History, Download, CalendarDays, FilterX } from 'lucide-react';

const HistoriqueCommandes = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterUrgence, setFilterUrgence] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

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

  const clearDateFilters = () => {
    setDateDebut('');
    setDateFin('');
  };

  const filteredCommandes = commandes
    .filter((commande) => {
      const matchSearch = 
        commande.numeroCommande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof commande.client === 'object' ? commande.client?.nom : commande.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof commande.modele === 'object' ? commande.modele?.nom : commande.modele || '').toLowerCase().includes(searchTerm.toLowerCase());

      const cmdDate = new Date(commande.createdAt || commande.dateCommande || commande.created_at);
      const matchDateDebut = !dateDebut || cmdDate >= new Date(dateDebut);
      const matchDateFin = !dateFin || cmdDate <= new Date(dateFin + 'T23:59:59');
      
      return matchSearch && matchDateDebut && matchDateFin;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.dateCommande || a.created_at);
      const dateB = new Date(b.createdAt || b.dateCommande || b.created_at);
      return dateB - dateA;
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
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
              <History className="text-white" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Historique Complet</h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1 truncate">Toutes les commandes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 max-w-full">
        <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-blue-600 uppercase truncate">Total</p>
          <p className="text-2xl sm:text-3xl font-black text-blue-900">{stats.total}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-yellow-50 to-yellow-100 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-yellow-600 uppercase truncate">En Attente</p>
          <p className="text-2xl sm:text-3xl font-black text-yellow-900">{stats.enAttente}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-indigo-50 to-indigo-100 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-indigo-600 uppercase truncate">En Cours</p>
          <p className="text-2xl sm:text-3xl font-black text-indigo-900">{stats.enCours}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-green-50 to-green-100 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-green-600 uppercase truncate">Livrées</p>
          <p className="text-2xl sm:text-3xl font-black text-green-900">{stats.terminees}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-red-50 to-red-100 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-red-600 uppercase truncate">Annulées</p>
          <p className="text-2xl sm:text-3xl font-black text-red-900">{stats.annulees}</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card max-w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="max-w-full">
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par n°, client ou modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-8 sm:pl-10 text-sm sm:text-base truncate"
              />
            </div>
          </div>
          <div className="max-w-full">
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="input text-sm sm:text-base"
            >
              <option value="">Tous statuts</option>
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
          <div className="max-w-full">
            <select
              value={filterUrgence}
              onChange={(e) => setFilterUrgence(e.target.value)}
              className="input text-sm sm:text-base"
            >
              <option value="">Toutes</option>
              <option value="true">🔥 Urgentes</option>
              <option value="false">Normal</option>
            </select>
          </div>
        </div>

        {/* Filtres par date */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <CalendarDays size={12} className="inline mr-1" />
                Date début
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="input text-sm sm:text-base"
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <CalendarDays size={12} className="inline mr-1" />
                Date fin
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="input text-sm sm:text-base"
              />
            </div>
            {(dateDebut || dateFin) && (
              <button
                onClick={clearDateFilters}
                className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm px-3 py-2 flex items-center gap-1.5 rounded-lg transition-all w-full sm:w-auto justify-center"
              >
                <FilterX size={14} />
                <span>Effacer dates</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des commandes */}
      {filteredCommandes.length === 0 ? (
        <div className="card text-center py-8 sm:py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-3 sm:mb-4" size={40} />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1.5 sm:mb-2">
            Aucune commande trouvée
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            {searchTerm || filterStatut || filterUrgence || dateDebut || dateFin
              ? 'Essayez de modifier vos filtres ou la plage de dates'
              : 'Aucune commande dans le système'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 max-w-full">
          {filteredCommandes.map((commande) => (
            <div key={commande._id} className="card hover:shadow-md transition-shadow max-w-full overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-3 lg:gap-4">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate flex-shrink-0">
                      {commande.numeroCommande}
                    </h3>
                    <span className={`badge ${getStatutBadge(commande.statut)} text-xs flex-shrink-0`}>
                      {getStatutLabel(commande.statut)}
                    </span>
                    {commande.urgence && (
                      <span className="badge badge-danger text-xs flex-shrink-0">
                        <AlertCircle size={11} className="mr-0.5" />
                        Urgent
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm max-w-full">
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Client</p>
                      <p className="font-medium text-gray-900 truncate">
                        {typeof commande.client === 'object' ? commande.client.nom : commande.client}
                      </p>
                      <p className="text-gray-600 truncate">
                        {typeof commande.client === 'object' ? commande.client.contact : ''}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Modèle</p>
                      <p className="font-medium text-gray-900 truncate">
                        {typeof commande.modele === 'object' ? commande.modele.nom : commande.modele}
                      </p>
                      <p className="text-gray-600 truncate">
                        {commande.taille} - {commande.couleur}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Ville</p>
                      <p className="font-medium text-gray-900 truncate">
                        {typeof commande.client === 'object' ? commande.client.ville : ''}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Prix</p>
                      <p className="font-bold text-primary-600 text-base sm:text-lg">
                        {commande.prix.toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  </div>

                  {(commande.noteAppelant || commande.note) && (
                    <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-yellow-50 rounded-lg overflow-hidden max-w-full">
                      <p className="text-xs sm:text-sm text-gray-700 break-all overflow-wrap-anywhere">
                        <span className="font-medium">Note: </span>
                        {commande.noteAppelant || commande.note}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center w-full lg:w-auto lg:ml-4 flex-shrink-0">
                  <Link
                    to={`/commandes/${commande._id}`}
                    className="btn btn-secondary btn-sm inline-flex items-center justify-center space-x-1 text-xs sm:text-sm w-full lg:w-auto"
                  >
                    <Eye size={14} className="flex-shrink-0" />
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

