/**
 * ============================================================================
 * PAGE : SYSTÈME DE POINTAGE PAR GÉOLOCALISATION GPS
 * ============================================================================
 * 
 * Fonctionnalités :
 * ✅ Pointage arrivée/départ avec validation GPS
 * ✅ Badge de statut en temps réel (ABSENT/PRÉSENT/RETARD/PARTI)
 * ✅ Affichage de la distance par rapport à l'atelier
 * ✅ Messages clairs pour l'utilisateur
 * ✅ Possibilité de réessayer après refus (hors zone)
 * ✅ Design moderne et responsive
 * 
 * Rôles concernés : gestionnaire, appelant, styliste, couturier
 */

import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  LogOut,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Presence() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [storeConfig, setStoreConfig] = useState(null);
  const [gpsError, setGpsError] = useState(null);

  // Charger les données au montage et toutes les 60 secondes
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Rafraîchir chaque minute
    return () => clearInterval(interval);
  }, []);

  // Charger le pointage du jour et la config
  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Charger le pointage du jour
      const attendanceRes = await axios.get(`${API_URL}/attendance/my-attendance-today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendance(attendanceRes.data.attendance);

      // Charger la config de l'atelier
      const configRes = await axios.get(`${API_URL}/attendance/store-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStoreConfig(configRes.data.config);

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      if (error.response?.status !== 404) {
        toast.error('Erreur lors du chargement des données');
      }
      setLoading(false);
    }
  };

  // Obtenir la géolocalisation
  const getGeolocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La géolocalisation n\'est pas supportée par votre navigateur'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let message = 'Erreur de géolocalisation';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Veuillez autoriser l\'accès à votre position dans les paramètres du navigateur';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Position indisponible. Vérifiez que votre GPS est activé';
              break;
            case error.TIMEOUT:
              message = 'Délai dépassé. Réessayez';
              break;
          }
          
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // Marquer l'arrivée
  const handleMarkArrival = async () => {
    setMarking(true);
    setGpsError(null);

    try {
      // Obtenir la géolocalisation
      toast.loading('Récupération de votre position GPS...', { id: 'gps' });
      const coords = await getGeolocation();
      toast.dismiss('gps');

      // Envoyer au serveur
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/attendance/mark-arrival`,
        coords,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAttendance(response.data.attendance);
        
        if (response.data.validation === 'RETARD') {
          toast.success(response.data.message, { 
            icon: '⚠️',
            duration: 5000 
          });
        } else {
          toast.success(response.data.message, { 
            icon: '✅',
            duration: 4000 
          });
        }
      }

    } catch (error) {
      console.error('Erreur pointage:', error);
      
      // Erreur hors zone (peut réessayer)
      if (error.response?.data?.error === 'HORS_ZONE') {
        const errorData = error.response.data;
        setGpsError(errorData);
        
        toast.error(
          `❌ Pointage refusé\n\nVous êtes à ${errorData.distance}m de l'atelier.\nVous devez être à moins de ${errorData.rayonTolerance}m.\n\n💡 Rapprochez-vous et réessayez !`,
          { duration: 7000 }
        );
      }
      // Autres erreurs
      else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error(error.response?.data?.message || 'Erreur lors du pointage');
      }
    } finally {
      setMarking(false);
    }
  };

  // Marquer le départ
  const handleMarkDeparture = async () => {
    setMarking(true);

    try {
      toast.loading('Récupération de votre position GPS...', { id: 'gps' });
      const coords = await getGeolocation();
      toast.dismiss('gps');

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/attendance/mark-departure`,
        coords,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAttendance(response.data.attendance);
        toast.success(response.data.message, { icon: '👋' });
      }

    } catch (error) {
      console.error('Erreur départ:', error);
      
      if (error.message) {
        toast.error(error.message);
      } else {
        toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement du départ');
      }
    } finally {
      setMarking(false);
    }
  };

  // Déterminer le statut
  const getStatus = () => {
    if (!attendance) return 'ABSENT';
    if (attendance.heure_depart) return 'PARTI';
    if (attendance.validation === 'RETARD') return 'RETARD';
    return 'PRÉSENT';
  };

  const status = getStatus();

  // Styles des badges de statut
  const statusConfig = {
    ABSENT: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
      icon: XCircle,
      label: 'ABSENT'
    },
    PRÉSENT: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
      icon: CheckCircle,
      label: 'PRÉSENT'
    },
    RETARD: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-300',
      icon: AlertCircle,
      label: 'RETARD'
    },
    PARTI: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300',
      icon: LogOut,
      label: 'PARTI'
    }
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-7 h-7 text-indigo-600" />
              Pointage GPS
            </h1>
            <p className="text-gray-600 mt-1">
              Système de présence par géolocalisation
            </p>
          </div>

          {/* Badge de statut */}
          <div className={`${currentStatus.bg} ${currentStatus.text} ${currentStatus.border} border-2 px-6 py-3 rounded-full font-bold text-lg flex items-center gap-2 shadow-sm`}>
            <StatusIcon className="w-6 h-6" />
            {currentStatus.label}
          </div>
        </div>
      </div>

      {/* Configuration de l'atelier */}
      {storeConfig && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5" />
            Configuration de l'atelier
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>📍 <strong>{storeConfig.nom}</strong></p>
            {storeConfig.adresse && <p>📮 {storeConfig.adresse}</p>}
            <p>📏 Rayon de validation : <strong>{storeConfig.rayon_tolerance}m</strong></p>
            <p>🕐 Horaires : {storeConfig.heure_ouverture} - {storeConfig.heure_fermeture}</p>
            <p>⏱️ Tolérance retard : {storeConfig.tolerance_retard} minutes</p>
          </div>
        </div>
      )}

      {/* Message d'erreur GPS (hors zone) */}
      {gpsError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 text-lg mb-2">
                ❌ Pointage refusé - Vous êtes HORS ZONE
              </h3>
              <p className="text-red-800 mb-3">
                Vous êtes à <strong>{gpsError.distance}m</strong> de l'atelier. 
                Vous devez être à moins de <strong>{gpsError.rayonTolerance}m</strong> pour pointer.
              </p>
              <div className="bg-white border border-red-200 rounded-md p-3 text-sm text-red-700">
                <p className="font-semibold mb-1">💡 Astuce :</p>
                <p>Rapprochez-vous de l'atelier et cliquez à nouveau sur "Marquer ma présence".</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informations du pointage */}
      {attendance ? (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            Pointage du jour
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Arrivée */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Arrivée
              </h3>
              <div className="space-y-1 text-sm text-green-800">
                <p>🕐 <strong>{new Date(attendance.heure_arrivee).toLocaleTimeString('fr-FR')}</strong></p>
                <p>📏 Distance : {Math.round(attendance.distance_arrivee)}m</p>
                <p>✅ {attendance.validation === 'RETARD' ? 'En retard' : 'À l\'heure'}</p>
              </div>
            </div>

            {/* Départ */}
            {attendance.heure_depart ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <LogOut className="w-5 h-5" />
                  Départ
                </h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>🕐 <strong>{new Date(attendance.heure_depart).toLocaleTimeString('fr-FR')}</strong></p>
                  <p>📏 Distance : {Math.round(attendance.distance_depart)}m</p>
                  <p>👋 Bonne soirée !</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center">
                <p className="text-gray-500 text-sm">
                  En attente du départ...
                </p>
              </div>
            )}
          </div>

          {/* Note éventuelle */}
          {attendance.note && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note :</strong> {attendance.note}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
          <p className="text-yellow-800 text-center">
            <AlertCircle className="w-5 h-5 inline mr-2" />
            Vous n'avez pas encore pointé aujourd'hui
          </p>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col items-center gap-4">
          {!attendance ? (
            // Bouton marquer présence
            <>
              <button
                onClick={handleMarkArrival}
                disabled={marking}
                className="w-full max-w-md bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
              >
                {marking ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Localisation en cours...
                  </>
                ) : (
                  <>
                    <MapPin className="w-6 h-6" />
                    Marquer ma présence
                  </>
                )}
              </button>

              <div className="text-center text-sm text-gray-600 max-w-md">
                <p className="mb-2">
                  💡 <strong>Information :</strong> Vous devez être à moins de {storeConfig?.rayon_tolerance || 50}m de l'atelier
                </p>
                <p className="text-xs text-gray-500">
                  Si le pointage est refusé, rapprochez-vous et réessayez !
                </p>
              </div>
            </>
          ) : !attendance.heure_depart ? (
            // Bouton marquer départ
            <>
              <button
                onClick={handleMarkDeparture}
                disabled={marking}
                className="w-full max-w-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
              >
                {marking ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Localisation en cours...
                  </>
                ) : (
                  <>
                    <LogOut className="w-6 h-6" />
                    Marquer mon départ
                  </>
                )}
              </button>

              <p className="text-sm text-gray-600">
                N'oubliez pas de pointer votre départ en fin de journée
              </p>
            </>
          ) : (
            // Déjà parti
            <div className="text-center">
              <div className="bg-blue-100 text-blue-700 px-6 py-3 rounded-lg inline-flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Pointage du jour terminé</span>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                À demain ! 👋
              </p>
            </div>
          )}

          {/* Bouton actualiser */}
          <button
            onClick={loadData}
            className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Avertissement permissions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
        <p className="font-semibold mb-2">⚠️ Autorisations nécessaires :</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Autoriser l'accès à votre position dans votre navigateur</li>
          <li>Activer le GPS sur votre appareil pour une meilleure précision</li>
          <li>Se trouver à proximité de l'atelier (moins de {storeConfig?.rayon_tolerance || 50}m)</li>
        </ul>
      </div>
    </div>
  );
}

