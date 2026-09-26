import { useAppAppearance } from "../../lib/appearance";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { darkColors, lightColors, spacing } from "../../theme";
import type { HomeProdeCard } from "../../types/home";
import Card from "../common/Card";

type Props = {
  game: HomeProdeCard;
  onPress: () => void;
};

export default function ProdeCard({ game, onPress }: Props) {
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {game.emoji} {game.title}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={22}
            color={colors.text.secondary}
          />
        </View>

        <Text style={[styles.description, { color: colors.text.secondary }]}>
          {game.description}
        </Text>

        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>🎟️ Entrada</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>{game.entryFee}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>💰 Pozo</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>{game.jackpot}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>👥 Jugadores</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>{game.players}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>⏳ Cierra en</Text>
          <Text style={[styles.countdown, { color: colors.primary }]}>{game.countdown}</Text>
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
