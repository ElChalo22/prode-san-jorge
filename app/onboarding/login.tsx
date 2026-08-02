import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/onboarding/username")}
      >
        <Text style={styles.buttonText}>Continuar</Text>
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
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111111",
  },
  button: {
    marginTop: 32,
    backgroundColor: "#111111",
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});