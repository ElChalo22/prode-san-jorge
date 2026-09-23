import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function UsernameScreen() {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveUsername = async () => {
    const value = username.trim();
    if (busy) return;
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(value)) {
      setMessage("Usá entre 3 y 24 letras, números o guiones bajos.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        router.replace("/onboarding/login");
        return;
      }
      const { error } = await supabase.from("profiles")
        .update({ username: value, onboarding_completed: true })
        .eq("id", auth.user.id).select("id").single();
      if (error) {
        setMessage(error.code === "23505" ? "Ese nombre ya está en uso. Probá con otro." : "No pudimos guardar tu nombre. Intentá nuevamente.");
        return;
      }
      router.replace("/(tabs)");
    } catch (caught) {
      console.error("Error al guardar el apodo:", caught);
      setMessage("No pudimos guardar tu nombre. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Elegí tu usuario</Text>

      <TextInput
        style={styles.input}
        placeholder="Ejemplo: Chalo22"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
        maxLength={24}
        editable={!busy}
      />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable
        style={styles.button}
        disabled={busy}
        onPress={() => void saveUsername()}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Guardar y continuar</Text>}
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
  message: { marginTop: 12, color: "#C62828", fontSize: 14 },
});
