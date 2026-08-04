import type { ProdeGameWithDetails } from "../services/prodeGames";
import type { HomeProdeCard } from "../types/home";

function formatCountdown(closesAt: string): string {
  const difference = new Date(closesAt).getTime() - Date.now();

  if (difference <= 0) {
    return "Cerrado";
  }

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function toHomeProdeCard(
  game: ProdeGameWithDetails,
): HomeProdeCard {
  return {
    id: game.id,
    emoji: game.prode_group.emoji ?? "⚽",
    title: game.name,
    description:
      game.prode_group.description ??
      "Ingresá y completá tus pronósticos.",
    jackpot: `${game.currency} 0`,
    players: 0,
    countdown: formatCountdown(game.closes_at),
    closesAt: game.closes_at,
    status: game.status === "open" ? "open" : "closed",
  };
}