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
      const result = user
        ? await supabase.from("profiles").select("role").eq("id", user.id).single()
        : null;
      if (active) {
        setRole(result?.data?.role === "superadmin" ? "superadmin" : result?.data?.role === "admin" ? "admin" : null);
        setLoading(false);
      }
    };
    void refresh();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []));

  return { role, loading };
}
