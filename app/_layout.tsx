import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useThemePersistence } from "../hooks/useThemePersistence";
import './globals.css';

LogBox.ignoreLogs(["Image: style.resizeMode is deprecated"]);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isThemeLoaded } = useThemePersistence();

  useEffect(() => {
    if (isThemeLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isThemeLoaded]);

  if (!isThemeLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
