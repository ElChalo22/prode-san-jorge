import { useRouter } from "expo-router";
import { useEffect } from "react";
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
import { lightColors } from "../../theme";
import { toHomeProdeCard } from "../../utils/homeProdeCard";

export default function HomeScreen() {
  const router = useRouter();

  const games = useProdeStore((state) => state.games);
  const loading = useProdeStore((state) => state.loading);
  const refreshing = useProdeStore((state) => state.refreshing);
  const error = useProdeStore((state) => state.error);
  const loadGames = useProdeStore((state) => state.loadGames);
  const refreshGames = useProdeStore((state) => state.refreshGames);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const homeGames = games.map(toHomeProdeCard);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshGames}
          />
        }
      >
        <HomeHeader username="Chalo" />

        {loading && (
          <View style={styles.feedback}>
            <ActivityIndicator size="large" />
            <Text style={styles.feedbackText}>
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
            <Text style={styles.feedbackText}>
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

        <HomeStats />

        <HomeRanking />
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