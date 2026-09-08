import { Tag } from 'lucide-react';
import { normalizeOrderSupplements } from '../utils/orderSupplements';

const OrderSupplementTags = ({ commande, compact = false, className = '' }) => {
  const supplements = normalizeOrderSupplements(commande?.supplements);
  if (supplements.length === 0) return null;

  return (
    <div className={`rounded-lg bg-violet-50 border border-violet-200 p-2 ${className}`}>
      <p className="text-[10px] font-black text-violet-800 mb-1 flex items-center gap-1 uppercase">
        <Tag size={11} />
        Ajouts ({supplements.length})
      </p>
      <div className="flex flex-wrap gap-1">
        {supplements.map((item) => (
          <span
            key={item.id}
            className={`inline-flex items-center rounded-full bg-violet-600 text-white font-bold ${
              compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'
            }`}
          >
            {item.libelle}{item.taille ? ` · Taille ${item.taille}` : ''} +{item.montant.toLocaleString('fr-FR')} F
          </span>
        ))}
      </div>
    </div>
  );
};

export default OrderSupplementTags;
