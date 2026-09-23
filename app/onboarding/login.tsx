import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || password.length < 6) {
      setMessage("Ingresá un correo válido y una contraseña de al menos 6 caracteres.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      if (creatingAccount) {
        const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
        if (error) throw error;
        if (!data.session) {
          setMessage("Revisá tu correo y confirmá la cuenta. Después volvé acá e iniciá sesión.");
          setCreatingAccount(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
      }

      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session?.user) {
        setMessage("Confirmá tu cuenta por correo antes de iniciar sesión.");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, onboarding_completed")
        .eq("id", auth.session.user.id)
        .single();
      if (profileError) throw profileError;
      router.replace(profile?.onboarding_completed && profile.username ? "/(tabs)" : "/onboarding/username");
    } catch (caught) {
      console.error("Error de acceso:", caught);
      setMessage(creatingAccount
        ? "No se pudo crear la cuenta. Revisá los datos e intentá nuevamente."
        : "No pudimos iniciar sesión. Revisá tu correo, contraseña y confirmación de cuenta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>⚽</Text>
          <Text style={styles.title}>{creatingAccount ? "Creá tu cuenta" : "Bienvenido"}</Text>
          <Text style={styles.subtitle}>Entrá con tu correo para guardar pronósticos y seguir tus aciertos.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            accessibilityLabel="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#89919B"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!busy}
          />
          <TextInput
            accessibilityLabel="Contraseña"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#89919B"
            secureTextEntry
            autoComplete={creatingAccount ? "new-password" : "current-password"}
            editable={!busy}
          />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable disabled={busy} onPress={() => void submit()} style={[styles.button, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{creatingAccount ? "Crear cuenta" : "Iniciar sesión"}</Text>}
          </Pressable>
          <Pressable disabled={busy} onPress={() => { setCreatingAccount(!creatingAccount); setMessage(null); }} style={styles.switchButton}>
            <Text style={styles.switchText}>
              {creatingAccount ? "¿Ya tenés cuenta? Iniciá sesión" : "¿Todavía no tenés cuenta? Registrate"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.footer}>Prode San Jorge · Acceso con correo y contraseña</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080A0D" },
  content: { flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 28, paddingTop: 90, paddingBottom: 40 },
  header: { alignItems: "center" },
  logo: { fontSize: 72 },
  title: { marginTop: 24, color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  subtitle: { marginTop: 12, color: "#B6BBC2", fontSize: 16, textAlign: "center", lineHeight: 24, maxWidth: 300 },
  form: { gap: 14, marginTop: 35 },
  input: { height: 54, borderRadius: 14, backgroundColor: "#181D23", color: "#FFFFFF", paddingHorizontal: 16, fontSize: 16 },
  message: { color: "#E6E9ED", fontSize: 14, lineHeight: 20 },
  button: { height: 54, borderRadius: 14, backgroundColor: "#18A558", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.6 },
  switchButton: { alignItems: "center", padding: 10 },
  switchText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  footer: { color: "#7B7E84", textAlign: "center", fontSize: 13, marginTop: 35 },
});
