/**
 * ============================================================================
 * PAGE : HISTORIQUE DES PRÉSENCES (Admin / Gestionnaire)
 * ============================================================================
 * 
 * Affiche l'historique complet des pointages avec :
 * ✅ Filtres par date, utilisateur, statut
 * ✅ Tableau paginé
 * ✅ Statistiques globales
 * ✅ Indicateurs visuels
 * ✅ Export CSV (à venir)
 */

import { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Download,
  Filter,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function HistoriquePresences() {
  const [attendances, setAttendances] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0], // Aujourd'hui par défaut
    userId: '',
    validation: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const getInitials = (fullName) => {
    if (!fullName) return '??';
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  useEffect(() => {
    loadData();
  }, [filters, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Charger l'historique
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const historyRes = await axios.get(
        `${API_URL}/attendance/history?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAttendances(historyRes.data.attendances);
      setPagination(historyRes.data.pagination);

      // Charger les statistiques
      const statsRes = await axios.get(
        `${API_URL}/attendance/statistics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatistics(statsRes.data.statistics);

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset à la page 1
  };

  const resetFilters = () => {
    setFilters({
      date: new Date().toISOString().split('T')[0],
      userId: '',
      validation: ''
    });
  };

  const getBadgeClass = (validation) => {
    const classes = {
      VALIDE: 'bg-green-100 text-green-700 border-green-300',
      RETARD: 'bg-orange-100 text-orange-700 border-orange-300',
      HORS_ZONE: 'bg-red-100 text-red-700 border-red-300'
    };
    return classes[validation] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStatusBadge = (attendance) => {
    if (attendance.heure_depart) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">
          <CheckCircle className="w-3 h-3" />
          PARTI
        </span>
      );
    }
    
    if (attendance.validation === 'RETARD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">
          <AlertCircle className="w-3 h-3" />
          RETARD
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
        <CheckCircle className="w-3 h-3" />
        PRÉSENT
      </span>
    );
  };

  if (loading && attendances.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-7 h-7 text-indigo-600" />
          Historique des présences
        </h1>
        <p className="text-gray-600 mt-1">
          Suivi complet des pointages par géolocalisation
        </p>
      </div>

      {/* Statistiques globales */}
      {statistics.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total employés</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.length}</p>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Présents aujourd'hui</p>
                <p className="text-2xl font-bold text-green-600">
                  {attendances.filter(a => a.validee).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Retards</p>
                <p className="text-2xl font-bold text-orange-600">
                  {attendances.filter(a => a.validation === 'RETARD').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux de ponctualité</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {attendances.length > 0
                    ? Math.round((attendances.filter(a => a.validation === 'VALIDE').length / attendances.length) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Validation
            </label>
            <select
              value={filters.validation}
              onChange={(e) => handleFilterChange('validation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tous</option>
              <option value="VALIDE">Valides</option>
              <option value="RETARD">Retards</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            >
              Réinitialiser
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => toast.info('Export CSV à venir...')}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des présences */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arrivée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Départ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validation
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-lg font-medium">Aucun pointage trouvé</p>
                    <p className="text-sm mt-1">Modifiez les filtres pour voir plus de résultats</p>
                  </td>
                </tr>
              ) : (
                attendances.map((attendance) => (
                  <tr key={attendance.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {getInitials(attendance.user?.nom)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {attendance.user?.nom || 'Utilisateur'}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {attendance.user?.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(attendance.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {new Date(attendance.heure_arrivee).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendance.heure_depart ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {new Date(attendance.heure_depart).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round(attendance.distance_arrivee)}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(attendance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getBadgeClass(attendance.validation)}`}>
                        {attendance.validation}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Précédent
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistiques par employé (30 derniers jours) */}
      {statistics.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Statistiques sur 30 jours
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Présences</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">À l'heure</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retards</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taux ponctualité</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance moy.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statistics.map((stat) => (
                  <tr key={stat.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{stat.nom}</div>
                      <div className="text-xs text-gray-500 capitalize">{stat.role}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{stat.total_presences || 0}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-semibold">{stat.presences_valides || 0}</td>
                    <td className="px-4 py-3 text-sm text-orange-600 font-semibold">{stat.retards || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${stat.taux_ponctualite || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-10">
                          {stat.taux_ponctualite || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{stat.distance_moyenne || 0}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

