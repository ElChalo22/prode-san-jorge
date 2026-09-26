import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { darkColors, lightColors } from "../../theme/colors";
import { useAppAppearance } from "../../lib/appearance";

type Profile = { username: string | null; full_name: string | null; avatar_url: string | null; favorite_team_id: string | null };
type FavoriteTeam = { id: string; name: string; logo_url: string | null };
type Participation = {
  id: string;
  status: string;
  hits: number | null;
  processed_matches: number | null;
  prode_games: { name: string } | { name: string }[] | null;
};

const REWARD_MILESTONES = [50, 125] as const;

export default function PerfilScreen() {
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [favoriteTeam, setFavoriteTeam] = useState<FavoriteTeam | null>(null);
  const load = useCallback(async () => {
    try {
      setError(null);
      const { data: auth, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!auth.session?.user) {
        setSignedIn(false);
        setProfile(null);
        setParticipations([]);
        setFavoriteTeam(null);
        return;
      }
      const userId = auth.session.user.id;
      setSignedIn(true);
      const [profileResult, participationResult] = await Promise.all([
        supabase.from("profiles").select("username, full_name, avatar_url, favorite_team_id").eq("id", userId).single(),
        supabase.from("participations")
          .select("id, status, hits, processed_matches, prode_games(name)")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (participationResult.error) throw participationResult.error;
      setProfile(profileResult.data);
      if (profileResult.data.favorite_team_id) {
        const { data: selected } = await supabase.from("teams").select("id,name,logo_url")
          .eq("id", profileResult.data.favorite_team_id).maybeSingle();
        setFavoriteTeam(selected);
      } else setFavoriteTeam(null);
      setParticipations((participationResult.data ?? []) as Participation[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el perfil.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const signOut = () => Alert.alert("Cerrar sesión", "¿Querés salir de tu cuenta?", [
    { text: "Cancelar", style: "cancel" },
    { text: "Cerrar sesión", style: "destructive", onPress: async () => {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) Alert.alert("No pudimos cerrar sesión", signOutError.message);
      else router.replace("/onboarding/welcome");
    } },
  ]);

  const displayProfile = profile;
  const displayParticipations = participations;
  const confirmed = displayParticipations.filter((item) => item.status === "confirmed");
  const totalHits = confirmed.reduce((sum, item) => sum + (item.hits ?? 0), 0);
  const nextMilestone = REWARD_MILESTONES.find((target) => totalHits < target);
  const previousMilestone = nextMilestone === 125 ? 50 : 0;
  const rewardProgress = nextMilestone
    ? Math.max(0, Math.min(1, (totalHits - previousMilestone) / (nextMilestone - previousMilestone)))
    : 1;
  const username = displayProfile?.username?.trim() || "Jugador";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
    >
      <Text style={[styles.title, { color: colors.text.primary }]}>Mi perfil</Text>
      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : null}
      {error ? <Text style={[styles.message, { color: colors.danger }]}>{error}</Text> : null}
      {!loading && !error && !signedIn ? (
        <View style={[styles.previewBanner, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
          <View style={styles.rowName}>
            <Text style={[styles.previewTitle, { color: colors.text.primary }]}>Ingresá a tu cuenta</Text>
            <Text style={[styles.message, { color: colors.text.secondary }]}>Consultá tu apodo, tus aciertos y los prodes que jugaste.</Text>
            <Pressable onPress={() => router.push("/onboarding/login")} style={[styles.loginButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.loginButtonText}>Iniciar sesión o registrarme</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {displayProfile ? <>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {displayProfile.avatar_url ? <Image source={{ uri: displayProfile.avatar_url }} style={styles.avatarImage} />
              : <Text style={[styles.initial, { color: colors.primary }]}>{username[0].toUpperCase()}</Text>}
          </View>
          <Text style={[styles.username, { color: colors.text.primary }]}>@{username}</Text>
          <Text style={[styles.hint, { color: colors.text.secondary }]}>Tu nombre público en el prode</Text>
          <View style={[styles.team, { backgroundColor: colors.background }]}>
            {favoriteTeam?.logo_url ? <Image source={{ uri: favoriteTeam.logo_url }} style={styles.teamLogo} />
              : <Ionicons name="shield-outline" size={24} color={colors.primary} />}
            <Text style={{ color: colors.text.primary, fontWeight: "700" }}>
              {favoriteTeam?.name ?? "Club sin elegir"}
            </Text>
          </View>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="trophy-outline" size={28} color={colors.primary} />
          <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalHits} aciertos</Text>
          <Text style={[styles.summaryCaption, { color: colors.text.secondary }]}>
            de {confirmed.length} {confirmed.length === 1 ? "prode jugado" : "prodes jugados"}
          </Text>
        </View>
        <View style={[styles.rewardsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.rewardsHeading}>
            <Ionicons name="gift-outline" size={23} color={colors.primary} />
            <Text style={[styles.rewardsTitle, { color: colors.text.primary }]}>Premios por aciertos</Text>
          </View>
          <Text style={[styles.rewardsDescription, { color: colors.text.secondary }]}>
            {nextMilestone
              ? `Te faltan ${nextMilestone - totalHits} aciertos para llegar a ${nextMilestone}.`
              : "Alcanzaste todas las metas anunciadas."}
          </Text>
          <View style={[styles.rewardTrack, { backgroundColor: colors.background }]}>
            <View style={[styles.rewardFill, { width: `${rewardProgress * 100}%`, backgroundColor: colors.primary }]} />
          </View>
          {REWARD_MILESTONES.map((target) => {
            const reached = totalHits >= target;
            return <View key={target} style={[styles.rewardRow, { borderTopColor: colors.border }]}>
              <Ionicons name={reached ? "checkmark-circle" : "lock-closed-outline"} size={21} color={reached ? colors.primary : colors.text.secondary} />
              <View style={styles.rowName}>
                <Text style={[styles.rewardName, { color: colors.text.primary }]}>{target} aciertos</Text>
                <Text style={[styles.rewardDetail, { color: colors.text.secondary }]}>
                  {reached ? "Meta alcanzada" : "Premio por anunciar"}
                </Text>
              </View>
            </View>;
          })}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Mis fechas</Text>
        {displayParticipations.length === 0 ? <Text style={[styles.message, { color: colors.text.secondary }]}>Todavía no participaste en ningún prode.</Text>
          : displayParticipations.map((item) => {
            const game = Array.isArray(item.prode_games) ? item.prode_games[0] : item.prode_games;
            return <View key={item.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rowName}>
                <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text.primary }]}>{game?.name ?? "Prode"}</Text>
                <Text style={{ color: colors.text.secondary }}>{item.status === "confirmed" ? "Participación confirmada" : "Participación pendiente"}</Text>
              </View>
              <Text style={[styles.rowHits, { color: colors.primary }]}>
                {item.status === "confirmed" ? `${item.hits ?? 0} ${(item.hits ?? 0) === 1 ? "acierto" : "aciertos"}` : "—"}
              </Text>
            </View>;
          })}
        <View style={[styles.privateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.text.secondary} />
          <View style={styles.rowName}>
            <Text style={[styles.rowTitle, { color: colors.text.primary }]}>Datos de verificación</Text>
            <Text style={{ color: colors.text.secondary }}>{displayProfile.full_name || "Nombre real aún no cargado"}</Text>
            <Text style={[styles.privateHint, { color: colors.text.secondary }]}>No se muestra en esta pantalla a otros jugadores.</Text>
          </View>
        </View>
        <Pressable onPress={signOut} style={[styles.signOut, { borderColor: colors.danger }]}>
          <Ionicons name="log-out-outline" size={21} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: "800" }}>Cerrar sesión</Text>
        </Pressable>
      </> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 120, gap: 14 },
  title: { fontSize: 32, fontWeight: "900", marginBottom: 4 },
  hero: { borderWidth: 1, borderRadius: 22, padding: 22, alignItems: "center" },
  avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  initial: { fontSize: 38, fontWeight: "900" },
  username: { fontSize: 24, fontWeight: "900", marginTop: 12 },
  hint: { fontSize: 13, marginTop: 4 },
  previewBanner: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  previewTitle: { fontSize: 15, fontWeight: "800" },
  loginButton: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  loginButtonText: { color: "#FFFFFF", fontWeight: "800" },
  teamLogo: { width: 30, height: 30, resizeMode: "contain" },
  signOut: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 15, borderWidth: 1, borderRadius: 14, marginTop: 12 },
  team: { marginTop: 18, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  summaryCard: { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: "center", gap: 4 },
  summaryNumber: { fontSize: 28, fontWeight: "900", marginTop: 4 },
  summaryCaption: { fontSize: 15, fontWeight: "600" },
  rewardsCard: { borderWidth: 1, borderRadius: 18, padding: 18 },
  rewardsHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  rewardsTitle: { fontSize: 18, fontWeight: "800" },
  rewardsDescription: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  rewardTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 14, marginBottom: 14 },
  rewardFill: { height: "100%", borderRadius: 4 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, paddingVertical: 12 },
  rewardName: { fontSize: 15, fontWeight: "800" },
  rewardDetail: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginTop: 8 },
  row: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  rowName: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 15, fontWeight: "800" },
  rowHits: { fontSize: 18, fontWeight: "900" },
  privateCard: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", gap: 12 },
  privateHint: { fontSize: 12, marginTop: 4 },
  message: { fontSize: 14, lineHeight: 20 },
});
