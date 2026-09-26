// CMP-003

import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { lightColors, radius, spacing } from "../../theme";

type Props = {
  username: string;
  latestNotice?: string | null;
};

export default function HomeHeader({ username, latestNotice }: Props) {
  return (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>
            Bienvenido nuevamente
          </Text>

          <Text style={styles.username}>
            {username} 👋
          </Text>
        </View>

        <Pressable style={styles.notificationButton} onPress={() => {
          if (latestNotice) Alert.alert("Aviso de tu prode", latestNotice);
        }}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color={lightColors.text.primary}
          />

          {latestNotice && <View style={styles.dot} />}
        </Pressable>
      </View>

      <View style={styles.badgeRow}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>EN JUEGO</Text>
        </View>

        <Text style={styles.subtitle}>
          Elegí un Prode para participar
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  welcome: {
    fontSize: 14,
    color: lightColors.text.secondary,
    marginBottom: 4,
  },

  username: {
    fontSize: 28,
    fontWeight: "800",
    color: lightColors.text.primary,
  },

  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: lightColors.surface,
    borderWidth: 1,
    borderColor: lightColors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  dot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E63946",
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9F7EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: lightColors.primary,
    marginRight: 6,
  },

  liveText: {
    fontSize: 11,
    fontWeight: "800",
    color: lightColors.primary,
  },

  subtitle: {
    fontSize: 13,
    color: lightColors.text.secondary,
    fontWeight: "600",
  },
});