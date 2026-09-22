import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

type ProdeGame = {
  id: string;
  name: string;
  status: string;
  closes_at: string;
};

type ParticipationRow = {
  id: string;
  user_id: string;
  hits: number | null;
  processed_matches: number | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type RankingEntry = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  hits: number;
  processedMatches: number;
  position: number;
};

const COLORS = {
  light: {
    background: "#F4F6F8",
    card: "#FFFFFF",
    cardSecondary: "#F8FAFC",
    text: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    primary: "#2563EB",
    primarySoft: "#DBEAFE",
    podium: "#FFF7D6",
    success: "#16A34A",
    error: "#DC2626",
  },
  dark: {
    background: "#090E18",
    card: "#121A28",
    cardSecondary: "#182233",
    text: "#F8FAFC",
    muted: "#94A3B8",
    border: "#253247",
    primary: "#60A5FA",
    primarySoft: "#172B4D",
    podium: "#332A13",
    success: "#4ADE80",
    error: "#F87171",
  },
};

function formatProcessedMatches(value: number) {
  if (value === 1) {
    return "1 partido";
  }

  return `${value} partidos`;
}

function getPositionLabel(position: number) {
  if (position === 1) {
    return "🥇";
  }

  if (position === 2) {
    return "🥈";
  }

  if (position === 3) {
    return "🥉";
  }

  return String(position);
}

