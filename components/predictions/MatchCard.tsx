import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type Prediction =
  | "1"
  | "X"
  | "2"
  | "1X"
  | "X2";

type MatchCardProps = {
  kickoffAt: string;

  local: string;
  localLogo?: string | null;

  visitante: string;
  visitanteLogo?: string | null;

  selected?: Prediction;
  onSelect: (prediction: Prediction) => void;

  showDoubleOptions?: boolean;
  doubleLimitReached?: boolean;
  onDoubleLimitReached?: () => void;
};

export const isDoublePrediction = (
  prediction?: Prediction,
) => {
  return prediction === "1X" || prediction === "X2";
};

function formatKickoff(
  kickoffAt: string,
): string {
  const date = new Date(kickoffAt);

  const weekday = new Intl.DateTimeFormat(
    "es-AR",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      weekday: "short",
    },
  )
    .format(date)
    .replace(".", "")
    .toUpperCase();

  const day = new Intl.DateTimeFormat(
    "es-AR",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      day: "2-digit",
    },
  ).format(date);

  const month = new Intl.DateTimeFormat(
    "es-AR",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      month: "short",
    },
  )
    .format(date)
    .replace(".", "")
    .toUpperCase();

  const time = new Intl.DateTimeFormat(
    "es-AR",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(date);

  return `${weekday} ${day} ${month} · ${time}`;
}

