import { StyleSheet, Text, View } from "react-native";

export default function TorneosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ranking</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
});