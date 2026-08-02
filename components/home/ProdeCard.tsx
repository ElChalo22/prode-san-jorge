// CMP-002

import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { lightColors, spacing } from "../../theme";
import Card from "../common/Card";

type Props = {
  emoji: string;
  title: string;
  description: string;
  jackpot: string;
  players: number;
  countdown: string;
  onPress: () => void;
};

export default function ProdeCard({
  emoji,
  title,
  description,
  jackpot,
  players,
  countdown,
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {emoji} {title}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={22}
            color={lightColors.text.secondary}
          />
        </View>

        <Text style={styles.description}>
          {description}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>💰 Pozo</Text>
          <Text style={styles.value}>{jackpot}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>👥 Jugadores</Text>
          <Text style={styles.value}>{players}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>⏳ Cierra en</Text>
          <Text style={styles.countdown}>{countdown}</Text>
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