import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import FavoriteClubPicker, { FavoriteClub } from "../../components/FavoriteClubPicker";
import { useAppAppearance, AppearancePreference } from "../../lib/appearance";
import { supabase } from "../../lib/supabase";
import { darkColors, lightColors } from "../../theme/colors";

export default function ConfiguracionScreen() {
  const { isDark, preference, setPreference } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [club, setClub] = useState<FavoriteClub | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setSignedIn(!!user);
      if (!user) { setClub(null); return; }
      const { data: profile } = await supabase.from("profiles").select("favorite_team_id")
        .eq("id", user.id).single();
      if (!profile?.favorite_team_id) { if (active) setClub(null); return; }
      const { data: selected } = await supabase.from("teams").select("id,name,logo_url")
        .eq("id", profile.favorite_team_id).maybeSingle();
      if (active) setClub(selected);
    })();
    return () => { active = false; };
  }, []));

  const choose = async (selected: FavoriteClub) => {
    setBusy(true); setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user ? await supabase.from("profiles").update({ favorite_team_id: selected.id })
      .eq("id", user.id) : { error: new Error("Iniciá sesión para elegir un club.") };
    if (error) setMessage(error.message);
    else { setClub(selected); setChoosing(false); }
    setBusy(false);
  };
  const themeOptions: { value: AppearancePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: "system", label: "Automático", icon: "phone-portrait-outline" },
    { value: "light", label: "Claro", icon: "sunny-outline" },
    { value: "dark", label: "Oscuro", icon: "moon-outline" },
  ];
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <Text style={[styles.title, { color: colors.text.primary }]}>Configuración</Text>
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.heading, { color: colors.text.primary }]}>Aspecto</Text>
      <Text style={{ color: colors.text.secondary }}>Elegí cómo se ve la app en este dispositivo.</Text>
      <View style={styles.options}>
        {themeOptions.map((option) => <Pressable key={option.value} onPress={() => {
          void setPreference(option.value).catch(() => setMessage("No pudimos guardar el aspecto."));
        }} style={[styles.option, { backgroundColor: preference === option.value ? colors.primary : colors.background }]}>
          <Ionicons name={option.icon} size={19} color={preference === option.value ? "#FFFFFF" : colors.text.primary} />
          <Text style={{ color: preference === option.value ? "#FFFFFF" : colors.text.primary, fontWeight: "700" }}>{option.label}</Text>
        </Pressable>)}
      </View>
    </View>
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.heading, { color: colors.text.primary }]}>Mi club</Text>
      <Text style={{ color: colors.text.secondary }}>Club del que sos hincha, entre los equipos de Primera División.</Text>
      <Text style={[styles.clubName, { color: colors.text.primary }]}>{club?.name ?? "Todavía no elegiste un club"}</Text>
      {signedIn ? <Pressable onPress={() => setChoosing((value) => !value)} style={styles.changeClub}>
        <Text style={{ color: colors.primary, fontWeight: "800" }}>Cambiar club</Text>
      </Pressable> : <Text style={{ color: colors.text.secondary, marginTop: 12 }}>Iniciá sesión para elegirlo.</Text>}
      {choosing && !busy && <FavoriteClubPicker selectedId={club?.id ?? null} onSelect={(selected) => void choose(selected)} />}
      {busy && <ActivityIndicator color={colors.primary} />}
    </View>
    <Pressable onPress={() => router.push("/notifications")}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border,
        flexDirection: "row", alignItems: "center" }]}>
      <Ionicons name="notifications-outline" size={23} color={colors.primary} />
      <Text style={{ color: colors.text.primary, fontWeight: "800", flex: 1 }}>Ver notificaciones</Text>
      <Ionicons name="chevron-forward" size={19} color={colors.text.secondary} />
    </Pressable>
    {message && <Text style={{ color: colors.danger }}>{message}</Text>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 130, gap: 16 },
  title: { fontSize: 30, fontWeight: "900", marginBottom: 6 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 9 },
  heading: { fontSize: 19, fontWeight: "800" },
  options: { flexDirection: "row", gap: 6, marginTop: 10 },
  option: { flex: 1, alignItems: "center", gap: 5, borderRadius: 12, paddingVertical: 12 },
  clubName: { fontSize: 15, fontWeight: "800", marginTop: 8 },
  changeClub: { paddingVertical: 7, alignSelf: "flex-start" },
});