export default function RankingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [games, setGames] = useState<ProdeGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) ?? null,
    [games, selectedGameId]
  );

  const loadGames = useCallback(async () => {
    const { data, error: gamesError } = await supabase
      .from("prode_games")
      .select("id, name, status, closes_at")
      .order("closes_at", { ascending: false })
      .limit(10);

    if (gamesError) {
      throw gamesError;
    }

    const loadedGames = (data ?? []) as ProdeGame[];

    setGames(loadedGames);

    setSelectedGameId((currentGameId) => {
      if (
        currentGameId &&
        loadedGames.some((game) => game.id === currentGameId)
      ) {
        return currentGameId;
      }

      return loadedGames[0]?.id ?? null;
    });
  }, []);

  const loadRanking = useCallback(async (gameId: string) => {
    setLoadingRanking(true);
    setError(null);

    try {
      const { data: participationData, error: participationError } =
        await supabase
          .from("participations")
          .select("id, user_id, hits, processed_matches")
          .eq("prode_game_id", gameId)
          .eq("status", "confirmed")
          .order("hits", { ascending: false })
          .order("processed_matches", { ascending: false });

      if (participationError) {
        throw participationError;
      }

      const participations =
        (participationData ?? []) as ParticipationRow[];

      if (participations.length === 0) {
        setRanking([]);
        return;
      }

      const userIds = [...new Set(participations.map((row) => row.user_id))];

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      if (profileError) {
        throw profileError;
      }

      const profiles = (profileData ?? []) as ProfileRow[];

      const profileById = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const sortedParticipants = [...participations].sort((a, b) => {
        const hitsDifference = (b.hits ?? 0) - (a.hits ?? 0);

        if (hitsDifference !== 0) {
          return hitsDifference;
        }

        return (
          (b.processed_matches ?? 0) - (a.processed_matches ?? 0)
        );
      });

      let previousHits: number | null = null;
      let previousPosition = 0;

      const mappedRanking: RankingEntry[] = sortedParticipants.map(
        (participation, index) => {
          const hits = participation.hits ?? 0;
          const profile = profileById.get(participation.user_id);

          const position =
            previousHits === hits ? previousPosition : index + 1;

          previousHits = hits;
          previousPosition = position;

          return {
            id: participation.id,
            userId: participation.user_id,
            username:
              profile?.username?.trim() ||
              `Jugador ${index + 1}`,
            avatarUrl: profile?.avatar_url ?? null,
            hits,
            processedMatches:
              participation.processed_matches ?? 0,
            position,
          };
        }
      );

      setRanking(mappedRanking);
    } catch (caughtError) {
      console.error("Error al cargar el ranking:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo cargar el ranking."
      );

      setRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoadingGames(true);
    setError(null);

    try {
      await loadGames();
    } catch (caughtError) {
      console.error("Error al cargar los prodes:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudieron cargar los prodes."
      );
    } finally {
      setLoadingGames(false);
    }
  }, [loadGames]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      await loadGames();

      if (selectedGameId) {
        await loadRanking(selectedGameId);
      }
    } catch (caughtError) {
      console.error("Error al actualizar el ranking:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo actualizar el ranking."
      );
    } finally {
      setRefreshing(false);
    }
  }, [loadGames, loadRanking, selectedGameId]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!selectedGameId) {
      setRanking([]);
      return;
    }

    void loadRanking(selectedGameId);
  }, [loadRanking, selectedGameId]);

  useEffect(() => {
    if (!selectedGameId) {
      return;
    }

    const channel = supabase
      .channel(`ranking-${selectedGameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participations",
          filter: `prode_game_id=eq.${selectedGameId}`,
        },
        () => {
          void loadRanking(selectedGameId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadRanking, selectedGameId]);

  const renderRankingEntry = ({
    item,
  }: {
    item: RankingEntry;
  }) => {
    const isPodium = item.position <= 3;

    return (
      <View
        style={[
          styles.rankingCard,
          {
            backgroundColor: isPodium
              ? colors.podium
              : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.positionContainer}>
          <Text
            style={[
              styles.positionText,
              { color: colors.text },
            ]}
          >
            {getPositionLabel(item.position)}
          </Text>
        </View>

        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <Text
              style={[
                styles.avatarText,
                { color: colors.primary },
              ]}
            >
              {item.username.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={styles.playerInformation}>
          <Text
            numberOfLines={1}
            style={[
              styles.username,
              { color: colors.text },
            ]}
          >
            {item.username}
          </Text>

          <Text
            style={[
              styles.processedMatches,
              { color: colors.muted },
            ]}
          >
            {formatProcessedMatches(item.processedMatches)}
          </Text>
        </View>

        <View style={styles.hitsContainer}>
          <Text
            style={[
              styles.hitsNumber,
              { color: colors.success },
            ]}
          >
            {item.hits}
          </Text>

          <Text
            style={[
              styles.hitsLabel,
              { color: colors.muted },
            ]}
          >
            aciertos
          </Text>
        </View>
      </View>
    );
  };

  if (loadingGames) {
    return (
      <View
        style={[
          styles.centeredContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            { color: colors.muted },
          ]}
        >
          Cargando ranking...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: colors.text },
          ]}
        >
          Ranking
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: colors.muted },
          ]}
        >
          La tabla se actualiza automáticamente con cada resultado.
        </Text>
      </View>

      {games.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gameSelector}
        >
          {games.map((game) => {
            const isSelected = game.id === selectedGameId;

            return (
              <Pressable
                key={game.id}
                onPress={() => setSelectedGameId(game.id)}
                style={[
                  styles.gameButton,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.card,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.gameButtonText,
                    {
                      color: isSelected
                        ? "#FFFFFF"
                        : colors.text,
                    },
                  ]}
                >
                  {game.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {selectedGame ? (
        <View
          style={[
            styles.selectedGameCard,
            {
              backgroundColor: colors.cardSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.selectedGameName,
              { color: colors.text },
            ]}
          >
            {selectedGame.name}
          </Text>

          <Text
            style={[
              styles.selectedGameStatus,
              { color: colors.muted },
            ]}
          >
            {ranking.length} participantes confirmados
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={[
            styles.messageCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.errorText,
              { color: colors.error },
            ]}
          >
            {error}
          </Text>

          <Pressable
            onPress={() => void handleRefresh()}
            style={[
              styles.retryButton,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.retryButtonText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : loadingRanking ? (
        <View style={styles.rankingLoader}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item) => item.id}
          renderItem={renderRankingEntry}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            ranking.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View
              style={[
                styles.messageCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.emptyIcon}>🏆</Text>

              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.text },
                ]}
              >
                Todavía no hay posiciones
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: colors.muted },
                ]}
              >
                El ranking aparecerá cuando haya participantes
                confirmados en este prode.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 58,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
  },
  gameSelector: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  gameButton: {
    maxWidth: 220,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 17,
    borderRadius: 21,
    borderWidth: 1,
  },
  gameButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  selectedGameCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 15,
    borderWidth: 1,
  },
  selectedGameName: {
    fontSize: 16,
    fontWeight: "800",
  },
  selectedGameStatus: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
  },
  rankingLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 120,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  rankingCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 17,
    borderWidth: 1,
  },
  positionContainer: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  positionText: {
    fontSize: 20,
    fontWeight: "900",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 19,
    fontWeight: "900",
  },
  playerInformation: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: "800",
  },
  processedMatches: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "500",
  },
  hitsContainer: {
    minWidth: 66,
    alignItems: "flex-end",
  },
  hitsNumber: {
    fontSize: 23,
    fontWeight: "900",
  },
  hitsLabel: {
    marginTop: -2,
    fontSize: 11,
    fontWeight: "600",
  },
  messageCard: {
    marginHorizontal: 20,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
  },
  emptyIcon: {
    marginBottom: 10,
    fontSize: 38,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    maxWidth: 290,
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});