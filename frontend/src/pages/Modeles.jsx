import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, Plus, Search, Edit2, Trash2, Eye, X, Save, Image as ImageIcon } from 'lucide-react';

const Modeles = () => {
  const [modeles, setModeles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingModele, setEditingModele] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    image: '',
    prixBase: '',
    categorie: 'Robe'
  });

  const categories = ['Robe', 'Chemise', 'Pantalon', 'Ensemble', 'Accessoire', 'Autre'];

  useEffect(() => {
    fetchModeles();
  }, []);

  const fetchModeles = async () => {
    try {
      const response = await api.get('/modeles');
      setModeles(response.data.modeles || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des modèles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingModele) {
        await api.put(`/modeles/${editingModele.id || editingModele._id}`, formData);
        toast.success('Modèle modifié avec succès !');
      } else {
        await api.post('/modeles', formData);
        toast.success('Modèle créé avec succès !');
      }
      
      setShowModal(false);
      setEditingModele(null);
      resetForm();
      fetchModeles();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleEdit = (modele) => {
    setEditingModele(modele);
    setFormData({
      nom: modele.nom,
      description: modele.description || '',
      image: modele.image || '',
      prixBase: modele.prixBase || modele.prix_base || '',
      categorie: modele.categorie || 'Robe'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce modèle ?')) return;
    
    try {
      await api.delete(`/modeles/${id}`);
      toast.success('Modèle désactivé');
      fetchModeles();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      description: '',
      image: '',
      prixBase: '',
      categorie: 'Robe'
    });
  };

  const toggleTaille = (taille) => {
    setFormData(prev => ({
      ...prev,
      taillesDisponibles: prev.taillesDisponibles.includes(taille)
        ? prev.taillesDisponibles.filter(t => t !== taille)
        : [...prev.taillesDisponibles, taille]
    }));
  };

  const toggleCouleur = (couleur) => {
    setFormData(prev => ({
      ...prev,
      couleursDisponibles: prev.couleursDisponibles.includes(couleur)
        ? prev.couleursDisponibles.filter(c => c !== couleur)
        : [...prev.couleursDisponibles, couleur]
    }));
  };

  const filteredModeles = modeles.filter((modele) =>
    modele.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (modele.categorie && modele.categorie.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200/30 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in overflow-x-hidden max-w-full px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
            Bibliothèque de Modèles
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium mt-1 truncate">Gérer les modèles de vêtements</p>
        </div>
        <button
          onClick={() => {
            setEditingModele(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Plus size={18} strokeWidth={2.5} className="flex-shrink-0" />
          <span className="truncate">Nouveau Modèle</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-full">
        <div className="stat-card max-w-full overflow-hidden">
          <div className="flex items-start justify-between mb-2 sm:mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 sm:p-3 lg:p-4 rounded-2xl shadow-lg flex-shrink-0">
              <Package className="text-white" size={20} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-500 uppercase mb-1 sm:mb-2 truncate">Total Modèles</p>
          <p className="text-xl sm:text-3xl lg:text-4xl font-black text-gray-900">{modeles.length}</p>
        </div>

        {categories.slice(0, 3).map((cat, i) => (
          <div key={i} className="stat-card max-w-full overflow-hidden">
            <p className="text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-500 uppercase mb-1 sm:mb-2 truncate">{cat}s</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">
              {modeles.filter(m => m.categorie === cat).length}
            </p>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="stat-card max-w-full overflow-hidden">
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 flex-shrink-0" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 sm:pl-12 text-sm sm:text-base"
            placeholder="Rechercher un modèle..."
          />
        </div>
      </div>

      {/* Liste des modèles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModeles.map((modele, index) => (
          <div
            key={modele.id || modele._id}
            className="stat-card group cursor-pointer hover:scale-105"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Image */}
            <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 overflow-hidden">
              {modele.image ? (
                <img 
                  src={modele.image} 
                  alt={modele.nom}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="text-gray-400" size={48} />
                </div>
              )}
              <div className="absolute top-3 right-3">
                <span className="badge badge-primary">{modele.categorie}</span>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">{modele.nom}</h3>
                {modele.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{modele.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Prix de base</p>
                  <p className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {(modele.prixBase || modele.prix_base).toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-700">Catégorie:</span>
                  <span className="text-gray-600">{modele.categorie}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-3">
                <button
                  onClick={() => handleEdit(modele)}
                  className="flex-1 btn btn-secondary btn-sm flex items-center justify-center space-x-2"
                >
                  <Edit2 size={16} />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => handleDelete(modele.id || modele._id)}
                  className="btn btn-danger btn-sm p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-black text-white">
                {editingModele ? 'Modifier le Modèle' : 'Nouveau Modèle'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingModele(null);
                  resetForm();
                }}
                className="p-2 text-white hover:bg-white/20 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Nom & Catégorie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Nom du modèle *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    className="input focus-ring"
                    placeholder="Ex: Robe Africaine"
                  />
                </div>
                <div>
                  <label className="label">Catégorie *</label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    required
                    className="input focus-ring"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="input focus-ring"
                  placeholder="Description du modèle..."
                />
              </div>

              {/* Image & Prix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">URL Image</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="input focus-ring"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label className="label">Prix de base (FCFA) *</label>
                  <input
                    type="number"
                    value={formData.prixBase}
                    onChange={(e) => setFormData({ ...formData, prixBase: e.target.value })}
                    required
                    min="0"
                    step="100"
                    className="input focus-ring"
                    placeholder="10000"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingModele(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary flex items-center space-x-2">
                  <Save size={20} />
                  <span>{editingModele ? 'Modifier' : 'Créer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Modeles;
