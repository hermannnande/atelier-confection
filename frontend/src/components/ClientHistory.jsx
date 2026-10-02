import { useState } from 'react';
import { ChevronDown, ChevronUp, History, ShieldAlert } from 'lucide-react';
import { clientProfileSummary, orderOutcomeLabel } from '../utils/clientHistory';

const formatHistoryDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('fr-FR') : '—';
};

// Profil du client sur la carte : nouveau, connu, fiable, à surveiller ou à risque.
export function ClientProfileBadge({ history }) {
  const summary = clientProfileSummary(history);
  if (!summary) return null;
  return (
    <div className={`mt-1.5 inline-flex max-w-full items-start gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold leading-tight ${summary.className}`}>
      {history.carteGrise
        ? <ShieldAlert size={11} className="mt-px flex-shrink-0" />
        : <History size={11} className="mt-px flex-shrink-0" />}
      <span className="min-w-0 break-words">{summary.label} · {summary.detail}</span>
    </div>
  );
}

// Historique du client dans la fenêtre de traitement, pour savoir à qui l'on parle.
// La liste des commandes précédentes est repliée par défaut pour rester lisible sur mobile.
export function ClientHistoryPanel({ history, defaultOpen = false }) {
  const [listeOuverte, setListeOuverte] = useState(defaultOpen);
  const summary = clientProfileSummary(history);
  if (!summary) return null;
  return (
    <div className={`rounded-lg border p-2.5 space-y-2 ${history.carteGrise ? 'border-gray-400 bg-gray-100' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-gray-500">
          <History size={12} /> Historique du client
        </p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${summary.className}`}>{summary.label}</span>
      </div>

      {history.carteGrise && history.dernierRefus && (
        <p className="rounded-md bg-gray-800 px-2 py-1.5 text-[11px] font-semibold text-white">
          ⚠ Colis refusé à la livraison le {formatHistoryDate(history.dernierRefus.date)}
          {history.dernierRefus.motif ? ` : « ${history.dernierRefus.motif} »` : ''}
        </p>
      )}

      {history.total === 0 ? (
        <p className="text-xs text-gray-600">Première commande de ce client.</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1 text-center">
            {[
              ['Commandes', history.total, 'text-gray-900'],
              ['Livrées', history.livrees, 'text-emerald-700'],
              ['Refusées', history.refusees, history.refusees ? 'text-red-700' : 'text-gray-900'],
              ['Annulées', history.annuleesApresValidation + history.annulees, 'text-orange-700'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-md bg-gray-50 px-1 py-1">
                <p className={`text-sm font-black ${color}`}>{value}</p>
                <p className="text-[9px] font-semibold uppercase text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-600">
            Client depuis le {formatHistoryDate(history.clientDepuis)}
            {history.montantLivre > 0 ? ` · ${history.montantLivre.toLocaleString('fr-FR')} F déjà livrés` : ''}
          </p>
          <button
            type="button"
            onClick={() => setListeOuverte((ouverte) => !ouverte)}
            aria-expanded={listeOuverte}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 active:bg-gray-100"
          >
            {listeOuverte ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {listeOuverte
              ? 'Masquer les commandes précédentes'
              : `Voir ${history.total > 1 ? `les ${history.total} commandes précédentes` : 'la commande précédente'}`}
          </button>
          {listeOuverte && (
            <>
              <ul className="max-h-48 space-y-1 overflow-y-auto overscroll-contain">
                {history.commandes.map((commande) => {
                  const outcome = orderOutcomeLabel(commande.issue);
                  return (
                    <li key={commande.id} className="rounded-md border border-gray-100 bg-white px-2 py-1 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 font-semibold text-gray-800">
                          {formatHistoryDate(commande.date)} · {commande.modele}
                          {commande.taille ? ` · ${commande.taille}` : ''}
                          {commande.couleur ? ` · ${commande.couleur}` : ''}
                        </span>
                        <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${outcome.className}`}>
                          {outcome.label}
                        </span>
                      </div>
                      {commande.motif && <p className="mt-0.5 text-gray-600">Motif : {commande.motif}</p>}
                    </li>
                  );
                })}
              </ul>
              {history.total > history.commandes.length && (
                <p className="text-[10px] text-gray-500">
                  {history.commandes.length} commandes les plus récentes affichées sur {history.total}.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
