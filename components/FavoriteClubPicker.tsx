import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import { useAppAppearance } from "../lib/appearance";
import { darkColors, lightColors } from "../theme/colors";

export type FavoriteClub = { id: string; name: string; logo_url: string | null };

export default function FavoriteClubPicker({ selectedId, onSelect }: {
  selectedId: string | null; onSelect: (club: FavoriteClub) => void;
}) {
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  const [clubs, setClubs] = useState<FavoriteClub[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.rpc("argentina_first_division_teams").then(({ data, error: requestError }) => {
      if (!active) return;
      setClubs(data ?? []);
      setError(requestError ? "No pudimos cargar los clubes. Volvé a abrir esta pantalla." :
        !data?.length ? "Todavía no se importaron clubes de Primera División." : null);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const filtered = useMemo(() => clubs.filter((club) => club.name.toLocaleLowerCase("es-AR")
    .includes(query.trim().toLocaleLowerCase("es-AR"))), [clubs, query]);
  return <View style={styles.container}>
    <Text style={[styles.heading, { color: colors.text.primary }]}>Tu club de Primera División</Text>
    <TextInput value={query} onChangeText={setQuery} placeholder="Buscar club"
      placeholderTextColor={colors.text.secondary}
      style={[styles.search, { color: colors.text.primary, borderColor: colors.border, backgroundColor: colors.surface }]} />
    {loading && <ActivityIndicator color={colors.primary} />}
    {error && <Text style={{ color: colors.danger }}>{error}</Text>}
    {!loading && !error && filtered.length === 0 && <Text style={{ color: colors.text.secondary }}>No encontramos ese club.</Text>}
    {filtered.map((club) => <Pressable key={club.id} onPress={() => onSelect(club)}
      style={[styles.club, { borderColor: selectedId === club.id ? colors.primary : colors.border,
        backgroundColor: colors.surface }]}>
      {club.logo_url ? <Image source={{ uri: club.logo_url }} style={styles.logo} />
        : <Ionicons name="shield-outline" size={27} color={colors.primary} />}
      <Text style={{ color: colors.text.primary, flex: 1, fontWeight: selectedId === club.id ? "800" : "500" }}>{club.name}</Text>
      {selectedId === club.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 8 }, heading: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  search: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  club: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  logo: { width: 32, height: 32, resizeMode: "contain" },
});
