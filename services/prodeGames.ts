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

export async function getOpenProdeGames(): Promise<
  ProdeGameWithDetails[]
> {
  const { data, error } = await supabase
    .from("prode_games")
    .select(`
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
    `)
    .eq("status", "open")
    .order("closes_at", { ascending: true });

  if (error) {
    console.log("========== ERROR SUPABASE ==========");
    console.log(JSON.stringify(error, null, 2));
    console.log("====================================");

    throw error;
  }

  return (data ?? []).map((game: any) => ({
    ...game,
    matchdays: (game.prode_game_matchdays ?? [])
      .map((item: any) => item.matchday)
      .filter(Boolean),
  }));
}