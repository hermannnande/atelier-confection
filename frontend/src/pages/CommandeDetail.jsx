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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/commandes')}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {commande.numeroCommande}
            </h1>
            <p className="text-gray-600">Détails de la commande</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`badge ${statutInfo.class} text-base px-4 py-2`}>
            <StatutIcon size={16} className="mr-2" />
            {getStatutLabel(commande.statut)}
          </span>
          {commande.urgence && (
            <span className="badge badge-danger text-base px-4 py-2">
              <AlertCircle size={16} className="mr-2" />
              Urgent
            </span>
          )}
        </div>
      </div>

      {/* Informations principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <User className="text-primary-600" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Client</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nom</p>
                <p className="font-medium text-gray-900">{commande.client.nom}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium text-gray-900">{commande.client.contact}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ville</p>
                <p className="font-medium text-gray-900 flex items-center">
                  <MapPin size={16} className="mr-1 text-gray-400" />
                  {commande.client.ville}
                </p>
              </div>
            </div>
          </div>

          {/* Modèle */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Modèle</h2>
            <div className="flex space-x-4">
              {commande.modele.image && (
                <img
                  src={commande.modele.image}
                  alt={commande.modele.nom}
                  className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                />
              )}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Nom du modèle</p>
                  <p className="font-medium text-gray-900 text-lg">{commande.modele.nom}</p>
                </div>
                {commande.modele.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-gray-700">{commande.modele.description}</p>
                  </div>
                )}
                <div className="flex space-x-4">
                  <div>
                    <p className="text-sm text-gray-500">Taille</p>
                    <p className="font-medium text-gray-900">{commande.taille}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Couleur</p>
                    <p className="font-medium text-gray-900">{commande.couleur}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          {commande.noteAppelant && (
            <div className="card bg-yellow-50 border-yellow-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Note pour l'atelier</h2>
              <p className="text-gray-700">{commande.noteAppelant}</p>
            </div>
          )}

          {/* Historique */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique</h2>
            <div className="space-y-4">
              {commande.historique.map((item, index) => (
                <div key={index} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary-600"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.action}</p>
                    {item.commentaire && (
                      <p className="text-sm text-gray-600 mt-1">{item.commentaire}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
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
        <div className="space-y-6">
          {/* Prix */}
          <div className="card bg-gradient-to-br from-primary-50 to-secondary-50 border-none">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="text-primary-600" size={20} />
              <h2 className="text-sm font-medium text-gray-600">Prix Total</h2>
            </div>
            <p className="text-3xl font-bold text-primary-600">
              {commande.prix.toLocaleString('fr-FR')} FCFA
            </p>
          </div>

          {/* Actions */}
          {['appelant', 'gestionnaire', 'administrateur'].includes(user?.role) && 
           ['nouvelle', 'validee'].includes(commande.statut) && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-2">
                {commande.statut === 'nouvelle' && (
                  <button
                    onClick={handleValider}
                    disabled={actionLoading}
                    className="w-full btn btn-success inline-flex items-center justify-center space-x-2"
                  >
                    <CheckCircle size={18} />
                    <span>Valider la commande</span>
                  </button>
                )}
                <button
                  onClick={handleAnnuler}
                  disabled={actionLoading}
                  className="w-full btn btn-danger inline-flex items-center justify-center space-x-2"
                >
                  <XCircle size={18} />
                  <span>Annuler</span>
                </button>
              </div>
            </div>
          )}

          {/* Workflow */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow</h2>
            <div className="space-y-3 text-sm">
              {commande.appelant && (
                <div>
                  <p className="text-gray-500">Appelant</p>
                  <p className="font-medium text-gray-900">{commande.appelant.nom}</p>
                </div>
              )}
              {commande.styliste && (
                <div>
                  <p className="text-gray-500">Styliste</p>
                  <p className="font-medium text-gray-900">{commande.styliste.nom}</p>
                </div>
              )}
              {commande.couturier && (
                <div>
                  <p className="text-gray-500">Couturier</p>
                  <p className="font-medium text-gray-900">{commande.couturier.nom}</p>
                </div>
              )}
              {commande.livreur && (
                <div>
                  <p className="text-gray-500">Livreur</p>
                  <p className="font-medium text-gray-900">{commande.livreur.nom}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dates</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Créée le</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(commande.createdAt), 'PPP', { locale: fr })}
                </p>
              </div>
              {commande.dateDecoupe && (
                <div>
                  <p className="text-gray-500">Découpe</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(commande.dateDecoupe), 'PPP', { locale: fr })}
                  </p>
                </div>
              )}
              {commande.dateCouture && (
                <div>
                  <p className="text-gray-500">Couture terminée</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(commande.dateCouture), 'PPP', { locale: fr })}
                  </p>
                </div>
              )}
              {commande.dateLivraison && (
                <div>
                  <p className="text-gray-500">Livraison</p>
                  <p className="font-medium text-gray-900">
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




