import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { lightColors, spacing } from "../../theme";
import type { HomeProdeCard } from "../../types/home";
import Card from "../common/Card";

type Props = {
  game: HomeProdeCard;
  onPress: () => void;
};

export default function ProdeCard({ game, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {game.emoji} {game.title}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={22}
            color={lightColors.text.secondary}
          />
        </View>

        <Text style={styles.description}>
          {game.description}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>🎟️ Entrada</Text>
          <Text style={styles.value}>{game.entryFee}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>💰 Pozo</Text>
          <Text style={styles.value}>{game.jackpot}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>👥 Jugadores</Text>
          <Text style={styles.value}>{game.players}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>⏳ Cierra en</Text>
          <Text style={styles.countdown}>{game.countdown}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: lightColors.text.primary,
  },

  description: {
    fontSize: 14,
    color: lightColors.text.secondary,
    marginBottom: spacing.lg,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  label: {
    fontSize: 14,
    color: lightColors.text.secondary,
  },

  value: {
    fontSize: 15,
    fontWeight: "700",
    color: lightColors.text.primary,
  },

  countdown: {
    fontSize: 15,
    fontWeight: "800",
    color: lightColors.primary,
  },
});
