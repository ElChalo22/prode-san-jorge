// CMP-005

import { StyleSheet, Text, View } from "react-native";

import { lightColors, spacing } from "../../theme";
import Card from "../common/Card";

const ranking = [
  {
    position: 1,
    username: "ElTano22",
    hits: 12,
  },
  {
    position: 2,
    username: "MarceGol",
    hits: 11,
  },
  {
    position: 3,
    username: "Fede10",
    hits: 10,
  },
];

export default function HomeRanking() {
  return (
    <>
      <Text style={styles.title}>
        Última fecha
      </Text>

      <Card>
        {ranking.map((player) => (
          <View
            key={player.position}
            style={styles.row}
          >
            <Text style={styles.position}>
              #{player.position}
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