export default function MatchCard({
  kickoffAt,

  local,
  localLogo,

  visitante,
  visitanteLogo,

  selected,
  onSelect,

  showDoubleOptions = false,
  doubleLimitReached = false,
  onDoubleLimitReached,
}: MatchCardProps) {
  const seleccionar = (
    prediction: Prediction,
  ) => {
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
    doubleLimitReached &&
    !isDoublePrediction(selected);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={12}
            color="#16874A"
          />

          <Text style={styles.kickoff}>
            {formatKickoff(kickoffAt)}
          </Text>
        </View>

        {isDoublePrediction(selected) && (
          <View style={styles.doubleBadge}>
            <Ionicons
              name="shield-checkmark"
              size={10}
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
            selected === "1" &&
              styles.simpleSelected,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.shield,
              selected === "1" &&
                styles.shieldSelected,
            ]}
          >
            {localLogo ? (
              <Image
                source={{
                  uri: localLogo,
                }}
                style={styles.teamLogo}
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name="shield-outline"
                size={22}
                color={
                  selected === "1"
                    ? "#FFFFFF"
                    : "#111111"
                }
              />
            )}
          </View>

          <Text
            numberOfLines={2}
            style={[
              styles.teamName,
              selected === "1" &&
                styles.selectedText,
            ]}
          >
            {local}
          </Text>

          <Text
            style={[
              styles.teamResult,
              selected === "1" &&
                styles.selectedText,
            ]}
          >
            Gana
          </Text>
        </Pressable>

        <Pressable
          onPress={() => seleccionar("X")}
          style={({ pressed }) => [
            styles.drawButton,
            selected === "X" &&
              styles.simpleSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.drawSymbol,
              selected === "X" &&
                styles.selectedText,
            ]}
          >
            X
          </Text>

          <Text
            style={[
              styles.drawText,
              selected === "X" &&
                styles.selectedText,
            ]}
          >
            Empate
          </Text>
        </Pressable>

        <Pressable
          onPress={() => seleccionar("2")}
          style={({ pressed }) => [
            styles.teamButton,
            selected === "2" &&
              styles.simpleSelected,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.shield,
              selected === "2" &&
                styles.shieldSelected,
            ]}
          >
            {visitanteLogo ? (
              <Image
                source={{
                  uri: visitanteLogo,
                }}
                style={styles.teamLogo}
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name="shield-outline"
                size={22}
                color={
                  selected === "2"
                    ? "#FFFFFF"
                    : "#111111"
                }
              />
            )}
          </View>

          <Text
            numberOfLines={2}
            style={[
              styles.teamName,
              selected === "2" &&
                styles.selectedText,
            ]}
          >
            {visitante}
          </Text>

          <Text
            style={[
              styles.teamResult,
              selected === "2" &&
                styles.selectedText,
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
              size={13}
              color="#9A6513"
            />

            <Text style={styles.doubleTitle}>
              Doble oportunidad
            </Text>
          </View>

          <View style={styles.doubleOptions}>
            <Pressable
              disabled={dobleDeshabilitado}
              onPress={() =>
                seleccionar("1X")
              }
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
              {localLogo ? (
                <Image
                  source={{
                    uri: localLogo,
                  }}
                  style={
                    styles.doubleTeamLogo
                  }
                  resizeMode="contain"
                />
              ) : (
                <Ionicons
                  name="shield-outline"
                  size={14}
                  color={
                    selected === "1X"
                      ? "#FFFFFF"
                      : "#8A5A12"
                  }
                />
              )}

              <Text
                numberOfLines={1}
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
              onPress={() =>
                seleccionar("X2")
              }
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
              {visitanteLogo ? (
                <Image
                  source={{
                    uri: visitanteLogo,
                  }}
                  style={
                    styles.doubleTeamLogo
                  }
                  resizeMode="contain"
                />
              ) : (
                <Ionicons
                  name="shield-outline"
                  size={14}
                  color={
                    selected === "X2"
                      ? "#FFFFFF"
                      : "#8A5A12"
                  }
                />
              )}

              <Text
                numberOfLines={1}
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
    borderRadius: 16,

    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 11,

    marginBottom: 9,

    borderWidth: 1,
    borderColor: "#E8E8E8",

    shadowColor: "#000000",
    shadowOpacity: 0.025,
    shadowRadius: 6,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 7,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: 5,
  },

  kickoff: {
    color: "#16874A",

    fontSize: 9,
    fontWeight: "800",

    letterSpacing: 0.3,
  },

  doubleBadge: {
    flexDirection: "row",
    alignItems: "center",

    gap: 3,

    backgroundColor: "#FFF0C7",

    borderRadius: 20,

    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  doubleBadgeText: {
    color: "#9A6513",

    fontSize: 7,
    fontWeight: "900",
  },

  predictionRow: {
    flexDirection: "row",
    alignItems: "stretch",

    gap: 6,
  },

  teamButton: {
    flex: 1,

    minHeight: 88,

    borderRadius: 12,

    backgroundColor: "#F3F4F5",

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 5,
    paddingVertical: 6,
  },

  drawButton: {
    width: 58,

    minHeight: 88,

    borderRadius: 12,

    backgroundColor: "#F3F4F5",

    alignItems: "center",
    justifyContent: "center",
  },

  simpleSelected: {
    backgroundColor: "#18A558",
  },

  shield: {
    width: 39,
    height: 39,

    borderRadius: 20,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 4,

    padding: 3,
  },

  shieldSelected: {
    backgroundColor:
      "rgba(255,255,255,0.92)",
  },

  teamLogo: {
    width: 33,
    height: 33,
  },

  teamName: {
    color: "#111111",

    fontSize: 10,
    lineHeight: 12,

    fontWeight: "800",

    textAlign: "center",

    minHeight: 23,
  },

  teamResult: {
    color: "#777777",

    fontSize: 8,
    fontWeight: "700",

    marginTop: 1,
  },

  drawSymbol: {
    color: "#111111",

    fontSize: 20,
    fontWeight: "900",
  },

  drawText: {
    color: "#777777",

    fontSize: 8,
    fontWeight: "700",

    marginTop: 2,
  },

  selectedText: {
    color: "#FFFFFF",
  },

  doubleSection: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",

    marginTop: 8,
    paddingTop: 7,
  },

  doubleTitleRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: 4,

    marginBottom: 6,
  },

  doubleTitle: {
    color: "#8A5A12",

    fontSize: 9,
    fontWeight: "800",
  },

  doubleOptions: {
    flexDirection: "row",

    gap: 6,
  },

  doubleButton: {
    flex: 1,

    height: 37,

    borderRadius: 10,

    backgroundColor: "#FFF8E8",

    borderWidth: 1,
    borderColor: "#EED89D",

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    gap: 4,

    paddingHorizontal: 6,
  },

  doubleSelected: {
    backgroundColor: "#B7791F",
    borderColor: "#B7791F",
  },

  doubleDisabled: {
    opacity: 0.4,
  },

  doubleTeamLogo: {
    width: 18,
    height: 18,
  },

  doubleButtonText: {
    flex: 1,

    color: "#805B17",

    fontSize: 8,
    lineHeight: 10,

    fontWeight: "700",

    textAlign: "center",
  },

  pressed: {
    transform: [
      {
        scale: 0.97,
      },
    ],

    opacity: 0.82,
  },
});