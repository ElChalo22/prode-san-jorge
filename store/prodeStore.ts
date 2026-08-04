import { create } from "zustand";

import type { ProdeGameWithDetails } from "../services/prodeGames";
import { getOpenProdeGames } from "../services/prodeGames";

interface ProdeStore {
  games: ProdeGameWithDetails[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasLoaded: boolean;

  loadGames: () => Promise<void>;
  refreshGames: () => Promise<void>;
  clearGames: () => void;
}

export const useProdeStore = create<ProdeStore>((set, get) => ({
  games: [],
  loading: false,
  refreshing: false,
  error: null,
  hasLoaded: false,

  loadGames: async () => {
    const { loading, hasLoaded } = get();

    if (loading || hasLoaded) {
      return;
    }

    try {
      set({
        loading: true,
        error: null,
      });

      const games = await getOpenProdeGames();

      set({
        games,
        hasLoaded: true,
      });
    } catch (error) {
      console.error("Error cargando los prodes:", error);

      set({
        error: "No se pudieron cargar los prodes.",
      });
    } finally {
      set({
        loading: false,
      });
    }
  },

  refreshGames: async () => {
    try {
      set({
        refreshing: true,
        error: null,
      });

      const games = await getOpenProdeGames();

      set({
        games,
        hasLoaded: true,
      });
    } catch (error) {
      console.error("Error actualizando los prodes:", error);

      set({
        error: "No se pudieron actualizar los prodes.",
      });
    } finally {
      set({
        refreshing: false,
      });
    }
  },

  clearGames: () => {
    set({
      games: [],
      error: null,
      hasLoaded: false,
    });
  },
}));