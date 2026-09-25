import Constants from "expo-constants";
import type { PropsWithChildren } from "react";
import { useCallback, useMemo, useState } from "react";

const isExpoGo = Constants.appOwnership === "expo";
export const liveVoiceAvailable = !isExpoGo;

// Expo Go cannot load LiveKit's native WebRTC module. Keep the app usable there
// while allowing the real SDK to load in a development build.
const sdk: any = isExpoGo ? null : require("@elevenlabs/react-native");

function ExpoGoConversationProvider({ children }: PropsWithChildren) {
  return children;
}

function useUnavailableConversation(options: any = {}) {
  const [isMuted, setMuted] = useState(false);

  const startSession = useCallback(
    (sessionOptions: any = {}) => {
      const message =
        "Live voice requires an Expo development build. Run npx expo run:android or npx expo run:ios.";
      options.onError?.(message);
      sessionOptions.onError?.(message);
    },
    [options],
  );
  const endSession = useCallback(() => {}, []);
  const setConversationMuted = useCallback(
    (value: boolean) => setMuted(value),
    [],
  );

  return useMemo(
    () => ({
      startSession,
      endSession,
      setMuted: setConversationMuted,
      setVolume: () => {},
      sendContextualUpdate: () => {},
      isMuted,
      status: "disconnected",
      isSpeaking: false,
      isListening: false,
    }),
    [endSession, isMuted, setConversationMuted, startSession],
  );
}

export const ConversationProvider =
  sdk?.ConversationProvider ?? ExpoGoConversationProvider;

export function useConversation(options?: any) {
  return sdk
    ? sdk.useConversation(options)
    : useUnavailableConversation(options);
}
