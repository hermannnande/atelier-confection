import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Users, UserPlus, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Utilisateurs = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    password: '',
    role: '',
    telephone: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      toast.error('Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      toast.success('Utilisateur créé !');
      setShowModal(false);
      setFormData({
        nom: '',
        email: '',
        password: '',
        role: '',
        telephone: ''
      });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleToggleActif = async (id, actif) => {
    try {
      await api.put(`/users/${id}`, { actif: !actif });
      toast.success(actif ? 'Utilisateur désactivé' : 'Utilisateur activé');
      fetchUsers();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      administrateur: 'badge-primary',
      gestionnaire: 'badge-info',
      appelant: 'badge-success',
      styliste: 'badge-warning',
      couturier: 'badge-secondary',
      livreur: 'badge-primary',
    };
    return colors[role] || 'badge-secondary';
  };

  const getRoleLabel = (role) => {
    const labels = {
      administrateur: 'Administrateur',
      gestionnaire: 'Gestionnaire',
      appelant: 'Appelant',
      styliste: 'Styliste',
      couturier: 'Couturier',
      livreur: 'Livreur',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Gestion des Utilisateurs</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1 truncate">Gérez les comptes de votre équipe</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary inline-flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <UserPlus size={18} className="flex-shrink-0" />
          <span className="truncate">Nouvel Utilisateur</span>
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 max-w-full">
        {['administrateur', 'gestionnaire', 'appelant', 'styliste', 'couturier', 'livreur'].map((role) => (
          <div key={role} className="card text-center max-w-full overflow-hidden">
            <p className="text-gray-600 text-[10px] sm:text-xs lg:text-sm mb-0.5 sm:mb-1 truncate">{getRoleLabel(role)}</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-primary-600">
              {users.filter(u => u.role === role && u.actif).length}
            </p>
          </div>
        ))}
      </div>

      {/* Liste des utilisateurs */}
      <div className="card max-w-full overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rôle</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Téléphone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-sm">
                          {user.nom?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{user.nom}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{user.telephone || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActif(user._id, user.actif)}
                      className={`badge ${user.actif ? 'badge-success' : 'badge-danger'} cursor-pointer`}
                    >
                      {user.actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button className="btn btn-secondary btn-sm">
                      <Edit size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de création */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Créer un Utilisateur</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nom complet *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label">Mot de passe *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength="6"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Rôle *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  className="input"
                >
                  <option value="">Sélectionner</option>
                  {currentUser?.role === 'gestionnaire' ? (
                    <option value="livreur">Livreur</option>
                  ) : (
                    <>
                      <option value="administrateur">Administrateur</option>
                      <option value="gestionnaire">Gestionnaire</option>
                      <option value="appelant">Appelant</option>
                      <option value="styliste">Styliste</option>
                      <option value="couturier">Couturier</option>
                      <option value="livreur">Livreur</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input
                  type="text"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Utilisateurs;




