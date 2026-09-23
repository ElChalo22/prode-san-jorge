import { Button } from "@/components";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

type WelcomeTeam = {
  id: string;
  name: string;
  logo_url: string;
};

const SHIELD_POSITIONS = [
  {
    left: width * 0.08,
    top: height * 0.1,
    rotation: "-8deg",
    scale: 1.05,
  },
  {
    left: width * 0.62,
    top: height * 0.12,
    rotation: "7deg",
    scale: 0.9,
  },
  {
    left: width * 0.32,
    top: height * 0.23,
    rotation: "-3deg",
    scale: 1,
  },
  {
    left: width * 0.72,
    top: height * 0.34,
    rotation: "9deg",
    scale: 0.82,
  },
  {
    left: width * 0.06,
    top: height * 0.4,
    rotation: "-7deg",
    scale: 0.88,
  },
  {
    left: width * 0.14,
    top: height * 0.7,
    rotation: "5deg",
    scale: 0.84,
  },
  {
    left: width * 0.62,
    top: height * 0.68,
    rotation: "-5deg",
    scale: 1,
  },
  {
    left: width * 0.38,
    top: height * 0.82,
    rotation: "4deg",
    scale: 0.78,
  },
];

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export default function WelcomeScreen() {
  const [teams, setTeams] = useState<WelcomeTeam[]>([]);
  const [savedAccount, setSavedAccount] = useState<{ username: string | null; email: string | null; needsUsername: boolean } | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let active = true;
    const loadAccount = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) return;
      const { data: profile } = await supabase.from("profiles")
        .select("username, onboarding_completed")
        .eq("id", data.session.user.id).maybeSingle();
      if (active) setSavedAccount({
        username: profile?.username ?? null,
        email: data.session.user.email ?? null,
        needsUsername: profile !== null && !profile?.onboarding_completed,
      });
    };
    void loadAccount();
    return () => { active = false; };
  }, []);

  const shieldsOpacity = useRef(new Animated.Value(0)).current;
  const shieldsScale = useRef(new Animated.Value(0.8)).current;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;

  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const loadTeams = async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, logo_url")
        .not("logo_url", "is", null)
        .eq("active", true)
        .limit(40);

      if (error) {
        console.error(
          "No se pudieron cargar los escudos del welcome:",
          error,
        );
        return;
      }

      const validTeams = (data ?? []).filter(
        (
          team,
        ): team is {
          id: string;
          name: string;
          logo_url: string;
        } => Boolean(team.logo_url),
      );

      setTeams(shuffle(validTeams).slice(0, 8));
    };

    loadTeams();
  }, []);

  const selectedTeams = useMemo(
    () => teams.slice(0, SHIELD_POSITIONS.length),
    [teams],
  );

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(shieldsOpacity, {
          toValue: 0.38,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.spring(shieldsScale, {
          toValue: 1,
          friction: 7,
          tension: 35,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(900),

      Animated.parallel([
        Animated.timing(shieldsOpacity, {
          toValue: 0.1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [
    buttonOpacity,
    buttonTranslate,
    logoOpacity,
    logoScale,
    shieldsOpacity,
    shieldsScale,
  ]);

  const handleStart = () => {
    router.push(savedAccount ? savedAccount.needsUsername ? "/onboarding/username" : "/(tabs)" : "/onboarding/login");
  };

  const changeAccount = async () => {
    if (switching) return;
    setSwitching(true);
    const { error } = await supabase.auth.signOut();
    setSwitching(false);
    if (!error) router.push("/onboarding/login");
  };

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shieldsLayer,
          {
            opacity: shieldsOpacity,
            transform: [{ scale: shieldsScale }],
          },
        ]}
      >
        {selectedTeams.map((team, index) => {
          const position = SHIELD_POSITIONS[index];

          if (!position) {
            return null;
          }

          return (
            <View
              key={team.id}
              style={[
                styles.shieldPosition,
                {
                  left: position.left,
                  top: position.top,
                  transform: [
                    { rotate: position.rotation },
                    { scale: position.scale },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri: team.logo_url }}
                style={styles.teamLogo}
                resizeMode="contain"
              />
            </View>
          );
        })}
      </Animated.View>

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Text style={styles.logoMain}>PRODE</Text>

        <Text style={styles.logoSecondary}>SAN JORGE</Text>

        <View style={styles.logoDivider}>
          <View style={styles.line} />

          <Text style={styles.ball}>⚽</Text>

          <View style={styles.line} />
        </View>

        <Text style={styles.subtitle}>
          El fútbol se vive mejor cuando todos juegan.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslate }],
          },
        ]}
      >
        <Button
          title={savedAccount ? `ENTRAR COMO ${savedAccount.username ? `@${savedAccount.username}` : savedAccount.email ?? "MI CUENTA"}` : "COMENZAR"}
          variant="white"
          onPress={handleStart}
        />
        {savedAccount ? <Pressable disabled={switching} onPress={() => void changeAccount()} style={styles.otherAccount}>
          <Text style={styles.otherAccountText}>Usar otra cuenta</Text>
        </Pressable> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080A0D",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  shieldsLayer: {
    ...StyleSheet.absoluteFill,
  },

  shieldPosition: {
    position: "absolute",
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
  },

  teamLogo: {
    width: 76,
    height: 76,
  },

  logoContainer: {
    width: "100%",
    paddingHorizontal: 28,
    alignItems: "center",
    zIndex: 2,
  },

  logoMain: {
    color: "#FFFFFF",
    fontSize: 54,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -2,
  },

  logoSecondary: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1,
    marginTop: -7,
  },

  logoDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },

  line: {
    width: 72,
    height: 1,
    backgroundColor: "#FFFFFF",
  },

  ball: {
    fontSize: 24,
    marginHorizontal: 12,
  },

  subtitle: {
    color: "#B8BBC0",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 22,
    maxWidth: 300,
  },

  buttonWrapper: {
    position: "absolute",
    bottom: 48,
    width: "100%",
    paddingHorizontal: 26,
    zIndex: 3,
  },
  otherAccount: { alignItems: "center", padding: 12, marginTop: 8 },
  otherAccountText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
