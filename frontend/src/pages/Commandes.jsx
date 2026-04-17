import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Filter, AlertCircle, Eye, Edit, Send, Package, Scissors, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Commandes = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterUrgence, setFilterUrgence] = useState('');
  const [sendingToAtelier, setSendingToAtelier] = useState(null);
  const [sendingToPreparation, setSendingToPreparation] = useState(null);
  const [stockDisponible, setStockDisponible] = useState({});
  const { user } = useAuthStore();
  
  const isStyliste = user?.role === 'styliste';

  useEffect(() => {
    fetchCommandes();
    if (isStyliste) {
      const interval = setInterval(fetchCommandes, 10000);
      return () => clearInterval(interval);
    }
  }, [filterStatut, filterUrgence]);

  const fetchCommandes = async () => {
    try {
      const params = {};
      if (filterStatut) params.statut = filterStatut;
      if (filterUrgence) params.urgence = filterUrgence;

      const response = await api.get('/commandes', { params });
      
      let commandesConfirmees;
      if (isStyliste) {
        commandesConfirmees = response.data.commandes.filter(cmd => cmd.statut === 'validee');
      } else {
        commandesConfirmees = response.data.commandes.filter(cmd => 
          !['en_attente_validation', 'en_attente_paiement', 'annulee'].includes(cmd.statut)
        );
      }
      
      // Trier avec priorité : 
      // 1. Commandes "validee" URGENTES en PREMIER (pas encore envoyées à l'atelier)
      // 2. Commandes "validee" NON URGENTES
      // 3. Autres commandes (déjà en atelier) par date, SANS priorité d'urgence
      const commandesTriees = commandesConfirmees.sort((a, b) => {
        const estValideeA = a.statut === 'validee';
        const estValideeB = b.statut === 'validee';
        
        // Priorité 1 : Commandes "validee" urgentes en haut
        if (estValideeA && a.urgence && !(estValideeB && b.urgence)) {
          return -1; // A urgente validee avant tout
        }
        if (estValideeB && b.urgence && !(estValideeA && a.urgence)) {
          return 1; // B urgente validee avant tout
        }
        
        // Priorité 2 : Commandes "validee" non urgentes avant celles déjà en atelier
        if (estValideeA && !estValideeB) {
          return -1; // A validee avant B (en atelier)
        }
        if (estValideeB && !estValideeA) {
          return 1; // B validee avant A (en atelier)
        }
        
        // Priorité 3 : Au sein du même groupe, tri par date
        // Pour les commandes déjà en atelier, l'urgence n'a plus d'importance
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA; // Plus récent en premier
      });
      
      setCommandes(commandesTriees);
      // Vérifier la disponibilité en stock
      verifierStockPourCommandes(commandesTriees);
    } catch (error) {
      toast.error('Erreur lors du chargement des commandes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const verifierStockPourCommandes = async (commandes) => {
    try {
      const response = await api.get('/stock');
      const stock = response.data.stock || response.data;
      
      console.log('📦 Stock chargé:', stock);
      console.log('📋 Commandes à vérifier:', commandes.length);
      
      const disponibilite = {};
      
      commandes.forEach((commande) => {
        // Récupérer à la fois l'ID et le NOM du modèle
        const modeleId = typeof commande.modele === 'object' ? commande.modele._id || commande.modele.id : commande.modele;
        const modeleNom = typeof commande.modele === 'object' ? commande.modele.nom : commande.modele;
        
        console.log(`🔍 Recherche stock pour: ${modeleNom} (${modeleId}) - ${commande.taille} - ${commande.couleur}`);
        
        const variationEnStock = stock.find(item => {
          // Comparer par ID OU par NOM (car le stock peut utiliser l'un ou l'autre)
          const itemModeleId = typeof item.modele === 'object' ? item.modele._id || item.modele.id : item.modele;
          const itemModeleNom = typeof item.modele === 'object' ? item.modele.nom : item.modele;
          
          // Vérifier la quantité (quantite OU quantitePrincipale)
          const qte = item.quantitePrincipale || item.quantite || 0;
          
          const matchParId = itemModeleId === modeleId;
          const matchParNom = itemModeleNom === modeleNom;
          const matchTaille = item.taille === commande.taille;
          const matchCouleur = item.couleur === commande.couleur;
          const aStock = qte > 0;
          
          const match = (matchParId || matchParNom) && matchTaille && matchCouleur && aStock;
          
          if (match) {
            console.log('✅ Trouvé en stock!', {
              modele: itemModeleNom,
              taille: item.taille,
              couleur: item.couleur,
              quantite: qte
            });
          }
          
          return match;
        });
        
        if (variationEnStock) {
          const commandeId = commande._id || commande.id;
          const qte = variationEnStock.quantitePrincipale || variationEnStock.quantite || 0;
          disponibilite[commandeId] = {
            disponible: true,
            quantite: qte
          };
          console.log(`✅ Badge ajouté pour commande ${commandeId} avec quantité ${qte}`);
        } else {
          console.log(`❌ Pas trouvé en stock pour ${modeleNom} - ${commande.taille} - ${commande.couleur}`);
        }
      });
      
      console.log('📊 Disponibilité finale:', disponibilite);
      setStockDisponible(disponibilite);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du stock:', error);
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

  const envoyerEnPreparationColis = async (commandeId) => {
    if (!window.confirm('Envoyer cette commande directement en Préparation Colis (sans passer par l\'atelier) ?')) {
      return;
    }

    setSendingToPreparation(commandeId);
    try {
      await api.put(`/commandes/${commandeId}`, {
        statut: 'en_stock'
      });
      
      toast.success('Commande envoyée en Préparation Colis ! 📦');
      fetchCommandes(); // Recharger la liste
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
      console.error(error);
    } finally {
      setSendingToPreparation(null);
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
    if (isStyliste) {
      const matchSearch = 
        commande.modele?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.taille?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.couleur?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }
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

  if (isStyliste) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden max-w-full px-2 sm:px-4">
        {/* En-tête styliste */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 sm:p-3 lg:p-4 rounded-2xl shadow-lg flex-shrink-0">
              <Scissors className="text-white" size={24} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                Modèles en attente
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium truncate">
                Commandes validées pas encore envoyées en atelier
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={fetchCommandes}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-xs sm:text-sm"
            >
              <RefreshCw size={14} />
              <span className="font-semibold">Actualiser</span>
            </button>
            <div className="text-right">
              <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase">En attente</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {filteredCommandes.length}
              </p>
            </div>
          </div>
        </div>

        {/* Recherche simplifiée styliste */}
        <div className="card max-w-full overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 flex-shrink-0" size={18} />
            <input
              type="text"
              placeholder="Rechercher par modèle, taille ou couleur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 sm:pl-12 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Grille de cartes styliste */}
        {filteredCommandes.length === 0 ? (
          <div className="card text-center py-8 sm:py-12 lg:py-16 bg-gradient-to-br from-emerald-50 to-teal-50 max-w-full overflow-hidden">
            <Package className="mx-auto text-emerald-500 mb-3 sm:mb-4" size={48} />
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 px-4">
              Aucun modèle en attente
            </h3>
            <p className="text-sm sm:text-base text-gray-600 px-4">
              Toutes les commandes ont été envoyées en atelier ou en préparation
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 max-w-full">
            {filteredCommandes.map((commande) => (
              <div
                key={commande._id || commande.id}
                className={`relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 max-w-full ${
                  commande.urgence
                    ? 'ring-2 ring-red-400 ring-offset-1'
                    : ''
                }`}
              >
                {/* Badge URGENT */}
                {commande.urgence && (
                  <div className="absolute top-0 right-0 bg-red-600 text-white px-1.5 sm:px-2 py-0.5 rounded-bl-lg font-black text-[9px] sm:text-[10px] flex items-center gap-0.5 z-10">
                    <AlertCircle size={9} />
                    <span>URGENT</span>
                  </div>
                )}

                {/* Image du modèle */}
                {(typeof commande.modele === 'object' && commande.modele?.image) ? (
                  <div className="relative w-full aspect-square bg-gray-100">
                    <img
                      src={commande.modele.image}
                      alt={commande.modele.nom}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 items-center justify-center hidden absolute inset-0">
                      <Package className="text-purple-400" size={40} />
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <Package className="text-purple-400" size={40} />
                  </div>
                )}

                {/* Infos du modèle */}
                <div className="p-2 sm:p-3 bg-white">
                  <p className="text-xs sm:text-sm font-black text-gray-900 truncate mb-1.5">
                    {commande.modele?.nom || commande.modele}
                  </p>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="bg-purple-50 rounded-md p-1 sm:p-1.5 text-center">
                      <p className="text-[9px] sm:text-[10px] text-purple-500 font-bold uppercase">Taille</p>
                      <p className="text-sm sm:text-base font-black text-purple-700">{commande.taille}</p>
                    </div>
                    <div className="bg-pink-50 rounded-md p-1 sm:p-1.5 text-center min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-pink-500 font-bold uppercase">Couleur</p>
                      <p className="text-[11px] sm:text-xs font-black text-pink-700 truncate">{commande.couleur}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Gestion des Commandes</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">Gérez toutes les commandes clients</p>
        </div>
        <Link to="/commandes/nouvelle" className="btn btn-primary inline-flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-sm sm:text-base flex-shrink-0">
          <Plus size={18} className="sm:w-5 sm:h-5" />
          <span>Nouvelle Commande</span>
        </Link>
      </div>

      {/* Filtres et recherche */}
      <div className="card max-w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <div className="relative max-w-full">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher..."
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
              className="input text-sm sm:text-base truncate"
            >
              <option value="">Tous statuts</option>
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
          <div className="max-w-full">
            <select
              value={filterUrgence}
              onChange={(e) => setFilterUrgence(e.target.value)}
              className="input text-sm sm:text-base truncate"
            >
              <option value="">Toutes</option>
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
                      <p className="font-medium text-gray-900 truncate">{commande.client.nom}</p>
                      <p className="text-gray-600 truncate">{commande.client.contact}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Modèle</p>
                      <p className="font-medium text-gray-900 truncate">{commande.modele.nom}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-gray-600 truncate">
                        {commande.taille} - {commande.couleur}
                      </p>
                        {(stockDisponible[commande._id] || stockDisponible[commande.id]) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                            <Package size={10} className="mr-1" />
                            En Stock ({(stockDisponible[commande._id] || stockDisponible[commande.id]).quantite})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Ville</p>
                      <p className="font-medium text-gray-900 truncate">{commande.client.ville}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 text-xs">Prix</p>
                      <p className="font-bold text-primary-600 text-base sm:text-lg">
                        {commande.prix.toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  </div>

                  {commande.noteAppelant && (
                    <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-yellow-50 rounded-lg overflow-hidden max-w-full">
                      <p className="text-xs sm:text-sm text-gray-700 break-all overflow-wrap-anywhere">
                        <span className="font-medium">Note: </span>
                        {commande.noteAppelant}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto lg:ml-4 flex-shrink-0">
                  {/* Boutons d'action - visibles seulement pour gestionnaire/admin et commandes validées */}
                  {peutEnvoyerAAtelier() && commande.statut === 'validee' && (
                    <>
                      <button
                        onClick={() => envoyerAAtelier(commande._id)}
                        disabled={sendingToAtelier === commande._id || sendingToPreparation === commande._id}
                        className="btn btn-primary btn-sm inline-flex items-center justify-center space-x-1 disabled:opacity-50 text-xs sm:text-sm w-full sm:w-auto"
                        title="Envoyer à l'atelier styliste"
                      >
                        <Send size={14} className="flex-shrink-0" />
                        <span className="truncate">{sendingToAtelier === commande._id ? 'Envoi...' : 'Atelier'}</span>
                      </button>
                      
                      <button
                        onClick={() => envoyerEnPreparationColis(commande._id)}
                        disabled={sendingToAtelier === commande._id || sendingToPreparation === commande._id}
                        className="btn btn-success btn-sm inline-flex items-center justify-center space-x-1 disabled:opacity-50 text-xs sm:text-sm w-full sm:w-auto"
                        title="Envoyer directement en Préparation Colis (sans passer par l'atelier)"
                      >
                        <Package size={14} className="flex-shrink-0" />
                        <span className="truncate">{sendingToPreparation === commande._id ? 'Envoi...' : 'Direct'}</span>
                      </button>
                    </>
                  )}
                  
                  <Link
                    to={`/commandes/${commande._id}`}
                    className="btn btn-secondary btn-sm inline-flex items-center justify-center space-x-1 text-xs sm:text-sm w-full sm:w-auto"
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

export default Commandes;




