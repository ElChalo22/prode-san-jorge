import { Button } from "@/components";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function LoginScreen() {
  return (
    <View style={styles.container}>

      <View style={styles.header}>

        <Text style={styles.logo}>⚽</Text>

        <Text style={styles.title}>
          Bienvenido
        </Text>

        <Text style={styles.subtitle}>
          Iniciá sesión para comenzar a jugar con tus amigos.
        </Text>

      </View>

      <View style={styles.buttons}>

        <Button
          title="Continuar con Google"
          icon="logo-google"
          onPress={() => {}}
        />

        <View style={{ height: 14 }} />

        <Button
          title="Continuar con Apple"
          icon="logo-apple"
          variant="secondary"
          onPress={() => {}}
        />

        <View style={{ height: 14 }} />

        <Button
          title="Continuar con Email"
          icon="mail"
          variant="outline"
          onPress={() => router.push("/onboarding/username")}
        />

      </View>

      <Text style={styles.footer}>
        Al continuar aceptás nuestros{" "}
        <Text style={styles.link}>
          Términos y Condiciones
        </Text>
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#080A0D",
    paddingHorizontal: 28,
    justifyContent: "space-between",
    paddingTop: 90,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
  },

  logo: {
    fontSize: 72,
  },

  title: {
    marginTop: 24,
    color: "white",
    fontSize: 34,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 12,
    color: "#B6BBC2",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },

  buttons: {
    width: "100%",
  },

  footer: {
    color: "#7B7E84",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },

  link: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

});