import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

export type Prediction =
  | "1"
  | "X"
  | "2"
  | "1X"
  | "X2";

export type TeamFormResult = "V" | "E" | "D";

export type MatchStats = {
  homeForm?: TeamFormResult[];
  awayForm?: TeamFormResult[];
  homeH2hWins?: number;
  drawsH2h?: number;
  awayH2hWins?: number;
  stadium?: string | null;
  capacity?: string | number | null;
  referee?: string | null;
  tv?: string | null;
};

type MatchCardProps = {
  kickoffAt: string;

  local: string;
  localLogo?: string | null;

  visitante: string;
  visitanteLogo?: string | null;

  selected?: Prediction;
  onSelect: (prediction: Prediction) => void;

  showDoubleOptions?: boolean;
  doubleLimitReached?: boolean;
  onDoubleLimitReached?: () => void;

  providerId?: string | null;
  stats?: MatchStats | null;
  statsLoading?: boolean;
  statsError?: string | null;
  onStatsPress?: (providerId?: string | null) => void;
};

export const isDoublePrediction = (
  prediction?: Prediction,
) => {
  return prediction === "1X" || prediction === "X2";
};

function formatKickoff(
  kickoffAt: string,
): string {
  const date = new Date(kickoffAt);

  const weekday = new Intl.DateTimeFormat(
    "es-AR",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      weekday: "short",
    },
  )
    .format(date)
    .replace(".", "")
    .toUpperCase();

  const day = new Intl.DateTimeFormat(
    "es-AR",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      day: "2-digit",
    },
  ).format(date);

  const month = new Intl.DateTimeFormat(
    "es-AR",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      month: "short",
    },
  )
    .format(date)
    .replace(".", "")
    .toUpperCase();

  const time = new Intl.DateTimeFormat(
    "es-AR",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(date);

  return `${weekday} ${day} ${month} · ${time}`;
}

function FormPill({ result }: { result: TeamFormResult }) {
  const icon =
    result === "V"
      ? "checkmark"
      : result === "E"
        ? "remove"
        : "close";

  return (
    <View
      style={[
        styles.formPill,
        result === "V" && styles.formWin,
        result === "E" && styles.formDraw,
        result === "D" && styles.formLoss,
      ]}
    >
      <Ionicons name={icon} size={11} color="#FFFFFF" />
    </View>
  );
}


