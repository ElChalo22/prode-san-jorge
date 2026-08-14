import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

const PROMIEDOS_API = "https://api.promiedos.com.ar";
const PROMIEDOS_VERSION = "1.11.7.5";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "Falta EXPO_PUBLIC_SUPABASE_URL en las variables de entorno.",
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

// =========================================================
// TIPOS PROMIEDOS
// =========================================================

interface PromiedosTeam {
  id: string;
  name: string;
  short_name?: string | null;
  url_name?: string | null;
  country_id?: string | null;
}

interface PromiedosStatus {
  enum?: number;
  name?: string;
  short_name?: string;
}

interface PromiedosGame {
  id: string;
  stage_round_name?: string | null;
  teams: PromiedosTeam[];
  start_time: string;
  status?: PromiedosStatus;
  winner?: number;
}

interface PromiedosLeague {
  id: string;
  name: string;
  url_name?: string | null;
  country_id?: string | null;
  country_name?: string | null;
  is_international?: boolean;
  games?: PromiedosGame[];
}

interface PromiedosGamesResponse {
  leagues?: PromiedosLeague[];
}

interface FullRoundResult {
  league: PromiedosLeague;
  roundName: string;
  games: PromiedosGame[];
}

// =========================================================
// CONFIGURACIÓN
// =========================================================

const TARGET_LEAGUE_ID = "hc";
const SEARCH_DAYS_BEFORE = 4;
const SEARCH_DAYS_AFTER = 4;
const DOUBLE_CHANCE_LIMIT = 2;
const ENTRY_FEE = 0;

// =========================================================
// FECHAS
// =========================================================

function getArgentinaDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function toPromiedosDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${day}-${month}-${year}`;
}

function addDays(date: string, amount: number): string {
  const [year, month, day] = date
    .split("-")
    .map(Number);

  const value = new Date(
    Date.UTC(year, month - 1, day),
  );

  value.setUTCDate(value.getUTCDate() + amount);

  return value.toISOString().slice(0, 10);
}

function parsePromiedosDateTime(value: string): Date {
  const match = value.match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/,
  );

  if (!match) {
    throw new Error(
      `Fecha de Promiedos inválida: "${value}"`,
    );
  }

  const [, day, month, year, hour, minute] = match;

  return new Date(
    `${year}-${month}-${day}T${hour}:${minute}:00-03:00`,
  );
}

function toIso(value: string): string {
  return parsePromiedosDateTime(value).toISOString();
}

function getRoundNumber(
  roundName?: string | null,
): number | null {
  if (!roundName) {
    return null;
  }

  const match = roundName.match(/\d+/);

  return match ? Number(match[0]) : null;
}

// =========================================================
// PROMIEDOS
// =========================================================

async function fetchGames(
  date: string,
): Promise<PromiedosGamesResponse> {
  const url = `${PROMIEDOS_API}/games/${toPromiedosDate(date)}`;

  console.log(`🌐 ${date}`);

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
      `Promiedos respondió HTTP ${response.status} para ${date}`,
    );
  }

  return (await response.json()) as PromiedosGamesResponse;
}

function findLeague(
  response: PromiedosGamesResponse,
  leagueId: string,
): PromiedosLeague | null {
  return (
    response.leagues?.find(
      (league) => league.id === leagueId,
    ) ?? null
  );
}

async function detectRound(
  referenceDate: string,
): Promise<{
  league: PromiedosLeague;
  roundName: string;
}> {
  const response = await fetchGames(referenceDate);
  const league = findLeague(
    response,
    TARGET_LEAGUE_ID,
  );

  if (!league) {
    throw new Error(
      "No encontramos Liga Profesional Argentina en la fecha indicada.",
    );
  }

  const firstGame = league.games?.find(
    (game) => game.stage_round_name,
  );

  if (!firstGame?.stage_round_name) {
    throw new Error(
      "No pudimos detectar la fecha de Liga Profesional.",
    );
  }

  return {
    league,
    roundName: firstGame.stage_round_name.trim(),
  };
}

async function fetchFullRound(
  referenceDate: string,
): Promise<FullRoundResult> {
  const detected = await detectRound(referenceDate);

  console.log("");
  console.log(
    `🎯 Fecha detectada: ${detected.roundName}`,
  );
  console.log(
    `🔎 Buscando partidos entre ${SEARCH_DAYS_BEFORE} días antes y ${SEARCH_DAYS_AFTER} días después...`,
  );
  console.log("");

  const gamesById = new Map<
    string,
    PromiedosGame
  >();

  let finalLeague = detected.league;

  for (
    let offset = -SEARCH_DAYS_BEFORE;
    offset <= SEARCH_DAYS_AFTER;
    offset += 1
  ) {
    const date = addDays(referenceDate, offset);

    const response = await fetchGames(date);

    const league = findLeague(
      response,
      TARGET_LEAGUE_ID,
    );

    if (!league) {
      continue;
    }

    finalLeague = league;

    for (const game of league.games ?? []) {
      const gameRound =
        game.stage_round_name?.trim();

      if (gameRound !== detected.roundName) {
        continue;
      }

      gamesById.set(game.id, game);
    }
  }

  const games = Array.from(
    gamesById.values(),
  ).sort(
    (a, b) =>
      parsePromiedosDateTime(
        a.start_time,
      ).getTime() -
      parsePromiedosDateTime(
        b.start_time,
      ).getTime(),
  );

  if (games.length === 0) {
    throw new Error(
      `No encontramos partidos para ${detected.roundName}.`,
    );
  }

  return {
    league: finalLeague,
    roundName: detected.roundName,
    games,
  };
}

// =========================================================
// HELPERS SUPABASE
// =========================================================

function getTeamLogoUrl(teamId: string): string {
  return `${PROMIEDOS_API}/images/team/${teamId}/4`;
}

function getCompetitionLogoUrl(
  leagueId: string,
): string {
  return `${PROMIEDOS_API}/images/league/${leagueId}/4`;
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

  if (
    name.includes("final") ||
    name.includes("fin")
  ) {
    return "finished";
  }

  if (
    name.includes("susp") ||
    name.includes("post")
  ) {
    return "postponed";
  }

  if (name.includes("cancel")) {
    return "cancelled";
  }

  if (
    name.includes("jugando") ||
    name.includes("entretiempo") ||
    name.includes("1t") ||
    name.includes("2t")
  ) {
    return "live";
  }

  return "scheduled";
}

async function upsertCompetition(
  league: PromiedosLeague,
): Promise<string> {
  const { data, error } = await supabase
    .from("competitions")
    .upsert(
      {
        provider: "promiedos",
        provider_id: league.id,
        name: league.name,
        short_name: league.name,
        country:
          league.country_name ?? "Argentina",
        logo_url: getCompetitionLogoUrl(
          league.id,
        ),
        active: true,
      },
      {
        onConflict: "provider,provider_id",
      },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Error guardando competición ${league.name}: ${error.message}`,
    );
  }

  return data.id;
}

