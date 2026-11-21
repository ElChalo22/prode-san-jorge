import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { supabase } from "./supabase";

export type StaffRole = "admin" | "superadmin" | null;

export function useStaffRole() {
  const [role, setRole] = useState<StaffRole>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      const [staffResult, profileResult] = await Promise.all([
        supabase.rpc("is_staff"),
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;

      const profileRole = profileResult.data?.role;
      const isStaff = staffResult.data === true ||
        profileRole === "admin" || profileRole === "superadmin";
      setRole(profileRole === "superadmin" ? "superadmin" : isStaff ? "admin" : null);
      setLoading(false);
    };

    void refresh();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []));

  return { role, loading };
}
