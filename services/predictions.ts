import { supabase } from "@/lib/supabase";

import type { PredictionValue } from "@/database/types";

interface SavePredictionsInput {
  prodeGameId: string;
  userId: string;
  predictions: {
    matchId: string;
    prediction: PredictionValue;
  }[];
}

export async function savePredictions({
  prodeGameId,
  userId,
  predictions,
}: SavePredictionsInput) {
  const { data: participation, error: participationError } =
    await supabase
      .from("participations")
      .insert({
        prode_game_id: prodeGameId,
        user_id: userId,
        status: "pending_payment",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

  if (participationError) {
    throw participationError;
  }

  const predictionRows = predictions.map((prediction) => ({
    participation_id: participation.id,
    match_id: prediction.matchId,
    prediction: prediction.prediction,
  }));

  const { error: predictionsError } = await supabase
    .from("predictions")
    .insert(predictionRows);

  if (predictionsError) {
    throw predictionsError;
  }

  return participation;
}