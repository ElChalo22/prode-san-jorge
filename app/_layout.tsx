import { Stack } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { AppAppearanceProvider } from "../lib/appearance";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const subscribe = async () => {
      const current = ++generation;
      const previous = channel;
      channel = null;
      if (previous) await supabase.removeChannel(previous);
      const { data: { user } } = await supabase.auth.getUser();
      if (disposed || current !== generation || !user) return;
      // Supabase reutiliza canales con el mismo nombre, incluso si ya se suscribieron.
      const next = supabase.channel(`approval-notices-${user.id}-${current}-${Date.now()}`);
      next.on("postgres_changes", { event: "INSERT", schema: "public", table: "player_notifications",
        filter: `user_id=eq.${user.id}` }, (payload) => {
        const notice = payload.new as { message?: string };
        if (notice.message) Alert.alert("Prode aprobado", notice.message);
      });
      if (disposed || current !== generation) { void supabase.removeChannel(next); return; }
      channel = next;
      next.subscribe();
    };
    void subscribe();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => { if (!disposed) void subscribe(); }, 0);
    });
    return () => {
      disposed = true;
      generation++;
      subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);
  return (
    <AppAppearanceProvider>
      <StatusBar style="auto" />
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
    </AppAppearanceProvider>
  );
}