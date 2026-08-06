import type {
  Match,
  Matchday,
  ProdeGame,
  ProdeGroup,
  Team,
} from "@/database/types";
import { supabase } from "@/lib/supabase";

export interface MatchWithTeams extends Match {
  home_team: Team;
  away_team: Team;
}

export interface MatchdayWithMatches extends Matchday {
  matches: MatchWithTeams[];
}

export interface ProdeGameWithDetails extends ProdeGame {
  prode_group: ProdeGroup;
  matchdays: MatchdayWithMatches[];
}

const PRODE_GAME_DETAILS_SELECT = `
  *,
  prode_group:prode_groups!prode_games_prode_group_id_fkey(*),
  prode_game_matchdays(
    matchday:matchdays!prode_game_matchdays_matchday_id_fkey(
      *,
      matches(
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      )
    )
  )
`;

function normalizeProdeGame(game: any): ProdeGameWithDetails {
  return {
    ...game,
    matchdays: (game.prode_game_matchdays ?? [])
      .map((item: any) => item.matchday)
      .filter(Boolean)
      .map((matchday: any) => ({
        ...matchday,
        matches: [...(matchday.matches ?? [])].sort(
          (firstMatch: Match, secondMatch: Match) =>
            new Date(firstMatch.kickoff_at).getTime() -
            new Date(secondMatch.kickoff_at).getTime(),
        ),
      })),
  };
}

export async function getOpenProdeGames(): Promise<
  ProdeGameWithDetails[]
> {
  const { data, error } = await supabase
    .from("prode_games")
    .select(PRODE_GAME_DETAILS_SELECT)
    .eq("status", "open")
    .order("closes_at", { ascending: true });

  if (error) {
    console.log("========== ERROR SUPABASE ==========");
    console.log(JSON.stringify(error, null, 2));
    console.log("====================================");

    throw error;
  }

  return (data ?? []).map(normalizeProdeGame);
}

export async function getProdeGameById(
  gameId: string,
): Promise<ProdeGameWithDetails> {
  const { data, error } = await supabase
    .from("prode_games")
    .select(PRODE_GAME_DETAILS_SELECT)
    .eq("id", gameId)
    .single();

  if (error) {
    console.log("======= ERROR PRODE POR ID =======");
    console.log(JSON.stringify(error, null, 2));
    console.log("==================================");

    throw error;
  }

  return normalizeProdeGame(data);
}