// CMP-005

import { StyleSheet, Text, View } from "react-native";

import { lightColors, spacing } from "../../theme";
import Card from "../common/Card";

type RankingRow = { username: string; hits: number; rank_position: number; game_name: string };

export default function HomeRanking({ ranking }: { ranking: RankingRow[] }) {
  return (
    <>
      <Text style={styles.title}>
        Última fecha
      </Text>

      <Card>
        {ranking.length === 0 && <Text style={styles.empty}>Todavía no hay una fecha con resultados.</Text>}
        {ranking.map((player) => (
          <View
            key={`${player.rank_position}-${player.username}`}
            style={styles.row}
          >
            <Text style={styles.position}>
              #{player.rank_position}
            </Text>

            <Text style={styles.username}>
              {player.username}
            </Text>

            <Text style={styles.hits}>
              {player.hits} aciertos
            </Text>
          </View>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  empty: { color: lightColors.text.secondary, paddingVertical: spacing.md },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: lightColors.text.primary,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },

  position: {
    width: 40,
    fontWeight: "800",
    color: lightColors.primary,
  },

  username: {
    flex: 1,
    fontSize: 16,
    color: lightColors.text.primary,
  },

  hits: {
    fontWeight: "700",
    color: lightColors.text.secondary,
  },
});