import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import { useAppAppearance } from "../../lib/appearance";
import { darkColors, lightColors } from "../../theme/colors";
import FavoriteClubPicker, { FavoriteClub } from "../../components/FavoriteClubPicker";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";

export default function UsernameScreen() {
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [username, setUsername] = useState("");
  const [club, setClub] = useState<FavoriteClub | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveUsername = async () => {
    const value = username.trim();
    if (busy) return;
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(value)) {
      setMessage("Usá entre 3 y 24 letras, números o guiones bajos.");
      return;
    }
    if (!club) { setMessage("Elegí el club del que sos hincha para continuar."); return; }
    setBusy(true);
    setMessage(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        router.replace("/onboarding/login");
        return;
      }
      const { error } = await supabase.from("profiles")
        .update({ username: value, favorite_team_id: club.id, onboarding_completed: true })
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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.text.primary }]}>Elegí tu usuario</Text>

      <TextInput
        style={[styles.input, { color: colors.text.primary, borderColor: colors.border, backgroundColor: colors.surface }]}
        placeholder="Ejemplo: Chalo22"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
        maxLength={24}
        editable={!busy}
      />

      <FavoriteClubPicker selectedId={club?.id ?? null} onSelect={setClub} />
      {message ? <Text style={[styles.message, { color: colors.danger }]}>{message}</Text> : null}

      <Pressable
        style={styles.button}
        disabled={busy}
        onPress={() => void saveUsername()}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Guardar y continuar</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 50,
    gap: 12,
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
