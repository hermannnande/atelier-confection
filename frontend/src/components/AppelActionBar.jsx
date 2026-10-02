import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';

const ACTIONS = [
  { action: 'confirmer', label: 'CONFIRMER', Icon: CheckCircle, className: 'bg-green-600 hover:bg-green-700' },
  { action: 'urgent', label: 'URGENT', Icon: AlertTriangle, className: 'bg-red-600 hover:bg-red-700' },
  { action: 'attente', label: 'EN ATTENTE', Icon: Clock, className: 'bg-orange-600 hover:bg-orange-700' },
  { action: 'annuler', label: 'ANNULER', Icon: XCircle, className: 'bg-gray-500 hover:bg-gray-600' },
];

// Boutons de traitement fixés en bas de la fenêtre : toujours visibles, même sur mobile.
export default function AppelActionBar({ disabled, onAction }) {
  return (
    <div className="grid flex-shrink-0 grid-cols-4 gap-1.5 border-t border-gray-200 bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {ACTIONS.map(({ action, label, Icon, className }) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action)}
          disabled={disabled}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-bold text-white transition-all active:scale-95 disabled:opacity-50 ${className}`}
        >
          <Icon size={18} />
          <span className="leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}