async function upsertTeam(
  team: PromiedosTeam,
): Promise<string> {
  const { data, error } = await supabase
    .from("teams")
    .upsert(
      {
        provider: "promiedos",
        provider_id: team.id,
        name: team.name,
        short_name:
          team.short_name ?? team.name,
        country: "Argentina",
        logo_url: getTeamLogoUrl(team.id),
        active: true,
      },
      {
        onConflict: "provider,provider_id",
      },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Error guardando equipo ${team.name}: ${error.message}`,
    );
  }

  return data.id;
}

async function upsertMatchday(
  competitionId: string,
  league: PromiedosLeague,
  roundName: string,
  games: PromiedosGame[],
): Promise<string> {
  const firstGame = games[0];
  const lastGame = games[games.length - 1];

  const providerId = `${league.id}:${roundName}`;

  const { data, error } = await supabase
    .from("matchdays")
    .upsert(
      {
        competition_id: competitionId,
        provider: "promiedos",
        provider_id: providerId,
        name: roundName,
        round_number:
          getRoundNumber(roundName),
        starts_at: toIso(
          firstGame.start_time,
        ),
        ends_at: toIso(
          lastGame.start_time,
        ),
      },
      {
        onConflict: "provider,provider_id",
      },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Error guardando ${roundName}: ${error.message}`,
    );
  }

  return data.id;
}

async function upsertMatch(
  matchdayId: string,
  game: PromiedosGame,
): Promise<void> {
  if (game.teams.length < 2) {
    console.warn(
      `⚠️ Partido ${game.id} ignorado porque faltan equipos.`,
    );

    return;
  }

  const [home, away] = game.teams;

  const homeTeamId = await upsertTeam(home);
  const awayTeamId = await upsertTeam(away);

  const { error } = await supabase
    .from("matches")
    .upsert(
      {
        matchday_id: matchdayId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        provider: "promiedos",
        provider_id: game.id,
        kickoff_at: toIso(
          game.start_time,
        ),
        status: mapMatchStatus(
          game.status,
        ),
      },
      {
        onConflict: "provider,provider_id",
      },
    );

  if (error) {
    throw new Error(
      `Error guardando ${home.name} vs ${away.name}: ${error.message}`,
    );
  }

  console.log(
    `⚽ ${home.name} vs ${away.name} — ${game.start_time}`,
  );
}

// =========================================================
// PRODE
// =========================================================

async function getArgentinaProdeGroupId(): Promise<string> {
  const { data, error } = await supabase
    .from("prode_groups")
    .select("id")
    .eq("slug", "argentina")
    .single();

  if (error) {
    throw new Error(
      `No pudimos obtener el grupo Argentina: ${error.message}`,
    );
  }

  return data.id;
}

