import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const version = Deno.env.get("PROMIEDOS_VERSION") ?? "1.11.7.5";
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const api = "https://api.promiedos.com.ar";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

type Team = { id: string; name: string; short_name?: string };
type Game = { id: string; teams: Team[]; start_time: string; stage_round_name?: string;
  status?: { enum?: number; name?: string } };
type League = { id: string; name: string; country_name?: string; games?: Game[] };

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", ...cors },
});

function kickoff(value: string) {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) throw new Error("Fecha de Promiedos inválida");
  return new Date(`${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:00-03:00`).toISOString();
}

async function upsert(table: string, row: Record<string, unknown>, conflict: string): Promise<string> {
  const { data, error } = await db.from(table).upsert(row, { onConflict: conflict }).select("id").single();
  if (error) throw error;
  return data.id;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Método no permitido" }, 405);
  try {
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Iniciá sesión" }, 401);
    const auth = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user) return reply({ error: "Sesión inválida" }, 401);
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "superadmin"].includes(profile.role)) return reply({ error: "Acceso denegado" }, 403);

    const body = await request.json().catch(() => ({})) as { action?: string; provider_ids?: string[] };
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const candidates = new Map<string, { league: League; game: Game; day: string; starts: string }>();
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(`${today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      const day = `${String(date.getUTCDate()).padStart(2, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${date.getUTCFullYear()}`;
      const response = await fetch(`${api}/games/${day}`, { headers: { Accept: "application/json", "X-VER": version } });
      if (!response.ok) throw new Error(`Promiedos respondió HTTP ${response.status}`);
      const payload = await response.json() as { leagues?: League[] };
      for (const league of payload.leagues ?? []) {
        for (const game of league.games ?? []) {
          if (game.teams.length < 2 || candidates.has(game.id)) continue;
          const starts = kickoff(game.start_time);
          if (new Date(starts).getTime() < Date.now() + 15 * 60000) continue;
          candidates.set(game.id, { league, game, day, starts });
        }
      }
    }
    if (body.action !== "prepare") {
      return reply({ matches: [...candidates.values()].map(({ league, game, starts }) => ({
        id: game.id, competition_id: league.id, competition: league.name,
        round: game.stage_round_name?.trim() || "Sin fecha", home: game.teams[0].name,
        away: game.teams[1].name, kickoff_at: starts,
      })).sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at)) });
    }
    const ids = body.provider_ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 30 ||
      ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length ||
      ids.some((id) => !candidates.has(id))) {
      return reply({ error: "La selección contiene partidos inválidos o ya iniciados" }, 400);
    }
    const selected = ids.map((id) => candidates.get(id)!);
    const resolved = new Map<string, string>();
    const { data: existing, error: existingError } = await db.from("matches")
      .select("id, provider_id, status").eq("provider", "promiedos").in("provider_id", ids);
    if (existingError) throw existingError;
    const existingIds = new Map((existing ?? []).map((match) => [match.provider_id, match]));
    for (let index = 0; index < selected.length; index += 5) {
      await Promise.all(selected.slice(index, index + 5).map(async ({ league, game, day, starts }) => {
          const alreadyImported = existingIds.get(game.id);
          if (alreadyImported) {
            if (alreadyImported.status !== "scheduled") throw new Error("Un partido elegido ya comenzó");
            resolved.set(game.id, alreadyImported.id);
            return;
          }
          const competitionId = await upsert("competitions", { provider: "promiedos", provider_id: league.id,
            name: league.name, country: league.country_name ?? null,
            logo_url: `${api}/images/league/${league.id}/4`, active: true }, "provider,provider_id");
          const matchdayId = await upsert("matchdays", { provider: "promiedos",
            provider_id: `${league.id}:${game.stage_round_name?.trim() || day}`,
            competition_id: competitionId, name: game.stage_round_name?.trim() || day }, "provider,provider_id");
          const teamIds = await Promise.all(game.teams.slice(0, 2).map((team) => upsert("teams", {
            provider: "promiedos", provider_id: team.id, name: team.name,
            short_name: team.short_name ?? team.name, logo_url: `${api}/images/team/${team.id}/4`,
            active: true }, "provider,provider_id")));
          const id = await upsert("matches", { provider: "promiedos", provider_id: game.id,
            matchday_id: matchdayId, home_team_id: teamIds[0], away_team_id: teamIds[1],
            kickoff_at: starts, status: "scheduled" }, "provider,provider_id");
          resolved.set(game.id, id);
      }));
    }
    return reply({ match_ids: ids.map((id) => resolved.get(id)) });
  } catch (error) {
    console.error("Error cargando catálogo Express", error);
    return reply({ error: error instanceof Error ? error.message : "No se pudieron cargar los partidos" }, 500);
  }
});
