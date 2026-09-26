import { Stack } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const subscribe = async () => {
      if (channel) { await supabase.removeChannel(channel); channel = null; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase.channel(`approval-notices-${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "player_notifications",
          filter: `user_id=eq.${user.id}` }, (payload) => {
          const notice = payload.new as { message?: string };
          if (notice.message) Alert.alert("Prode aprobado", notice.message);
        }).subscribe();
    };
    void subscribe();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Esperar al siguiente tick evita solicitar sesiones dentro del callback de Auth.
      setTimeout(() => { void subscribe(); }, 0);
    });
    return () => { subscription.unsubscribe(); if (channel) void supabase.removeChannel(channel); };
  }, []);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}