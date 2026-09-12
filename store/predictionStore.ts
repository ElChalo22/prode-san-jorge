import { create } from "zustand";

import type {
  Match,
  Participation,
  PredictionValue,
} from "../database/types";

import type { ProdeGameWithDetails } from "../services/prodeGames";

import { supabase } from "../lib/supabase";
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

  updateMatch: (match: Match) => void;

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

    updateMatch: (updatedMatch) => {
      set((state) => {
        if (!state.game) {
          return state;
        }

        let matchFound = false;

        const matchdays = state.game.matchdays.map(
          (matchday) => ({
            ...matchday,

            matches: matchday.matches.map((match) => {
              if (match.id !== updatedMatch.id) {
                return match;
              }

              matchFound = true;

              return {
                ...match,
                ...updatedMatch,

                // Conservamos las relaciones que no vienen
                // en el evento Realtime de la tabla matches.
                home_team: match.home_team,
                away_team: match.away_team,
              };
            }),
          }),
        );

        if (!matchFound) {
          return state;
        }

        console.log(
          "⚽ Partido actualizado en vivo:",
          updatedMatch.id,
          updatedMatch.home_score,
          "-",
          updatedMatch.away_score,
          updatedMatch.status,
        );

        return {
          ...state,
          game: {
            ...state.game,
            matchdays,
          },
        };
      });
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

export function subscribeToLiveMatches() {
  const channel = supabase
    .channel("prode-live-matches")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "matches",
      },
      (payload) => {
        console.log(
          "📡 Realtime recibió actualización:",
          payload.new,
        );

        usePredictionStore
          .getState()
          .updateMatch(payload.new as Match);
      },
    )
    .subscribe((status) => {
      console.log(
        "📡 Estado Realtime matches:",
        status,
      );
    });

  return () => {
    console.log(
      "📡 Cerrando Realtime matches",
    );

    supabase.removeChannel(channel);
  };
}