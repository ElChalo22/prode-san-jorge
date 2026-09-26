import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppAppearance } from "../lib/appearance";
import { supabase } from "../lib/supabase";
import { darkColors, lightColors } from "../theme/colors";

type Notice = { id: string; message: string; created_at: string; prode_game_id: string; read_at: string | null };
export default function NotificationsScreen() {
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setNotices([]); setLoading(false); } return; }
      const { data, error: loadError } = await supabase.from("player_notifications")
        .select("id,message,created_at,prode_game_id,read_at").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(100);
      if (!active) return;
      if (loadError) setError(loadError.message);
      else {
        setNotices(data ?? []);
        const { error: readError } = await supabase.rpc("read_my_notifications");
        if (readError && active) setError(readError.message);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []));
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()} style={styles.back}>
      <Ionicons name="arrow-back" size={23} color={colors.text.primary} />
      <Text style={{ color: colors.text.primary }}>Volver</Text>
    </Pressable>
    <Text style={[styles.title, { color: colors.text.primary }]}>Notificaciones</Text>
    {loading && <ActivityIndicator color={colors.primary} />}
    {error && <Text style={{ color: colors.danger }}>{error}</Text>}
    {!loading && !error && notices.length === 0 && <Text style={{ color: colors.text.secondary }}>Todavía no tenés notificaciones.</Text>}
    {notices.map((notice) => <Pressable key={notice.id} onPress={() => router.push({ pathname: "/pronosticos", params: { gameId: notice.prode_game_id } })}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: colors.text.primary, fontWeight: "700" }}>{notice.message}</Text>
        <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{new Date(notice.created_at).toLocaleString("es-AR")}</Text>
      </View>
    </Pressable>)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 90, gap: 12 },
  back: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  title: { fontSize: 30, fontWeight: "900", marginBottom: 10 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
});
