import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppAppearance } from "../../lib/appearance";
import { supabase } from "../../lib/supabase";
import { darkColors, lightColors } from "../../theme/colors";
import type { DirectoryPlayer } from "../../lib/playerDirectory";
type Tab = "premios" | "ranking" | "social";
type FavoriteTeam = { name: string; logo_url: string | null };
type JacketClaim = { status: string; team_id: string | null };

export default function RankingScreen() {
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [tab, setTab] = useState<Tab>("premios");
  const [hits, setHits] = useState(0);
  const [credits, setCredits] = useState<{ kind: string; redeemed_at: string | null }[]>([]);
  const [cash, setCash] = useState<string | null>(null);
  const [jacketClaim, setJacketClaim] = useState<JacketClaim | null>(null);
  const [favoriteTeam, setFavoriteTeam] = useState<FavoriteTeam | null>(null);
  const [players, setPlayers] = useState<DirectoryPlayer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("public_player_directory");
    if (!error) setPlayers((data ?? []) as DirectoryPlayer[]);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) { setHits(0); setCredits([]); setCash(null); setJacketClaim(null); setFavoriteTeam(null); }
        return;
      }
      const [entries, bonuses, claim, jacket, profile] = await Promise.all([
        supabase.from("participations").select("hits").eq("user_id", user.id).eq("status", "confirmed"),
        supabase.from("reward_credits").select("kind,redeemed_at").eq("user_id", user.id),
        supabase.from("reward_claims").select("status").eq("user_id", user.id).eq("milestone", 125).maybeSingle(),
        supabase.from("reward_claims").select("status,team_id").eq("user_id", user.id).eq("milestone", 200).maybeSingle(),
        supabase.from("profiles").select("favorite_team_id").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setHits((entries.data ?? []).reduce((sum, row) => sum + (row.hits ?? 0), 0));
      setCredits(bonuses.data ?? []);
      setCash(claim.data?.status ?? null);
      setJacketClaim(jacket.data ?? null);
      if (profile.data?.favorite_team_id) {
        const { data: team } = await supabase.from("teams").select("name,logo_url")
          .eq("id", profile.data.favorite_team_id).maybeSingle();
        if (active) setFavoriteTeam(team);
      } else setFavoriteTeam(null);
    })();
    void loadPlayers();
    return () => { active = false; };
  }, [loadPlayers]));

  const visiblePlayers = useMemo(() => {
    const normalized = query.trim().replace(/^@/, "").toLocaleLowerCase("es");
    if (!normalized) return players;
    return players.filter((player) => player.username.toLocaleLowerCase("es").includes(normalized));
  }, [players, query]);
  const argentina = credits.find((credit) => credit.kind === "argentina");
  const express = credits.find((credit) => credit.kind === "express");
  const tabs: { id: Tab; label: string }[] = [
    { id: "premios", label: "Premios" }, { id: "ranking", label: "Ranking" }, { id: "social", label: "Social" },
  ];

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <Text style={[styles.title, { color: colors.text.primary }]}>Ranking y premios</Text>
    <View style={styles.tabs}>{tabs.map((item) => <Pressable key={item.id} onPress={() => setTab(item.id)}
      style={[styles.tab, { backgroundColor: tab === item.id ? colors.primary : colors.surface, borderColor: colors.border }]}>
      <Text style={{ color: tab === item.id ? "#FFFFFF" : colors.text.primary, fontWeight: "800" }}>{item.label}</Text>
    </Pressable>)}</View>

    {tab === "premios" && <>
      <Text style={{ color: colors.text.secondary }}>Tus aciertos confirmados se acumulan entre los prodes que jugás.</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="football-outline" size={28} color={colors.primary} />
        <Text style={[styles.number, { color: colors.text.primary }]}>{hits} aciertos</Text>
        <Text style={{ color: colors.text.secondary }}>Tus aciertos acumulados</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text.primary }]}>55 aciertos</Text>
        <Text style={{ color: colors.text.secondary }}>Una participación gratis en Liga Argentina, por única vez.</Text>
        <Text style={{ color: colors.primary, fontWeight: "800" }}>{argentina?.redeemed_at ? "Beneficio usado" : argentina ? "Disponible para jugar" : `${Math.max(0, 55 - hits)} aciertos para llegar`}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text.primary }]}>125 aciertos</Text>
        <Text style={{ color: colors.text.secondary }}>Premio de ARS 25.000. El equipo coordinará el pago.</Text>
        <Text style={{ color: colors.primary, fontWeight: "800" }}>{cash === "paid" ? "Premio pagado" : cash === "pending" ? "Premio pendiente de pago" : `${Math.max(0, 125 - hits)} aciertos para llegar`}</Text>
      </View>
      <View style={[styles.jacketCard, { backgroundColor: isDark ? "#142019" : "#F1F8F3", borderColor: colors.primary }]}>
        <View style={styles.jacketHeader}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={[styles.jacketEyebrow, { color: colors.primary }]}>PREMIO DESTACADO</Text>
        </View>
        <Text style={[styles.jacketTitle, { color: colors.text.primary }]}>Campera personalizada</Text>
        <Text style={[styles.jacketDescription, { color: colors.text.secondary }]}>
          Al llegar a 200 aciertos, ganás una campera negra con el escudo de {favoriteTeam?.name ?? "tu club"}.
        </Text>
        <View style={styles.jacketStage}>
          <Image source={require("../../assets/images/premio-campera-base.jpg")} style={styles.jacketImage} />
          {favoriteTeam?.logo_url
            ? <View style={styles.jacketCrestFrame}><Image source={{ uri: favoriteTeam.logo_url }} style={styles.jacketCrest} /></View>
            : <View style={styles.jacketCrestFrame}><Ionicons name="shield-outline" size={21} color="#18A558" /></View>}
        </View>
        <View style={[styles.jacketProgressTrack, { backgroundColor: isDark ? "#29342D" : "#DDE9E0" }]}>
          <View style={[styles.jacketProgressFill, { width: `${Math.min(100, hits / 2)}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.jacketStatus, { color: colors.primary }]}>
          {jacketClaim?.status === "delivered" ? "Campera entregada"
            : jacketClaim?.status === "pending" ? "¡Premio desbloqueado! El equipo coordinará la entrega."
              : hits >= 200 ? "¡Premio desbloqueado! El equipo coordinará la entrega."
                : `${Math.max(0, 200 - hits)} aciertos para desbloquearla`}
        </Text>
        {!favoriteTeam && <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
          Elegí tu club en el perfil para personalizar el escudo.
        </Text>}
      </View>
      {express && <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text.primary }]}>Verificación de identidad</Text>
        <Text style={{ color: colors.primary }}>{express.redeemed_at ? "Entrada Express usada" : "Entrada Express gratis disponible"}</Text>
      </View>}
    </>}

    {tab === "ranking" && <>
      <Text style={{ color: colors.text.secondary }}>Jugadores ordenados por aciertos acumulados.</Text>
      {loading && <ActivityIndicator color={colors.primary} />}
      {visiblePlayers.map((player, index) => <PlayerRow key={player.id} player={player} position={index + 1} colors={colors} onPress={() => router.push(`/players/${player.id}`)} />)}
      {!loading && players.length === 0 && <Text style={{ color: colors.text.secondary }}>Todavía no hay jugadores en el ranking.</Text>}
    </>}

    {tab === "social" && <>
      <Text style={{ color: colors.text.secondary }}>Buscá a alguien por su apodo y visitá su perfil.</Text>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.text.secondary} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Buscar jugadores" placeholderTextColor={colors.text.secondary}
          autoCapitalize="none" style={{ flex: 1, color: colors.text.primary, paddingVertical: 9 }} />
      </View>
      {loading && <ActivityIndicator color={colors.primary} />}
      {visiblePlayers.map((player) => <PlayerRow key={player.id} player={player} colors={colors} onPress={() => router.push(`/players/${player.id}`)} />)}
      {!loading && visiblePlayers.length === 0 && <Text style={{ color: colors.text.secondary }}>No encontramos jugadores con ese apodo.</Text>}
    </>}
  </ScrollView>;
}

function PlayerRow({ player, position, colors, onPress }: { player: DirectoryPlayer; position?: number; colors: typeof lightColors; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.player, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    {position !== undefined && <Text style={[styles.position, { color: colors.primary }]}>{position}</Text>}
    {player.avatar_url ? <Image source={{ uri: player.avatar_url }} style={styles.avatar} /> : <Ionicons name="person-circle-outline" size={43} color={colors.primary} />}
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: colors.text.primary, fontWeight: "800" }}>@{player.username}</Text>
      <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{player.team_name ?? "Club sin elegir"}</Text>
    </View>
    <Text style={{ color: colors.primary, fontWeight: "900" }}>{player.hits} aciertos</Text>
    <Ionicons name="chevron-forward" size={17} color={colors.text.secondary} />
  </Pressable>;
}

const styles = StyleSheet.create({ content: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 130, gap: 16 },
  title: { fontSize: 31, fontWeight: "900" }, tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 11 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 7 }, number: { fontSize: 26, fontWeight: "900" },
  jacketCard: { borderRadius: 20, borderWidth: 1.5, padding: 18, gap: 9, overflow: "hidden" },
  jacketHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  jacketEyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  jacketTitle: { fontSize: 21, fontWeight: "900" },
  jacketDescription: { fontSize: 13, lineHeight: 19 },
  jacketStage: { width: 260, height: 250, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  jacketImage: { width: "100%", height: "100%", resizeMode: "contain" },
  jacketCrestFrame: { position: "absolute", left: "60%", top: "25%", width: 31, height: 31, borderRadius: 6, padding: 3, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  jacketCrest: { width: "100%", height: "100%", resizeMode: "contain" },
  jacketProgressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  jacketProgressFill: { height: "100%", borderRadius: 4 },
  jacketStatus: { fontSize: 13, fontWeight: "800" },
  heading: { fontSize: 20, fontWeight: "900" }, search: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  player: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  position: { width: 22, fontWeight: "900", textAlign: "center" }, avatar: { width: 40, height: 40, borderRadius: 20 },
});