export default function MatchCard({
  kickoffAt,

  local,
  localLogo,

  visitante,
  visitanteLogo,

  selected,
  onSelect,

  showDoubleOptions = false,
  doubleLimitReached = false,
  onDoubleLimitReached,

  providerId,
  stats,
  statsLoading = false,
  statsError = null,
  onStatsPress,
}: MatchCardProps) {
  const [statsVisible, setStatsVisible] =
    React.useState(false);
  const seleccionar = (
    prediction: Prediction,
  ) => {
    const seleccionActualEsDoble =
      isDoublePrediction(selected);

    const nuevaSeleccionEsDoble =
      isDoublePrediction(prediction);

    if (
      nuevaSeleccionEsDoble &&
      doubleLimitReached &&
      !seleccionActualEsDoble
    ) {
      onDoubleLimitReached?.();
      return;
    }

    onSelect(prediction);
  };

  const dobleDeshabilitado =
    doubleLimitReached &&
    !isDoublePrediction(selected);

  const abrirEstadisticas = () => {
    setStatsVisible(true);
    onStatsPress?.(providerId);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={12}
            color="#16874A"
          />

          <Text style={styles.kickoff}>
            {formatKickoff(kickoffAt)}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {isDoublePrediction(selected) && (
            <View style={styles.doubleBadge}>
              <Ionicons
                name="shield-checkmark"
                size={10}
                color="#9A6513"
              />

              <Text style={styles.doubleBadgeText}>
                DOBLE
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver estadísticas de ${local} vs ${visitante}`}
            hitSlop={8}
            onPress={abrirEstadisticas}
            style={({ pressed }) => [
              styles.statsButton,
              pressed && styles.statsButtonPressed,
            ]}
          >
            <Ionicons
              name="stats-chart"
              size={14}
              color="#16874A"
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.predictionRow}>
        <Pressable
          onPress={() => seleccionar("1")}
          style={({ pressed }) => [
            styles.teamButton,
            selected === "1" &&
              styles.simpleSelected,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.shield,
              selected === "1" &&
                styles.shieldSelected,
            ]}
          >
            {localLogo ? (
              <Image
                source={{
                  uri: localLogo,
                }}
                style={styles.teamLogo}
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name="shield-outline"
                size={22}
                color={
                  selected === "1"
                    ? "#FFFFFF"
                    : "#111111"
                }
              />
            )}
          </View>

          <Text
            numberOfLines={2}
            style={[
              styles.teamName,
              selected === "1" &&
                styles.selectedText,
            ]}
          >
            {local}
          </Text>

          <Text
            style={[
              styles.teamResult,
              selected === "1" &&
                styles.selectedText,
            ]}
          >
            Gana
          </Text>
        </Pressable>

        <Pressable
          onPress={() => seleccionar("X")}
          style={({ pressed }) => [
            styles.drawButton,
            selected === "X" &&
              styles.simpleSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.drawSymbol,
              selected === "X" &&
                styles.selectedText,
            ]}
          >
            X
          </Text>

          <Text
            style={[
              styles.drawText,
              selected === "X" &&
                styles.selectedText,
            ]}
          >
            Empate
          </Text>
        </Pressable>

        <Pressable
          onPress={() => seleccionar("2")}
          style={({ pressed }) => [
            styles.teamButton,
            selected === "2" &&
              styles.simpleSelected,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.shield,
              selected === "2" &&
                styles.shieldSelected,
            ]}
          >
            {visitanteLogo ? (
              <Image
                source={{
                  uri: visitanteLogo,
                }}
                style={styles.teamLogo}
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name="shield-outline"
                size={22}
                color={
                  selected === "2"
                    ? "#FFFFFF"
                    : "#111111"
                }
              />
            )}
          </View>

          <Text
            numberOfLines={2}
            style={[
              styles.teamName,
              selected === "2" &&
                styles.selectedText,
            ]}
          >
            {visitante}
          </Text>

          <Text
            style={[
              styles.teamResult,
              selected === "2" &&
                styles.selectedText,
            ]}
          >
            Gana
          </Text>
        </Pressable>
      </View>

      {showDoubleOptions && (
        <View style={styles.doubleSection}>
          <View style={styles.doubleTitleRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color="#9A6513"
            />

            <Text style={styles.doubleTitle}>
              Doble oportunidad
            </Text>
          </View>

          <View style={styles.doubleOptions}>
            <Pressable
              disabled={dobleDeshabilitado}
              onPress={() =>
                seleccionar("1X")
              }
              style={({ pressed }) => [
                styles.doubleButton,

                selected === "1X" &&
                  styles.doubleSelected,

                dobleDeshabilitado &&
                  styles.doubleDisabled,

                pressed &&
                  !dobleDeshabilitado &&
                  styles.pressed,
              ]}
            >
              {localLogo ? (
                <Image
                  source={{
                    uri: localLogo,
                  }}
                  style={
                    styles.doubleTeamLogo
                  }
                  resizeMode="contain"
                />
              ) : (
                <Ionicons
                  name="shield-outline"
                  size={14}
                  color={
                    selected === "1X"
                      ? "#FFFFFF"
                      : "#8A5A12"
                  }
                />
              )}

              <Text
                numberOfLines={1}
                style={[
                  styles.doubleButtonText,
                  selected === "1X" &&
                    styles.selectedText,
                ]}
              >
                {local} gana o empata
              </Text>
            </Pressable>

            <Pressable
              disabled={dobleDeshabilitado}
              onPress={() =>
                seleccionar("X2")
              }
              style={({ pressed }) => [
                styles.doubleButton,

                selected === "X2" &&
                  styles.doubleSelected,

                dobleDeshabilitado &&
                  styles.doubleDisabled,

                pressed &&
                  !dobleDeshabilitado &&
                  styles.pressed,
              ]}
            >
              {visitanteLogo ? (
                <Image
                  source={{
                    uri: visitanteLogo,
                  }}
                  style={
                    styles.doubleTeamLogo
                  }
                  resizeMode="contain"
                />
              ) : (
                <Ionicons
                  name="shield-outline"
                  size={14}
                  color={
                    selected === "X2"
                      ? "#FFFFFF"
                      : "#8A5A12"
                  }
                />
              )}

              <Text
                numberOfLines={1}
                style={[
                  styles.doubleButtonText,
                  selected === "X2" &&
                    styles.selectedText,
                ]}
              >
                {visitante} gana o empata
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent
        visible={statsVisible}
        onRequestClose={() => setStatsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setStatsVisible(false)}
          />

          <View style={styles.statsSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.statsSheetHeader}>
              <View style={styles.statsTitleWrap}>
                <View style={styles.statsTitleIcon}>
                  <Ionicons
                    name="stats-chart"
                    size={15}
                    color="#16874A"
                  />
                </View>

                <View style={styles.statsTitleTexts}>
                  <Text style={styles.statsTitle}>
                    Estadísticas del partido
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={styles.statsSubtitle}
                  >
                    {local} vs {visitante}
                  </Text>
                </View>
              </View>

              <Pressable
                hitSlop={8}
                onPress={() => setStatsVisible(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.statsButtonPressed,
                ]}
              >
                <Ionicons
                  name="close"
                  size={19}
                  color="#222222"
                />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.statsContent}
              showsVerticalScrollIndicator={false}
            >
              {statsLoading ? (
                <View style={styles.statsState}>
                  <ActivityIndicator
                    size="small"
                    color="#16874A"
                  />
                  <Text style={styles.statsStateText}>
                    Cargando estadísticas...
                  </Text>
                </View>
              ) : statsError ? (
                <View style={styles.statsState}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={22}
                    color="#B54747"
                  />
                  <Text style={styles.statsErrorText}>
                    {statsError}
                  </Text>
                </View>
              ) : stats ? (
                <>
                  {(stats.homeForm?.length ||
                    stats.awayForm?.length) && (
                    <View style={styles.statsSection}>
                      <Text style={styles.statsSectionTitle}>
                        ÚLTIMOS PARTIDOS
                      </Text>

                      <View style={styles.formTeamRow}>
                        <View style={styles.formTeamName}>
                          {localLogo ? (
                            <Image
                              source={{ uri: localLogo }}
                              style={styles.statsTeamLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <Ionicons
                              name="shield-outline"
                              size={21}
                              color="#222222"
                            />
                          )}
                          <Text
                            numberOfLines={1}
                            style={styles.formTeamText}
                          >
                            {local}
                          </Text>
                        </View>
                        <View style={styles.formResults}>
                          {stats.homeForm?.map((result, index) => (
                            <FormPill
                              key={`home-${index}`}
                              result={result}
                            />
                          ))}
                        </View>
                      </View>

                      <View style={styles.formTeamRow}>
                        <View style={styles.formTeamName}>
                          {visitanteLogo ? (
                            <Image
                              source={{ uri: visitanteLogo }}
                              style={styles.statsTeamLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <Ionicons
                              name="shield-outline"
                              size={21}
                              color="#222222"
                            />
                          )}
                          <Text
                            numberOfLines={1}
                            style={styles.formTeamText}
                          >
                            {visitante}
                          </Text>
                        </View>
                        <View style={styles.formResults}>
                          {stats.awayForm?.map((result, index) => (
                            <FormPill
                              key={`away-${index}`}
                              result={result}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  )}

                  {(stats.homeH2hWins !== undefined ||
                    stats.drawsH2h !== undefined ||
                    stats.awayH2hWins !== undefined) && (
                    <View style={styles.statsSection}>
                      <Text style={styles.statsSectionTitle}>
                        ENFRENTAMIENTOS ENTRE SÍ
                      </Text>
                      <View style={styles.h2hRow}>
                        <View style={styles.h2hItem}>
                          <Text style={styles.h2hValue}>
                            {stats.homeH2hWins ?? 0}
                          </Text>
                          <Text style={styles.h2hLabel}>
                            Victorias de {local}
                          </Text>
                        </View>
                        <View style={styles.h2hDivider} />
                        <View style={styles.h2hItem}>
                          <Text style={styles.h2hValue}>
                            {stats.drawsH2h ?? 0}
                          </Text>
                          <Text style={styles.h2hLabel}>
                            Empates
                          </Text>
                        </View>
                        <View style={styles.h2hDivider} />
                        <View style={styles.h2hItem}>
                          <Text style={styles.h2hValue}>
                            {stats.awayH2hWins ?? 0}
                          </Text>
                          <Text style={styles.h2hLabel}>
                            Victorias de {visitante}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {(stats.stadium ||
                    stats.capacity ||
                    stats.referee ||
                    stats.tv) && (
                    <View style={styles.statsSection}>
                      <Text style={styles.statsSectionTitle}>
                        INFORMACIÓN DEL PARTIDO
                      </Text>
                      {[
                        ["location-outline", "Estadio", stats.stadium],
                        ["people-outline", "Capacidad", stats.capacity],
                        ["person-outline", "Árbitro", stats.referee],
                        ["tv-outline", "Televisión", stats.tv],
                      ].map(([icon, label, value]) =>
                        value ? (
                          <View key={String(label)} style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                              <Ionicons
                                name={icon as keyof typeof Ionicons.glyphMap}
                                size={15}
                                color="#16874A"
                              />
                            </View>
                            <View style={styles.infoTextWrap}>
                              <Text style={styles.infoLabel}>
                                {label}
                              </Text>
                              <Text style={styles.infoValue}>
                                {String(value)}
                              </Text>
                            </View>
                          </View>
                        ) : null,
                      )}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.statsState}>
                  <Ionicons
                    name="analytics-outline"
                    size={24}
                    color="#777777"
                  />
                  <Text style={styles.statsStateText}>
                    Este partido todavía no tiene estadísticas disponibles.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,

    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 11,

    marginBottom: 9,

    borderWidth: 1,
    borderColor: "#E8E8E8",

    shadowColor: "#000000",
    shadowOpacity: 0.025,
    shadowRadius: 6,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 7,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: 5,
  },

  kickoff: {
    color: "#16874A",

    fontSize: 9,
    fontWeight: "800",

    letterSpacing: 0.3,
  },

  doubleBadge: {
    flexDirection: "row",
    alignItems: "center",

    gap: 3,

    backgroundColor: "#FFF0C7",

    borderRadius: 20,

    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  doubleBadgeText: {
    color: "#9A6513",

    fontSize: 7,
    fontWeight: "900",
  },


  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statsButton: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#EAF7F0",
    borderWidth: 1,
    borderColor: "#CFECDD",
    alignItems: "center",
    justifyContent: "center",
  },

  statsButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.95 }],
  },

  predictionRow: {
    flexDirection: "row",
    alignItems: "stretch",

    gap: 6,
  },

  teamButton: {
    flex: 1,

    minHeight: 88,

    borderRadius: 12,

    backgroundColor: "#F3F4F5",

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 5,
    paddingVertical: 6,
  },

  drawButton: {
    width: 58,

    minHeight: 88,

    borderRadius: 12,

    backgroundColor: "#F3F4F5",

    alignItems: "center",
    justifyContent: "center",
  },

  simpleSelected: {
    backgroundColor: "#18A558",
  },

  shield: {
    width: 39,
    height: 39,

    borderRadius: 20,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 4,

    padding: 3,
  },

  shieldSelected: {
    backgroundColor:
      "rgba(255,255,255,0.92)",
  },

  teamLogo: {
    width: 33,
    height: 33,
  },

  teamName: {
    color: "#111111",

    fontSize: 10,
    lineHeight: 12,

    fontWeight: "800",

    textAlign: "center",

    minHeight: 23,
  },

  teamResult: {
    color: "#777777",

    fontSize: 8,
    fontWeight: "700",

    marginTop: 1,
  },

  drawSymbol: {
    color: "#111111",

    fontSize: 20,
    fontWeight: "900",
  },

  drawText: {
    color: "#777777",

    fontSize: 8,
    fontWeight: "700",

    marginTop: 2,
  },

  selectedText: {
    color: "#FFFFFF",
  },

  doubleSection: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",

    marginTop: 8,
    paddingTop: 7,
  },

  doubleTitleRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: 4,

    marginBottom: 6,
  },

  doubleTitle: {
    color: "#8A5A12",

    fontSize: 9,
    fontWeight: "800",
  },

  doubleOptions: {
    flexDirection: "row",

    gap: 6,
  },

  doubleButton: {
    flex: 1,

    height: 37,

    borderRadius: 10,

    backgroundColor: "#FFF8E8",

    borderWidth: 1,
    borderColor: "#EED89D",

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    gap: 4,

    paddingHorizontal: 6,
  },

  doubleSelected: {
    backgroundColor: "#B7791F",
    borderColor: "#B7791F",
  },

  doubleDisabled: {
    opacity: 0.4,
  },

  doubleTeamLogo: {
    width: 18,
    height: 18,
  },

  doubleButtonText: {
    flex: 1,

    color: "#805B17",

    fontSize: 8,
    lineHeight: 10,

    fontWeight: "700",

    textAlign: "center",
  },


  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
  },

  modalDismissArea: {
    flex: 1,
  },

  statsSheet: {
    maxHeight: "78%",
    minHeight: 330,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },

  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D7D7D7",
    alignSelf: "center",
    marginBottom: 8,
  },

  statsSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },

  statsTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingRight: 12,
  },

  statsTitleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EAF7F0",
    alignItems: "center",
    justifyContent: "center",
  },

  statsTitleTexts: {
    flex: 1,
  },

  statsTitle: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
  },

  statsSubtitle: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F5",
    alignItems: "center",
    justifyContent: "center",
  },

  statsContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },

  statsState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 24,
  },

  statsStateText: {
    color: "#666666",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  statsErrorText: {
    color: "#B54747",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  statsSection: {
    backgroundColor: "#F8F9F9",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ECEEEE",
  },

  statsSectionTitle: {
    color: "#111111",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 10,
  },

  formTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 34,
  },

  formTeamName: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statsTeamLogo: {
    width: 21,
    height: 21,
  },

  formTeamText: {
    flex: 1,
    color: "#222222",
    fontSize: 9,
    fontWeight: "800",
  },

  formResults: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  formPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  formWin: {
    backgroundColor: "#18A558",
  },

  formDraw: {
    backgroundColor: "#8C9399",
  },

  formLoss: {
    backgroundColor: "#D84A4A",
  },

  h2hRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },

  h2hItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  h2hDivider: {
    width: 1,
    backgroundColor: "#E1E3E4",
  },

  h2hValue: {
    color: "#16874A",
    fontSize: 18,
    fontWeight: "900",
  },

  h2hLabel: {
    color: "#666666",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 6,
  },

  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EAF7F0",
    alignItems: "center",
    justifyContent: "center",
  },

  infoTextWrap: {
    flex: 1,
  },

  infoLabel: {
    color: "#888888",
    fontSize: 8,
    fontWeight: "700",
  },

  infoValue: {
    color: "#222222",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 1,
  },

  webViewContainer: {
    height: 560,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  webView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  webViewLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },

  pressed: {
    transform: [
      {
        scale: 0.97,
      },
    ],

    opacity: 0.82,
  },
});
