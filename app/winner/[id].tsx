import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, Share, StyleSheet, Text, View } from "react-native";
import * as Sharing from "expo-sharing";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import { useAppAppearance } from "../../lib/appearance";
import { supabase } from "../../lib/supabase";
import { darkColors, lightColors } from "../../theme/colors";

type WinnerNotice = { message: string; prize_amount: number | null; created_at: string };
const CONFETTI = ["🎉", "✨", "⚽", "🏆", "🎊", "💸", "⭐", "🎉", "✨", "🎊", "🏆", "⚽"];

export default function WinnerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [notice, setNotice] = useState<WinnerNotice | null>(null);
  const [username, setUsername] = useState("Jugador");
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<ViewShotRef | null>(null);
  const [motion] = useState(() => CONFETTI.map(() => new Animated.Value(0)));

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => setVisible(false), 7000);
    void (async () => {
      const [{ data: noticeRow }, { data: { user } }] = await Promise.all([
        supabase.from("player_notifications").select("message,prize_amount,created_at").eq("id", id).single(),
        supabase.auth.getUser(),
      ]);
      const { data: profile } = user ? await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
        : { data: null };
      if (active) {
        setNotice(noticeRow);
        setUsername(profile?.username ?? "Jugador");
        setLoading(false);
      }
    })();
    const animations = motion.map((value, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 90),
      Animated.timing(value, { toValue: 1, duration: 2400 + (index % 4) * 280, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    Animated.stagger(70, animations).start();
    return () => { active = false; clearTimeout(timeout); animations.forEach((animation) => animation.stop()); };
  }, [id, motion]);

  const share = async () => {
    if (!notice) return;
    setSharing(true);
    try {
      const imageUri = await cardRef.current?.capture();
      if (imageUri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(imageUri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Compartir mi victoria" });
      } else {
        await Share.share({ message: `🏆 ¡GANÉ EN PRODE SAN JORGE! 🏆\n@${username}\n${notice.message}\nPremio: ARS ${Number(notice.prize_amount ?? 0).toLocaleString("es-AR")}` });
      }
    } catch { Share.share({ message: `🏆 ¡GANÉ EN PRODE SAN JORGE! 🏆\n@${username}\n${notice.message}\nPremio: ARS ${Number(notice.prize_amount ?? 0).toLocaleString("es-AR")}` }); }
    finally { setSharing(false); }
  };

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    {visible && motion.map((value, index) => <Animated.Text key={index} pointerEvents="none"
      style={[styles.confetti, { left: `${(index * 31 + 7) % 100}%`, opacity: value.interpolate({ inputRange: [0, 0.12, 0.88, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [-60, 900] }) },
          { rotate: value.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${index % 2 ? 540 : -540}deg`] }) }] }]}>{CONFETTI[index]}</Animated.Text>)}
    <Pressable onPress={() => router.back()} style={styles.close}><Ionicons name="close" size={26} color={colors.text.primary} /></Pressable>
    {loading ? <ActivityIndicator size="large" color={colors.primary} /> : notice ? <>
      <ViewShot ref={cardRef} options={{ format: "png", quality: 1 }} style={{ width: "100%", alignItems: "center" }}>
      <View style={styles.content}>
      <Text style={styles.eyebrow}>PRODE SAN JORGE PRESENTA</Text>
      <Text style={styles.trophy}>🏆</Text>
      <Text style={styles.title}>¡CAMPEÓN!</Text>
      <Text style={styles.player}>@{username}</Text>
      <Text style={styles.message}>{notice.message}</Text>
      <View style={styles.prizeCard}>
        <Text style={styles.prizeLabel}>PREMIO GANADO</Text>
        <Text style={styles.prize}>ARS {Number(notice.prize_amount ?? 0).toLocaleString("es-AR")}</Text>
      </View>
      <Text style={styles.note}>La suerte estuvo de tu lado. ¡Compartí la victoria!</Text>
      </View>
      </ViewShot>
      <Pressable disabled={sharing} onPress={() => void share()} style={[styles.shareButton, { opacity: sharing ? 0.6 : 1 }]}>
        <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
        <Text style={styles.shareText}>{sharing ? "Preparando imagen…" : "Compartir imagen"}</Text>
      </Pressable>
    </> : <Text style={{ color: colors.text.secondary }}>No encontramos este premio.</Text>}
  </View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 22 },
  close: { position: "absolute", zIndex: 10, top: 55, right: 22, width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.75)" },
  content: { width: "100%", maxWidth: 460, alignItems: "center", padding: 26, borderRadius: 30,
    backgroundColor: "#103B2A", borderWidth: 2, borderColor: "#F8D04E", gap: 8, overflow: "hidden" },
  eyebrow: { color: "#CFF5D9", letterSpacing: 2, fontWeight: "900", fontSize: 11 },
  trophy: { fontSize: 74, marginTop: 8 }, title: { color: "#FFD84D", fontSize: 43, fontWeight: "900", textAlign: "center" },
  player: { color: "#FFFFFF", fontSize: 25, fontWeight: "900", marginTop: 3 },
  message: { color: "#E1F4E7", fontSize: 15, textAlign: "center", lineHeight: 21, marginTop: 4 },
  prizeCard: { width: "100%", borderRadius: 18, padding: 15, alignItems: "center", backgroundColor: "#F6D253", marginTop: 12 },
  prizeLabel: { color: "#533B00", fontSize: 12, letterSpacing: 1.5, fontWeight: "900" },
  prize: { color: "#2B1D00", fontSize: 31, fontWeight: "900", marginTop: 3 },
  note: { color: "#D8EBDD", fontSize: 13, textAlign: "center", marginTop: 6 },
  shareButton: { marginTop: 10, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#18784A" },
  shareText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  confetti: { position: "absolute", top: -40, fontSize: 27, zIndex: 4 },
});
