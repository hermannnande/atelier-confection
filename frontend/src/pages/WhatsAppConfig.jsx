import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  KeyRound,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Wrench,
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

const CustomerSmsConfig = () => {
  const [apiKey, setApiKey] = useState('');
  const [deviceId, setDeviceId] = useState('f95525f8-e6c8-4657-9439-685230100ca0');
  const [simSlot, setSimSlot] = useState('1');
  const [savingConfig, setSavingConfig] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilters, setHistoryFilters] = useState({ status: '', eventCode: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });
  const [reportPreview, setReportPreview] = useState(null);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(true);
  const [sendingReport, setSendingReport] = useState(false);

  const templateLabels = useMemo(
    () => Object.fromEntries(templates.map((template) => [template.code, template.label])),
    [templates],
  );

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await api.get('/customer-sms/status');
      const nextStatus = response.data?.data || null;
      setStatus(nextStatus);
      if (nextStatus?.deviceId) setDeviceId(nextStatus.deviceId);
      if (nextStatus?.simSlot === 0 || nextStatus?.simSlot === 1) setSimSlot(String(nextStatus.simSlot));
    } catch {
      toast.error('Impossible de vérifier la préparation SMS');
    } finally {
      setStatusLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/customer-sms/templates');
      const items = response.data?.data || [];
      setTemplates(items);
      setDrafts(Object.fromEntries(items.map((item) => [item.code, item.message])));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible de charger les messages SMS');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadHistory = async (page = 1, filters = historyFilters) => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/customer-sms/history', {
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
      toast.error(error.response?.data?.message || 'Impossible de charger l’historique SMS');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadReportPreview = async () => {
    setReportPreviewLoading(true);
    try {
      const response = await api.get('/customer-sms/reports/preview');
      setReportPreview(response.data?.data || null);
    } catch (error) {
      setReportPreview(null);
      toast.error(error.response?.data?.message || 'Impossible de compter les reports du jour');
    } finally {
      setReportPreviewLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadTemplates();
    loadHistory(1, { status: '', eventCode: '' });
    loadReportPreview();
  }, []);

  const handleTemplateChange = (code, message) => {
    setDrafts((current) => ({ ...current, [code]: message }));
  };

  const saveConfiguration = async (event) => {
    event.preventDefault();
    if (!/^sk_(live|test)_[A-Za-z0-9_-]{20,}$/.test(apiKey.trim())) {
      toast.error('Saisissez une clé SMSEnvoie valide');
      return;
    }
    setSavingConfig(true);
    try {
      const response = await api.post('/customer-sms/config', {
        apiKey: apiKey.trim(),
        deviceId: deviceId.trim(),
        simSlot: Number(simSlot),
        enabled: true,
      });
      setStatus(response.data?.data || null);
      setApiKey('');
      toast.success(`SMSEnvoie activé avec SIM ${Number(simSlot) + 1}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Configuration SMSEnvoie impossible');
    } finally {
      setSavingConfig(false);
    }
  };

  const insertVariable = (code, variable) => {
    setDrafts((current) => ({
      ...current,
      [code]: `${current[code] || ''}{${variable}}`,
    }));
  };

  const saveTemplates = async () => {
    const messages = Object.values(drafts).map((message) => String(message || '').trim());
    if (messages.some((message) => message.length < 5 || message.length > 640)) {
      toast.error('Chaque SMS doit contenir entre 5 et 640 caractères');
      return;
    }

    setSavingTemplates(true);
    try {
      const response = await api.put('/customer-sms/templates', { templates: drafts });
      const items = response.data?.data || [];
      setTemplates(items);
      setDrafts(Object.fromEntries(items.map((item) => [item.code, item.message])));
      toast.success('Messages SMS enregistrés');
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

  const sendReportJ0Batch = async () => {
    setSendingReport(true);
    try {
      const response = await api.post('/customer-sms/reports/run-j0');
      const sent = response.data?.stats?.sent || 0;
      const failed = response.data?.stats?.failed || 0;
      if (failed > 0) toast.error(`${failed} SMS du lot ont échoué`);
      else toast.success(`${sent} SMS Report du jour J mis en envoi`);
      await Promise.all([loadReportPreview(), loadHistory(1, historyFilters)]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Envoi du Report du jour J impossible');
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-sky-500 to-blue-700 p-7 text-white shadow-xl shadow-blue-500/20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
              <MessageSquareText size={34} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-100">Migration en préparation</p>
              <h1 className="text-3xl font-black">SMS NousUnique</h1>
              <p className="mt-1 text-sm text-blue-50">Messages automatiques, personnalisation et futur suivi des envois</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-amber-950">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
            {statusLoading ? 'Vérification…' : status?.ready ? 'Prêt à envoyer' : 'Fournisseur attendu'}
          </div>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-red-100 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-red-100 p-3 text-red-700"><Ban size={25} /></div>
            <div>
              <h2 className="text-lg font-black text-red-950">WhatsApp arrêté</h2>
              <p className="mt-2 text-sm leading-6 text-red-900/75">
                WaSenderAPI n’est plus utilisé pour les commandes NousUnique. Un verrou serveur empêche tout nouvel envoi WhatsApp.
              </p>
            </div>
          </div>
        </article>
        <article className={`rounded-3xl border p-6 ${status?.ready ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl p-3 ${status?.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {status?.ready ? <CheckCircle2 size={25} /> : <Wrench size={25} />}
            </div>
            <div>
              <h2 className={`text-lg font-black ${status?.ready ? 'text-emerald-950' : 'text-amber-950'}`}>
                {status?.ready ? `${status.providerLabel || 'Fournisseur SMS'} prêt sur ${status.simLabel || 'la SIM configurée'}` : 'En attente de la plateforme SMS'}
              </h2>
              {status?.ready ? (
                <p className="mt-2 text-sm leading-6 text-emerald-900/75">
                  L’appareil NOUSUNIQUE est configuré pour envoyer tous les messages clients avec {status.simLabel}.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-amber-900/75">
                  Aucun SMS client ne partira avant le branchement du fournisseur. Les événements, modèles, contrôles anti-doublon et l’historique sont déjà prêts.
                </p>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-amber-700">Envoi manuel ciblé</p>
            <h2 className="mt-1 text-2xl font-black text-amber-950">Report du jour J</h2>
            <p className="mt-2 text-sm text-amber-900/75">
              Uniquement les commandes validées aujourd’hui encore actives dans Commandes. Chaque lot contient au maximum 5 SMS.
            </p>
            <p className="mt-3 text-lg font-black text-amber-950">
              {reportPreviewLoading ? 'Comptage…' : `${reportPreview?.eligible || 0} client(s) restant(s)`}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:min-w-64">
            <button
              type="button"
              onClick={loadReportPreview}
              disabled={reportPreviewLoading || sendingReport}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white px-5 py-3 font-black text-amber-900 disabled:opacity-50"
            >
              <RefreshCw size={18} className={reportPreviewLoading ? 'animate-spin' : ''} /> Actualiser le nombre
            </button>
            <button
              type="button"
              onClick={sendReportJ0Batch}
              disabled={sendingReport || reportPreviewLoading || !reportPreview?.eligible}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 font-black text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              <Send size={18} /> {sendingReport ? 'Envoi du lot…' : 'Envoyer le prochain lot'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="rounded-2xl bg-blue-100 p-3 text-blue-700"><KeyRound size={25} /></div>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Connexion sécurisée</p>
            <h2 className="mt-1 text-2xl font-black text-gray-900">Configurer SMSEnvoie</h2>
            <p className="mt-2 text-sm text-gray-500">La clé est chiffrée avant stockage et ne sera jamais réaffichée.</p>
          </div>
        </div>
        <form onSubmit={saveConfiguration} className="grid gap-4 lg:grid-cols-2">
          <label className="lg:col-span-2">
            <span className="mb-2 block text-sm font-bold text-gray-700">Clé API privée</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
              placeholder="sk_live_…"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-gray-700">Appareil Android</span>
            <div className="relative">
              <Smartphone className="pointer-events-none absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                className="w-full rounded-2xl border-2 border-gray-200 py-3.5 pl-12 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-gray-700">Carte SIM utilisée</span>
            <select
              value={simSlot}
              onChange={(event) => setSimSlot(event.target.value)}
              className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="0">SIM 1</option>
              <option value="1">SIM 2</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={savingConfig}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-black text-white transition hover:bg-blue-700 disabled:opacity-50 lg:col-span-2"
          >
            <Save size={18} /> {savingConfig ? 'Configuration…' : `Activer SMSEnvoie sur SIM ${Number(simSlot) + 1}`}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Personnalisation</p>
            <h2 className="mt-1 text-2xl font-black text-gray-900">Messages SMS automatiques</h2>
            <p className="mt-2 text-sm text-gray-500">Les anciens textes WhatsApp personnalisés sont repris comme brouillons et peuvent être raccourcis pour les SMS.</p>
          </div>
          <button
            type="button"
            onClick={saveTemplates}
            disabled={savingTemplates || templatesLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
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
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-gray-900">{template.label}</h3>
                      {template.migratedFromWhatsApp && (
                        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">Texte repris</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{template.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTemplateChange(template.code, template.defaultMessage)}
                    title="Rétablir le SMS conseillé"
                    className="shrink-0 rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>
                <textarea
                  value={drafts[template.code] || ''}
                  onChange={(event) => handleTemplateChange(template.code, event.target.value)}
                  rows={6}
                  maxLength={640}
                  className="w-full resize-y rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Variables :</span>
                  {template.variables.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(template.code, variable)}
                      className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 transition hover:bg-blue-200"
                    >
                      {`{${variable}}`}
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-gray-400">{(drafts[template.code] || '').length}/640</span>
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
            <h2 className="mt-1 text-2xl font-black text-gray-900">Historique des SMS clients</h2>
            <p className="mt-2 text-sm text-gray-500">Il commencera à se remplir après la connexion de la nouvelle plateforme.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select value={historyFilters.status} onChange={(event) => updateHistoryFilter('status', event.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700">
              <option value="">Tous les statuts</option>
              <option value="envoye">Envoyés</option>
              <option value="echoue">Échoués</option>
              <option value="en_attente">En attente</option>
            </select>
            <select value={historyFilters.eventCode} onChange={(event) => updateHistoryFilter('eventCode', event.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700">
              <option value="">Tous les messages</option>
              {templates.map((template) => <option key={template.code} value={template.code}>{template.label}</option>)}
            </select>
            <button type="button" onClick={() => loadHistory(pagination.page)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700">
              <RefreshCw size={17} className={historyLoading ? 'animate-spin' : ''} /> Actualiser
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Total', stats.total, 'bg-blue-50 text-blue-950'],
            ['Envoyés', stats.sent, 'bg-emerald-50 text-emerald-950'],
            ['Échoués', stats.failed, 'bg-red-50 text-red-950'],
          ].map(([label, value, colors]) => (
            <div key={label} className={`rounded-2xl p-4 ${colors}`}>
              <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>

        {historyLoading ? (
          <div className="py-14 text-center font-semibold text-gray-500">Chargement de l’historique…</div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-14 text-center">
            <MessageSquareText className="mx-auto text-gray-300" size={38} />
            <p className="mt-3 font-bold text-gray-700">Aucun SMS client envoyé</p>
            <p className="mt-1 text-sm text-gray-500">C’est normal tant que le fournisseur SMS n’est pas connecté.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => {
              const eventCode = String(item.template_code || '').replace(/^sms_customer_/, '');
              return (
                <article key={item.id} className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[item.statut] || 'bg-gray-100 text-gray-700'}`}>{statusLabels[item.statut] || item.statut}</span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{templateLabels[eventCode] || eventCode}</span>
                        {item.numero_commande && <span className="text-xs font-bold text-gray-500">#{item.numero_commande}</span>}
                      </div>
                      <p className="mt-4 font-bold text-gray-900">{item.destinataire_nom || 'Client'}</p>
                      <p className="text-sm text-gray-500">{item.destinataire_telephone || '—'}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-600"><Clock3 size={15} /> {formatDate(item.sent_at || item.created_at)}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4 lg:w-1/2">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.message}</p>
                      {item.erreur && <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"><AlertCircle size={15} /><span>{item.erreur}</span></div>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-gray-500">Page {pagination.page} sur {pagination.pages} · {pagination.total} résultat(s)</p>
          <div className="flex gap-2">
            <button type="button" disabled={pagination.page <= 1 || historyLoading} onClick={() => loadHistory(pagination.page - 1)} className="rounded-xl border border-gray-200 p-2.5 text-gray-600 disabled:opacity-40" aria-label="Page précédente"><ChevronLeft size={18} /></button>
            <button type="button" disabled={pagination.page >= pagination.pages || historyLoading} onClick={() => loadHistory(pagination.page + 1)} className="rounded-xl border border-gray-200 p-2.5 text-gray-600 disabled:opacity-40" aria-label="Page suivante"><ChevronRight size={18} /></button>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <CheckCircle2 className="mt-0.5 shrink-0 text-blue-600" size={18} />
        <p>Dès que vous transmettrez la plateforme SMS, il restera à ajouter son adaptateur et ses identifiants privés. Les commandes n’auront pas besoin d’être reprogrammées.</p>
      </div>
    </div>
  );
};

export default CustomerSmsConfig;