async function findExistingProdeGame(
  groupId: string,
  roundName: string,
): Promise<string | null> {
  const name = `Liga Profesional - ${roundName}`;

  const { data, error } = await supabase
    .from("prode_games")
    .select("id")
    .eq("prode_group_id", groupId)
    .eq("name", name)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error buscando el prode: ${error.message}`,
    );
  }

  return data?.id ?? null;
}

async function upsertProdeGame(
  roundName: string,
  games: PromiedosGame[],
): Promise<string> {
  const groupId =
    await getArgentinaProdeGroupId();

  const firstKickoff =
    parsePromiedosDateTime(
      games[0].start_time,
    );

  const closesAt = new Date(
    firstKickoff.getTime() -
      15 * 60 * 1000,
  ).toISOString();

  const name = `Liga Profesional - ${roundName}`;

  const existingId =
    await findExistingProdeGame(
      groupId,
      roundName,
    );

  if (existingId) {
    const { error } = await supabase
      .from("prode_games")
      .update({
        status: "open",
        closes_at: closesAt,
        double_chance_limit:
          DOUBLE_CHANCE_LIMIT,
      })
      .eq("id", existingId);

    if (error) {
      throw new Error(
        `Error actualizando prode: ${error.message}`,
      );
    }

    return existingId;
  }

  const { data, error } = await supabase
    .from("prode_games")
    .insert({
      prode_group_id: groupId,
      name,
      entry_fee: ENTRY_FEE,
      currency: "ARS",
      status: "open",
      opens_at: new Date().toISOString(),
      closes_at: closesAt,
      double_chance_limit:
        DOUBLE_CHANCE_LIMIT,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Error creando prode: ${error.message}`,
    );
  }

  return data.id;
}

async function linkMatchdayToProde(
  prodeGameId: string,
  matchdayId: string,
): Promise<void> {
  const { error } = await supabase
    .from("prode_game_matchdays")
    .upsert(
      {
        prode_game_id: prodeGameId,
        matchday_id: matchdayId,
      },
      {
        onConflict:
          "prode_game_id,matchday_id",
      },
    );

  if (error) {
    throw new Error(
      `Error vinculando fecha al prode: ${error.message}`,
    );
  }
}

// =========================================================
// MAIN
// =========================================================

async function main() {
  console.log("");
  console.log(
    "==========================================",
  );
  console.log("⚽ PRODE SAN JORGE");
  console.log(
    "📥 Importador de fecha completa",
  );
  console.log(
    "==========================================",
  );

  const referenceDate =
    process.argv[2] ?? getArgentinaDate();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      referenceDate,
    )
  ) {
    throw new Error(
      "La fecha debe tener formato YYYY-MM-DD.",
    );
  }

  console.log(
    `📅 Día de referencia: ${referenceDate}`,
  );
  console.log("");

  const fullRound =
    await fetchFullRound(referenceDate);

  console.log("");
  console.log(
    `🏆 ${fullRound.league.name}`,
  );
  console.log(
    `📋 ${fullRound.roundName}`,
  );
  console.log(
    `⚽ Partidos encontrados: ${fullRound.games.length}`,
  );
  console.log("");

  const competitionId =
    await upsertCompetition(
      fullRound.league,
    );

  const matchdayId =
    await upsertMatchday(
      competitionId,
      fullRound.league,
      fullRound.roundName,
      fullRound.games,
    );

  for (const game of fullRound.games) {
    await upsertMatch(
      matchdayId,
      game,
    );
  }

  const prodeGameId =
    await upsertProdeGame(
      fullRound.roundName,
      fullRound.games,
    );

  await linkMatchdayToProde(
    prodeGameId,
    matchdayId,
  );

  const firstGame =
    fullRound.games[0];

  const lastGame =
    fullRound.games[
      fullRound.games.length - 1
    ];

  const closesAt = new Date(
    parsePromiedosDateTime(
      firstGame.start_time,
    ).getTime() -
      15 * 60 * 1000,
  );

  console.log("");
  console.log(
    "==========================================",
  );
  console.log(
    "✅ FECHA COMPLETA IMPORTADA",
  );
  console.log(
    `🏆 ${fullRound.roundName}`,
  );
  console.log(
    `⚽ Partidos: ${fullRound.games.length}`,
  );
  console.log(
    `🟢 Primer partido: ${firstGame.start_time}`,
  );
  console.log(
    `🏁 Último partido: ${lastGame.start_time}`,
  );
  console.log(
    `🔒 Cierre del Prode: ${closesAt.toLocaleString(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
      },
    )}`,
  );
  console.log(
    "📱 Prode creado/actualizado y vinculado.",
  );
  console.log(
    "==========================================",
  );
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error(
    "❌ ERROR IMPORTANDO FECHA",
  );
  console.error(error);
  console.error("");

  process.exit(1);
});