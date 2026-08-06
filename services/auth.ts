import { supabase } from "@/lib/supabase";

export async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error obteniendo el usuario actual:", error);
    throw error;
  }

  if (!user) {
    throw new Error("No hay una sesión iniciada.");
  }

  return user.id;
}