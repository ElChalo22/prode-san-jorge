import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppAppearance } from "../../lib/appearance";
import { supabase } from "../../lib/supabase";
import { darkColors, lightColors } from "../../theme/colors";
import type { DirectoryPlayer } from "../../lib/playerDirectory";
export default function PublicPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [player, setPlayer] = useState<DirectoryPlayer | null>(null);
  const [friendStatus, setFriendStatus] = useState("none");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) return;
    let active = true;
    void Promise.all([supabase.rpc("public_player_directory"), supabase.rpc("player_friend_status", { target_player_id: id })]).then(([directory, status]) => {
      if (active) {
        setPlayer((directory.data ?? []).find((item: DirectoryPlayer) => item.id === id) ?? null);
        setFriendStatus(status.data ?? "none");
      }
    });
    return () => { active = false; };
  }, [id]);
  const sendRequest = async () => {
    if (!player || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("send_friend_request", { target_player_id: player.id });
    if (error) Alert.alert("No se pudo enviar", error.message);
    else { setFriendStatus("sent"); Alert.alert("Solicitud enviada", `@${player.username} tendrá que aceptarla.`); }
    setBusy(false);
  };
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={colors.text.primary} /></Pressable>
    {player ? <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {player.avatar_url ? <Image source={{ uri: player.avatar_url }} style={styles.avatar} />
        : <Ionicons name="person-circle-outline" size={80} color={colors.primary} />}
      <Text style={[styles.name, { color: colors.text.primary }]}>@{player.username}</Text>
      <View style={styles.team}>
        {player.team_logo && <Image source={{ uri: player.team_logo }} style={styles.logo} />}
        <Text style={{ color: colors.text.secondary }}>{player.team_name ?? "Club sin elegir"}</Text>
      </View>
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 20 }}>{player.hits} aciertos · {player.games} prodes jugados</Text>
      {friendStatus !== "self" && <Pressable disabled={busy || (friendStatus !== "none" && friendStatus !== "received")}
        onPress={() => friendStatus === "received" ? router.push("/notifications") : void sendRequest()}
        style={[styles.friendButton, { backgroundColor: friendStatus === "friends" ? colors.background : colors.primary, borderColor: colors.border, opacity: busy ? 0.6 : 1 }]}>
        <Ionicons name={friendStatus === "friends" ? "people" : friendStatus === "sent" ? "time-outline" : friendStatus === "received" ? "mail-outline" : "person-add-outline"}
          size={19} color={friendStatus === "none" ? "#FFFFFF" : colors.primary} />
        <Text style={{ color: friendStatus === "none" ? "#FFFFFF" : colors.text.primary, fontWeight: "800" }}>
          {busy ? "Enviando…" : friendStatus === "friends" ? "Ya son amigos" : friendStatus === "sent" ? "Solicitud pendiente" : friendStatus === "received" ? "Responder solicitud" : "Añadir amigo"}
        </Text>
      </Pressable>}
    </View> : <Text style={{ color: colors.text.secondary }}>Cargando perfil...</Text>}
  </ScrollView>;
}
const styles = StyleSheet.create({ content: { paddingTop: 55, paddingHorizontal: 22, gap: 25 },
  card: { borderWidth: 1, borderRadius: 20, alignItems: "center", padding: 25, gap: 15 },
  avatar: { width: 85, height: 85, borderRadius: 43 }, name: { fontSize: 26, fontWeight: "900" },
  friendButton: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  team: { flexDirection: "row", alignItems: "center", gap: 8 }, logo: { width: 32, height: 32, resizeMode: "contain" } });
