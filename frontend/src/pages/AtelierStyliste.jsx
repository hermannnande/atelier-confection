import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Scissors, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const AtelierStyliste = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    try {
      const response = await api.get('/commandes');
      // Affiche uniquement les commandes envoyées par le gestionnaire (statut: en_decoupe)
      const filtered = response.data.commandes.filter(c => 
        c.statut === 'en_decoupe'
      );
      setCommandes(filtered);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommencerDecoupe = async (id) => {
    try {
      await api.post(`/commandes/${id}/decoupe`);
      toast.success('Découpe commencée !');
      fetchCommandes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleEnvoyerCouture = async (id) => {
    try {
      await api.post(`/commandes/${id}/couture`);
      toast.success('Envoyé en couture !');
      fetchCommandes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const commandesValidees = commandes.filter(c => c.statut === 'validee');
  const commandesEnDecoupe = commandes.filter(c => c.statut === 'en_decoupe');

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl p-8 text-white">
        <div className="flex items-center space-x-4">
          <Scissors size={40} />
          <div>
            <h1 className="text-3xl font-bold mb-2">Atelier de Découpe</h1>
            <p className="text-yellow-100">Gérez les commandes à découper</p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-gray-600 mb-2">En attente de découpe</p>
          <p className="text-3xl font-bold text-primary-600">{commandesValidees.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 mb-2">En cours de découpe</p>
          <p className="text-3xl font-bold text-yellow-600">{commandesEnDecoupe.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 mb-2">Total</p>
          <p className="text-3xl font-bold text-gray-900">{commandes.length}</p>
        </div>
      </div>

      {/* Commandes en attente */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Commandes en attente de découpe
        </h2>
        {commandesValidees.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <p className="text-gray-600">Aucune commande en attente de découpe</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {commandesValidees.map((commande) => (
              <div key={commande._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {commande.numeroCommande}
                      </h3>
                      {commande.urgence && (
                        <span className="badge badge-danger">
                          <AlertCircle size={12} className="mr-1" />
                          Urgent
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Modèle</p>
                        <p className="font-medium text-gray-900">{commande.modele.nom}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Taille</p>
                        <p className="font-medium text-gray-900">{commande.taille}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Couleur</p>
                        <p className="font-medium text-gray-900">{commande.couleur}</p>
                      </div>
                    </div>

                    {commande.noteAppelant && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Note: </span>
                          {commande.noteAppelant}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      to={`/commandes/${commande._id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      onClick={() => handleCommencerDecoupe(commande._id)}
                      className="btn btn-primary btn-sm"
                    >
                      <Scissors size={16} className="mr-1" />
                      Commencer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commandes en découpe */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Commandes en cours de découpe
        </h2>
        {commandesEnDecoupe.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">Aucune commande en cours de découpe</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {commandesEnDecoupe.map((commande) => (
              <div key={commande._id} className="card bg-yellow-50 border-yellow-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {commande.numeroCommande}
                      </h3>
                      <span className="badge badge-warning">En cours</span>
                      {commande.urgence && (
                        <span className="badge badge-danger">
                          <AlertCircle size={12} className="mr-1" />
                          Urgent
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Modèle</p>
                        <p className="font-medium text-gray-900">{commande.modele.nom}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Taille</p>
                        <p className="font-medium text-gray-900">{commande.taille}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Couleur</p>
                        <p className="font-medium text-gray-900">{commande.couleur}</p>
                      </div>
                    </div>

                    {commande.noteAppelant && (
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Note: </span>
                          {commande.noteAppelant}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      to={`/commandes/${commande._id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      onClick={() => handleEnvoyerCouture(commande._id)}
                      className="btn btn-success btn-sm"
                    >
                      <CheckCircle size={16} className="mr-1" />
                      Envoyer en couture
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AtelierStyliste;




