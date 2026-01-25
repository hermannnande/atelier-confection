import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { 
  MessageSquare, 
  Send, 
  History, 
  Settings, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  BarChart3,
  Edit2,
  Eye,
  TestTube
} from 'lucide-react';

export default function NotificationsSMS() {
  const [activeTab, setActiveTab] = useState('overview');
  const [templates, setTemplates] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [testPhone, setTestPhone] = useState('');
  const [selectedSms, setSelectedSms] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [statusRes, statsRes] = await Promise.all([
          api.get('/sms/status'),
          api.get('/sms/stats')
        ]);
        setStatus(statusRes.data.data);
        setStats(statsRes.data.data);
      } else if (activeTab === 'templates') {
        const res = await api.get('/sms/templates');
        setTemplates(res.data.data);
      } else if (activeTab === 'historique') {
        const res = await api.get('/sms/historique?limit=100');
        setHistorique(res.data.data);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }

    try {
      setLoading(true);
      await api.post('/sms/test', { phone: testPhone });
      toast.success('SMS de test envoyé !');
      setTestPhone('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      setLoading(true);
      await api.put(`/sms/templates/${editingTemplate.id}`, editingTemplate);
      toast.success('Template mis à jour !');
      setEditingTemplate(null);
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoSend = async (code, currentValue) => {
    try {
      const newValue = currentValue === 'true' ? 'false' : 'true';
      await api.put(`/sms/config/auto_send_${code}`, { valeur: newValue });
      toast.success('Configuration mise à jour');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggleGlobalSmsEnabled = async (currentValue) => {
    try {
      const newValue = currentValue === 'true' ? 'false' : 'true';
      await api.put(`/sms/config/sms_enabled`, { valeur: newValue });
      toast.success('Configuration mise à jour');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatutBadge = (statut) => {
    const styles = {
      envoye: 'bg-green-100 text-green-800',
      echoue: 'bg-red-100 text-red-800',
      en_attente: 'bg-yellow-100 text-yellow-800',
      test: 'bg-blue-100 text-blue-800'
    };

    const icons = {
      envoye: <CheckCircle className="w-4 h-4" />,
      echoue: <XCircle className="w-4 h-4" />,
      en_attente: <Clock className="w-4 h-4" />,
      test: <TestTube className="w-4 h-4" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[statut] || 'bg-gray-100 text-gray-800'}`}>
        {icons[statut]}
        {statut}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          Notifications SMS
        </h1>
        <p className="text-gray-600 mt-2">
          Gérez les notifications SMS automatiques envoyées aux clients
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-5 h-5 inline mr-2" />
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Edit2 className="w-5 h-5 inline mr-2" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('historique')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'historique'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <History className="w-5 h-5 inline mr-2" />
          Historique
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-5 h-5 inline mr-2" />
          Configuration
        </button>
      </div>

      {/* Content */}
      {loading && activeTab !== 'overview' && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement...</p>
        </div>
      )}

      {/* Tab: Overview */}
      {activeTab === 'overview' && !loading && stats && status && (
        <div className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">SMS Envoyés</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalEnvoyes}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Échecs</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalEchoues}</p>
                </div>
                <XCircle className="w-12 h-12 text-red-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Aujourd'hui</p>
                  <p className="text-3xl font-bold mt-1">{stats.smsAujourdhui}</p>
                </div>
                <Clock className="w-12 h-12 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Taux de Réussite</p>
                  <p className="text-3xl font-bold mt-1">{stats.tauxReussite}%</p>
                </div>
                <BarChart3 className="w-12 h-12 text-purple-200" />
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Statut du Système</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Envoi (ENV)</p>
                <p className="font-semibold">
                  {status.enabled ? (
                    <span className="text-green-600">✅ Activé</span>
                  ) : (
                    <span className="text-orange-600">⚠️ Mode Test</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Auto-send (DB)</p>
                <p className="font-semibold">
                  {status.dbEnabled ? (
                    <span className="text-green-600">✅ Activé</span>
                  ) : (
                    <span className="text-orange-600">⏸️ Désactivé</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Effectif (ENV + DB)</p>
                <p className="font-semibold">
                  {status.effectiveEnabled ? (
                    <span className="text-green-600">✅ Envoi réel + auto-send</span>
                  ) : (
                    <span className="text-orange-600">⚠️ Auto-send coupé ou mode test</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Configuration API</p>
                <p className="font-semibold">
                  {status.configured ? (
                    <span className="text-green-600">✅ Configuré</span>
                  ) : (
                    <span className="text-red-600">❌ Non configuré</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">API Key</p>
                <p className="font-mono text-sm">{status.apiKey || 'Non définie'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Téléphone Émetteur</p>
                <p className="font-semibold">{status.senderPhone || 'Non défini'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Device (config → used)</p>
                <p className="font-mono text-sm">
                  {String(status.deviceId || '—')} → {String(status.deviceUsed || '—')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">SIM Slot</p>
                <p className="font-semibold">{status.simSlot ? `SIM${status.simSlot}` : 'Auto'}</p>
              </div>
            </div>
            {status.configError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <strong>Erreur config DB:</strong> {status.configError}
              </div>
            )}
          </div>

          {/* Test SMS */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TestTube className="w-5 h-5 text-blue-600" />
              Tester l'envoi SMS
            </h3>
            <div className="flex gap-3">
              <input
                type="tel"
                placeholder="+225 0700000000"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleTestSMS}
                disabled={loading || !testPhone}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Envoyer Test
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              💡 Entrez votre numéro pour tester que le système fonctionne
            </p>
          </div>
        </div>
      )}

      {/* Tab: Templates */}
      {activeTab === 'templates' && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{template.nom}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {template.message}
                </pre>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  template.actif
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.actif ? '✅ Actif' : '❌ Inactif'}
                </span>
                <span className="text-xs text-gray-500">Code: {template.code}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Historique */}
      {activeTab === 'historique' && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destinataire</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historique.map((sms) => (
                  <tr key={sms.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(sms.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{sms.destinataire_nom}</div>
                      <div className="text-sm text-gray-500">{sms.destinataire_telephone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 line-clamp-2">{sms.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      {getStatutBadge(sms.statut)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSms(sms)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        title="Voir les détails (message_id / réponse SMS8)"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && !loading && status && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Configuration Automatique</h3>
            <p className="text-sm text-gray-600 mb-6">
              Activez ou désactivez l'envoi automatique de SMS pour chaque étape
            </p>
            <div className="space-y-4">
              {/* Toggle global */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium">SMS_ENABLED (DB - auto-send global)</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Si désactivé, aucun SMS automatique ne part, même si les auto_send_* sont à true.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleGlobalSmsEnabled(status.config?.sms_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    status.config?.sms_enabled === 'true' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      status.config?.sms_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {Object.entries(status.config || {}).filter(([key]) => key.startsWith('auto_send_')).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {key.replace('auto_send_', '').replace(/_/g, ' ').toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleAutoSend(key.replace('auto_send_', ''), value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value === 'true' ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        value === 'true' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Important</h3>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>• Votre téléphone Android doit rester allumé et connecté</li>
              <li>• L'application SMS8.io doit être active en arrière-plan</li>
              <li>• Vérifiez que vous avez un forfait SMS suffisant</li>
              <li>• Les variables disponibles: {'{client}'}, {'{numero}'}, {'{modele}'}, {'{telephone}'}, {'{ville}'}</li>
            </ul>
          </div>
        </div>
      )}

      {/* Modal Edition Template */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">Modifier le Template</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.nom}
                    onChange={(e) => setEditingTemplate({...editingTemplate, nom: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={editingTemplate.message}
                    onChange={(e) => setEditingTemplate({...editingTemplate, message: e.target.value})}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables: {'{client}'}, {'{numero}'}, {'{modele}'}, {'{taille}'}, {'{couleur}'}, {'{telephone}'}, {'{ville}'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.description || ''}
                    onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="actif"
                    checked={editingTemplate.actif}
                    onChange={(e) => setEditingTemplate({...editingTemplate, actif: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="actif" className="text-sm font-medium text-gray-700">
                    Template actif
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveTemplate}
                  disabled={loading}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="flex-1 px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails SMS */}
      {selectedSms && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSms(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">Détails SMS</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedSms.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSms(null)}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold"
                >
                  Fermer
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Destinataire</p>
                  <p className="font-semibold text-gray-900 mt-1">{selectedSms.destinataire_nom}</p>
                  <p className="text-sm text-gray-700">{selectedSms.destinataire_telephone}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Statut</p>
                  <div className="mt-2">{getStatutBadge(selectedSms.statut)}</div>
                  <p className="text-xs text-gray-500 mt-3 uppercase font-semibold">Template</p>
                  <p className="text-sm font-mono text-gray-900 mt-1">{selectedSms.template_code || '—'}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Message</p>
                  <pre className="mt-2 text-sm text-gray-800 whitespace-pre-wrap font-mono">{selectedSms.message}</pre>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold">message_id</p>
                  <p className="text-sm font-mono text-gray-900 mt-1 break-all">{selectedSms.message_id || '—'}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Erreur</p>
                  <p className="text-sm text-gray-900 mt-1 break-words">{selectedSms.erreur || '—'}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Réponse API (SMS8)</p>
                  <pre className="mt-2 text-xs text-gray-800 whitespace-pre-wrap font-mono">
                    {selectedSms.response_api
                      ? JSON.stringify(selectedSms.response_api, null, 2)
                      : '—'}
                  </pre>
                  <p className="text-xs text-gray-500 mt-2">
                    Astuce: cherche <span className="font-mono">meta.runtime</span> (= vercel/local) et <span className="font-mono">sms8</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



