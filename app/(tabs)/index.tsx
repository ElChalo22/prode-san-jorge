import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
useEffect(() => {
  const testSupabaseConnection = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .limit(1);

    console.log("SUPABASE DATA:", data);
    console.log("SUPABASE ERROR:", error);
  };

  testSupabaseConnection();
}, []);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, Chalo 👋</Text>
            <Text style={styles.appName}>Prode San Jorge</Text>
          </View>

          <Pressable style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={23} color="#111" />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* Torneo activo */}
        <View style={styles.heroCard}>
          <View style={styles.activeRow}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>TORNEO ACTIVO</Text>
          </View>

          <Text style={styles.tournamentName}>Liga Clausura 2026</Text>
          <Text style={styles.matchday}>Fecha 8</Text>

          <View style={styles.divider} />

          <Text style={styles.closesLabel}>La fecha cierra en</Text>
          <Text style={styles.countdown}>03 : 12 : 45</Text>
          <Text style={styles.countdownLabels}>HORAS · MINUTOS · SEGUNDOS</Text>

          <Pressable style={styles.primaryButton}>
            <Ionicons name="football-outline" size={21} color="#FFF" />
            <Text style={styles.primaryButtonText}>
              Hacer mis pronósticos
            </Text>
          </Pressable>
        </View>

        {/* Resumen */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mi rendimiento</Text>
          <Text style={styles.sectionLink}>Ver ranking</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="podium-outline" size={23} color="#111" />
            <Text style={styles.statValue}>#4</Text>
            <Text style={styles.statLabel}>Posición</Text>
            <Text style={styles.positiveText}>▲ 3 puestos</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={23} color="#111" />
            <Text style={styles.statValue}>126</Text>
            <Text style={styles.statLabel}>Puntos</Text>
            <Text style={styles.secondaryText}>Esta temporada</Text>
          </View>
        </View>

        {/* Próximo partido */}
        <Text style={styles.sectionTitle}>Próximo partido</Text>

        <View style={styles.matchCard}>
          <Text style={styles.matchCompetition}>Liga Profesional · Fecha 8</Text>

          <View style={styles.teamsRow}>
            <View style={styles.team}>
              <View style={styles.teamShield}>
                <Text style={styles.shieldText}>R</Text>
              </View>
              <Text style={styles.teamName}>River</Text>
            </View>

            <View style={styles.matchInfo}>
              <Text style={styles.matchTime}>21:30</Text>
              <Text style={styles.matchDate}>Sábado 2 ago.</Text>
            </View>

            <View style={styles.team}>
              <View style={styles.teamShield}>
                <Text style={styles.shieldText}>B</Text>
              </View>
              <Text style={styles.teamName}>Boca</Text>
            </View>
          </View>
        </View>

        {/* Premio */}
        <View style={styles.prizeCard}>
          <View>
            <Text style={styles.prizeLabel}>Premio acumulado</Text>
            <Text style={styles.prizeValue}>$135.000</Text>
          </View>

          <View style={styles.prizeIcon}>
            <Ionicons name="trophy" size={28} color="#111" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 35,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  greeting: {
    fontSize: 14,
    color: "#777",
    marginBottom: 3,
  },

  appName: {
    fontSize: 25,
    fontWeight: "900",
    color: "#111",
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E53935",
  },

  heroCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    marginBottom: 28,
  },

  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  activeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22A447",
    marginRight: 8,
  },

  activeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#22A447",
  },

  tournamentName: {
    fontSize: 25,
    fontWeight: "900",
    color: "#111",
  },

  matchday: {
    fontSize: 16,
    color: "#777",
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 20,
  },

  closesLabel: {
    textAlign: "center",
    fontSize: 13,
    color: "#777",
  },

  countdown: {
    textAlign: "center",
    fontSize: 34,
    fontWeight: "900",
    color: "#111",
    marginTop: 5,
    letterSpacing: 2,
  },

  countdownLabels: {
    textAlign: "center",
    fontSize: 9,
    color: "#999",
    marginTop: 3,
    letterSpacing: 1,
  },

  primaryButton: {
    height: 56,
    borderRadius: 16,
    marginTop: 22,
    backgroundColor: "#111",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },

  primaryButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111",
    marginBottom: 13,
  },

  sectionLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#777",
    marginBottom: 13,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 17,
  },

  statValue: {
    fontSize: 27,
    fontWeight: "900",
    color: "#111",
    marginTop: 12,
  },

  statLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginTop: 1,
  },

  positiveText: {
    fontSize: 11,
    color: "#22A447",
    fontWeight: "700",
    marginTop: 9,
  },

  secondaryText: {
    fontSize: 11,
    color: "#999",
    marginTop: 9,
  },

  matchCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },

  matchCompetition: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginBottom: 18,
  },

  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  team: {
    width: 90,
    alignItems: "center",
  },

  teamShield: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EFEFEF",
    justifyContent: "center",
    alignItems: "center",
  },

  shieldText: {
    fontSize: 21,
    fontWeight: "900",
  },

  teamName: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },

  matchInfo: {
    alignItems: "center",
  },

  matchTime: {
    fontSize: 22,
    fontWeight: "900",
  },

  matchDate: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },

  prizeCard: {
    backgroundColor: "#E9E9E9",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  prizeLabel: {
    fontSize: 13,
    color: "#666",
  },

  prizeValue: {
    fontSize: 27,
    fontWeight: "900",
    color: "#111",
    marginTop: 3,
  },

  prizeIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
});