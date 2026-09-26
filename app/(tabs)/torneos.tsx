import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import ProdeCard from "../../components/home/ProdeCard";
import { useAppAppearance } from "../../lib/appearance";
import { useProdeStore } from "../../store/prodeStore";
import { toHomeProdeCard } from "../../utils/homeProdeCard";
import { darkColors, lightColors } from "../../theme/colors";

export default function TorneosScreen() {
  const router = useRouter();
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const games = useProdeStore((state) => state.games);
  const loading = useProdeStore((state) => state.loading);
  const refreshing = useProdeStore((state) => state.refreshing);
  const refreshGames = useProdeStore((state) => state.refreshGames);
  useFocusEffect(useCallback(() => { void refreshGames(); }, [refreshGames]));
  return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshGames()} tintColor={colors.primary} />}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Torneos</Text>
      <Text style={{ color: colors.text.secondary }}>Prodes disponibles para participar.</Text>
      {loading && games.length === 0 ? <ActivityIndicator color={colors.primary} /> : games.length === 0
        ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Todavía no hay prodes abiertos</Text>
          <Text style={{ color: colors.text.secondary }}>Cuando el equipo publique una fecha, la vas a encontrar acá.</Text>
        </View>
        : games.map((game) => <ProdeCard key={game.id} game={toHomeProdeCard(game)} onPress={() => router.push({ pathname: "/(tabs)/pronosticos", params: { gameId: game.id } })} />)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, content: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
  title: { fontSize: 31, fontWeight: "900" }, empty: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 8 }, emptyTitle: { fontSize: 17, fontWeight: "800" } });
