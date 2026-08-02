import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

type AnimatedShieldProps = {
  name: string;
  symbol: string;
  left: number;
  top: number;
  rotation: string;
  scale: number;
  delay: number;
};

export default function AnimatedShield({
  name,
  symbol,
  left,
  top,
  rotation,
  scale,
  delay,
}: AnimatedShieldProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, {
        toValue: 0.38,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -12,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 10,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.shield,
        {
          left,
          top,
          opacity,
          transform: [
            { translateY },
            { rotate: rotation },
            { scale },
          ],
        },
      ]}
    >
      <Text style={styles.symbol}>{symbol}</Text>
      <Text style={styles.name}>{name}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shield: {
    position: "absolute",
    width: 86,
    height: 96,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 24,
    backgroundColor: "#11151A",
    alignItems: "center",
    justifyContent: "center",
  },

  symbol: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },

  name: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    marginTop: 5,
    letterSpacing: 0.6,
  },
});