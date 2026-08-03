import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type Prediction = "1" | "X" | "2" | "1X" | "X2";

type MatchCardProps = {
  number: number;
  local: string;
  visitante: string;
  selected?: Prediction;
  onSelect: (prediction: Prediction) => void;
  showDoubleOptions?: boolean;
  doubleLimitReached?: boolean;
  onDoubleLimitReached?: () => void;
};

export const isDoublePrediction = (
  prediction?: Prediction
) => prediction === "1X" || prediction === "X2";

export default function MatchCard({
  number,
  local,
  visitante,
  selected,
  onSelect,
  showDoubleOptions = false,
  doubleLimitReached = false,
  onDoubleLimitReached,
}: MatchCardProps) {
  const seleccionar = (prediction: Prediction) => {
    const seleccionActualEsDoble =
      isDoublePrediction(selected);

    const nuevaSeleccionEsDoble =
      isDoublePrediction(prediction);

    if (
      nuevaSeleccionEsDoble &&
      doubleLimitReached &&
      !seleccionActualEsDoble
    ) {
      onDoubleLimitReached?.();
      return;
    }

    onSelect(prediction);
  };

  const dobleDeshabilitado =
    doubleLimitReached && !isDoublePrediction(selected);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.matchNumber}>
          PARTIDO {number}
        </Text>

        {isDoublePrediction(selected) && (
          <View style={styles.doubleBadge}>
            <Ionicons
              name="shield-checkmark"
              size={12}
              color="#9A6513"
            />

            <Text style={styles.doubleBadgeText}>
              DOBLE
            </Text>
          </View>
        )}
      </View>

      <View style={styles.predictionRow}>
        <Pressable
          onPress={() => seleccionar("1")}
          style={({ pressed }) => [
            styles.teamButton,
            selected === "1" && styles.simpleSelected,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.shield,
              selected === "1" && styles.shieldSelected,
            ]}
          >
            <Ionicons
              name="shield-outline"
              size={25}
              color={
                selected === "1" ? "#FFFFFF" : "#111111"
              }
            />
          </View>

          <Text
            numberOfLines={2}
            style={[
              styles.teamName,
              selected === "1" && styles.selectedText,
            ]}
          >
            {local}
          </Text>

          <Text
            style={[
              styles.teamResult,
              selected === "1" && styles.selectedText,
            ]}
          >
            Gana
          </Text>
        </Pressable>

        <Pressable
          onPress={() => seleccionar("X")}
          style={({ pressed }) => [
            styles.drawButton,
            selected === "X" && styles.simpleSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.drawSymbol,
              selected === "X" && styles.selectedText,
            ]}
          >
            X
          </Text>

          <Text
            style={[
              styles.drawText,
              selected === "X" && styles.selectedText,
            ]}
          >
            Empate
          </Text>
        </Pressable>

        <Pressable
          onPress={() => seleccionar("2")}
          style={({ pressed }) => [
            styles.teamButton,
            selected === "2" && styles.simpleSelected,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.shield,
              selected === "2" && styles.shieldSelected,
            ]}
          >
            <Ionicons
              name="shield-outline"
              size={25}
              color={
                selected === "2" ? "#FFFFFF" : "#111111"
              }
            />
          </View>

          <Text
            numberOfLines={2}
            style={[
              styles.teamName,
              selected === "2" && styles.selectedText,
            ]}
          >
            {visitante}
          </Text>

          <Text
            style={[
              styles.teamResult,
              selected === "2" && styles.selectedText,
            ]}
          >
            Gana
          </Text>
        </Pressable>
      </View>

      {showDoubleOptions && (
        <View style={styles.doubleSection}>
          <View style={styles.doubleTitleRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color="#9A6513"
            />

            <Text style={styles.doubleTitle}>
              Doble oportunidad
            </Text>
          </View>

          <View style={styles.doubleOptions}>
            <Pressable
              disabled={dobleDeshabilitado}
              onPress={() => seleccionar("1X")}
              style={({ pressed }) => [
                styles.doubleButton,
                selected === "1X" &&
                  styles.doubleSelected,
                dobleDeshabilitado &&
                  styles.doubleDisabled,
                pressed &&
                  !dobleDeshabilitado &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                name="shield-outline"
                size={16}
                color={
                  selected === "1X"
                    ? "#FFFFFF"
                    : "#8A5A12"
                }
              />

              <Text
                style={[
                  styles.doubleButtonText,
                  selected === "1X" &&
                    styles.selectedText,
                ]}
              >
                {local} gana o empata
              </Text>
            </Pressable>

            <Pressable
              disabled={dobleDeshabilitado}
              onPress={() => seleccionar("X2")}
              style={({ pressed }) => [
                styles.doubleButton,
                selected === "X2" &&
                  styles.doubleSelected,
                dobleDeshabilitado &&
                  styles.doubleDisabled,
                pressed &&
                  !dobleDeshabilitado &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                name="shield-outline"
                size={16}
                color={
                  selected === "X2"
                    ? "#FFFFFF"
                    : "#8A5A12"
                }
              />

              <Text
                style={[
                  styles.doubleButtonText,
                  selected === "X2" &&
                    styles.selectedText,
                ]}
              >
                {visitante} gana o empata
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  matchNumber: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  doubleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF0C7",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  doubleBadgeText: {
    color: "#9A6513",
    fontSize: 8,
    fontWeight: "900",
  },

  predictionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },

  teamButton: {
    flex: 1,
    minHeight: 100,
    borderRadius: 14,
    backgroundColor: "#F3F4F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 9,
  },

  drawButton: {
    width: 68,
    minHeight: 100,
    borderRadius: 14,
    backgroundColor: "#F3F4F5",
    alignItems: "center",
    justifyContent: "center",
  },

  simpleSelected: {
    backgroundColor: "#18A558",
  },

  shield: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },

  shieldSelected: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  teamName: {
    color: "#111111",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    textAlign: "center",
    minHeight: 28,
  },

  teamResult: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },

  drawSymbol: {
    color: "#111111",
    fontSize: 22,
    fontWeight: "900",
  },

  drawText: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 3,
  },

  selectedText: {
    color: "#FFFFFF",
  },

  doubleSection: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    marginTop: 11,
    paddingTop: 10,
  },

  doubleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },

  doubleTitle: {
    color: "#8A5A12",
    fontSize: 10,
    fontWeight: "800",
  },

  doubleOptions: {
    flexDirection: "row",
    gap: 7,
  },

  doubleButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: "#FFF8E8",
    borderWidth: 1,
    borderColor: "#EED89D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },

  doubleSelected: {
    backgroundColor: "#B7791F",
    borderColor: "#B7791F",
  },

  doubleDisabled: {
    opacity: 0.4,
  },

  doubleButtonText: {
    flex: 1,
    color: "#805B17",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.82,
  },
});