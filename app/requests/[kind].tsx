import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useAppAppearance } from "../../lib/appearance";
import { supabase } from "../../lib/supabase";
import { uploadClaimDocuments, uploadImage } from "../../lib/userUploads";
import { darkColors, lightColors } from "../../theme/colors";

export default function UserRequestScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const type = kind === "verify" ? "verify" : kind === "claim" ? "claim" : "suggestion";
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wordCount = message.trim().length ? message.trim().split(/\s+/).length : 0;
  const submit = async () => {
    if (busy) return;
    if (type !== "verify" && (message.trim().length < 5 || wordCount > 700)) {
      setError("Escribí entre 5 caracteres y 700 palabras."); return;
    }
    setBusy(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/onboarding/login"); return; }
      if (type === "verify") {
        const path = await uploadImage("identity-documents", user.id);
        if (!path) return;
        const { error: submitError } = await supabase.rpc("submit_identity_request", { object_path: path });
        if (submitError) throw submitError;
        Alert.alert("DNI enviado", "Un administrador revisará tu identidad. Si la aprueba, recibirás una entrada gratis para un Prode Express.");
      } else {
        // El adjunto es opcional: la persona decide si lo incorpora al formulario.
        const { error: submitError } = await supabase.rpc("submit_user_feedback", {
          request_kind: type === "claim" ? "claim" : "suggestion", request_message: message.trim(), object_paths: attachments,
        });
        if (submitError) throw submitError;
        Alert.alert("Solicitud enviada", "El equipo de administración la recibió.");
      }
      router.back();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo enviar."); }
    finally { setBusy(false); }
  };
  const [attachments, setAttachments] = useState<string[]>([]);
  const addAttachment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/onboarding/login"); return; }
      setBusy(true);
      if (attachments.length >= 3) throw new Error("Podés adjuntar hasta 3 archivos.");
      const paths = await uploadClaimDocuments(user.id, 3 - attachments.length);
      if (paths) setAttachments((current) => [...current, ...paths]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo adjuntar."); }
    finally { setBusy(false); }
  };
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={26} color={colors.text.primary} /></Pressable>
    <Text style={[styles.title, { color: colors.text.primary }]}>
      {type === "verify" ? "Verificar usuario" : type === "claim" ? "Hacer un reclamo" : "Sugerir un cambio"}
    </Text>
    {type === "verify" ? <Text style={{ color: colors.text.secondary, lineHeight: 22 }}>
      Subí una foto clara de tu DNI. La usaremos por única vez para verificar tu identidad y el equipo admin la revisará de forma privada. Cuando se apruebe recibirás una participación gratis en un Prode Express.
    </Text> : <>
      <Text style={{ color: colors.text.secondary }}>
        {type === "claim" ? "Contanos qué pasó; podés agregar una imagen o PDF." : "Contanos qué mejorarías en la app."}
      </Text>
      <TextInput value={message} onChangeText={setMessage} multiline
        placeholder="Escribí acá..." placeholderTextColor={colors.text.secondary}
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text.primary }]} />
      <Text style={{ color: wordCount > 700 ? colors.danger : colors.text.secondary }}>{wordCount}/700 palabras</Text>
      <Pressable onPress={() => void addAttachment()} disabled={busy} style={styles.attachment}>
        <Ionicons name="attach-outline" size={22} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{attachments.length ? `${attachments.length} archivo(s) adjuntado(s) · máximo 3` : "Adjuntar imágenes o PDF (opcional)"}</Text>
      </Pressable>
    </>}
    {error && <Text style={{ color: colors.danger }}>{error}</Text>}
    <Pressable disabled={busy} onPress={() => void submit()} style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.5 : 1 }]}>
      <Text style={styles.buttonText}>{busy ? "Enviando..." : type === "verify" ? "Elegir foto de DNI y enviar" : "Enviar"}</Text>
    </Pressable>
  </ScrollView>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: 22, paddingTop: 55, paddingBottom: 110, gap: 18 },
  title: { fontSize: 29, fontWeight: "900" }, input: { borderWidth: 1, borderRadius: 14,
    minHeight: 160, padding: 14, textAlignVertical: "top" }, attachment: { flexDirection: "row", alignItems: "center", gap: 7 },
  button: { borderRadius: 14, paddingVertical: 17, alignItems: "center" }, buttonText: { color: "#FFFFFF", fontWeight: "800" } });
