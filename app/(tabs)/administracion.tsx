import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useStaffRole } from "../../lib/useStaffRole";
import { darkColors, lightColors } from "../../theme/colors";

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  participations: { user_id: string; prode_games: { name: string }[] }[];
};
type CatalogMatch = { id: string; competition_id: string; competition: string; round: string;
  home: string; away: string; kickoff_at: string };

export default function AdministracionScreen() {
  const colors = useColorScheme() === "dark" ? darkColors : lightColors;
  const { role, loading: checkingRole } = useStaffRole();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [games, setGames] = useState<{ id: string; name: string; status: string }[]>([]);
  const [players, setPlayers] = useState<{ id: string; username: string | null; role: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<"resumen" | "pagos" | "prodes" | "express" | "equipo">("resumen");
  const [catalog, setCatalog] = useState<CatalogMatch[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [expressName, setExpressName] = useState("");
  const [matchQuery, setMatchQuery] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const load = useCallback(async () => {
    if (!role) return;
    setBusy(true);
    setError(null);
    try {
      const [paymentResult, gameResult, profileResult] = await Promise.all([
        supabase.from("payments")
          .select("id, amount, currency, status, participations(user_id, prode_games(name))")
          .order("created_at", { ascending: false }).limit(100),
        supabase.from("prode_games").select("id, name, status")
          .order("created_at", { ascending: false }).limit(30),
        supabase.from("profiles").select("id, username, role")
          .order("created_at", { ascending: false }).limit(500),
      ]);
      if (paymentResult.error) throw paymentResult.error;
      if (gameResult.error) throw gameResult.error;
      if (profileResult.error) throw profileResult.error;
      setPayments((paymentResult.data ?? []) as Payment[]);
      setGames(gameResult.data ?? []);
      setPlayers(profileResult.data ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el panel.");
    } finally {
      setBusy(false);
    }
  }, [role]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const changeRole = async (id: string, nextRole: "player" | "admin") => {
    setBusy(true);
    setError(null);
    const { error: requestError } = await supabase.rpc("set_staff_role", { target_id: id, new_role: nextRole });
    if (requestError) {
      setError(requestError.message);
      setBusy(false);
    } else {
      await load();
    }
  };

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    setError(null);
    const { data, error: catalogError } = await supabase.functions.invoke("express-catalog", { body: {} });
    if (catalogError || data?.error) setError(data?.error ?? catalogError?.message ?? "No se pudo consultar Promiedos.");
    else setCatalog(data?.matches ?? []);
    setLoadingCatalog(false);
  };

  const publishExpress = async () => {
    if (chosen.length < 1 || !expressName.trim()) {
      Alert.alert("Faltan datos", "Poné un nombre y elegí al menos un partido.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data: prepared, error: prepareError } = await supabase.functions.invoke("express-catalog", {
      body: { action: "prepare", provider_ids: chosen },
    });
    if (prepareError || prepared?.error || prepared?.match_ids?.length !== chosen.length) {
      setError(prepared?.error ?? prepareError?.message ?? "No se pudieron verificar los partidos elegidos.");
      setBusy(false);
      return;
    }
    const { error: publishError } = await supabase.rpc("create_express_game", {
      game_name: expressName.trim(), selected_match_ids: prepared.match_ids, fee: 0,
    });
    if (publishError) setError(publishError.message);
    else {
      setChosen([]);
      setExpressName("");
      setSection("prodes");
      Alert.alert("Prode Express publicado", "Ya está disponible para los jugadores.");
      await load();
    }
    setBusy(false);
  };

  if (checkingRole) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!role) return <View style={[styles.center, { backgroundColor: colors.background }]}>
    <Ionicons name="lock-closed-outline" size={36} color={colors.text.secondary} />
    <Text style={{ color: colors.text.primary }}>Esta sección requiere acceso de administración.</Text>
    <Pressable onPress={() => router.replace("/(tabs)")}><Text style={{ color: colors.primary }}>Volver al inicio</Text></Pressable>
  </View>;

  const pending = payments.filter((payment) => payment.status === "pending");
  const matches = players.filter((player) => player.username?.toLowerCase().includes(query.trim().toLowerCase()));
  const visibleMatches = catalog.filter((match) =>
    `${match.home} ${match.away} ${match.competition} ${match.round}`.toLocaleLowerCase("es")
      .includes(matchQuery.trim().toLocaleLowerCase("es")));
  const rounds = new Map<string, { name: string; round: string; ids: string[] }>();
  for (const match of catalog) {
    const key = `${match.competition_id}:${match.round}`;
    const group = rounds.get(key) ?? { name: match.competition, round: match.round, ids: [] };
    group.ids.push(match.id);
    rounds.set(key, group);
  }
  const groupQuery = matchQuery.trim().toLocaleLowerCase("es");
  const visibleRounds = [...rounds.entries()].filter(([, group]) =>
    !groupQuery || `${group.name} ${group.round}`.toLocaleLowerCase("es").includes(groupQuery));

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void load()} tintColor={colors.primary} />}>
    <View style={styles.header}>
      <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}><Ionicons name="shield-checkmark-outline" size={25} color="#FFFFFF" /></View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Administración</Text>
        <Text style={{ color: colors.text.secondary }}>Prode San Jorge · {role === "superadmin" ? "Superadmin" : "Admin"}</Text>
      </View>
    </View>
    {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sections}>
      {(["resumen", "pagos", "prodes", "express", ...(role === "superadmin" ? ["equipo"] : [])] as typeof section[]).map((item) =>
        <Pressable key={item} onPress={() => { setSection(item); if (item === "express" && !catalog.length) void loadCatalog(); }} accessibilityRole="tab" accessibilityState={{ selected: section === item }}
          style={[styles.section, { backgroundColor: section === item ? colors.primary : colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: section === item ? "#FFFFFF" : colors.text.primary, fontWeight: "700" }}>
            {item === "resumen" ? "Resumen" : item === "pagos" ? "Pagos" : item === "prodes" ? "Prodes" : item === "express" ? "Crear Express" : "Equipo"}
          </Text>
        </Pressable>)}
    </ScrollView>

    {section === "resumen" ? <>
    <View style={styles.stats}>
      <View style={[styles.card, styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.number, { color: colors.primary }]}>{pending.length}</Text>
        <Text style={{ color: colors.text.secondary }}>Pagos pendientes</Text>
      </View>
      <View style={[styles.card, styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.number, { color: colors.primary }]}>{games.filter((game) => game.status === "open").length}</Text>
        <Text style={{ color: colors.text.secondary }}>Prodes abiertos</Text>
      </View>
    </View>
    <Text style={[styles.heading, { color: colors.text.primary }]}>Para revisar</Text>
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.itemName, { color: colors.text.primary }]}>{pending.length === 0 ? "No hay pagos pendientes" : `${pending.length} pago${pending.length === 1 ? "" : "s"} pendiente${pending.length === 1 ? "" : "s"}`}</Text>
      <Text style={{ color: colors.text.secondary }}>Consultá los movimientos en la sección Pagos.</Text>
      <Pressable onPress={() => setSection("pagos")}><Text style={{ color: colors.primary, fontWeight: "700" }}>Ver pagos →</Text></Pressable>
    </View>
    </> : null}

    {section === "prodes" ? <>
    <Text style={[styles.heading, { color: colors.text.primary }]}>Prodes recientes</Text>
    {games.length === 0 ? <Text style={{ color: colors.text.secondary }}>No hay prodes cargados.</Text> :
      games.map((game) => <View key={game.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.itemName, { color: colors.text.primary }]}>{game.name}</Text>
        <Text style={{ color: colors.text.secondary }}>Estado: {game.status === "open" ? "Abierto" : game.status === "closed" ? "Cerrado" : game.status}</Text>
      </View>)}
    </> : null}

    {section === "express" ? <>
      <Text style={[styles.heading, { color: colors.text.primary }]}>Nuevo Prode Express</Text>
      <Text style={{ color: colors.text.secondary }}>Elegí partidos de Promiedos. Se publica al crearlo y cierra 15 minutos antes del primero. La Liga Argentina sigue automática. Por ahora, entrada gratis.</Text>
      <TextInput placeholder="Nombre, por ejemplo: Express del miércoles" placeholderTextColor={colors.text.secondary}
        value={expressName} onChangeText={setExpressName} maxLength={80}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border }]} />
      <TextInput placeholder="Buscar equipo, partido o competencia" placeholderTextColor={colors.text.secondary}
        value={matchQuery} onChangeText={setMatchQuery}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border }]} />
      <View style={styles.playerRow}>
        <Text style={{ flex: 1, color: colors.text.primary, fontWeight: "700" }}>{chosen.length} partidos elegidos</Text>
        <Pressable onPress={() => void loadCatalog()} disabled={loadingCatalog}>
          <Text style={{ color: colors.primary }}>{loadingCatalog ? "Buscando…" : "Actualizar partidos"}</Text>
        </Pressable>
      </View>
      {loadingCatalog ? <ActivityIndicator color={colors.primary} /> : null}
      {!loadingCatalog && catalog.length === 0 ? <Text style={{ color: colors.text.secondary }}>No hay partidos disponibles para los próximos 7 días.</Text> : null}
      {catalog.length > 0 ? <>
        <Text style={[styles.heading, { color: colors.text.primary }]}>Agregar fecha completa</Text>
        <Text style={{ color: colors.text.secondary }}>Incluye todos los partidos de esa competencia y fecha dentro de los próximos 7 días, aunque se jueguen en días distintos.</Text>
        {visibleRounds.slice(0, 40).map(([key, group]) => {
          const complete = group.ids.every((id) => chosen.includes(id));
          return <Pressable key={key} onPress={() => {
            const next = complete ? chosen.filter((id) => !group.ids.includes(id))
              : [...new Set([...chosen, ...group.ids])];
            if (next.length > 30) Alert.alert("Límite de partidos", "Un Prode Express admite hasta 30 partidos.");
            else setChosen(next);
          }}
            style={[styles.card, styles.playerRow, { backgroundColor: colors.surface, borderColor: complete ? colors.primary : colors.border }]}>
            <Ionicons name={complete ? "checkbox" : "add-circle-outline"} color={colors.primary} size={22} />
            <View style={{ flex: 1 }}><Text style={[styles.itemName, { color: colors.text.primary }]}>{group.name} · {group.round}</Text>
              <Text style={{ color: colors.text.secondary }}>{group.ids.length} partidos</Text></View>
            <Text style={{ color: colors.primary }}>{complete ? "Quitar" : "Agregar"}</Text>
          </Pressable>;
        })}
        {visibleRounds.length > 40 ? <Text style={{ color: colors.text.secondary }}>Buscá una competencia para ver más fechas.</Text> : null}
      </> : null}
      <Text style={[styles.heading, { color: colors.text.primary }]}>Partidos individuales</Text>
      {visibleMatches.slice(0, 80).map((match) => {
        const selected = chosen.includes(match.id);
        return <Pressable key={match.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}
          onPress={() => {
            if (!selected && chosen.length >= 30) Alert.alert("Límite de partidos", "Un Prode Express admite hasta 30 partidos.");
            else setChosen((current) => selected ? current.filter((id) => id !== match.id) : [...current, match.id]);
          }}
          style={[styles.card, styles.playerRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
          <Ionicons name={selected ? "checkbox" : "square-outline"} color={colors.primary} size={23} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{match.competition} · {match.round} · {new Date(match.kickoff_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} ARG</Text>
            <Text style={[styles.itemName, { color: colors.text.primary }]}>{match.home} vs. {match.away}</Text>
          </View>
        </Pressable>;
      })}
      {visibleMatches.length > 80 ? <Text style={{ color: colors.text.secondary }}>Mostrando 80 partidos. Usá el buscador para encontrar otro.</Text> : null}
      <Pressable disabled={busy || chosen.length < 1 || !expressName.trim()} onPress={() => void publishExpress()}
        style={[styles.button, { backgroundColor: colors.primary, opacity: busy || chosen.length < 1 || !expressName.trim() ? 0.5 : 1, alignItems: "center", marginTop: 16 }]}>
        <Text style={styles.buttonText}>Publicar Prode Express</Text>
      </Pressable>
    </> : null}

    {section === "pagos" ? <>
    <Text style={[styles.heading, { color: colors.text.primary }]}>Pagos recientes</Text>
    {payments.length === 0 ? <Text style={{ color: colors.text.secondary }}>Todavía no hay pagos registrados.</Text> :
      payments.slice(0, 20).map((payment) => {
        const participation = payment.participations?.[0];
        const game = participation?.prode_games;
        const name = game?.[0]?.name;
        const player = players.find((item) => item.id === participation?.user_id);
        return <View key={payment.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.itemName, { color: colors.text.primary }]}>{name ?? "Prode"} · @{player?.username ?? "jugador"}</Text>
          <Text style={{ color: colors.text.secondary }}>{payment.amount} {payment.currency} · {payment.status === "pending" ? "Pendiente" : payment.status === "approved" ? "Aprobado" : payment.status === "rejected" ? "Rechazado" : payment.status}</Text>
        </View>;
      })}
    <Text style={{ color: colors.text.secondary }}>La revisión de comprobantes y aprobación de pagos se incorporará en el siguiente paso.</Text>
    </> : null}

    {role === "superadmin" && section === "equipo" ? <>
      <Text style={[styles.heading, { color: colors.text.primary }]}>Permisos del equipo</Text>
      <Text style={{ color: colors.text.secondary }}>Buscá por apodo y asigná el rol de admin. El superadmin se habilita inicialmente desde Supabase.</Text>
      <TextInput placeholder="Buscar apodo" placeholderTextColor={colors.text.secondary} value={query} onChangeText={setQuery}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border }]} />
      {query.trim() ? matches.slice(0, 20).map((player) => <View key={player.id} style={[styles.card, styles.playerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}><Text style={[styles.itemName, { color: colors.text.primary }]}>@{player.username ?? "sin apodo"}</Text>
          <Text style={{ color: colors.text.secondary }}>{player.role}</Text></View>
        {player.role !== "superadmin" ? <Pressable disabled={busy} onPress={() => void changeRole(player.id, player.role === "admin" ? "player" : "admin")}
          style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.5 : 1 }]}>
          <Text style={styles.buttonText}>{player.role === "admin" ? "Quitar admin" : "Dar admin"}</Text>
        </Pressable> : null}
      </View>) : null}
    </> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "900" },
  sections: { gap: 8, paddingVertical: 4 },
  section: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  heading: { fontSize: 21, fontWeight: "800", marginTop: 20 },
  stats: { flexDirection: "row", gap: 10, marginTop: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 5 },
  stat: { flex: 1 },
  number: { fontSize: 28, fontWeight: "900" },
  itemName: { fontSize: 15, fontWeight: "700" },
  playerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14 },
  button: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
});
