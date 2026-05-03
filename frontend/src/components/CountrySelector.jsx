import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Globe2, Check } from 'lucide-react';
import { useCountryStore } from '../store/countryStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Selecteur de pays (drapeau cliquable dans le header).
 *
 * Comportement :
 *   - Si l'user n'a acces qu'a UN pays : affiche juste le drapeau (pas cliquable, lecture seule).
 *   - Si l'user a acces a PLUSIEURS pays : menu deroulant pour switcher.
 *   - Apres switch : recharge la page pour que toutes les pages refetch leurs donnees du nouveau pays.
 *
 * Usage : <CountrySelector />
 */
const CountrySelector = () => {
  const { isAuthenticated } = useAuthStore();
  const {
    currentCountry,
    availableCountries,
    canSwitch,
    loading,
    fetchAvailableCountries,
    switchCountry,
    getCurrentCountryInfo,
  } = useCountryStore();

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (isAuthenticated && availableCountries.length === 0) {
      fetchAvailableCountries();
    }
  }, [isAuthenticated, availableCountries.length, fetchAvailableCountries]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const currentInfo = getCurrentCountryInfo();

  const handleSwitch = (code) => {
    if (code === currentCountry) {
      setOpen(false);
      return;
    }
    const ok = switchCountry(code);
    if (!ok) {
      toast.error('Pays non disponible');
      return;
    }
    const target = availableCountries.find((p) => p.code === code);
    toast.success(`Pays bascule sur ${target?.drapeau || ''} ${target?.nom || code}`);
    setOpen(false);
    // Recharger la page : toutes les pages vont refetch leurs donnees avec le nouveau X-Country
    setTimeout(() => window.location.reload(), 400);
  };

  if (loading && !currentInfo) {
    return (
      <div className="flex items-center px-3 py-2 bg-gray-100 rounded-xl">
        <Globe2 size={18} className="text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!currentInfo) return null;

  // Mode lecture seule (1 seul pays accessible) : juste afficher le drapeau, sans menu
  if (!canSwitch || availableCountries.length <= 1) {
    return (
      <div
        className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/60"
        title={`Pays : ${currentInfo.nom}`}
      >
        <span className="text-xl leading-none">{currentInfo.drapeau}</span>
        <span className="hidden md:inline text-sm font-bold text-gray-700">{currentInfo.code}</span>
      </div>
    );
  }

  // Mode switcher (admin/gestionnaire multi-pays) : menu deroulant
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/60 hover:from-blue-100 hover:to-indigo-100 hover:scale-105 transition-all"
        title="Changer de pays"
      >
        <span className="text-xl leading-none">{currentInfo.drapeau}</span>
        <span className="hidden md:inline text-sm font-bold text-gray-700">{currentInfo.code}</span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Selectionner un pays</p>
          </div>
          <ul className="py-2 max-h-80 overflow-y-auto">
            {availableCountries.map((p) => {
              const active = p.code === currentCountry;
              return (
                <li key={p.code}>
                  <button
                    onClick={() => handleSwitch(p.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${
                      active
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl leading-none">{p.drapeau}</span>
                      <div>
                        <p className="font-bold text-sm">{p.nom}</p>
                        <p className="text-xs text-gray-500">
                          {p.code} - {p.symbole_devise}
                        </p>
                      </div>
                    </div>
                    {active && <Check size={18} className="text-blue-600" strokeWidth={3} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CountrySelector;
