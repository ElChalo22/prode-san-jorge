// CMP-004

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { lightColors, spacing } from "../../theme";
import Card from "../common/Card";

type Stat = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
};

const stats: Stat[] = [
  {
    icon: "football-outline",
    title: "Prodes jugados",
    value: "18",
  },
  {
    icon: "trophy-outline",
    title: "Fechas ganadas",
    value: "3",
  },
  {
    icon: "checkmark-circle-outline",
    title: "Aciertos",
    value: "146",
  },
  {
    icon: "cash-outline",
    title: "Ganado",
    value: "$540.000",
  },
];

export default function HomeStats() {
  return (
    <>
      <Text style={styles.title}>
        Tus estadísticas
      </Text>

      <View style={styles.grid}>
        {stats.map((item) => (
          <Card key={item.title} style={styles.card}>
            <Ionicons
              name={item.icon}
              size={24}
              color={lightColors.primary}
            />

            <Text style={styles.value}>
              {item.value}
            </Text>

            <Text style={styles.label}>
              {item.title}
            </Text>
          </Card>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.lg,
    color: lightColors.text.primary,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    marginBottom: spacing.md,
    alignItems: "center",
  },

  value: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: spacing.md,
    color: lightColors.text.primary,
  },

  label: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: lightColors.text.secondary,
  },
});