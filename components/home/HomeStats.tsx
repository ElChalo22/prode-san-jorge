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

type Props = { played: number | null; wins: number | null; hits: number | null; won: number | null };

export default function HomeStats({ played, wins, hits, won }: Props) {
  const stats: Stat[] = [
  {
    icon: "football-outline",
    title: "Prodes jugados",
    value: played === null ? "—" : String(played),
  },
  {
    icon: "trophy-outline",
    title: "Fechas ganadas",
    value: wins === null ? "—" : String(wins),
  },
  {
    icon: "checkmark-circle-outline",
    title: "Aciertos",
    value: hits === null ? "—" : String(hits),
  },
  {
    icon: "cash-outline",
    title: "Ganado",
    value: won === null ? "—" : `ARS ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(won)}`,
  },
];

  return (
    <>
      <Text style={styles.title}>
        Tus estadísticas
      </Text>

      {played === null && <Text style={styles.guest}>Iniciá sesión para ver tus estadísticas.</Text>}
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
  guest: { color: lightColors.text.secondary, marginBottom: spacing.md },
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