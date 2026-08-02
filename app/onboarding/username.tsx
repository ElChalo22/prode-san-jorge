import { router } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function UsernameScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Elegí tu usuario</Text>

      <TextInput
        style={styles.input}
        placeholder="Ejemplo: Chalo22"
        autoCapitalize="none"
      />

      <Pressable
        style={styles.button}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.buttonText}>Continuar al inicio</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111111",
    textAlign: "center",
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginTop: 28,
    fontSize: 16,
  },
  button: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});