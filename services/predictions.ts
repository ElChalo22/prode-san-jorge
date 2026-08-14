import { supabase } from "@/lib/supabase";

import type { PredictionValue } from "@/database/types";

interface SavePredictionsInput {
  prodeGameId: string;
  userId: string;
  predictions: {
    matchId: string;
    prediction: PredictionValue;
    secondaryPrediction?: PredictionValue | null;
  }[];
}

export async function savePredictions({
  prodeGameId,
  userId,
  predictions,
}: SavePredictionsInput) {
  const {
    data: participation,
    error: participationError,
  } = await supabase
    .from("participations")
    .upsert(
      {
        prode_game_id: prodeGameId,
        user_id: userId,
        status: "pending_payment",
        submitted_at: new Date().toISOString(),
      },
      {
        onConflict: "prode_game_id,user_id",
      },
    )
    .select()
    .single();

  if (participationError) {
    console.log(
      "Error creando o actualizando participación:",
      participationError,
    );

    throw participationError;
  }

  if (!participation) {
    throw new Error(
      "No se pudo crear o recuperar la participación.",
    );
  }

  if (predictions.length === 0) {
    return participation;
  }

  const predictionRows = predictions.map(
    ({
      matchId,
      prediction,
      secondaryPrediction,
    }) => ({
      participation_id: participation.id,
      match_id: matchId,
      prediction,
      secondary_prediction:
        secondaryPrediction ?? null,
    }),
  );

  const { error: predictionsError } =
    await supabase
      .from("predictions")
      .upsert(predictionRows, {
        onConflict: "participation_id,match_id",
      });

  if (predictionsError) {
    console.log(
      "Error creando o actualizando pronósticos:",
      predictionsError,
    );

    throw predictionsError;
  }

  return participation;
}