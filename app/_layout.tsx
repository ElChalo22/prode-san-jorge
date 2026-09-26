import { router, Stack } from "expo-router";
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
    let staffChannel: ReturnType<typeof supabase.channel> | null = null;
    const subscribe = async () => {
      const current = ++generation;
      const previous = channel;
      channel = null;
      if (previous) await supabase.removeChannel(previous);
      const previousStaff = staffChannel;
      staffChannel = null;
      if (previousStaff) await supabase.removeChannel(previousStaff);
      const { data: { user } } = await supabase.auth.getUser();
      if (disposed || current !== generation || !user) return;
      // Supabase reutiliza canales con el mismo nombre, incluso si ya se suscribieron.
      const next = supabase.channel(`approval-notices-${user.id}-${current}-${Date.now()}`);
      next.on("postgres_changes", { event: "INSERT", schema: "public", table: "player_notifications",
        filter: `user_id=eq.${user.id}` }, (payload) => {
        const notice = payload.new as { id?: string; kind?: string; message?: string };
        if (notice.kind === "winner" && notice.id) {
          router.push({ pathname: "/winner/[id]", params: { id: notice.id } });
        } else if (notice.kind === "friend_request") {
          Alert.alert("Nueva solicitud de amistad", notice.message ?? "Tenés una solicitud pendiente.");
        } else if (notice.kind === "friend_accepted" || notice.kind === "friend_rejected") {
          Alert.alert(notice.kind === "friend_accepted" ? "Solicitud aceptada" : "Solicitud rechazada", notice.message ?? "Actualizamos el estado de tu solicitud.");
        } else if (notice.kind === "profile") {
          Alert.alert("Foto de perfil actualizada", notice.message ?? "Podrás volver a modificarla dentro de 30 días.");
        } else if (notice.message) Alert.alert("Prode aprobado", notice.message);
      });
      if (disposed || current !== generation) { void supabase.removeChannel(next); return; }
      channel = next;
      next.subscribe();
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (disposed || current !== generation || !profile || !["admin", "superadmin"].includes(profile.role)) return;
      const staff = supabase.channel(`staff-requests-${user.id}-${current}-${Date.now()}`);
      staff.on("postgres_changes", { event: "INSERT", schema: "public", table: "user_feedback" },
        () => Alert.alert("Nueva solicitud", "Hay un reclamo o sugerencia pendiente en Administración."));
      staff.on("postgres_changes", { event: "INSERT", schema: "public", table: "identity_requests" },
        () => Alert.alert("Nueva verificación", "Hay un DNI pendiente de revisión en Administración."));
      if (disposed || current !== generation) { void supabase.removeChannel(staff); return; }
      staffChannel = staff;
      staff.subscribe();
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
      if (staffChannel) void supabase.removeChannel(staffChannel);
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
