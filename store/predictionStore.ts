import { create } from "zustand";

import type {
  Participation,
  PredictionValue,
} from "../database/types";
import type { ProdeGameWithDetails } from "../services/prodeGames";

import { savePredictions } from "../services/predictions";
import { getProdeGameById } from "../services/prodeGames";

interface SaveGamePredictionsInput {
  prodeGameId: string;
  userId: string;
  predictions: {
    matchId: string;
    prediction: PredictionValue;
    secondaryPrediction?: PredictionValue | null;
  }[];
}

interface PredictionStore {
  game: ProdeGameWithDetails | null;
  participation: Participation | null;

  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;

  loadGame: (gameId: string) => Promise<void>;

  submitPredictions: (
    input: SaveGamePredictionsInput,
  ) => Promise<Participation | null>;

  clearGame: () => void;
  clearSaveError: () => void;
}

export const usePredictionStore = create<PredictionStore>(
  (set) => ({
    game: null,
    participation: null,

    loading: false,
    saving: false,
    error: null,
    saveError: null,

    loadGame: async (gameId) => {
      try {
        set({
          loading: true,
          error: null,
          participation: null,
        });

        const game = await getProdeGameById(gameId);

        set({
          game,
        });
      } catch (error) {
        console.error(
          "Error cargando el prode:",
          error,
        );

        set({
          error: "No se pudo cargar el prode.",
        });
      } finally {
        set({
          loading: false,
        });
      }
    },

    submitPredictions: async ({
      prodeGameId,
      userId,
      predictions,
    }) => {
      try {
        set({
          saving: true,
          saveError: null,
        });

        const participation = await savePredictions({
          prodeGameId,
          userId,
          predictions,
        });

        set({
          participation,
        });

        return participation;
      } catch (error) {
        console.error(
          "Error guardando los pronósticos:",
          error,
        );

        set({
          saveError:
            "No se pudieron guardar los pronósticos.",
        });

        return null;
      } finally {
        set({
          saving: false,
        });
      }
    },

    clearGame: () => {
      set({
        game: null,
        participation: null,
        error: null,
        saveError: null,
      });
    },

    clearSaveError: () => {
      set({
        saveError: null,
      });
    },
  }),
);