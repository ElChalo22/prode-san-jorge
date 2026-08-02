import AnimatedShield from "@/components/AnimatedShield";
import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const CLUBS = [
  { name: "CARP", symbol: "R" },
  { name: "CABJ", symbol: "B" },
  { name: "RACING", symbol: "R" },
  { name: "CASLA", symbol: "SL" },
  { name: "CAI", symbol: "I" },
  { name: "NOB", symbol: "N" },
  { name: "TALLERES", symbol: "T" },
  { name: "HURACÁN", symbol: "H" },
  { name: "VÉLEZ", symbol: "V" },
  { name: "AAAJ", symbol: "A" },
];

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export default function WelcomeScreen() {
  const selectedClubs = useMemo(() => shuffle(CLUBS).slice(0, 8), []);

  const shieldsOpacity = useRef(new Animated.Value(0)).current;
  const shieldsScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
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
    ]).start();
  }, [
    buttonOpacity,
    buttonTranslate,
    logoOpacity,
    logoScale,
    shieldsOpacity,
    shieldsScale,
  ]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.shieldsLayer,
          {
            opacity: shieldsOpacity,
            transform: [{ scale: shieldsScale }],
          },
        ]}
      >
  {selectedClubs.map((club, index) => (
  <AnimatedShield
    key={`${club.name}-${index}`}
    name={club.name}
    symbol={club.symbol}
    left={SHIELD_POSITIONS[index].left}
    top={SHIELD_POSITIONS[index].top}
    rotation={SHIELD_POSITIONS[index].rotation}
    scale={SHIELD_POSITIONS[index].scale}
    delay={index * 120}
  />
))}
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
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push("/onboarding/login")}
        >
          <Text style={styles.buttonText}>COMENZAR</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const SHIELD_POSITIONS = [
  { left: width * 0.08, top: height * 0.1, rotation: "-8deg", scale: 1.05 },
  { left: width * 0.62, top: height * 0.12, rotation: "7deg", scale: 0.9 },
  { left: width * 0.32, top: height * 0.23, rotation: "-3deg", scale: 1 },
  { left: width * 0.72, top: height * 0.34, rotation: "9deg", scale: 0.82 },
  { left: width * 0.06, top: height * 0.4, rotation: "-7deg", scale: 0.88 },
  { left: width * 0.14, top: height * 0.7, rotation: "5deg", scale: 0.84 },
  { left: width * 0.62, top: height * 0.68, rotation: "-5deg", scale: 1 },
  { left: width * 0.38, top: height * 0.82, rotation: "4deg", scale: 0.78 },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080A0D",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  shieldsLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  shield: {
    position: "absolute",
    width: 86,
    height: 96,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 24,
    backgroundColor: "#11151A",
    justifyContent: "center",
    alignItems: "center",
  },

  shieldSymbol: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },

  shieldName: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    marginTop: 5,
    letterSpacing: 0.6,
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

  button: {
    height: 58,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },

  buttonText: {
    color: "#080A0D",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});