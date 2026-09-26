// CMP-003

import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { darkColors, lightColors, radius, spacing } from "../../theme";

import { useAppAppearance } from "../../lib/appearance";

type Props = {
  username: string;
  unreadCount: number;
  openGames: number;
  onNotifications: () => void;
  onAdmin?: () => void;
};

export default function HomeHeader({ username, unreadCount, openGames, onNotifications, onAdmin }: Props) {
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  return (
    <>
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcome, { color: colors.text.secondary }]}>
            Bienvenido nuevamente
          </Text>

          <Text style={[styles.username, { color: colors.text.primary }]} >
            {username} 👋
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityLabel="Ver notificaciones" onPress={onNotifications}
            style={[styles.notificationButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.text.primary} />
            {unreadCount > 0 && <View style={styles.dot} />}
          </Pressable>
          {onAdmin && <Pressable accessibilityLabel="Administración" onPress={onAdmin}
            style={[styles.notificationButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={23} color={colors.primary} />
          </Pressable>}
        </View>
      </View>

      <View style={styles.badgeRow}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{openGames} {openGames === 1 ? "PRODE ABIERTO" : "PRODES ABIERTOS"}</Text>
        </View>

        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Elegí un Prode para participar
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8 },
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