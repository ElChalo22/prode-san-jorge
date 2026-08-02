import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MatchCard, {
  Prediction,
} from "../../components/predictions/MatchCard";

type Match = {
  id: number;
  local: string;
  visitante: string;
};

const PARTIDOS: Match[] = [
  {
    id: 1,
    local: "River Plate",
    visitante: "Boca Juniors",
  },
  {
    id: 2,
    local: "Racing Club",
    visitante: "Independiente",
  },
  {
    id: 3,
    local: "San Lorenzo",
    visitante: "Huracán",
  },
  {
    id: 4,
    local: "Rosario Central",
    visitante: "Newell's",
  },
];

export default function PronosticosScreen() {
  const [pronosticos, setPronosticos] = useState<
    Record<number, Prediction>
  >({});

  const completados = Object.keys(pronosticos).length;
  const progreso = (completados / PARTIDOS.length) * 100;

  const seleccionarPronostico = (
    partidoId: number,
    opcion: Prediction
  ) => {
    setPronosticos((actuales) => ({
      ...actuales,
      [partidoId]: opcion,
    }));
  };

  const guardarPronosticos = () => {
    if (completados < PARTIDOS.length) {
      const faltantes = PARTIDOS.length - completados;

      Alert.alert(
        "Faltan partidos",
        `Te ${
          faltantes === 1 ? "falta" : "faltan"
        } completar ${faltantes} ${
          faltantes === 1 ? "pronóstico" : "pronósticos"
        }.`
      );

      return;
    }

    console.log("Pronósticos guardados:", pronosticos);

    Alert.alert(
      "¡Pronósticos guardados!",
      "Tus elecciones fueron registradas correctamente."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.fecha}>FECHA 1</Text>

            <Text style={styles.title}>Mis pronósticos</Text>

            <Text style={styles.subtitle}>
              Elegí ganador local, empate o ganador visitante.
            </Text>
          </View>

          <View style={styles.iconContainer}>
            <Ionicons
              name="football-outline"
              size={26}
              color="#18A558"
            />
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              Progreso de la fecha
            </Text>

            <Text style={styles.progressValue}>
              {completados}/{PARTIDOS.length}
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progreso}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.progressMessage}>
            {completados === PARTIDOS.length
              ? "¡Completaste todos los partidos!"
              : "Completá la fecha para poder guardar."}
          </Text>
        </View>

        <View style={styles.instructions}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color="#16874A"
          />

          <Text style={styles.instructionsText}>
            1 = Local · X = Empate · 2 = Visitante
          </Text>
        </View>

        {PARTIDOS.map((partido, index) => (
          <MatchCard
            key={partido.id}
            number={index + 1}
            local={partido.local}
            visitante={partido.visitante}
            selected={pronosticos[partido.id]}
            onSelect={(option) =>
              seleccionarPronostico(partido.id, option)
            }
          />
        ))}

        <Pressable
          onPress={guardarPronosticos}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
          ]}
        >
          <Ionicons
            name="save-outline"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.saveButtonText}>
            Guardar pronósticos
          </Text>
        </Pressable>

        <Text style={styles.bottomMessage}>
          Podrás modificar tus elecciones hasta el cierre de la
          fecha.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F6F7",
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 120,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  headerContent: {
    flex: 1,
    paddingRight: 12,
  },

  fecha: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 5,
  },

  title: {
    color: "#111111",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: "#707070",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },

  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  progressTitle: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "800",
  },

  progressValue: {
    color: "#18A558",
    fontSize: 15,
    fontWeight: "800",
  },

  progressBackground: {
    height: 9,
    borderRadius: 10,
    backgroundColor: "#E5E5E5",
    marginTop: 13,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#18A558",
  },

  progressMessage: {
    color: "#777777",
    fontSize: 11,
    marginTop: 9,
  },

  instructions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#EAF8EF",
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
  },

  instructionsText: {
    color: "#16874A",
    fontSize: 12,
    fontWeight: "700",
  },

  saveButton: {
    height: 57,
    borderRadius: 17,
    backgroundColor: "#18A558",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 8,
  },

  saveButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  bottomMessage: {
    color: "#777777",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
});