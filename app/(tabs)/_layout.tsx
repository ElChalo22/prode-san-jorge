import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAppAppearance } from "../../lib/appearance";

export default function TabsLayout() {
  const { isDark } = useAppAppearance();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? "#FFFFFF" : "#111111",
        tabBarInactiveTintColor: isDark ? "#AAAAAA" : "#8A8A8A",
        tabBarStyle: {
          height: 85,
          paddingTop: 8,
          paddingBottom: 20,
          borderTopWidth: 1,
          borderTopColor: isDark ? "#2B2B2B" : "#E8E8E8",
          backgroundColor: isDark ? "#181818" : "#FFFFFF",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="pronosticos"
        options={{
          title: "Pronósticos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="football-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="torneos"
        options={{
          title: "Torneos",
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="ranking"
        options={{
          title: "Premios",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="podium-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="configuracion"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="administracion"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
