export interface HomeProdeCard {
  id: string;
  emoji: string;
  title: string;
  description: string;
  jackpot: string;
  players: number;
  countdown: string;
  closesAt: string;
  status: "open" | "closed";
}