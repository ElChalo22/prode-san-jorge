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
  isDoublePrediction,
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

/*
  Valor temporal para pruebas.

  Más adelante vendrá desde Supabase y podrá ser modificado
  fácilmente por el administrador para cada fecha.
*/
const MAX_DOBLES_POR_USUARIO = 2;

export default function PronosticosScreen() {
  const [pronosticos, setPronosticos] = useState<
    Record<number, Prediction>
  >({});

  const completados = Object.keys(pronosticos).length;

  const doblesUsados = Object.values(pronosticos).filter(
    isDoublePrediction
  ).length;

  const progreso =
    PARTIDOS.length === 0
      ? 0
      : (completados / PARTIDOS.length) * 100;

  const progresoDobles =
    MAX_DOBLES_POR_USUARIO === 0
      ? 0
      : (doblesUsados / MAX_DOBLES_POR_USUARIO) * 100;

  const limiteDoblesAlcanzado =
    doblesUsados >= MAX_DOBLES_POR_USUARIO;

  const seleccionarPronostico = (
    partidoId: number,
    opcion: Prediction
  ) => {
    setPronosticos((actuales) => ({
      ...actuales,
      [partidoId]: opcion,
    }));
  };

  const mostrarAvisoLimiteDobles = () => {
    Alert.alert(
      "Límite alcanzado",
      `Solo podés usar doble oportunidad en ${
        MAX_DOBLES_POR_USUARIO
      } ${
        MAX_DOBLES_POR_USUARIO === 1
          ? "partido"
          : "partidos"
      } de esta fecha.`
    );
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
              Elegí el resultado que creés que tendrá cada partido.
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

        {MAX_DOBLES_POR_USUARIO > 0 && (
          <View style={styles.doubleCard}>
            <View style={styles.doubleHeader}>
              <View style={styles.doubleTitleContainer}>
                <View style={styles.doubleIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={21}
                    color="#9A6513"
                  />
                </View>

                <View>
                  <Text style={styles.doubleLabel}>
                    DOBLE OPORTUNIDAD
                  </Text>

                  <Text style={styles.doubleTitle}>
                    Dobles disponibles
                  </Text>
                </View>
              </View>

              <Text style={styles.doubleCounter}>
                {doblesUsados}/{MAX_DOBLES_POR_USUARIO}
              </Text>
            </View>

            <Text style={styles.doubleDescription}>
              Podés elegir dos posibles resultados en hasta{" "}
              {MAX_DOBLES_POR_USUARIO}{" "}
              {MAX_DOBLES_POR_USUARIO === 1
                ? "partido"
                : "partidos"}{" "}
              de esta fecha.
            </Text>

            <View style={styles.doubleProgressBackground}>
              <View
                style={[
                  styles.doubleProgressFill,
                  {
                    width: `${Math.min(
                      progresoDobles,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.doubleMessage}>
              {limiteDoblesAlcanzado
                ? "Ya utilizaste todos los dobles disponibles."
                : `Todavía podés usar ${
                    MAX_DOBLES_POR_USUARIO - doblesUsados
                  } ${
                    MAX_DOBLES_POR_USUARIO -
                      doblesUsados ===
                    1
                      ? "doble"
                      : "dobles"
                  }.`}
            </Text>
          </View>
        )}

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
            onSelect={(opcion) =>
              seleccionarPronostico(partido.id, opcion)
            }
            showDoubleOptions={MAX_DOBLES_POR_USUARIO > 0}
            doubleLimitReached={limiteDoblesAlcanzado}
            onDoubleLimitReached={mostrarAvisoLimiteDobles}
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

  doubleCard: {
    backgroundColor: "#FFF9EA",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EED89D",
  },

  doubleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  doubleTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  doubleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF0C7",
    alignItems: "center",
    justifyContent: "center",
  },

  doubleLabel: {
    color: "#9A6513",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  doubleTitle: {
    color: "#5E430F",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },

  doubleCounter: {
    color: "#9A6513",
    fontSize: 20,
    fontWeight: "900",
  },

  doubleDescription: {
    color: "#7B641F",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 13,
  },

  doubleProgressBackground: {
    height: 8,
    borderRadius: 10,
    backgroundColor: "#F0E0B4",
    marginTop: 12,
    overflow: "hidden",
  },

  doubleProgressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#B7791F",
  },

  doubleMessage: {
    color: "#8A6B20",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 8,
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