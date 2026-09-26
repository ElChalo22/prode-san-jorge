import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import HomeHeader from "../../components/home/HomeHeader";
import HomeRanking from "../../components/home/HomeRanking";
import HomeStats from "../../components/home/HomeStats";
import ProdeCard from "../../components/home/ProdeCard";

import { useProdeStore } from "../../store/prodeStore";
import { supabase } from "../../lib/supabase";
import { darkColors, lightColors } from "../../theme";
import { useAppAppearance } from "../../lib/appearance";
import { toHomeProdeCard } from "../../utils/homeProdeCard";

type RankingRow = { game_name: string; username: string; hits: number; rank_position: number };
type PlayerStats = { played: number | null; hits: number | null; wins: number | null; won: number | null };

export default function HomeScreen() {
  const router = useRouter();
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [staff, setStaff] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [username, setUsername] = useState("Jugador");
  const [playerStats, setPlayerStats] = useState<PlayerStats>({ played: null, hits: null, wins: null, won: null });
  const [ranking, setRanking] = useState<RankingRow[]>([]);


  const loadHomeData = useCallback(async () => {
    try {
      const { data: latest, error: rankingError } = await supabase.rpc("latest_home_ranking");
      if (rankingError) throw rankingError;
      setRanking(latest ?? []);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUsername("Jugador");
        setPlayerStats({ played: null, hits: null, wins: null, won: null });
        setUnreadCount(0);
        setStaff(false);
        return;
      }
      const [profile, entries, notice] = await Promise.all([
        supabase.from("profiles").select("username,role").eq("id", user.id).single(),
        supabase.from("participations").select("id,hits").eq("user_id", user.id).eq("status", "confirmed"),
        supabase.from("player_notifications").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).is("read_at", null),
      ]);
      if (profile.error || entries.error || notice.error) throw profile.error ?? entries.error ?? notice.error;
      setUsername(profile.data.username?.trim() || "Jugador");
      setUnreadCount(notice.count ?? 0);
      setStaff(profile.data.role === "admin" || profile.data.role === "superadmin");
      const confirmed = entries.data ?? [];
      const { data: awards, error: awardsError } = confirmed.length
        ? await supabase.from("winners").select("prode_game_id,prize_amount").in("participation_id", confirmed.map((entry) => entry.id))
        : { data: [], error: null };
      if (awardsError) throw awardsError;
      setPlayerStats({ played: confirmed.length,
        hits: confirmed.reduce((sum, entry) => sum + (entry.hits ?? 0), 0),
        wins: new Set((awards ?? []).map((award) => award.prode_game_id)).size,
        won: (awards ?? []).reduce((sum, award) => sum + Number(award.prize_amount), 0),
      });
    } catch (caught) {
      console.error("No se pudieron cargar las estadísticas del inicio:", caught);
    }
  }, []);

  const games = useProdeStore((state) => state.games);
  const loading = useProdeStore((state) => state.loading);
  const refreshing = useProdeStore((state) => state.refreshing);
  const error = useProdeStore((state) => state.error);
  const refreshGames = useProdeStore((state) => state.refreshGames);

  useFocusEffect(useCallback(() => {
    void refreshGames();
    void loadHomeData();
  }, [refreshGames, loadHomeData]));

  const homeGames = games.map(toHomeProdeCard);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void refreshGames(); void loadHomeData(); }}
          />
        }
      >
        <HomeHeader username={username} unreadCount={unreadCount} openGames={games.length}
          onNotifications={() => router.push("/notifications")}
          onAdmin={staff ? () => router.push("/administracion") : undefined} />

        {loading && (
          <View style={styles.feedback}>
            <ActivityIndicator size="large" />
            <Text style={[styles.feedbackText, { color: colors.text.secondary }]}>
              Cargando prodes...
            </Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.feedback}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && homeGames.length === 0 && (
          <View style={styles.feedback}>
            <Text style={[styles.feedbackText, { color: colors.text.secondary }]}>
              No hay prodes abiertos en este momento.
            </Text>
          </View>
        )}

        {homeGames.map((game) => (
          <ProdeCard
            key={game.id}
            game={game}
            onPress={() =>
              router.push({
                pathname: "/pronosticos",
                params: {
                  gameId: game.id,
                },
              })
            }
          />
        ))}

        <HomeStats {...playerStats} />

        <HomeRanking ranking={ranking} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7F8",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
  },

  feedback: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },

  feedbackText: {
    marginTop: 12,
    fontSize: 15,
    textAlign: "center",
    color: lightColors.text.secondary,
  },

  errorText: {
    fontSize: 15,
    textAlign: "center",
    color: "#C62828",
  },
});