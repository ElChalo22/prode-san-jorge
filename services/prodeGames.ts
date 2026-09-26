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
  confirmedPlayers?: number;
  jackpotAmount?: number;
}

const PRODE_GAME_DETAILS_SELECT = `
  *,
  prode_group:prode_groups!prode_games_prode_group_id_fkey(*),
  express_game_matches(match_id),
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
  const selected = new Set<string>((game.express_game_matches ?? []).map((item: any) => item.match_id));
  return {
    ...game,
    matchdays: (game.prode_game_matchdays ?? [])
      .map((item: any) => item.matchday)
      .filter(Boolean)
      .map((matchday: any) => ({
        ...matchday,
        matches: [...(matchday.matches ?? [])]
          .filter((match: Match) => game.game_type !== "express" || selected.has(match.id))
          .sort(
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

  const games = (data ?? []).map(normalizeProdeGame);
  const summaries = await Promise.all(games.map((game) =>
    supabase.rpc("game_public_summary", { target_game_id: game.id })
  ));
  summaries.forEach((summary, index) => {
    if (summary.error) throw summary.error;
    games[index].confirmedPlayers = Number(summary.data?.[0]?.players ?? 0);
    games[index].jackpotAmount = Number(summary.data?.[0]?.jackpot ?? 0);
  });
  return games;
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
