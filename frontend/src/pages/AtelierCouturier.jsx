import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Shirt, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const AtelierCouturier = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    try {
      const response = await api.get('/commandes');
      const filtered = response.data.commandes.filter(c => 
        c.statut === 'en_couture'
      );
      setCommandes(filtered);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminerCouture = async (id, commande) => {
    if (!window.confirm(`Confirmer la fin de couture de cette commande ?\n\nCette action ajoutera automatiquement :\n• Modèle : ${commande.modele.nom}\n• Taille : ${commande.taille}\n• Couleur : ${commande.couleur}\n\nAu stock principal (+1 unité)`)) {
      return;
    }

    try {
      await api.post(`/commandes/${id}/terminer-couture`);
      toast.success(
        `✅ Couture terminée !\n📦 ${commande.modele.nom} (${commande.taille} - ${commande.couleur}) ajouté au stock.`,
        { duration: 5000 }
      );
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

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 text-white">
        <div className="flex items-center space-x-4">
          <Shirt size={40} />
          <div>
            <h1 className="text-3xl font-bold mb-2">Atelier de Couture</h1>
            <p className="text-orange-100">Gérez les commandes à coudre</p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <p className="text-gray-600 mb-2">Commandes en couture</p>
          <p className="text-3xl font-bold text-orange-600">{commandes.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 mb-2">Urgentes</p>
          <p className="text-3xl font-bold text-red-600">
            {commandes.filter(c => c.urgence).length}
          </p>
        </div>
      </div>

      {/* Commandes en couture */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Commandes à coudre
        </h2>
        {commandes.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <p className="text-gray-600">Aucune commande en couture pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {commandes.map((commande) => (
              <div key={commande._id} className="card bg-orange-50 border-orange-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {commande.numeroCommande}
                      </h3>
                      {commande.urgence && (
                        <span className="badge badge-danger animate-pulse">
                          <AlertCircle size={12} className="mr-1" />
                          Urgent
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm mb-4">
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
                      <div>
                        <p className="text-gray-500">Client</p>
                        <p className="font-medium text-gray-900">{commande.client.nom}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Styliste</p>
                        <p className="font-medium text-gray-900">
                          {commande.styliste?.nom || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {commande.modele.image && (
                      <div className="mb-4">
                        <img
                          src={commande.modele.image}
                          alt={commande.modele.nom}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}

                    {commande.noteAppelant && (
                      <div className="mb-3 p-3 bg-white rounded-lg border border-orange-300">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Instructions: </span>
                          {commande.noteAppelant}
                        </p>
                      </div>
                    )}
                    
                    {/* Info ajout stock */}
                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center">
                        <CheckCircle size={14} className="mr-1" />
                        Ajout automatique au stock
                      </p>
                      <p className="text-xs text-gray-700">
                        📦 Une fois terminée, cette commande sera automatiquement ajoutée au stock principal
                        <span className="font-semibold"> ({commande.modele.nom} - {commande.taille} - {commande.couleur})</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      to={`/commandes/${commande._id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      onClick={() => handleTerminerCouture(commande._id, commande)}
                      className="btn btn-success btn-sm"
                    >
                      <CheckCircle size={16} className="mr-1" />
                      Terminer & Stocker
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

export default AtelierCouturier;




