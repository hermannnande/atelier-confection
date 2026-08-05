import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock3,
  KeyRound,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';

const statusStyles = {
  envoye: 'bg-emerald-100 text-emerald-800',
  echoue: 'bg-red-100 text-red-800',
  en_attente: 'bg-amber-100 text-amber-800',
};

const statusLabels = {
  envoye: 'Envoyé',
  echoue: 'Échoué',
  en_attente: 'En attente',
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const WhatsAppConfig = () => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilters, setHistoryFilters] = useState({ status: '', eventCode: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });

  const templateLabels = useMemo(
    () => Object.fromEntries(templates.map((template) => [template.code, template.label])),
    [templates],
  );

  const loadStatus = async () => {
    try {
      const response = await api.get('/whatsapp/status');
      setStatus(response.data?.data || null);
    } catch {
      toast.error('Impossible de vérifier la connexion WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/whatsapp/templates');
      const items = response.data?.data || [];
      setTemplates(items);
      setDrafts(Object.fromEntries(items.map((item) => [item.code, item.message])));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de charger les messages automatiques');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadHistory = async (page = 1, filters = historyFilters) => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/whatsapp/history', {
        params: {
          page,
          limit: 25,
          status: filters.status || undefined,
          eventCode: filters.eventCode || undefined,
        },
      });
      setHistory(response.data?.data || []);
      setPagination(response.data?.pagination || { page: 1, pages: 1, total: 0 });
      setStats(response.data?.stats || { total: 0, sent: 0, failed: 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de charger l’historique WhatsApp');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadTemplates();
    loadHistory(1, { status: '', eventCode: '' });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = apiKey.trim();
    if (value.length < 20 || /\s/.test(value)) {
      toast.error('Saisissez une clé WaSenderAPI valide');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/whatsapp/config', {
        apiKey: value,
        enabled: true,
      });
      setStatus(response.data?.data || null);
      setApiKey('');
      toast.success('WhatsApp NousUnique est activé');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Activation WhatsApp impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (code, message) => {
    setDrafts((current) => ({ ...current, [code]: message }));
  };

  const insertVariable = (code, variable) => {
    setDrafts((current) => ({
      ...current,
      [code]: `${current[code] || ''}{${variable}}`,
    }));
  };

  const resetTemplate = (template) => {
    handleTemplateChange(template.code, template.defaultMessage);
  };

  const saveTemplates = async () => {
    if (Object.values(drafts).some((message) => String(message || '').trim().length < 5)) {
      toast.error('Chaque message doit contenir au moins 5 caractères');
      return;
    }

    setSavingTemplates(true);
    try {
      const response = await api.put('/whatsapp/templates', { templates: drafts });
      const items = response.data?.data || [];
      setTemplates(items);
      setDrafts(Object.fromEntries(items.map((item) => [item.code, item.message])));
      toast.success('Messages automatiques enregistrés');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Enregistrement des messages impossible');
    } finally {
      setSavingTemplates(false);
    }
  };

  const updateHistoryFilter = (key, value) => {
    const next = { ...historyFilters, [key]: value };
    setHistoryFilters(next);
    loadHistory(1, next);
  };

  const connected = status?.enabled && status?.configured;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-7 text-white shadow-xl shadow-emerald-500/20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
              <MessageCircle size={34} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-100">WaSenderAPI</p>
              <h1 className="text-3xl font-black">WhatsApp NousUnique</h1>
              <p className="mt-1 text-sm text-emerald-50">Messages automatiques et suivi des envois clients</p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-black ${connected ? 'bg-white text-emerald-700' : 'bg-amber-300 text-amber-950'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-700'}`} />
            {loading ? 'Vérification…' : connected ? 'Connecté' : 'À configurer'}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-lg lg:col-span-3">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <KeyRound size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Clé de la session</h2>
              <p className="text-sm text-gray-500">Session attendue : NousUnique</p>
            </div>
          </div>
          <label htmlFor="wasender-api-key" className="mb-2 block text-sm font-bold text-gray-700">
            Clé privée WaSenderAPI
          </label>
          <input
            id="wasender-api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Laissez vide si la session est déjà connectée"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={saving}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3.5 font-black text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Activation en cours…' : connected ? 'Mettre à jour la connexion' : 'Activer WhatsApp'}
          </button>
        </form>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-7 lg:col-span-2">
          <div className="mb-5 flex items-center gap-3 text-emerald-800">
            <ShieldCheck size={28} />
            <h2 className="text-lg font-black">Protection de la clé</h2>
          </div>
          <p className="text-sm leading-6 text-emerald-900/80">
            La clé est chiffrée avant son enregistrement. Elle n’est jamais affichée ni renvoyée par l’application.
          </p>
          <div className="mt-6 space-y-3">
            {['Commande reçue', 'Commande validée', 'Livreur assigné avec son contact', 'Excuses à J, J+1 et J+2 à 17h30'].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm font-semibold text-emerald-900">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Personnalisation</p>
            <h2 className="mt-1 text-2xl font-black text-gray-900">Messages automatiques</h2>
            <p className="mt-2 text-sm text-gray-500">Chaque scénario possède son propre texte. Cliquez sur une variable pour l’insérer.</p>
          </div>
          <button
            type="button"
            onClick={saveTemplates}
            disabled={savingTemplates || templatesLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save size={18} />
            {savingTemplates ? 'Enregistrement…' : 'Enregistrer les messages'}
          </button>
        </div>

        {templatesLoading ? (
          <div className="py-12 text-center font-semibold text-gray-500">Chargement des messages…</div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {templates.map((template) => (
              <article key={template.code} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-gray-900">{template.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{template.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetTemplate(template)}
                    title="Rétablir le message d’origine"
                    className="shrink-0 rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>
                <textarea
                  value={drafts[template.code] || ''}
                  onChange={(event) => handleTemplateChange(template.code, event.target.value)}
                  rows={7}
                  maxLength={2000}
                  className="w-full resize-y rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Variables :</span>
                  {template.variables.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(template.code, variable)}
                      className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 transition hover:bg-emerald-200"
                    >
                      {`{${variable}}`}
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-gray-400">{(drafts[template.code] || '').length}/2000</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Suivi</p>
            <h2 className="mt-1 text-2xl font-black text-gray-900">Historique des messages</h2>
            <p className="mt-2 text-sm text-gray-500">Consultez le destinataire, le message exact et le résultat de chaque envoi.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={historyFilters.status}
              onChange={(event) => updateHistoryFilter('status', event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
            >
              <option value="">Tous les statuts</option>
              <option value="envoye">Envoyés</option>
              <option value="echoue">Échoués</option>
              <option value="en_attente">En attente</option>
            </select>
            <select
              value={historyFilters.eventCode}
              onChange={(event) => updateHistoryFilter('eventCode', event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
            >
              <option value="">Tous les messages</option>
              {templates.map((template) => (
                <option key={template.code} value={template.code}>{template.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadHistory(pagination.page)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100"
            >
              <RefreshCw size={17} className={historyLoading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Total</p>
            <p className="mt-1 text-2xl font-black text-blue-950">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Envoyés</p>
            <p className="mt-1 text-2xl font-black text-emerald-950">{stats.sent}</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-red-600">Échoués</p>
            <p className="mt-1 text-2xl font-black text-red-950">{stats.failed}</p>
          </div>
        </div>

        {historyLoading ? (
          <div className="py-14 text-center font-semibold text-gray-500">Chargement de l’historique…</div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-14 text-center">
            <MessageCircle className="mx-auto text-gray-300" size={38} />
            <p className="mt-3 font-bold text-gray-700">Aucun message pour ce filtre</p>
            <p className="mt-1 text-sm text-gray-500">Les prochains envois automatiques apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => {
              const eventCode = String(item.template_code || '').replace(/^whatsapp_/, '');
              return (
                <article key={item.id} className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-200 hover:shadow-md">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[item.statut] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[item.statut] || item.statut}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {templateLabels[eventCode] || eventCode}
                        </span>
                        {item.numero_commande && (
                          <span className="text-xs font-bold text-gray-500">#{item.numero_commande}</span>
                        )}
                      </div>
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase text-gray-400">Client</p>
                          <p className="mt-1 font-bold text-gray-900">{item.destinataire_nom || 'Client'}</p>
                          <p className="text-gray-500">{item.destinataire_telephone || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-gray-400">Date</p>
                          <p className="mt-1 flex items-center gap-2 font-semibold text-gray-700">
                            <Clock3 size={15} /> {formatDate(item.sent_at || item.created_at)}
                          </p>
                          {item.message_id && <p className="mt-1 text-xs text-gray-400">ID : {item.message_id}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4 lg:w-1/2">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.message}</p>
                      {item.erreur && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                          <AlertCircle className="mt-0.5 shrink-0" size={15} />
                          <span>{item.erreur}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-gray-500">
            Page {pagination.page} sur {pagination.pages} · {pagination.total} résultat(s)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || historyLoading}
              onClick={() => loadHistory(pagination.page - 1)}
              className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              aria-label="Page précédente"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages || historyLoading}
              onClick={() => loadHistory(pagination.page + 1)}
              className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              aria-label="Page suivante"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WhatsAppConfig;
