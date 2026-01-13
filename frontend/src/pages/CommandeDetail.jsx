import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { 
  ArrowLeft, 
  Edit, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Package,
  User,
  MapPin,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CommandeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [commande, setCommande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCommande();
  }, [id]);

  const fetchCommande = async () => {
    try {
      const response = await api.get(`/commandes/${id}`);
      setCommande(response.data.commande);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValider = async () => {
    setActionLoading(true);
    try {
      await api.post(`/commandes/${id}/valider`);
      toast.success('Commande validée !');
      fetchCommande();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnnuler = async () => {
    const motif = prompt('Motif d\'annulation:');
    if (!motif) return;

    setActionLoading(true);
    try {
      await api.post(`/commandes/${id}/annuler`, { motif });
      toast.success('Commande annulée');
      fetchCommande();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatutBadge = (statut) => {
    const badges = {
      nouvelle: { class: 'badge-info', icon: AlertCircle },
      validee: { class: 'badge-success', icon: CheckCircle },
      en_attente_paiement: { class: 'badge-warning', icon: Clock },
      en_decoupe: { class: 'badge-primary', icon: Package },
      en_couture: { class: 'badge-secondary', icon: Package },
      en_stock: { class: 'badge-info', icon: Package },
      en_livraison: { class: 'badge-primary', icon: Package },
      livree: { class: 'badge-success', icon: CheckCircle },
      refusee: { class: 'badge-danger', icon: XCircle },
      annulee: { class: 'badge-danger', icon: XCircle },
    };
    return badges[statut] || { class: 'badge-secondary', icon: AlertCircle };
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!commande) {
    return (
      <div className="text-center py-12">
        <p>Commande non trouvée</p>
      </div>
    );
  }

  const statutInfo = getStatutBadge(commande.statut);
  const StatutIcon = statutInfo.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          <button
            onClick={() => navigate('/commandes')}
            className="btn btn-secondary btn-sm flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
              {commande.numeroCommande}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 truncate">Détails de la commande</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <span className={`badge ${statutInfo.class} text-xs sm:text-base px-2 sm:px-4 py-1 sm:py-2`}>
            <StatutIcon size={14} className="sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">{getStatutLabel(commande.statut)}</span>
            <span className="sm:hidden text-xs">{getStatutLabel(commande.statut).slice(0, 8)}</span>
          </span>
          {commande.urgence && (
            <span className="badge badge-danger text-xs sm:text-base px-2 sm:px-4 py-1 sm:py-2">
              <AlertCircle size={14} className="sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Urgent</span>
              <span className="sm:hidden text-xs">!</span>
            </span>
          )}
        </div>
      </div>

      {/* Informations principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-full">
        {/* Colonne gauche */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Client */}
          <div className="card max-w-full overflow-hidden">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <User className="text-primary-600 flex-shrink-0" size={18} />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Client</h2>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Nom</p>
                <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{commande.client.nom}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Contact</p>
                <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{commande.client.contact}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Ville</p>
                <p className="font-medium text-sm sm:text-base text-gray-900 flex items-center min-w-0">
                  <MapPin size={14} className="mr-1 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{commande.client.ville}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Modèle */}
          <div className="card max-w-full overflow-hidden">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Modèle</h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {commande.modele.image && (
                <img
                  src={commande.modele.image}
                  alt={commande.modele.nom}
                  className="w-full sm:w-24 sm:h-24 lg:w-32 lg:h-32 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                />
              )}
              <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500">Nom du modèle</p>
                  <p className="font-medium text-base sm:text-lg text-gray-900 truncate">{commande.modele.nom}</p>
                </div>
                {commande.modele.description && (
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500">Description</p>
                    <p className="text-xs sm:text-sm text-gray-700 break-words">{commande.modele.description}</p>
                  </div>
                )}
                <div className="flex gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500">Taille</p>
                    <p className="font-medium text-sm sm:text-base text-gray-900">{commande.taille}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500">Couleur</p>
                    <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{commande.couleur}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          {commande.noteAppelant && (
            <div className="card bg-yellow-50 border-yellow-200 overflow-hidden max-w-full">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Note pour l'atelier</h2>
              <p className="text-xs sm:text-sm text-gray-700 break-words overflow-wrap-anywhere max-w-full">{commande.noteAppelant}</p>
            </div>
          )}

          {/* Historique */}
          <div className="card max-w-full overflow-hidden">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Historique</h2>
            <div className="space-y-3 sm:space-y-4">
              {commande.historique.map((item, index) => (
                <div key={index} className="flex items-start gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary-600 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-gray-900 break-words">{item.action}</p>
                    {item.commentaire && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">{item.commentaire}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {format(new Date(item.date), 'PPP à HH:mm', { locale: fr })}
                      {item.utilisateur && ` • ${item.utilisateur.nom}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Prix */}
          <div className="card bg-gradient-to-br from-primary-50 to-secondary-50 border-none max-w-full overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-primary-600 flex-shrink-0" size={18} />
              <h2 className="text-xs sm:text-sm font-medium text-gray-600">Prix Total</h2>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-600">
              {commande.prix.toLocaleString('fr-FR')} <span className="hidden sm:inline">FCFA</span><span className="sm:hidden">F</span>
            </p>
          </div>

          {/* Actions */}
          {['appelant', 'gestionnaire', 'administrateur'].includes(user?.role) && 
           ['nouvelle', 'validee'].includes(commande.statut) && (
            <div className="card max-w-full overflow-hidden">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Actions</h2>
              <div className="space-y-2">
                {commande.statut === 'nouvelle' && (
                  <button
                    onClick={handleValider}
                    disabled={actionLoading}
                    className="w-full btn btn-success inline-flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckCircle size={16} className="flex-shrink-0" />
                    <span className="truncate">Valider la commande</span>
                  </button>
                )}
                <button
                  onClick={handleAnnuler}
                  disabled={actionLoading}
                  className="w-full btn btn-danger inline-flex items-center justify-center gap-2 text-sm"
                >
                  <XCircle size={16} className="flex-shrink-0" />
                  <span>Annuler</span>
                </button>
              </div>
            </div>
          )}

          {/* Workflow */}
          <div className="card max-w-full overflow-hidden">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Workflow</h2>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              {commande.appelant && (
                <div className="min-w-0">
                  <p className="text-gray-500">Appelant</p>
                  <p className="font-medium text-gray-900 truncate">{commande.appelant.nom}</p>
                </div>
              )}
              {commande.styliste && (
                <div className="min-w-0">
                  <p className="text-gray-500">Styliste</p>
                  <p className="font-medium text-gray-900 truncate">{commande.styliste.nom}</p>
                </div>
              )}
              {commande.couturier && (
                <div className="min-w-0">
                  <p className="text-gray-500">Couturier</p>
                  <p className="font-medium text-gray-900 truncate">{commande.couturier.nom}</p>
                </div>
              )}
              {commande.livreur && (
                <div className="min-w-0">
                  <p className="text-gray-500">Livreur</p>
                  <p className="font-medium text-gray-900 truncate">{commande.livreur.nom}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="card max-w-full overflow-hidden">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Dates</h2>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <div className="min-w-0">
                <p className="text-gray-500">Créée le</p>
                <p className="font-medium text-gray-900 break-words">
                  {format(new Date(commande.createdAt), 'PPP', { locale: fr })}
                </p>
              </div>
              {commande.dateDecoupe && (
                <div className="min-w-0">
                  <p className="text-gray-500">Découpe</p>
                  <p className="font-medium text-gray-900 break-words">
                    {format(new Date(commande.dateDecoupe), 'PPP', { locale: fr })}
                  </p>
                </div>
              )}
              {commande.dateCouture && (
                <div className="min-w-0">
                  <p className="text-gray-500">Couture terminée</p>
                  <p className="font-medium text-gray-900 break-words">
                    {format(new Date(commande.dateCouture), 'PPP', { locale: fr })}
                  </p>
                </div>
              )}
              {commande.dateLivraison && (
                <div className="min-w-0">
                  <p className="text-gray-500">Livraison</p>
                  <p className="font-medium text-gray-900 break-words">
                    {format(new Date(commande.dateLivraison), 'PPP', { locale: fr })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandeDetail;




