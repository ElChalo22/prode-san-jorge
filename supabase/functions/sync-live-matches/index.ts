import { createClient } from "npm:@supabase/supabase-js@2";

const PROMIEDOS_API = "https://api.promiedos.com.ar";
const PROMIEDOS_VERSION =
  Deno.env.get("PROMIEDOS_VERSION") ?? "1.11.7.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) {
  throw new Error(
    "Falta SUPABASE_URL en las variables de entorno.",
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.",
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

// Ventana chica: alcanza para partidos recientes/en vivo/próximos
// sin hacer el trabajo pesado del importador general.
const LOOKBACK_HOURS = 6;
const LOOKAHEAD_HOURS = 36;

interface PromiedosStatus {
  enum?: number;
  name?: string;
  short_name?: string;
}

interface PromiedosGame {
  id: string;
  start_time: string;
  status?: PromiedosStatus;
  scores?: number[];
  winner?: number;
  game_time?: number | null;
  game_time_to_display?: string | null;
  game_time_status_to_display?: string | null;
}

interface PromiedosLeague {
  id: string;
  games?: PromiedosGame[];
}

interface PromiedosGamesResponse {
  leagues?: PromiedosLeague[];
}

interface DbMatch {
  id: string;
  provider_id: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  result: "1" | "X" | "2" | null;
}

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function toPromiedosDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

function getArgentinaDateFromIso(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function mapMatchStatus(
  status?: PromiedosStatus,
):
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled" {
  const name = status?.name?.toLowerCase() ?? "";
  const shortName = status?.short_name?.toLowerCase() ?? "";
  const combined = `${name} ${shortName}`;

  if (
    combined.includes("final") ||
    combined.includes("fin")
  ) {
    return "finished";
  }

  if (
    combined.includes("susp") ||
    combined.includes("post")
  ) {
    return "postponed";
  }

  if (combined.includes("cancel")) {
    return "cancelled";
  }

  if (
    combined.includes("jugando") ||
    combined.includes("entretiempo") ||
    combined.includes("1t") ||
    combined.includes("2t") ||
    combined.includes("primer tiempo") ||
    combined.includes("segundo tiempo")
  ) {
    return "live";
  }

  return "scheduled";
}

function calculateResult(
  status: ReturnType<typeof mapMatchStatus>,
  homeScore: number | null,
  awayScore: number | null,
): "1" | "X" | "2" | null {
  if (
    status !== "finished" ||
    homeScore === null ||
    awayScore === null
  ) {
    return null;
  }

  if (homeScore > awayScore) {
    return "1";
  }

  if (homeScore < awayScore) {
    return "2";
  }

  return "X";
}

async function fetchPromiedosGames(
  argentinaDate: string,
): Promise<PromiedosGame[]> {
  const url =
    `${PROMIEDOS_API}/games/${toPromiedosDate(argentinaDate)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "X-VER": PROMIEDOS_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Promiedos respondió HTTP ${response.status} para ${argentinaDate}`,
    );
  }

  const data =
    (await response.json()) as PromiedosGamesResponse;

  // Express puede mezclar competiciones; buscar todos los partidos del día.
  return (data.leagues ?? []).flatMap((league) => league.games ?? []);
}

async function getRelevantMatches(): Promise<DbMatch[]> {
  const now = Date.now();

  const from = new Date(
    now - LOOKBACK_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const to = new Date(
    now + LOOKAHEAD_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, provider_id, kickoff_at, status, home_score, away_score, result",
    )
    .eq("provider", "promiedos")
    .gte("kickoff_at", from)
    .lte("kickoff_at", to)
    .order("kickoff_at", { ascending: true });

  if (error) {
    throw new Error(
      `Error leyendo partidos de Supabase: ${error.message}`,
    );
  }

  return (data ?? []) as DbMatch[];
}

async function syncLiveMatches() {
  const matches = await getRelevantMatches();

  if (matches.length === 0) {
    return {
      ok: true,
      checked: 0,
      foundInPromiedos: 0,
      updated: 0,
      message: "No hay partidos relevantes para sincronizar.",
    };
  }

  const dates = Array.from(
    new Set(
      matches.map((match) =>
        getArgentinaDateFromIso(match.kickoff_at)
      ),
    ),
  );

  const gamesById = new Map<string, PromiedosGame>();

  for (const date of dates) {
    const games = await fetchPromiedosGames(date);

    for (const game of games) {
      gamesById.set(game.id, game);
    }
  }

  let foundInPromiedos = 0;
  let updated = 0;

  const changes: Array<{
    providerId: string;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    result: "1" | "X" | "2" | null;
  }> = [];

  for (const match of matches) {
    const game = gamesById.get(match.provider_id);

    if (!game) {
      continue;
    }

    foundInPromiedos += 1;

    const nextStatus = mapMatchStatus(game.status);

    const hasScores =
      Array.isArray(game.scores) &&
      game.scores.length >= 2 &&
      Number.isFinite(game.scores[0]) &&
      Number.isFinite(game.scores[1]);

    const nextHomeScore = hasScores
      ? Number(game.scores![0])
      : match.home_score;

    const nextAwayScore = hasScores
      ? Number(game.scores![1])
      : match.away_score;

    const nextResult =
      nextStatus === "finished"
        ? calculateResult(
            nextStatus,
            nextHomeScore,
            nextAwayScore,
          )
        : match.result;

    const changed =
      match.status !== nextStatus ||
      match.home_score !== nextHomeScore ||
      match.away_score !== nextAwayScore ||
      match.result !== nextResult;

    if (!changed) {
      continue;
    }

    const { error } = await supabase
      .from("matches")
      .update({
        status: nextStatus,
        home_score: nextHomeScore,
        away_score: nextAwayScore,
        result: nextResult,
      })
      .eq("id", match.id);

    if (error) {
      throw new Error(
        `Error actualizando partido ${match.provider_id}: ${error.message}`,
      );
    }

    updated += 1;

    changes.push({
      providerId: match.provider_id,
      status: nextStatus,
      homeScore: nextHomeScore,
      awayScore: nextAwayScore,
      result: nextResult,
    });
  }

  return {
    ok: true,
    checked: matches.length,
    dates,
    foundInPromiedos,
    updated,
    changes,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(
      { ok: false, error: "Método no permitido." },
      405,
    );
  }

  try {
    const expectedSecret =
      Deno.env.get("IMPORT_CRON_SECRET");

    const receivedSecret =
      request.headers.get("x-cron-secret");

    if (
      !expectedSecret ||
      receivedSecret !== expectedSecret
    ) {
      return jsonResponse(
        { ok: false, error: "No autorizado." },
        401,
      );
    }

    const result = await syncLiveMatches();

    return jsonResponse(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido sincronizando partidos.";

    console.error(
      "❌ ERROR SYNC LIVE MATCHES",
      error,
    );

    return jsonResponse(
      { ok: false, error: message },
      500,
    );
  }
});
