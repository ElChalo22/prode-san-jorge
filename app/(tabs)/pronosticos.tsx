import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MatchCard, {
  Prediction,
} from "../../components/predictions/MatchCard";

import type { PredictionValue } from "../../database/types";

import { supabase } from "../../lib/supabase";
import { useAppAppearance } from "../../lib/appearance";
import {
  subscribeToLiveMatches,
  usePredictionStore,
} from "../../store/predictionStore";

const esPronosticoDoble = (
  prediction?: Prediction,
): boolean => {
  return prediction === "1X" || prediction === "X2";
};

export default function PronosticosScreen() {
  const { isDark } = useAppAppearance();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const params = useLocalSearchParams<{
    gameId?: string | string[];
  }>();

  const gameId = Array.isArray(params.gameId)
    ? params.gameId[0]
    : params.gameId;

  const game = usePredictionStore((state) => state.game);
  const loading = usePredictionStore((state) => state.loading);
  const saving = usePredictionStore((state) => state.saving);
  const error = usePredictionStore((state) => state.error);

  const loadGame = usePredictionStore(
    (state) => state.loadGame,
  );

  const submitPredictions = usePredictionStore(
    (state) => state.submitPredictions,
  );

  const maxDoblesPorUsuario =
    game?.double_chance_limit ?? 2;

  const [pronosticos, setPronosticos] = useState<
    Record<string, Prediction>
  >({});
  const [paymentInfo, setPaymentInfo] = useState<{
    participationId: string; status: string; deadline: string | null; amount: number;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [confirmedPlayers, setConfirmedPlayers] = useState<{ participation_id: string; user_id: string;
    username: string; hits: number; total_matches: number; is_friend: boolean }[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [confirmedPicks, setConfirmedPicks] = useState<{ participation_id: string; username: string; match_id: string;
    prediction: string; secondary_prediction: string | null }[]>([]);
  const [freeEntry, setFreeEntry] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState({ players: 0, jackpot: 0 });
  const locked = paymentInfo?.status === "confirmed";

  const loadCommunity = useCallback(async (selectedGameId: string) => {
    const [picksResult, playersResult, summaryResult, authResult] = await Promise.all([
      supabase.rpc("game_confirmed_picks", { target_game_id: selectedGameId }),
      supabase.rpc("game_confirmed_players", { target_game_id: selectedGameId }),
      supabase.rpc("game_public_summary", { target_game_id: selectedGameId }),
      supabase.auth.getUser(),
    ]);
    if (picksResult.error || playersResult.error || summaryResult.error) {
      console.error("Error cargando el pozo o pronósticos confirmados:", picksResult.error ?? playersResult.error ?? summaryResult.error);
      return;
    }
    setConfirmedPicks(picksResult.data ?? []);
    setConfirmedPlayers(playersResult.data ?? []);
    setViewerId(authResult.data.user?.id ?? null);
    setSummary({ players: Number(summaryResult.data?.[0]?.players ?? 0),
      jackpot: Number(summaryResult.data?.[0]?.jackpot ?? 0) });
  }, []);


  const loadPayment = useCallback(async (selectedGameId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPaymentInfo(null); return; }
    const { data: participation } = await supabase.from("participations")
      .select("id,status,payment_deadline").eq("prode_game_id", selectedGameId)
      .eq("user_id", user.id).maybeSingle();
    if (!participation) { setPaymentInfo(null); return; }
    const { data: payment } = await supabase.from("payments")
      .select("amount").eq("participation_id", participation.id).maybeSingle();
    setPaymentInfo(payment ? { participationId: participation.id, status: participation.status,
      deadline: participation.payment_deadline, amount: payment.amount } : null);
    if (participation.status === "confirmed") {
      const { data: savedPicks } = await supabase.from("predictions")
        .select("match_id,prediction,secondary_prediction")
        .eq("participation_id", participation.id);
      if (savedPicks) setPronosticos(Object.fromEntries(savedPicks.map((pick) => [
        pick.match_id, `${pick.prediction}${pick.secondary_prediction ?? ""}` as Prediction,
      ])));
    }
  }, []);
  useEffect(() => {
    if (!paymentInfo?.deadline || paymentInfo.status !== "pending_payment") return;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(paymentInfo.deadline!).getTime() - Date.now()) / 1000)));
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [paymentInfo?.deadline, paymentInfo?.status]);
  useFocusEffect(useCallback(() => {
    if (!gameId) return;
    void loadPayment(gameId);
    void loadCommunity(gameId);
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setFreeEntry(false); return; }
      const { data } = await supabase.from("reward_credits").select("id").eq("user_id", user.id)
        .eq("kind", game?.game_type === "express" ? "express" : "argentina")
        .is("redeemed_at", null).limit(1);
      setFreeEntry(!!data?.length);
    });
    const refreshPlayers = setInterval(() => void loadCommunity(gameId), 30000);
    let active = true;
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { if (active) setApprovalNotice(null); return; }
      const { data } = await supabase.from("player_notifications")
        .select("message").eq("user_id", user.id).eq("prode_game_id", gameId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (active) setApprovalNotice(data?.message ?? null);
    });
    return () => { active = false; clearInterval(refreshPlayers); };
  }, [gameId, game?.game_type, loadCommunity, loadPayment]));



  const redeemCredit = async () => {
    if (!paymentInfo) return;
    setRedeeming(true);
    const { error: redeemError } = await supabase.rpc("redeem_free_entry", {
      target_participation_id: paymentInfo.participationId,
    });
    if (redeemError) Alert.alert("No se pudo usar el beneficio", redeemError.message);
    else {
      setFreeEntry(false);
      if (gameId) { await loadPayment(gameId); await loadCommunity(gameId); }
      Alert.alert("Participación confirmada", "Tu entrada gratis quedó aplicada y tus pronósticos están cerrados.");
    }
    setRedeeming(false);
  };

  const attachReceipt = async () => {
    if (!paymentInfo || !game) return;
    if (paymentInfo.deadline && Date.now() >= new Date(paymentInfo.deadline).getTime()) {
      Alert.alert("Plazo vencido", "Volvé a guardar tus pronósticos para iniciar un nuevo plazo de pago.");
      return;
    }
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"],
        allowsEditing: false, quality: 0.8, base64: true });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (!asset?.base64) throw new Error("No pudimos leer la imagen seleccionada.");
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert("Archivo demasiado grande", "Elegí una imagen de hasta 5 MB."); return;
      }
      setUploadingReceipt(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Iniciá sesión para enviar el comprobante.");
      const mime = asset.mimeType === "image/png" ? "image/png" :
        asset.mimeType === "image/webp" ? "image/webp" : "image/jpeg";
      const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/${paymentInfo.participationId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("prode-receipts")
        .upload(path, decode(asset.base64), { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;
      const { error: submitError } = await supabase.rpc("submit_prode_receipt", {
        target_participation_id: paymentInfo.participationId, object_path: path,
      });
      if (submitError) throw submitError;
      await loadPayment(game.id);
      Alert.alert("Comprobante enviado", "Tu pago quedó pendiente de aprobación por el administrador.");
    } catch (receiptError) {
      Alert.alert("No se pudo enviar", receiptError instanceof Error ? receiptError.message : "Intentá nuevamente.");
    } finally { setUploadingReceipt(false); }
  };

  useEffect(() => {
    if (!gameId) {
      return;
    }

    void loadGame(gameId);
  }, [gameId, loadGame]);

  useEffect(() => {
    if (!gameId) {
      return;
    }

    const unsubscribe = subscribeToLiveMatches();

    return () => {
      unsubscribe();
    };
  }, [gameId]);

  useEffect(() => {
    const reset = setTimeout(() => setPronosticos({}), 0);
    return () => clearTimeout(reset);
  }, [gameId]);

  const partidos = useMemo(() => {
    if (!game) {
      return [];
    }

    return game.matchdays
      .flatMap((matchday) => matchday.matches ?? [])
      .sort(
        (primerPartido, segundoPartido) =>
          new Date(primerPartido.kickoff_at).getTime() -
          new Date(segundoPartido.kickoff_at).getTime(),
      );
  }, [game]);

  const completados = Object.keys(pronosticos).length;

  const doblesUsados = Object.values(pronosticos).filter(
    (pronostico) => esPronosticoDoble(pronostico),
  ).length;

  const progreso =
    partidos.length === 0
      ? 0
      : (completados / partidos.length) * 100;

  const progresoDobles =
    maxDoblesPorUsuario === 0
      ? 0
      : (doblesUsados / maxDoblesPorUsuario) * 100;

  const limiteDoblesAlcanzado =
    maxDoblesPorUsuario > 0 &&
    doblesUsados >= maxDoblesPorUsuario;

  const seleccionarPronostico = (
    partidoId: string,
    opcion: Prediction,
  ) => {
    setPronosticos((actuales) => ({
      ...actuales,
      [partidoId]: opcion,
    }));
  };

  const mostrarAvisoLimiteDobles = () => {
    Alert.alert(
      "Límite alcanzado",
      `Solo podés usar doble oportunidad en ${maxDoblesPorUsuario} ${
        maxDoblesPorUsuario === 1 ? "partido" : "partidos"
      } de esta fecha.`,
    );
  };

  const convertirPronostico = (
    prediction: Prediction,
  ): {
    prediction: PredictionValue;
    secondaryPrediction: PredictionValue | null;
  } => {
    switch (prediction) {
      case "1":
        return {
          prediction: "1",
          secondaryPrediction: null,
        };

      case "X":
        return {
          prediction: "X",
          secondaryPrediction: null,
        };

      case "2":
        return {
          prediction: "2",
          secondaryPrediction: null,
        };

      case "1X":
        return {
          prediction: "1",
          secondaryPrediction: "X",
        };

      case "X2":
        return {
          prediction: "X",
          secondaryPrediction: "2",
        };
    }
  };

  const guardarPronosticos = async () => {
    if (locked) { Alert.alert("Pronósticos confirmados", "Tu participación ya fue aprobada y tus elecciones están cerradas."); return; }
    if (saving) {
      return;
    }

    if (!gameId) {
      Alert.alert(
        "Prode no disponible",
        "No pudimos identificar el prode seleccionado.",
      );

      return;
    }

    if (partidos.length === 0) {
      Alert.alert(
        "Sin partidos",
        "Todavía no hay partidos disponibles en este prode.",
      );

      return;
    }

    if (!game || game.status !== "open" || Date.now() >= new Date(game.closes_at).getTime()) {
      Alert.alert("Prode cerrado", "La fecha ya cerró y no acepta más pronósticos.");
      return;
    }

    if (completados < partidos.length) {
      const faltantes = partidos.length - completados;

      Alert.alert(
        "Faltan partidos",
        `Te ${
          faltantes === 1 ? "falta" : "faltan"
        } completar ${faltantes} ${
          faltantes === 1 ? "pronóstico" : "pronósticos"
        }.`,
      );

      return;
    }

    if (doblesUsados > maxDoblesPorUsuario) {
      Alert.alert(
        "Demasiados dobles",
        `Solo podés utilizar ${maxDoblesPorUsuario} ${
          maxDoblesPorUsuario === 1 ? "doble" : "dobles"
        } en esta fecha.`,
      );

      return;
    }

    try {
      const { data: auth, error: userError } = await supabase.auth.getSession();

      if (userError) {
        console.error(
          "Error obteniendo usuario:",
          userError,
        );

        Alert.alert(
          "Error de sesión",
          "No pudimos comprobar tu usuario. Intentá nuevamente.",
        );

        return;
      }

      const user = auth.session?.user;
      if (!user) {
        Alert.alert(
          "Sesión requerida",
          "Necesitás iniciar sesión antes de guardar tus pronósticos.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Iniciar sesión", onPress: () => router.push("/onboarding/login") },
          ],
        );

        return;
      }

      const predictions = partidos.map((partido) => {
        const seleccion = pronosticos[partido.id];

        const {
          prediction,
          secondaryPrediction,
        } = convertirPronostico(seleccion);

        return {
          matchId: partido.id,
          prediction,
          secondaryPrediction,
        };
      });

      const participation =
        await submitPredictions({
          prodeGameId: gameId,
          userId: user.id,
          predictions,
        });

      if (!participation) {
        Alert.alert(
          "No se pudo guardar",
          "Ocurrió un problema guardando tus pronósticos. Intentá nuevamente.",
        );

        return;
      }

      await loadPayment(gameId);

      Alert.alert(
        "Pronósticos guardados",
        "Transferí el importe y subí el comprobante dentro de los próximos 10 minutos para que el admin revise tu participación.",
      );
    } catch (saveError) {
      console.error(
        "Error preparando los pronósticos:",
        saveError,
      );

      Alert.alert(
        "No se pudo guardar",
        "Ocurrió un problema guardando tus pronósticos. Intentá nuevamente.",
      );
    }
  };

  if (!gameId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.feedback}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color="#C62828"
          />

          <Text style={styles.errorTitle}>
            No se seleccionó ningún prode
          </Text>

          <Text style={styles.feedbackText}>
            Ingresá desde el botón de un prode disponible en el
            inicio.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !game) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.feedback}>
          <ActivityIndicator
            size="large"
            color="#18A558"
          />

          <Text style={styles.feedbackText}>
            Cargando partidos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.feedback}>
          <Ionicons
            name="cloud-offline-outline"
            size={42}
            color="#C62828"
          />

          <Text style={styles.errorTitle}>
            No pudimos cargar el prode
          </Text>

          <Text style={styles.feedbackText}>
            {error}
          </Text>

          <Pressable
            onPress={() => loadGame(gameId)}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>
              Intentar nuevamente
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.feedback}>
          <Text style={styles.feedbackText}>
            No se encontró el prode seleccionado.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.fecha}>
              {game.prode_group.name?.toUpperCase() ??
                "PRODE SAN JORGE"}
            </Text>

            <Text style={styles.title}>
              {game.name}
            </Text>

            <Text style={styles.subtitle}>
              Elegí el resultado que creés que tendrá cada
              partido.
            </Text>
          </View>

          <View style={styles.iconContainer}>
            <Ionicons
              name="football-outline"
              size={26}
              color="#18A558"
            />
          </View>
        </View>

        {approvalNotice && <View style={styles.approvalCard}>
          <Ionicons name="checkmark-circle" size={20} color="#147D42" />
          <Text style={styles.approvalText}>{approvalNotice}</Text>
        </View>}

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              Progreso de la fecha
            </Text>

            <Text style={styles.progressValue}>
              {completados}/{partidos.length}
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    progreso,
                    100,
                  )}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.progressMessage}>
            {partidos.length > 0 &&
            completados === partidos.length
              ? "¡Completaste todos los partidos!"
              : "Completá la fecha para poder guardar."}
          </Text>
        </View>

        {maxDoblesPorUsuario > 0 && (
          <View style={styles.doubleCard}>
            <View style={styles.doubleHeader}>
              <View style={styles.doubleTitleContainer}>
                <View style={styles.doubleIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={21}
                    color="#9A6513"
                  />
                </View>

                <View>
                  <Text style={styles.doubleLabel}>
                    DOBLE OPORTUNIDAD
                  </Text>

                  <Text style={styles.doubleTitle}>
                    Dobles disponibles
                  </Text>
                </View>
              </View>

              <Text style={styles.doubleCounter}>
                {doblesUsados}/{maxDoblesPorUsuario}
              </Text>
            </View>

            <Text style={styles.doubleDescription}>
              Podés elegir dos posibles resultados en hasta{" "}
              {maxDoblesPorUsuario}{" "}
              {maxDoblesPorUsuario === 1
                ? "partido"
                : "partidos"}{" "}
              de esta fecha.
            </Text>

            <View
              style={styles.doubleProgressBackground}
            >
              <View
                style={[
                  styles.doubleProgressFill,
                  {
                    width: `${Math.min(
                      progresoDobles,
                      100,
                    )}%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.doubleMessage}>
              {limiteDoblesAlcanzado
                ? "Ya utilizaste todos los dobles disponibles."
                : `Todavía podés usar ${
                    maxDoblesPorUsuario -
                    doblesUsados
                  } ${
                    maxDoblesPorUsuario -
                      doblesUsados ===
                    1
                      ? "doble"
                      : "dobles"
                  }.`}
            </Text>
          </View>
        )}

        <View style={styles.instructions}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color="#16874A"
          />

          <Text style={styles.instructionsText}>
            1 = Local · X = Empate · 2 = Visitante
          </Text>
        </View>

        {partidos.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons
              name="calendar-outline"
              size={32}
              color="#777777"
            />

            <Text style={styles.emptyTitle}>
              Todavía no hay partidos
            </Text>

            <Text style={styles.emptyText}>
              Los partidos aparecerán cuando el administrador
              cargue esta fecha.
            </Text>
          </View>
        )}

        {partidos.map((partido) => (
          <MatchCard
            key={partido.id}
            kickoffAt={partido.kickoff_at}
            local={partido.home_team.name}
            localLogo={partido.home_team.logo_url}
            visitante={partido.away_team.name}
            visitanteLogo={partido.away_team.logo_url}
            providerId={partido.provider_id}
            selected={pronosticos[partido.id]}
            locked={locked}
            onSelect={(opcion) =>
              seleccionarPronostico(
                partido.id,
                opcion,
              )
            }
            showDoubleOptions={
              maxDoblesPorUsuario > 0
            }
            doubleLimitReached={
              limiteDoblesAlcanzado
            }
            onDoubleLimitReached={
              mostrarAvisoLimiteDobles
            }
          />
        ))}

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Pozo: ARS {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(summary.jackpot)}</Text>
          <Text style={styles.progressMessage}>{summary.players} {summary.players === 1 ? "participación aprobada" : "participaciones aprobadas"} · 78% de las entradas para premios</Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Jugadores confirmados ({summary.players})</Text>
          {!locked ? <Text style={styles.progressMessage}>Podrás ver a los jugadores y sus pronósticos cuando aprueben tu participación.</Text> :
            confirmedPlayers.length === 0 ? <Text style={styles.progressMessage}>Todavía no hay jugadores confirmados.</Text> :
            [...confirmedPlayers].sort((a, b) => {
              if (a.user_id === viewerId) return -1;
              if (b.user_id === viewerId) return 1;
              if (a.is_friend !== b.is_friend) return a.is_friend ? -1 : 1;
              return a.username.localeCompare(b.username, "es", { sensitivity: "base" });
            }).map((player) => <View key={player.participation_id} style={styles.playerPicks}>
              <Pressable onPress={() => setSelectedPlayer((current) => current === player.participation_id ? null : player.participation_id)}
                style={styles.playerButton}>
                <Text style={styles.playerName}>{player.user_id === viewerId ? `@${player.username} · Vos` : `${player.is_friend ? "★ " : ""}@${player.username}`}</Text>
                <Text style={styles.playerScore}>{player.hits}/{player.total_matches}</Text>
                <Ionicons name={selectedPlayer === player.participation_id ? "chevron-up" : "chevron-down"} size={17} color={isDark ? "#A3A3A3" : "#777777"} />
              </Pressable>
              {selectedPlayer === player.participation_id && partidos.map((match) => {
                const pick = confirmedPicks.find((item) => item.participation_id === player.participation_id && item.match_id === match.id);
                return <Text key={match.id} style={styles.pickLine}>
                  {match.home_team.name} – {match.away_team.name}: {pick ? `${pick.prediction}${pick.secondary_prediction ?? ""}` : "—"}
                </Text>;
              })}
            </View>)}
        </View>

        {partidos.length > 0 && (
          <>
            <Pressable
              disabled={saving || locked}
              onPress={guardarPronosticos}
              style={({ pressed }) => [
                styles.saveButton,
                (saving || locked) && styles.saveButtonDisabled,
                pressed &&
                  !saving &&
                  styles.buttonPressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="save-outline"
                  size={21}
                  color="#FFFFFF"
                />
              )}

              <Text style={styles.saveButtonText}>
                {locked ? "Pronósticos confirmados" : saving ? "Guardando..." : "Guardar pronósticos"}
              </Text>
            </Pressable>

            {paymentInfo ? <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Pago de la entrada</Text>
              <Text style={styles.progressMessage}>ARS {paymentInfo.amount}</Text>
              {game.payment_alias ? <Text style={styles.progressMessage}>Alias: {game.payment_alias}</Text> : null}
              {game.payment_cbu ? <>
                <Text selectable style={styles.progressMessage}>CVU/CBU: {game.payment_cbu}</Text>
                <Pressable onPress={() => void Clipboard.setStringAsync(game.payment_cbu ?? "").then(() => Alert.alert("Copiado", "El CVU/CBU quedó en el portapapeles."))} style={styles.copyButton}>
                  <Ionicons name="copy-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Copiar CVU/CBU</Text>
                </Pressable>
              </> : null}
              {game.payment_holder ? <Text style={styles.progressMessage}>Titular: {game.payment_holder}</Text> : null}
              {paymentInfo.status === "pending_payment" && freeEntry && <Pressable disabled={redeeming}
                onPress={() => void redeemCredit()} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>{redeeming ? "Aplicando…" : "Usar mi entrada gratis"}</Text>
              </Pressable>}
              {paymentInfo.status === "pending_payment" ? <>
                <Text style={styles.paymentTimer}>{secondsLeft === null ? "Tenés 10 minutos para transferir" : secondsLeft > 0
                  ? `Tiempo para transferir: ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : "Venció el plazo para pagar. La participación se reiniciará."}</Text>
                <Text style={styles.progressMessage}>Subí el comprobante antes de {paymentInfo.deadline ? new Date(paymentInfo.deadline).toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" }) + " ARG" : "que venza el plazo"}.</Text>
                <Pressable disabled={uploadingReceipt} onPress={() => void attachReceipt()} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>{uploadingReceipt ? "Enviando…" : "Adjuntar comprobante"}</Text>
                </Pressable>
              </> : <Text style={styles.progressMessage}>
                {paymentInfo.status === "payment_under_review" ? "Comprobante enviado: pendiente de aprobación."
                  : paymentInfo.status === "confirmed" ? "Participación aprobada."
                  : paymentInfo.status === "rejected" ? "Pago rechazado. Consultá al administrador." : "Pago pendiente."}
              </Text>}
            </View> : null}

            <Text style={styles.bottomMessage}>
              {locked ? "Tus elecciones están cerradas desde la aprobación." : "Podrás modificar tus elecciones hasta que se apruebe tu pago o cierre la fecha."}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (dark: boolean) => StyleSheet.create({
  approvalCard: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: (dark ? "#173726" : "#EAF8EF"), borderRadius: 14, padding: 14, marginBottom: 12 },
  approvalText: { flex: 1, color: "#147D42", fontSize: 13, fontWeight: "700" },
  copyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 10, padding: 11, backgroundColor: dark ? "#276749" : "#16874A", marginTop: 4 },
  paymentTimer: { fontSize: 18, fontWeight: "900", color: dark ? "#FFC857" : "#A55B00", marginTop: 4 },
  playerButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  playerScore: { fontWeight: "800", marginLeft: "auto", marginRight: 10, color: dark ? "#62D795" : "#16874A" },
  playerPicks: { borderTopWidth: 1, borderTopColor: "#EEEEEE", marginTop: 12, paddingTop: 10 },
  playerName: { fontSize: 14, fontWeight: "800", color: (dark ? "#FFFFFF" : "#111111"), marginBottom: 5 },
  pickLine: { fontSize: 11, color: "#555555", lineHeight: 19 },
  safeArea: {
    flex: 1,
    backgroundColor: (dark ? "#0D0D0D" : "#F5F6F7"),
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 120,
  },

  feedback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  feedbackText: {
    color: (dark ? "#A3A3A3" : "#777777"),
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
  },

  errorTitle: {
    color: (dark ? "#FFFFFF" : "#111111"),
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 12,
  },

  retryButton: {
    backgroundColor: "#18A558",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 20,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  headerContent: {
    flex: 1,
    paddingRight: 12,
  },

  fecha: {
    color: (dark ? "#A3A3A3" : "#777777"),
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 5,
  },

  title: {
    color: (dark ? "#FFFFFF" : "#111111"),
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: (dark ? "#A3A3A3" : "#707070"),
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: (dark ? "#181818" : "#FFFFFF"),
    borderWidth: 1,
    borderColor: (dark ? "#2B2B2B" : "#E8E8E8"),
    alignItems: "center",
    justifyContent: "center",
  },

  progressCard: {
    backgroundColor: (dark ? "#181818" : "#FFFFFF"),
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: (dark ? "#2B2B2B" : "#E8E8E8"),
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  progressTitle: {
    color: (dark ? "#FFFFFF" : "#111111"),
    fontSize: 15,
    fontWeight: "800",
  },

  progressValue: {
    color: "#18A558",
    fontSize: 15,
    fontWeight: "800",
  },

  progressBackground: {
    height: 9,
    borderRadius: 10,
    backgroundColor: (dark ? "#2B2B2B" : "#E5E5E5"),
    marginTop: 13,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#18A558",
  },

  progressMessage: {
    color: (dark ? "#A3A3A3" : "#777777"),
    fontSize: 11,
    marginTop: 9,
  },

  doubleCard: {
    backgroundColor: (dark ? "#2B2418" : "#FFF9EA"),
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: (dark ? "#58451D" : "#EED89D"),
  },

  doubleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  doubleTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  doubleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: (dark ? "#453314" : "#FFF0C7"),
    alignItems: "center",
    justifyContent: "center",
  },

  doubleLabel: {
    color: (dark ? "#F5D891" : "#9A6513"),
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  doubleTitle: {
    color: (dark ? "#F5D891" : "#5E430F"),
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },

  doubleCounter: {
    color: (dark ? "#F5D891" : "#9A6513"),
    fontSize: 20,
    fontWeight: "900",
  },

  doubleDescription: {
    color: (dark ? "#D2BD83" : "#7B641F"),
    fontSize: 12,
    lineHeight: 18,
    marginTop: 13,
  },

  doubleProgressBackground: {
    height: 8,
    borderRadius: 10,
    backgroundColor: (dark ? "#453314" : "#F0E0B4"),
    marginTop: 12,
    overflow: "hidden",
  },

  doubleProgressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#B7791F",
  },

  doubleMessage: {
    color: (dark ? "#D2BD83" : "#8A6B20"),
    fontSize: 10,
    fontWeight: "600",
    marginTop: 8,
  },

  instructions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: (dark ? "#173726" : "#EAF8EF"),
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
  },

  instructionsText: {
    color: (dark ? "#62D795" : "#16874A"),
    fontSize: 12,
    fontWeight: "700",
  },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: (dark ? "#181818" : "#FFFFFF"),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: (dark ? "#2B2B2B" : "#E8E8E8"),
    padding: 26,
  },

  emptyTitle: {
    color: (dark ? "#FFFFFF" : "#111111"),
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },

  emptyText: {
    color: (dark ? "#A3A3A3" : "#777777"),
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },

  saveButton: {
    height: 57,
    borderRadius: 17,
    backgroundColor: "#18A558",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 8,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  bottomMessage: {
    color: (dark ? "#A3A3A3" : "#777777"),
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
