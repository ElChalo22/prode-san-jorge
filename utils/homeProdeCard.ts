import type { ProdeGameWithDetails } from "../services/prodeGames";
import type {
  HomeProdeCard,
  HomeProdeTeamLogo,
} from "../types/home";

function formatCountdown(closesAt: string): string {
  const difference =
    new Date(closesAt).getTime() - Date.now();

  if (difference <= 0) {
    return "Cerrado";
  }

  const totalSeconds = Math.floor(
    difference / 1000,
  );

  const days = Math.floor(
    totalSeconds / 86400,
  );

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600,
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function getTeams(
  game: ProdeGameWithDetails,
): HomeProdeTeamLogo[] {
  const teamsMap = new Map<
    string,
    HomeProdeTeamLogo
  >();

  for (const matchday of game.matchdays) {
    for (const match of matchday.matches ?? []) {
      if (match.home_team) {
        teamsMap.set(match.home_team.id, {
          id: match.home_team.id,
          name: match.home_team.name,
          logoUrl:
            match.home_team.logo_url ?? null,
        });
      }

      if (match.away_team) {
        teamsMap.set(match.away_team.id, {
          id: match.away_team.id,
          name: match.away_team.name,
          logoUrl:
            match.away_team.logo_url ?? null,
        });
      }
    }
  }

  return Array.from(teamsMap.values());
}

export function toHomeProdeCard(
  game: ProdeGameWithDetails,
): HomeProdeCard {
  return {
    id: game.id,

    emoji:
      game.prode_group.emoji ?? "⚽",

    title: game.name,

    description:
      game.description ?? game.prode_group.description ??
      "Ingresá y completá tus pronósticos.",

    entryFee: `${game.currency} ${game.entry_fee}`,

    jackpot: `${game.currency} 0`,

    players: 0,

    countdown: formatCountdown(
      game.closes_at,
    ),

    closesAt: game.closes_at,

    status:
      game.status === "open"
        ? "open"
        : "closed",

    teams: getTeams(game),
  };
}
