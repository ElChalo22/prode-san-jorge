// SRV-001

export type CompetitionGroup = {
  id: string;
  title: string;
  description: string;
  competitions: string[];
  color: string;
};

export const competitionGroups: CompetitionGroup[] = [
  {
    id: "argentina",
    title: "🇦🇷 Argentina",
    description: "Liga Profesional Argentina",
    competitions: ["Liga Profesional Argentina"],
    color: "#18A558",
  },
  {
    id: "international",
    title: "🌎 Internacional",
    description: "Champions • Libertadores • Sudamericana",
    competitions: [
      "UEFA Champions League",
      "Copa Libertadores",
      "Copa Sudamericana",
    ],
    color: "#2F80ED",
  },
];