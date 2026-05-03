import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

/**
 * Store multi-pays (Zustand + persist)
 *
 * Etat :
 *   - currentCountry : code du pays actif (ex. 'CI'). Utilise pour filtrer les requetes API.
 *   - availableCountries : liste des pays auxquels l'utilisateur a acces (depuis /api/pays).
 *   - canSwitch : true si l'user peut switcher entre plusieurs pays (admin/gestionnaire multi-pays).
 *   - loading : etat de chargement de la liste des pays.
 *
 * Actions :
 *   - fetchAvailableCountries() : recupere la liste depuis le backend (a appeler apres login).
 *   - switchCountry(code) : change le pays actif (avec validation cote client).
 *   - reset() : reset au logout.
 */
export const useCountryStore = create(
  persist(
    (set, get) => ({
      currentCountry: 'CI',
      availableCountries: [],
      canSwitch: false,
      loading: false,
      error: null,

      /**
       * A appeler apres login (et au refresh si token valide).
       * Recupere la liste des pays accessibles + initialise currentCountry.
       */
      fetchAvailableCountries: async () => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.get('/pays');
          const list = data?.pays || [];
          const userCountry = data?.pays_actuel || 'CI';
          const peutSwitcher = !!data?.peut_switcher;

          // Si le pays actuellement selectionne n'est plus accessible, on retombe sur le pays principal
          const currentValid = list.some((p) => p.code === get().currentCountry);
          const newCurrent = currentValid ? get().currentCountry : userCountry;

          set({
            availableCountries: list,
            currentCountry: newCurrent,
            canSwitch: peutSwitcher,
            loading: false,
          });
          return list;
        } catch (err) {
          // Backend indisponible ou /api/pays pas encore deploye : fallback CI
          set({
            availableCountries: [
              { code: 'CI', nom: "Cote d'Ivoire", devise: 'XOF', symbole_devise: 'FCFA', drapeau: '🇨🇮' },
            ],
            canSwitch: false,
            loading: false,
            error: err?.response?.data?.message || err?.message || 'Erreur',
          });
          return [];
        }
      },

      /**
       * Change le pays actif. Tous les composants qui utilisent useCountryStore
       * seront automatiquement re-renderes et leurs requetes API enverront le
       * nouveau header X-Country (via l'intercepteur axios).
       */
      switchCountry: (code) => {
        const list = get().availableCountries;
        const found = list.find((p) => p.code === code);
        if (!found) {
          console.warn(`[countryStore] Pays "${code}" non disponible pour cet utilisateur.`);
          return false;
        }
        if (get().currentCountry === code) return true;
        set({ currentCountry: code });
        return true;
      },

      /**
       * Helper pour les composants : retourne l'objet pays actif complet.
       */
      getCurrentCountryInfo: () => {
        const code = get().currentCountry;
        return get().availableCountries.find((p) => p.code === code) || null;
      },

      /**
       * Helper pour formatter un prix dans la devise du pays actif.
       */
      formatPrice: (amount) => {
        const info = get().getCurrentCountryInfo();
        const symbol = info?.symbole_devise || 'FCFA';
        const value = Number(amount) || 0;
        return `${value.toLocaleString('fr-FR')} ${symbol}`;
      },

      reset: () => {
        set({
          currentCountry: 'CI',
          availableCountries: [],
          canSwitch: false,
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: 'country-storage',
      // On ne persiste que le code du pays actif. La liste est rechargee depuis l'API.
      partialize: (state) => ({ currentCountry: state.currentCountry }),
    }
  )
);
