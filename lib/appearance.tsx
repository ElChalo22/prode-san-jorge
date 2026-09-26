import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, useColorScheme } from "react-native";

export type AppearancePreference = "system" | "light" | "dark";
const STORAGE_KEY = "prode-appearance";
const AppearanceContext = createContext<{
  preference: AppearancePreference;
  setPreference: (value: AppearancePreference) => Promise<void>;
}>({ preference: "system", setPreference: async () => {} });

export function AppAppearanceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setStoredPreference] = useState<AppearancePreference>("system");
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!active) return;
      const value = stored === "light" || stored === "dark" ? stored : "system";
      setStoredPreference(value);
      Appearance.setColorScheme(value === "system" ? "unspecified" : value);
    });
    return () => { active = false; };
  }, []);
  const value = useMemo(() => ({ preference, setPreference: async (next: AppearancePreference) => {
    Appearance.setColorScheme(next === "system" ? "unspecified" : next);
    setStoredPreference(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } }), [preference]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppAppearance() {
  return { ...useContext(AppearanceContext), isDark: useColorScheme() === "dark" };
}
