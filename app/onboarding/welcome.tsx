import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PRODE SAN JORGE</Text>

      <Text style={styles.subtitle}>
        El fútbol se vive mejor cuando todos juegan.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/onboarding/login")}
      >
        <Text style={styles.buttonText}>Comenzar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#111",
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 15,
    textAlign: "center",
    lineHeight: 24,
  },

  button: {
    marginTop: 50,
    backgroundColor: "#111",
    paddingHorizontal: 45,
    paddingVertical: 16,
    borderRadius: 16,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
});