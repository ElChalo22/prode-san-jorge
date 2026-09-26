export type UserRole = "player" | "admin" | "superadmin";

export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type GameStatus =
  | "draft"
  | "open"
  | "closed"
  | "finished"
  | "cancelled";

export type ParticipationStatus =
  | "draft"
  | "pending_payment"
  | "payment_under_review"
  | "confirmed"
  | "rejected"
  | "expired";

export type PredictionValue = "1" | "X" | "2";

export type PaymentStatus =
  | "pending"
  | "uploaded"
  | "approved"
  | "rejected"
  | "expired";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ProdeGroup {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emoji: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Competition {
  id: string;
  provider: string;
  provider_id: string;
  name: string;
  short_name: string | null;
  country: string | null;
  logo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProdeGroupCompetition {
  id: string;
  prode_group_id: string;
  competition_id: string;
  active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  provider: string;
  provider_id: string;
  name: string;
  short_name: string | null;
  country: string | null;
  logo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Matchday {
  id: string;
  competition_id: string;
  provider: string;
  provider_id: string;
  name: string;
  round_number: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  matchday_id: string;
  home_team_id: string;
  away_team_id: string;
  provider: string;
  provider_id: string;
  kickoff_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  result: PredictionValue | null;
  created_at: string;
  updated_at: string;
}

export interface ProdeGame {
  id: string;
  prode_group_id: string;
  name: string;
  description: string | null;
  game_type: "automatic" | "express";
  entry_fee: number;
  currency: string;
  status: GameStatus;
  opens_at: string | null;
  closes_at: string;
  double_chance_limit: number;
  payment_alias: string | null;
  payment_cbu: string | null;
  payment_holder: string | null;
  payment_qr_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProdeGameMatchday {
  id: string;
  prode_game_id: string;
  matchday_id: string;
  created_at: string;
}

export interface Participation {
  id: string;
  prode_game_id: string;
  user_id: string;
  status: ParticipationStatus;
  payment_deadline: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: string;
  participation_id: string;
  match_id: string;
  prediction: PredictionValue;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  participation_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentReceipt {
  id: string;
  payment_id: string;
  file_url: string;
  uploaded_at: string;
}

export interface Winner {
  id: string;
  prode_game_id: string;
  participation_id: string;
  hits: number;
  prize_amount: number;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}
