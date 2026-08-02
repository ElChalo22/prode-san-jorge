import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type Prediction = "1" | "X" | "2";

type MatchCardProps = {
  number: number;
  local: string;
  visitante: string;
  selected?: Prediction;
  onSelect: (prediction: Prediction) => void;
};

const OPTIONS: Prediction[] = ["1", "X", "2"];

export default function MatchCard({
  number,
  local,
  visitante,
  selected,
  onSelect,
}: MatchCardProps) {
  const getDescription = (option: Prediction) => {
    if (option === "1") return "Local";
    if (option === "X") return "Empate";

    return "Visitante";
  };

  return (
    <View style={styles.matchCard}>
      <Text style={styles.matchNumber}>PARTIDO {number}</Text>

      <View style={styles.teamsRow}>
        <View style={styles.team}>
          <View style={styles.shield}>
            <Ionicons
              name="shield-outline"
              size={28}
              color="#111111"
            />
          </View>

          <Text style={styles.teamName}>{local}</Text>
          <Text style={styles.teamType}>Local</Text>
        </View>

        <View style={styles.vsCircle}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.team}>
          <View style={styles.shield}>
            <Ionicons
              name="shield-outline"
              size={28}
              color="#111111"
            />
          </View>

          <Text style={styles.teamName}>{visitante}</Text>
          <Text style={styles.teamType}>Visitante</Text>
        </View>
      </View>

      <View style={styles.optionsRow}>
        {OPTIONS.map((option) => {
          const isSelected = selected === option;

          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.optionButton,
                isSelected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>

              <Text
                style={[
                  styles.optionDescription,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {getDescription(option)}
              </Text>

              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color="#FFFFFF"
                  style={styles.checkIcon}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  matchNumber: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 22,
  },

  team: {
    width: "38%",
    alignItems: "center",
  },

  shield: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  teamName: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    minHeight: 35,
  },

  teamType: {
    color: "#777777",
    fontSize: 11,
    marginTop: 3,
  },

  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
  },

  vsText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  optionsRow: {
    flexDirection: "row",
    gap: 9,
  },

  optionButton: {
    flex: 1,
    height: 68,
    borderRadius: 14,
    backgroundColor: "#F1F2F3",
    alignItems: "center",
    justifyContent: "center",
  },

  optionSelected: {
    backgroundColor: "#18A558",
  },

  optionPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },

  optionText: {
    color: "#111111",
    fontSize: 21,
    fontWeight: "900",
  },

  optionDescription: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },

  optionTextSelected: {
    color: "#FFFFFF",
  },

  checkIcon: {
    position: "absolute",
    top: 6,
    right: 6,
  },
});