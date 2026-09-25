import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppOnboarding } from "@/components/app-onboarding";
import { AuthScreen } from "@/components/auth-screen";
import { AuthenticatedScreen } from "@/components/authenticated-screen";
import { SplashScreenView } from "@/components/splash-screen";
import { ChipProvider } from "@/components/ui/bottom-chip";
import { ToastProvider } from "@/components/ui/toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ConversationProvider } from "@/lib/elevenlabs-react-native";
import { getActiveSessionUser } from "@/lib/supabase";
import { ModeProvider } from "@/providers/mode-provider";
import { Colors } from "@/theme/colors";

SplashScreen.preventAutoHideAsync().catch(() => {});

type AppStep = "onboarding" | "auth" | "app";

function AppShell() {
  const scheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);
  const [step, setStep] = useState<AppStep>("onboarding");
  const palette = Colors[scheme];

  useEffect(() => {
    getActiveSessionUser()
      .then((user) => {
        if (user) {
          setStep("app");
        }
      })
      .catch(() => {});
  }, []);

  const navigationTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.primary,
        background: palette.background,
        card: palette.card,
        text: palette.text,
        border: palette.border,
        notification: palette.destructive,
      },
    };
  }, [palette, scheme]);

  return (
    <ConversationProvider>
      <ThemeProvider value={navigationTheme}>
        {showSplash && (
          <SplashScreenView onFinish={() => setShowSplash(false)} />
        )}
        {step === "onboarding" ? (
          <AppOnboarding onComplete={() => setStep("auth")} />
        ) : step === "auth" ? (
          <AuthScreen onComplete={() => setStep("app")} />
        ) : (
          <AuthenticatedScreen onLogout={() => setStep("auth")} />
        )}
      </ThemeProvider>
    </ConversationProvider>
  );
}

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ModeProvider defaultMode="light">
        <ToastProvider>
          <ChipProvider>
            <AppShell />
          </ChipProvider>
        </ToastProvider>
      </ModeProvider>
    </GestureHandlerRootView>
  );
}
