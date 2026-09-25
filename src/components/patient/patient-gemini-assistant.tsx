import { useColor } from "@/hooks/useColor";
import { useConversation } from "@/lib/elevenlabs-react-native";
import {
    ArrowLeft,
    Mic,
    MicOff,
    PhoneOff,
    Sparkles,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Linking,
    Modal,
    PermissionsAndroid,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type TranscriptMessage = {
  id: string;
  role: "user" | "agent";
  message: string;
};

type PatientGeminiAssistantProps = {
  visible: boolean;
  onClose: () => void;
};

const agentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID?.trim() || "";

async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  if (await PermissionsAndroid.check(permission)) return true;

  const result = await PermissionsAndroid.request(permission, {
    title: "Microphone access",
    message: "Microphone access is required for voice conversations.",
    buttonPositive: "Continue",
    buttonNegative: "Not now",
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function VoiceOrb({
  active,
  speaking,
  color,
}: {
  active: boolean;
  speaking: boolean;
  color: string;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(active ? (speaking ? 1.16 : 1.08) : 1.02, {
        duration: speaking ? 700 : 1400,
      }),
      -1,
      true,
    );
  }, [active, speaking, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.orbStage}>
      <Animated.View
        style={[
          styles.orbHalo,
          { borderColor: color, opacity: active ? 0.24 : 0.1 },
          animatedStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.orbRing,
          { borderColor: color, opacity: active ? 0.5 : 0.2 },
          animatedStyle,
        ]}
      />
      <Animated.View
        style={[styles.orb, { backgroundColor: color }, animatedStyle]}
      >
        <Sparkles size={42} color="#FFFFFF" strokeWidth={1.5} />
      </Animated.View>
    </View>
  );
}

export function PatientGeminiAssistant({
  visible,
  onClose,
}: PatientGeminiAssistantProps) {
  const background = useColor("background");
  const card = useColor("card");
  const text = useColor("text");
  const muted = useColor("textMuted");
  const primary = useColor("primary");
  const border = useColor("border");
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<ScrollView>(null);

  const conversation = useConversation({
    onMessage: ({ message, role, event_id }: { message: string; role: any; event_id?: string | number }) => {
      setMessages((current) => [
        ...current,
        {
          id: String(event_id ?? `${Date.now()}-${current.length}`),
          role,
          message,
        },
      ]);
    },
    onError: (message: any) => {
      console.error("VOICE: error", message);
      setError(
        "Unable to connect to the voice assistant. Please check your internet connection and try again.",
      );
    },
    onConnect: () => {
      console.log("VOICE: session connected");
      setError(null);
    },
    onDisconnect: () => console.log("VOICE: session ended"),
  });

  const status = conversation.status;
  const active = status === "connected";
  const connecting = status === "connecting";
  const speaking = conversation.isSpeaking;

  useEffect(() => {
    if (visible) return;
    conversation.endSession();
    setMessages([]);
    setError(null);
  }, [visible]);

  useEffect(() => {
    transcriptRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => () => conversation.endSession(), [conversation.endSession]);

  const handleStart = async () => {
    if (active || connecting) return;
    setError(null);

    if (!agentId || agentId.includes("your_")) {
      setError(
        "Voice assistant is not configured yet. Add the public ElevenLabs agent ID and rebuild the app.",
      );
      return;
    }

    try {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        Alert.alert(
          "Microphone access required",
          "Microphone access is required for voice conversations. Please enable microphone access in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      console.log("VOICE: starting session");
      conversation.startSession({ agentId });
    } catch (startError) {
      console.error("VOICE: start failed", startError);
      setError("Unable to start the voice assistant. Please try again.");
    }
  };

  const handleEnd = () => {
    conversation.endSession();
  };

  const statusLabel = connecting
    ? "Connecting..."
    : !active
      ? "Tap the microphone to start"
      : speaking
        ? "Speaking..."
        : conversation.isMuted
          ? "Microphone muted"
          : "Listening...";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: background }]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close voice assistant"
            hitSlop={12}
            style={styles.iconButton}
          >
            <ArrowLeft size={22} color={text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: text }]}>AI Assistant</Text>
            <Text style={[styles.subtitle, { color: muted }]}>
              Talk naturally with your assistant
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <VoiceOrb
            active={active || connecting}
            speaking={speaking}
            color={primary}
          />
          <Text style={[styles.status, { color: text }]}>{statusLabel}</Text>
          {error ? (
            <Animated.View entering={FadeIn} style={styles.errorBlock}>
              <Text style={[styles.errorText, { color: text }]}>{error}</Text>
              <Pressable
                onPress={handleStart}
                accessibilityLabel="Try starting the voice assistant again"
              >
                <Text style={[styles.retryText, { color: primary }]}>
                  Try again
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}

          <ScrollView
            ref={transcriptRef}
            style={[
              styles.transcript,
              { backgroundColor: card, borderColor: border },
            ]}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <Text style={[styles.emptyTranscript, { color: muted }]}>
                Your conversation will appear here.
              </Text>
            ) : (
              messages.map((item) => (
                <View key={item.id} style={styles.message}>
                  <Text style={[styles.messageRole, { color: primary }]}>
                    {item.role === "user" ? "You" : "Assistant"}
                  </Text>
                  <Text style={[styles.messageText, { color: text }]}>
                    {item.message}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.controls}>
            {active ? (
              <>
                <Pressable
                  onPress={() => conversation.setMuted(!conversation.isMuted)}
                  accessibilityLabel={
                    conversation.isMuted
                      ? "Unmute microphone"
                      : "Mute microphone"
                  }
                  style={[
                    styles.controlButton,
                    { borderColor: border, backgroundColor: card },
                  ]}
                >
                  {conversation.isMuted ? (
                    <MicOff size={22} color={muted} />
                  ) : (
                    <Mic size={22} color={primary} />
                  )}
                </Pressable>
                <Pressable
                  onPress={handleEnd}
                  accessibilityLabel="End voice conversation"
                  style={[styles.endButton, { backgroundColor: primary }]}
                >
                  <PhoneOff size={22} color="#FFFFFF" />
                  <Text style={styles.endButtonText}>End conversation</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={handleStart}
                disabled={connecting}
                accessibilityLabel="Start voice conversation"
                style={[
                  styles.startButton,
                  { backgroundColor: primary, opacity: connecting ? 0.6 : 1 },
                ]}
              >
                <Mic size={24} color="#FFFFFF" />
                <Text style={styles.startButtonText}>
                  {connecting ? "Connecting..." : "Start conversation"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, alignItems: "center" },
  headerSpacer: { width: 44 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 2 },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  orbStage: {
    width: 250,
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  orbHalo: {
    position: "absolute",
    width: 244,
    height: 244,
    borderRadius: 122,
    borderWidth: 1,
  },
  orbRing: {
    position: "absolute",
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 1,
  },
  orb: {
    width: 136,
    height: 136,
    borderRadius: 68,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  status: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  errorBlock: { alignItems: "center", marginBottom: 12, paddingHorizontal: 12 },
  errorText: { textAlign: "center", fontSize: 13, lineHeight: 19 },
  retryText: { fontSize: 14, fontWeight: "800", marginTop: 8 },
  transcript: { width: "100%", flex: 1, borderWidth: 1, borderRadius: 14 },
  transcriptContent: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  emptyTranscript: { textAlign: "center", fontSize: 14, paddingVertical: 24 },
  message: { gap: 4 },
  messageRole: { fontSize: 12, fontWeight: "800" },
  messageText: { fontSize: 15, lineHeight: 22 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 18,
    minHeight: 76,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  startButton: {
    minHeight: 56,
    width: "100%",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  endButton: {
    minHeight: 56,
    flex: 1,
    borderRadius: 12,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  endButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
