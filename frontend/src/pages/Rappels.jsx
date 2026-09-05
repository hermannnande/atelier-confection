import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Eye,
  MapPin,
  Package,
  Pencil,
  Phone,
  Save,
  Search,
  X,
} from 'lucide-react';
import api from '../services/api';

const orderId = (commande) => commande?._id || commande?.id;
const clientName = (commande) => commande?.client?.nom || commande?.nomClient || 'Client non renseigné';
const clientPhone = (commande) => commande?.client?.contact || commande?.contactClient || '';
const clientCity = (commande) => commande?.client?.ville || commande?.ville || 'Ville non renseignée';
const modelName = (commande) => commande?.modele?.nom || commande?.modele || 'Modèle non renseigné';

const phoneNumberForCall = (value) => {
  const phone = String(value || '').trim();
  return `${phone.startsWith('+') ? '+' : ''}${phone.replace(/\D/g, '')}`;
};

const orderDate = (commande) => (
  commande?.dateCommande
  || commande?.createdAt
  || commande?.created_at
);

const formatDate = (value) => {
  if (!value) return 'Date non renseignée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date non renseignée';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Rappels = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNoteId, setSavingNoteId] = useState(null);

  const fetchRappels = async (silent = false) => {
    try {
      const response = await api.get('/commandes', { params: { statut: 'a_rappeler' } });
      setCommandes(response.data.commandes || []);
    } catch (error) {
      if (!silent) toast.error('Erreur lors du chargement des rappels');
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRappels();
    const intervalId = window.setInterval(() => fetchRappels(true), 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  const filteredCommandes = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('fr');
    const digits = searchTerm.replace(/\D/g, '');

    return commandes.filter((commande) => {
      if (!term) return true;
      const fields = [
        commande.numeroCommande,
        clientName(commande),
        clientPhone(commande),
        clientCity(commande),
        modelName(commande),
        commande.taille,
        commande.couleur,
      ].map((value) => String(value || '').toLocaleLowerCase('fr'));
      const phoneDigits = String(clientPhone(commande) || '').replace(/\D/g, '');
      return fields.some((value) => value.includes(term)) || (digits && phoneDigits.includes(digits));
    });
  }, [commandes, searchTerm]);

  const confirmerRappel = async (commande) => {
    const id = orderId(commande);
    if (!window.confirm(`Le client confirme-t-il de nouveau la commande ${commande.numeroCommande} ?`)) {
      return;
    }

    setConfirmingId(id);
    try {
      await api.post(`/commandes/${id}/confirmer-rappel`);
      setCommandes((current) => current.filter((item) => orderId(item) !== id));
      toast.success('Client confirmé : la commande est revenue dans Commandes');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la confirmation');
      console.error(error);
    } finally {
      setConfirmingId(null);
    }
  };

  const startEditingNote = (commande) => {
    setEditingNoteId(orderId(commande));
    setNoteDraft(commande.noteAppelant || '');
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setNoteDraft('');
  };

  const saveNote = async (commande) => {
    const id = orderId(commande);
    setSavingNoteId(id);
    try {
      const response = await api.patch(`/commandes/${id}/note`, { note: noteDraft });
      setCommandes((current) => current.map((item) => (
        orderId(item) === id ? response.data.commande : item
      )));
      cancelEditingNote();
      toast.success(noteDraft.trim() ? 'Note enregistrée' : 'Note supprimée');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification de la note');
      console.error(error);
    } finally {
      setSavingNoteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-lg shadow-orange-200 flex-shrink-0">
            <BellRing size={26} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Rappels clients</h1>
            <p className="text-sm text-gray-600">Commandes qui nécessitent une nouvelle confirmation</p>
          </div>
        </div>
        <div className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-black text-orange-800">
          <Phone size={16} />
          {commandes.length} à rappeler
        </div>
      </div>

      {commandes.length > 0 && (
        <div className="card !p-3 sm:!p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher par commande, client, téléphone ou modèle..."
              className="input pl-10 pr-10 text-sm sm:text-base"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {commandes.length === 0 ? (
        <div className="card text-center py-14">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={52} />
          <h2 className="text-xl font-bold text-gray-900">Aucun client à rappeler</h2>
          <p className="text-gray-600 mt-1">Toutes les demandes de confirmation ont été traitées.</p>
        </div>
      ) : filteredCommandes.length === 0 ? (
        <div className="card text-center py-12">
          <Search className="mx-auto text-gray-400 mb-3" size={44} />
          <h2 className="text-lg font-bold text-gray-900">Aucun résultat</h2>
          <p className="text-sm text-gray-600 mt-1">Essayez une autre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
          {filteredCommandes.map((commande) => {
            const id = orderId(commande);
            const phone = clientPhone(commande);
            return (
              <article key={id} className="card !p-4 sm:!p-5 border-l-4 !border-l-orange-500 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-black text-gray-900">{commande.numeroCommande}</h2>
                      {commande.urgence && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[11px] font-black text-red-700">
                          <AlertCircle size={12} /> Urgent
                        </span>
                      )}
                    </div>
                    <p className="inline-flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <CalendarClock size={13} /> Commande du {formatDate(orderDate(commande))}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">À rappeler</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 p-3 min-w-0">
                    <p className="text-xs font-semibold uppercase text-gray-500">Client</p>
                    <p className="font-bold text-gray-900 truncate mt-1">{clientName(commande)}</p>
                    <p className="inline-flex items-center gap-1 text-gray-600 mt-1 min-w-0">
                      <MapPin size={13} className="flex-shrink-0" />
                      <span className="truncate">{clientCity(commande)}</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 min-w-0">
                    <p className="text-xs font-semibold uppercase text-orange-700">Contact à rappeler</p>
                    {phone ? (
                      <a
                        href={`tel:${phoneNumberForCall(phone)}`}
                        className="inline-flex items-center gap-2 mt-1 font-black text-blue-700 hover:text-blue-900 hover:underline max-w-full"
                        title={`Appeler ${clientName(commande)}`}
                      >
                        <Phone size={17} className="flex-shrink-0" />
                        <span className="truncate">{phone}</span>
                      </a>
                    ) : (
                      <p className="mt-1 font-semibold text-gray-500">Aucun contact</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-violet-50 p-3 sm:col-span-2">
                    <div className="flex items-center gap-2 text-violet-700">
                      <Package size={15} />
                      <p className="text-xs font-semibold uppercase">Commande</p>
                    </div>
                    <p className="font-bold text-gray-900 mt-1">{modelName(commande)}</p>
                    <p className="text-gray-700 mt-0.5">{commande.taille} · {commande.couleur} · <span className="font-black">{Number(commande.prix || 0).toLocaleString('fr-FR')} F</span></p>
                  </div>
                </div>

                {editingNoteId === id ? (
                  <div className="mt-3 rounded-xl bg-yellow-50 border border-yellow-200 p-3">
                    <label htmlFor={`rappel-note-${id}`} className="block text-xs font-bold text-gray-700 mb-1.5">
                      Note de la commande
                    </label>
                    <textarea
                      id={`rappel-note-${id}`}
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      autoFocus
                      className="input resize-y text-sm"
                      placeholder="Ajouter une précision après l’appel..."
                    />
                    <div className="mt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="text-[11px] text-gray-500">{noteDraft.length}/1000 caractères</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEditingNote}
                          disabled={savingNoteId === id}
                          className="btn btn-secondary btn-sm flex-1 sm:flex-none inline-flex items-center justify-center gap-1"
                        >
                          <X size={14} /> Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => saveNote(commande)}
                          disabled={savingNoteId === id}
                          className="btn btn-primary btn-sm flex-1 sm:flex-none inline-flex items-center justify-center gap-1 disabled:opacity-60"
                        >
                          <Save size={14} /> {savingNoteId === id ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl bg-yellow-50 border border-yellow-100 p-3 flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-700 break-words min-w-0">
                      <span className="font-bold">Note : </span>
                      {commande.noteAppelant || <span className="italic text-gray-500">Aucune note</span>}
                    </p>
                    <button
                      type="button"
                      onClick={() => startEditingNote(commande)}
                      className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-yellow-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-yellow-100 active:scale-95 transition-all"
                      aria-label={`Modifier la note de ${commande.numeroCommande}`}
                    >
                      <Pencil size={13} /> Modifier
                    </button>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => confirmerRappel(commande)}
                    disabled={confirmingId === id || savingNoteId === id}
                    className="btn btn-success btn-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-60 sm:col-span-1"
                  >
                    <CheckCircle2 size={15} />
                    {confirmingId === id ? 'Confirmation...' : 'Client confirme'}
                  </button>
                  <Link
                    to={`/commandes/${id}`}
                    className="btn btn-secondary btn-sm inline-flex items-center justify-center gap-1.5 sm:col-span-1"
                  >
                    <Eye size={15} /> Voir
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Rappels;
