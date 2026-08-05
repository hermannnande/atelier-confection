import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, KeyRound, MessageCircle, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const WhatsAppConfig = () => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    loadStatus();
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

  const connected = status?.enabled && status?.configured;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-7 text-white shadow-xl shadow-emerald-500/20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
              <MessageCircle size={34} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-100">WaSenderAPI</p>
              <h1 className="text-3xl font-black">WhatsApp NousUnique</h1>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-black ${connected ? 'bg-white text-emerald-700' : 'bg-amber-300 text-amber-950'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-700'}`} />
            {loading ? 'Vérification…' : connected ? 'Connecté' : 'À configurer'}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="lg:col-span-3 rounded-3xl border border-gray-200 bg-white p-7 shadow-lg">
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
            placeholder="Collez la clé de la session NousUnique"
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

        <div className="lg:col-span-2 rounded-3xl border border-emerald-100 bg-emerald-50 p-7">
          <div className="mb-5 flex items-center gap-3 text-emerald-800">
            <ShieldCheck size={28} />
            <h2 className="text-lg font-black">Protection de la clé</h2>
          </div>
          <p className="text-sm leading-6 text-emerald-900/80">
            La clé est chiffrée avant son enregistrement. Elle n’est jamais affichée ni renvoyée par l’application.
          </p>
          <div className="mt-6 space-y-3">
            {[
              'Commande reçue',
              'Commande validée',
              'Livreur assigné avec son contact',
              'Excuses à J, J+1 et J+2 à 17h30',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm font-semibold text-emerald-900">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConfig;
