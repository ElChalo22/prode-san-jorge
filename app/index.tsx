import { supabase } from "@/lib/supabase";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type SavedAccount = { username: string | null; email: string | null; needsUsername: boolean };

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<SavedAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session?.user) return;

        const { data: profile } = await supabase.from("profiles")
          .select("username, onboarding_completed")
          .eq("id", data.session.user.id).maybeSingle();
        if (active) setAccount({
          username: profile?.username ?? null,
          email: data.session.user.email ?? null,
          needsUsername: profile !== null && !profile?.onboarding_completed,
        });
      } catch {
        // Sin una sesión disponible, se presenta el inicio de sesión normal.
      } finally {
        if (active) setLoading(false);
      }
    };
    void restoreSession();
    return () => { active = false; };
  }, []);

  const enter = async () => {
    if (busy) return;
    setBusy(true);
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session) {
      router.replace("/onboarding/login");
      return;
    }
    router.replace(account?.needsUsername ? "/onboarding/username" : "/(tabs)");
  };

  const changeAccount = async () => {
    if (busy) return;
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("No se pudo cambiar de cuenta. Intentá de nuevo.");
      setBusy(false);
      return;
    }
    router.replace("/onboarding/login");
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#18A558" /></View>;
  if (!account) return <Redirect href="/onboarding/welcome" />;

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>⚽</Text>
      <Text style={styles.title}>Prode San Jorge</Text>
      <Text style={styles.subtitle}>Tu cuenta está guardada en este dispositivo</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={busy} onPress={() => void enter()} style={[styles.button, busy && styles.disabled]}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Entrar como {account.username ? `@${account.username}` : account.email ?? "mi cuenta"}</Text>}
      </Pressable>
      <Pressable disabled={busy} onPress={() => void changeAccount()} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Usar otra cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080A0D", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  logo: { fontSize: 64 },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", marginTop: 18 },
  subtitle: { color: "#B6BBC2", fontSize: 15, textAlign: "center", marginTop: 10, marginBottom: 34 },
  button: { backgroundColor: "#18A558", borderRadius: 14, minHeight: 54, width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  secondaryButton: { padding: 16, marginTop: 10 },
  secondaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  error: { color: "#FF9B9B", textAlign: "center", marginBottom: 12 },
  disabled: { opacity: 0.6 },
});
