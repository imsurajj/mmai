/**
 * PatientDailyCheck — Immersive full-screen post-login voice check-in.
 *
 * PHASE 1 GREETING  : Dark overlay fades in. Voice greets patient by name.
 * PHASE 2 QUESTIONS : Gemini asks 3 adaptive questions (from caregiver reports).
 * PHASE 3 PLAN      : Voice reads today's task/reminder plan. Patient acknowledges.
 * PHASE 4 SUMMARY   : Score ring + updated baseline + caregiver quick-add.
 */
import {
    addCareReminder,
    CareReminder,
    PersonalBaseline,
    TimelineEvent,
} from "@/lib/caregiver-service";
import {
    liveVoiceAvailable,
    useConversation,
} from "@/lib/elevenlabs-react-native";
import { speakQuestion, stopSpeaking } from "@/lib/elevenlabs-service";
import {
    DynamicQuestion,
    generateGeminiPatientQuestion,
} from "@/lib/gemini-service";
import {
    getPatientCapacityProfile,
    getPatientReports,
    PatientVerifiedReport,
} from "@/lib/patient-reports-service";
import { CurrentSessionUser, safeStorage } from "@/lib/supabase";
import {
    Activity,
    ArrowRight,
    BarChart3,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    HeartHandshake,
    HelpCircle,
    Mic,
    MicOff,
    Pill,
    Plus,
    Smile,
    Sparkles,
    Volume2,
    VolumeX,
    X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    PermissionsAndroid,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    SlideInRight,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

export const DAILY_CHECK_STORAGE_KEY = "mmai_daily_check_completed_date";
const TOTAL_QUESTIONS = 3;
const voiceAgentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID?.trim() || "";
type Phase = "greeting" | "questions" | "plan" | "summary";
type AnswerRecord = {
  question: DynamicQuestion;
  selectedIndex: number;
  isCorrect: boolean;
  responseTimeMs: number;
};

function DailyVoiceOrb({
  active,
  speaking,
}: {
  active: boolean;
  speaking: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(active ? (speaking ? 1.14 : 1.07) : 1.02, {
        duration: speaking ? 700 : 1400,
      }),
      -1,
      true,
    );
  }, [active, speaking, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.dailyOrbStage}>
      <Animated.View
        style={[
          styles.dailyOrbHalo,
          animatedStyle,
          active && styles.dailyOrbHaloActive,
        ]}
      />
      <Animated.View style={[styles.dailyOrbRing, animatedStyle]} />
      <Animated.View style={[styles.dailyOrbCore, animatedStyle]}>
        <Sparkles size={38} color="#FFFFFF" strokeWidth={1.5} />
      </Animated.View>
    </View>
  );
}

export type PatientDailyCheckProps = {
  user: CurrentSessionUser | null;
  baseline: PersonalBaseline | null;
  timelineEvents: TimelineEvent[];
  reminders: CareReminder[];
  onComplete: (updatedBaseline: PersonalBaseline) => void;
};

export function PatientDailyCheck({
  user,
  baseline,
  timelineEvents,
  reminders,
  onComplete,
}: PatientDailyCheckProps) {
  const [phase, setPhase] = useState<Phase>("greeting");
  const [reports, setReports] = useState<PatientVerifiedReport[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [currentQ, setCurrentQ] = useState<DynamicQuestion | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const qStartTime = useRef<number>(Date.now());
  const [planReminders, setPlanReminders] = useState<CareReminder[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(
    new Set(),
  );
  const [planReadingIndex, setPlanReadingIndex] = useState(-1);
  const [planIntroSpoken, setPlanIntroSpoken] = useState(false);
  const [updatedBaseline, setUpdatedBaseline] =
    useState<PersonalBaseline | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // default UNMUTED
  const audioUnlocked = useRef(false);
  const [showCareAdd, setShowCareAdd] = useState(false);
  const [careAddTitle, setCareAddTitle] = useState("");
  const [careAddTime, setCareAddTime] = useState("");
  const [careAddCat, setCareAddCat] =
    useState<CareReminder["category"]>("custom");
  const [careAddSaving, setCareAddSaving] = useState(false);
  const [localReminders, setLocalReminders] =
    useState<CareReminder[]>(reminders);
  const capacity = getPatientCapacityProfile(baseline);
  const pendingVoiceText = useRef<string | null>(null);
  const pendingVoiceEnd = useRef<(() => void) | undefined>(undefined);
  const liveConversation = useConversation({
    onConnect: () => {
      console.log("VOICE: daily check connected");
      if (pendingVoiceText.current) {
        liveConversation.sendContextualUpdate?.(
          `Speak this to the patient naturally and exactly: ${pendingVoiceText.current}`,
        );
        pendingVoiceText.current = null;
      }
    },
    onError: (message: string) =>
      console.error("VOICE: daily check error", message),
    onDisconnect: () => console.log("VOICE: daily check ended"),
    onModeChange: ({ mode }: { mode: "speaking" | "listening" }) => {
      setIsSpeaking(mode === "speaking");
      if (mode === "listening" && pendingVoiceEnd.current) {
        const finish = pendingVoiceEnd.current;
        pendingVoiceEnd.current = undefined;
        finish();
      }
    },
  });

  useEffect(() => {
    if (
      Platform.OS === "web" ||
      !liveVoiceAvailable ||
      !voiceAgentId ||
      voiceAgentId.includes("your_")
    )
      return;

    let cancelled = false;
    const startLiveVoice = async () => {
      if (Platform.OS === "android") {
        const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
        const granted =
          (await PermissionsAndroid.check(permission)) ||
          (await PermissionsAndroid.request(permission, {
            title: "Microphone access",
            message: "Microphone access is required for live voice check-ins.",
            buttonPositive: "Continue",
            buttonNegative: "Not now",
          })) === PermissionsAndroid.RESULTS.GRANTED;
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
      }
      if (!cancelled && liveConversation.status === "disconnected") {
        console.log("VOICE: starting daily check session");
        liveConversation.startSession({ agentId: voiceAgentId });
      }
    };

    const timer = setTimeout(startLiveVoice, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      liveConversation.endSession();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") setIsSpeaking(liveConversation.isSpeaking);
  }, [liveConversation.isSpeaking]);

  // Waveform
  const w1 = useSharedValue(0.3);
  const w2 = useSharedValue(0.3);
  const w3 = useSharedValue(0.3);
  const w4 = useSharedValue(0.3);
  const w5 = useSharedValue(0.3);
  useEffect(() => {
    const ws = [w1, w2, w3, w4, w5];
    const dur = [320, 260, 380, 290, 340];
    if (isSpeaking) {
      ws.forEach((w, i) => {
        w.value = withRepeat(
          withSequence(
            withTiming(1, { duration: dur[i] }),
            withTiming(0.15, { duration: dur[i] }),
          ),
          -1,
          true,
        );
      });
    } else {
      ws.forEach((w) => {
        w.value = withTiming(0.25, { duration: 300 });
      });
    }
  }, [isSpeaking]);
  const aW1 = useAnimatedStyle(() => ({ transform: [{ scaleY: w1.value }] }));
  const aW2 = useAnimatedStyle(() => ({ transform: [{ scaleY: w2.value }] }));
  const aW3 = useAnimatedStyle(() => ({ transform: [{ scaleY: w3.value }] }));
  const aW4 = useAnimatedStyle(() => ({ transform: [{ scaleY: w4.value }] }));
  const aW5 = useAnimatedStyle(() => ({ transform: [{ scaleY: w5.value }] }));
  const animatedWaves = [aW1, aW2, aW3, aW4, aW5];

  const overlayOp = useSharedValue(1);
  useEffect(() => {
    overlayOp.value = withTiming(1, { duration: 700 });
  }, []);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOp.value }));

  useEffect(() => {
    getPatientReports().then(setReports);
  }, []);

  // Unlock audio context on mobile (required before Web Speech can auto-play)
  const unlockAudio = () => {
    if (audioUnlocked.current) return;
    audioUnlocked.current = true;
    try {
      const win: any = typeof window !== "undefined" ? window : null;
      if (win?.AudioContext || win?.webkitAudioContext) {
        const AudioCtx = win.AudioContext || win.webkitAudioContext;
        const ctx = new AudioCtx();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        ctx.resume();
      }
    } catch {}
  };

  // Greeting auto-speak
  useEffect(() => {
    if (phase !== "greeting") return;
    const name = user?.name || "Friend";
    const greet =
      capacity.level === "supported"
        ? `Hello ${name}! It is time for your daily memory check-in. I will ask a few simple questions, then tell you about your day.`
        : `Good day, ${name}! Welcome to your morning check-in. I will ask a few questions based on your health reports, then walk you through your plan for today.`;
    const t = setTimeout(() => {
      if (!isMuted)
        speak(greet, () => {
          setTimeout(() => {
            setPhase("questions");
            setQIndex(0);
            setAnswers([]);
            fetchNextQuestion();
          }, 800);
        });
      else {
        // If muted, auto-advance after a fixed delay
        setTimeout(() => {
          setPhase("questions");
          setQIndex(0);
          setAnswers([]);
          fetchNextQuestion();
        }, 3000);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [phase]);

  // Plan intro
  useEffect(() => {
    if (phase !== "plan") return;
    const today = localReminders
      .filter((r) => r.status === "active")
      .slice(0, 6);
    setPlanReminders(today);
    if (!planIntroSpoken) {
      setPlanIntroSpoken(true);
      const intro = `Great job! Now let me tell you what is planned for today. You have ${today.length} items on your schedule.`;
      setTimeout(() => speak(intro, () => setPlanReadingIndex(0)), 600);
    }
  }, [phase]);

  // Sequential plan item read-out
  useEffect(() => {
    if (
      phase !== "plan" ||
      planReadingIndex < 0 ||
      planReadingIndex >= planReminders.length
    )
      return;
    const item = planReminders[planReadingIndex];
    const txt = `${planReadingIndex + 1}. ${item.title}${item.scheduled_time ? `, at ${item.scheduled_time}` : ""}.`;
    speak(txt, () => {
      setTimeout(() => setPlanReadingIndex((i) => i + 1), 700);
    });
  }, [planReadingIndex]);

  useEffect(() => {
    if (
      phase !== "plan" ||
      planReadingIndex !== planReminders.length ||
      planReminders.length === 0
    )
      return;
    setTimeout(
      () =>
        speak(
          "That is your full plan for today. Please tap each item to confirm, then tap All Done when you are ready.",
        ),
      600,
    );
  }, [planReadingIndex, planReminders.length]);

  const speak = (text: string, onEnd?: () => void) => {
    if (isMuted) {
      onEnd?.();
      return;
    } // respect mute
    if (Platform.OS !== "web") {
      if (liveConversation.status === "connected") {
        pendingVoiceEnd.current = onEnd;
        liveConversation.sendContextualUpdate(
          `Speak this to the patient naturally and exactly: ${text}`,
        );
      } else {
        pendingVoiceText.current = text;
        pendingVoiceEnd.current = onEnd;
      }
      return;
    }
    speakQuestion({
      text,
      capacity: capacity.level,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        onEnd?.();
      },
      onError: () => {
        setIsSpeaking(false);
        onEnd?.();
      },
    });
  };

  const toggleMute = () => {
    if (!isMuted) {
      // Muting — stop any active speech
      stopSpeaking();
      setIsSpeaking(false);
      setIsMuted(true);
      if (Platform.OS !== "web") liveConversation.setMuted(true);
    } else {
      // Unmuting — unlock audio on mobile and replay current content
      unlockAudio();
      setIsMuted(false);
      if (Platform.OS !== "web") liveConversation.setMuted(false);
      if (phase === "questions" && currentQ) {
        setTimeout(
          () =>
            speakQuestion({
              text: currentQ.speechPrompt || currentQ.questionText,
              capacity: capacity.level,
              onStart: () => setIsSpeaking(true),
              onEnd: () => setIsSpeaking(false),
              onError: () => setIsSpeaking(false),
            }),
          150,
        );
      }
    }
  };

  const fetchNextQuestion = async () => {
    setLoadingQ(true);
    setSelectedOpt(null);
    setIsAnswered(false);
    stopSpeaking();
    setIsSpeaking(false);
    try {
      const q = await generateGeminiPatientQuestion({
        patientName: user?.name || "Friend",
        baseline,
        capacity,
        reports,
        timelineEvents,
        reminders: localReminders,
      });
      setCurrentQ(q);
      qStartTime.current = Date.now();
      setTimeout(() => speak(q.speechPrompt || q.questionText), 500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQ(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered || !currentQ) return;
    const ms = Date.now() - qStartTime.current;
    const correct = idx === currentQ.correctIndex;
    setSelectedOpt(idx);
    setIsAnswered(true);
    speak(currentQ.encouragingFeedback);
    setAnswers((prev) => [
      ...prev,
      {
        question: currentQ,
        selectedIndex: idx,
        isCorrect: correct,
        responseTimeMs: ms,
      },
    ]);
  };

  const handleNextQuestion = () => {
    const next = qIndex + 1;
    if (next >= TOTAL_QUESTIONS) {
      stopSpeaking();
      setPhase("plan");
    } else {
      setQIndex(next);
      fetchNextQuestion();
    }
  };

  const handleCloseVoice = async () => {
    stopSpeaking();
    liveConversation.endSession();
    await safeStorage.setItem(
      DAILY_CHECK_STORAGE_KEY,
      new Date().toDateString(),
    );
    onComplete(
      baseline ?? {
        patient_id: user?.id || "default",
        object_average: 85,
        orientation_average: 90,
        recent_event_average: 82,
        average_response_time: 7.8,
        sample_count: 0,
        updated_at: new Date().toISOString(),
      },
    );
  };

  const handlePlanDone = async () => {
    stopSpeaking();
    const correct = answers.filter((a) => a.isCorrect).length;
    const total = answers.length;
    const sessionScore = total > 0 ? Math.round((correct / total) * 100) : 85;
    const avgMs =
      total > 0
        ? answers.reduce((s, a) => s + a.responseTimeMs, 0) / total
        : 7800;
    const prior = baseline ?? {
      patient_id: user?.id || "default",
      object_average: 85,
      orientation_average: 90,
      recent_event_average: 82,
      average_response_time: 7.8,
      sample_count: 0,
      updated_at: new Date().toISOString(),
    };
    const blended: PersonalBaseline = {
      patient_id: prior.patient_id,
      object_average: Math.round(
        prior.object_average * 0.7 + sessionScore * 0.3,
      ),
      orientation_average: prior.orientation_average,
      recent_event_average: Math.round(
        prior.recent_event_average * 0.7 + sessionScore * 0.3,
      ),
      average_response_time: parseFloat(
        (prior.average_response_time * 0.7 + (avgMs / 1000) * 0.3).toFixed(1),
      ),
      sample_count: prior.sample_count + 1,
      updated_at: new Date().toISOString(),
    };
    setUpdatedBaseline(blended);
    await safeStorage.setItem(
      DAILY_CHECK_STORAGE_KEY,
      new Date().toDateString(),
    );
    setPhase("summary");
    setTimeout(
      () =>
        speak(
          `You are all set! Your check-in score today is ${Math.round((correct / Math.max(total, 1)) * 100)} percent. Your updated baseline has been saved. Have a wonderful day!`,
        ),
      700,
    );
  };

  const handleCareAddSave = async () => {
    if (!careAddTitle.trim()) return;
    setCareAddSaving(true);
    try {
      const newRem = await addCareReminder({
        patient_id: user?.id || "default",
        title: careAddTitle.trim(),
        scheduled_time: careAddTime.trim() || "Anytime",
        category: careAddCat,
        recurrence: "once",
      });
      setLocalReminders((prev) => [...prev, newRem]);
      setCareAddTitle("");
      setCareAddTime("");
      setCareAddCat("custom");
      setShowCareAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCareAddSaving(false);
    }
  };

  const catIcon = (cat: CareReminder["category"]) => {
    if (cat === "medication") return <Pill size={13} color="#748B75" />;
    if (cat === "appointment") return <Calendar size={13} color="#748B75" />;
    if (cat === "activity") return <Activity size={13} color="#748B75" />;
    return <Clock size={13} color="#748B75" />;
  };

  const sessionPercent =
    answers.length > 0
      ? Math.round(
          (answers.filter((a) => a.isCorrect).length / answers.length) * 100,
        )
      : 0;

  const WaveRow = () => (
    <View style={styles.waveRow}>
      {animatedWaves.map((s, i) => (
        <Animated.View
          key={i}
          style={[styles.waveBar, s, isMuted && { opacity: 0.2 }]}
        />
      ))}
    </View>
  );

  // Redesigned voice panel: waveform + status + separate mute/unmute pill
  const VoicePanel = ({ label }: { label: string }) => (
    <View style={styles.voicePanel}>
      <View
        style={[
          styles.voiceBtn,
          { backgroundColor: isMuted ? "#4B5563" : PRIMARY },
        ]}
      >
        {isMuted ? (
          <VolumeX size={17} color="#fff" />
        ) : isSpeaking ? (
          <Volume2 size={17} color="#fff" />
        ) : (
          <Volume2 size={17} color="#fff" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.voiceTitle}>
          {isMuted ? "🔇 Speaker muted" : isSpeaking ? label : "Speaker ready"}
        </Text>
      </View>
      <WaveRow />
      {/* Mute / Unmute pill */}
      <Pressable
        onPress={toggleMute}
        style={[styles.mutePill, isMuted && styles.mutePillActive]}
      >
        {isMuted ? (
          <>
            <Volume2 size={13} color={PRIMARY} />
            <Text style={[styles.mutePillText, { color: PRIMARY }]}>
              Unmute
            </Text>
          </>
        ) : (
          <>
            <VolumeX size={13} color="rgba(255,255,255,0.6)" />
            <Text
              style={[styles.mutePillText, { color: "rgba(255,255,255,0.6)" }]}
            >
              Mute
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );

  return (
    <Animated.View style={[styles.root, overlayStyle]}>
      <View style={[styles.orb, styles.orbTL]} />
      <View style={[styles.orb, styles.orbBR]} />
      <Pressable
        onPress={handleCloseVoice}
        accessibilityLabel="Close voice check-in and open dashboard"
        style={styles.closeVoiceButton}
      >
        <X size={22} color="#FFFFFF" />
      </Pressable>

      {/* ── GREETING ── */}
      {phase === "greeting" && (
        <Animated.View
          entering={FadeIn.duration(600)}
          style={styles.centerPane}
        >
          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.orbitControlRow}
          >
            <DailyVoiceOrb
              active={
                liveConversation.status === "connected" ||
                liveConversation.status === "connecting"
              }
              speaking={isSpeaking}
            />
            <Pressable
              onPress={toggleMute}
              accessibilityLabel={
                isMuted
                  ? "Unmute microphone and speaker"
                  : "Mute microphone and speaker"
              }
              style={[
                styles.orbitMicButton,
                isMuted && styles.orbitMicButtonMuted,
              ]}
            >
              {isMuted ? (
                <MicOff size={21} color="#FFFFFF" />
              ) : (
                <Mic size={21} color="#FFFFFF" />
              )}
            </Pressable>
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.delay(700).duration(500)}
            style={styles.greetHello}
          >
            Good Morning,
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(900).duration(500)}
            style={styles.greetName}
          >
            {user?.name || "Friend"}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(1100).duration(500)}
            style={styles.greetSub}
          >
            Daily Memory Check-In
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.delay(1600).duration(400)}
            style={styles.listeningLabel}
          >
            {isMuted
              ? "Microphone muted"
              : isSpeaking
                ? "Your assistant is speaking…"
                : liveConversation.status === "connecting"
                  ? "Connecting to your assistant…"
                  : "Your assistant is ready"}
          </Animated.Text>
          <Animated.View
            entering={FadeInDown.delay(1800).duration(400)}
            style={styles.pillsRow}
          >
            {[
              { icon: <Sparkles size={12} color="#fff" />, label: "Gemini AI" },
              {
                icon: <HeartHandshake size={12} color="#fff" />,
                label: "Caregiver Reports",
              },
              {
                icon: <BarChart3 size={12} color="#fff" />,
                label: "Live Baseline",
              },
            ].map((p) => (
              <View key={p.label} style={styles.greetPill}>
                {p.icon}
                <Text style={styles.greetPillText}>{p.label}</Text>
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      )}

      {/* ── QUESTIONS ── */}
      {phase === "questions" && (
        <ScrollView
          contentContainerStyle={styles.qScroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.qTopBar}
          >
            <View style={styles.qDots}>
              {[...Array(TOTAL_QUESTIONS)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.qDot,
                    i < qIndex
                      ? styles.qDotDone
                      : i === qIndex
                        ? styles.qDotActive
                        : styles.qDotPending,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.qCounter}>
              {qIndex + 1} / {TOTAL_QUESTIONS}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(200).duration(400)}
            style={styles.voiceOrbitRow}
          >
            <DailyVoiceOrb
              active={liveConversation.status === "connected"}
              speaking={isSpeaking}
            />
            <Pressable
              onPress={toggleMute}
              accessibilityLabel={
                isMuted ? "Unmute microphone" : "Mute microphone"
              }
              style={[
                styles.orbitMicButton,
                isMuted && styles.orbitMicButtonMuted,
              ]}
            >
              {isMuted ? (
                <MicOff size={21} color="#FFFFFF" />
              ) : (
                <Mic size={21} color="#FFFFFF" />
              )}
            </Pressable>
          </Animated.View>
          <Text style={styles.voiceOrbitStatus}>
            {isMuted
              ? "Microphone muted"
              : isSpeaking
                ? "Your assistant is speaking…"
                : "Listening…"}
          </Text>

          {loadingQ ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>
                Reading your caregiver reports…
              </Text>
            </View>
          ) : currentQ ? (
            <Animated.View
              key={`q${qIndex}`}
              entering={SlideInRight.duration(350)}
              style={styles.qCard}
            >
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>
                  {currentQ.category === "personal"
                    ? "👨‍👩‍👧 Family & Personal"
                    : currentQ.category === "living"
                      ? "🏠 Daily Routine"
                      : "📋 Caregiver Report"}
                </Text>
              </View>
              <Text style={styles.questionText}>{currentQ.questionText}</Text>
              {currentQ.hint && !isAnswered && (
                <View style={styles.hintRow}>
                  <HelpCircle size={13} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.hintText}>Hint: {currentQ.hint}</Text>
                </View>
              )}
              <View style={styles.optionsList}>
                {currentQ.options.map((opt, idx) => {
                  const sel = selectedOpt === idx;
                  const correct = idx === currentQ.correctIndex;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => handleSelectOption(idx)}
                      disabled={isAnswered}
                      style={({ pressed }) => [
                        styles.optBtn,
                        isAnswered && correct && styles.optBtnCorrect,
                        isAnswered && sel && !correct && styles.optBtnWrong,
                        pressed && !isAnswered && { opacity: 0.75 },
                      ]}
                    >
                      <View
                        style={[
                          styles.optRadio,
                          isAnswered && correct && styles.optRadioCorrect,
                        ]}
                      >
                        {isAnswered && correct && (
                          <Check size={12} color="#fff" strokeWidth={3} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optText,
                          isAnswered &&
                            correct && { color: "#6ECC8A", fontWeight: "800" },
                          isAnswered && sel && !correct && { color: "#F87171" },
                        ]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {isAnswered && (
                <Animated.View
                  entering={FadeInDown.duration(280)}
                  style={styles.feedbackBox}
                >
                  <Smile size={18} color="#6ECC8A" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedbackTitle}>Great engagement!</Text>
                    <Text style={styles.feedbackDesc}>
                      {currentQ.encouragingFeedback}
                    </Text>
                  </View>
                </Animated.View>
              )}
              {isAnswered && (
                <Animated.View entering={FadeInDown.delay(200).duration(250)}>
                  <Pressable
                    onPress={handleNextQuestion}
                    style={({ pressed }) => [
                      styles.nextBtn,
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <Text style={styles.nextBtnText}>
                      {qIndex + 1 >= TOTAL_QUESTIONS
                        ? "See Today's Plan →"
                        : `Next Question (${qIndex + 2}/${TOTAL_QUESTIONS}) →`}
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </Animated.View>
          ) : null}
        </ScrollView>
      )}

      {/* ── PLAN ── */}
      {phase === "plan" && (
        <ScrollView
          contentContainerStyle={styles.planScroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(350)}>
            <Text style={styles.planTitle}>📅 Your Plan for Today</Text>
            <Text style={styles.planSub}>
              Your assistant is reading your schedule. Tap each item to confirm.
            </Text>

            <View style={[styles.voicePanel, { marginBottom: 8 }]}>
              <View style={styles.voiceBtn}>
                {isSpeaking ? (
                  <Volume2 size={17} color="#fff" />
                ) : (
                  <Clock size={17} color="#fff" />
                )}
              </View>
              <Text style={styles.voiceTitle}>
                {isSpeaking
                  ? "Reading your schedule…"
                  : "Schedule read-out complete"}
              </Text>
              <WaveRow />
            </View>

            {planReminders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No active tasks today. Add one below.
                </Text>
              </View>
            ) : (
              <View style={styles.planList}>
                {planReminders.map((item, i) => {
                  const acked = acknowledgedIds.has(item.id);
                  return (
                    <Animated.View
                      key={item.id}
                      entering={FadeInDown.delay(i * 80).duration(300)}
                    >
                      <Pressable
                        onPress={() => {
                          setAcknowledgedIds((prev) => {
                            const next = new Set(prev);
                            next.has(item.id)
                              ? next.delete(item.id)
                              : next.add(item.id);
                            return next;
                          });
                        }}
                        style={[
                          styles.planItem,
                          acked && styles.planItemAcked,
                          planReadingIndex === i && styles.planItemReading,
                        ]}
                      >
                        <View style={styles.planItemLeft}>
                          {catIcon(item.category)}
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.planItemTitle,
                                acked && styles.planItemTitleAcked,
                              ]}
                            >
                              {item.title}
                            </Text>
                            {item.scheduled_time && (
                              <Text style={styles.planItemTime}>
                                {item.scheduled_time}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View
                          style={[
                            styles.planCheck,
                            acked && styles.planCheckAcked,
                          ]}
                        >
                          {acked && (
                            <Check size={12} color="#fff" strokeWidth={3} />
                          )}
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            )}

            <Pressable
              onPress={() => setShowCareAdd(true)}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Plus size={15} color="#748B75" />
              <Text style={styles.addBtnText}>
                Caregiver: Add Task or Reminder
              </Text>
            </Pressable>

            <Pressable
              onPress={handlePlanDone}
              style={({ pressed }) => [
                styles.planDoneBtn,
                pressed && { opacity: 0.88 },
              ]}
            >
              <CheckCircle2 size={17} color="#fff" />
              <Text style={styles.planDoneBtnText}>
                All Done — Show My Summary
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      )}

      {/* ── SUMMARY ── */}
      {phase === "summary" && (
        <ScrollView
          contentContainerStyle={styles.summaryScroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeIn.duration(500)}
            style={{ alignItems: "center", gap: 16 }}
          >
            <View style={styles.summaryIconOuter}>
              <View style={styles.summaryIconInner}>
                <Smile size={30} color="#fff" />
              </View>
            </View>
            <Text style={styles.summaryTitle}>
              {sessionPercent >= 67 ? "Excellent Work!" : "Good Effort!"}
            </Text>
            <Text style={styles.summarySub}>
              {answers.filter((a) => a.isCorrect).length} of {answers.length}{" "}
              questions correct today.
            </Text>

            <View
              style={[
                styles.scoreRing,
                { borderColor: sessionPercent >= 67 ? "#748B75" : "#D97706" },
              ]}
            >
              <Text
                style={[
                  styles.scorePercent,
                  { color: sessionPercent >= 67 ? "#748B75" : "#D97706" },
                ]}
              >
                {sessionPercent}%
              </Text>
              <Text style={styles.scoreLabel}>Session Score</Text>
            </View>

            <View style={styles.breakdownList}>
              {answers.map((a, i) => (
                <View
                  key={i}
                  style={[
                    styles.breakdownItem,
                    { borderColor: a.isCorrect ? "#2D7A46" : "#DC2626" },
                  ]}
                >
                  <View
                    style={[
                      styles.breakdownDot,
                      { backgroundColor: a.isCorrect ? "#2D7A46" : "#DC2626" },
                    ]}
                  />
                  <Text style={styles.breakdownText} numberOfLines={2}>
                    Q{i + 1}: {a.question.questionText}
                  </Text>
                  <Text
                    style={[
                      styles.breakdownResult,
                      { color: a.isCorrect ? "#6ECC8A" : "#F87171" },
                    ]}
                  >
                    {a.isCorrect ? "✓" : "✗"}
                  </Text>
                </View>
              ))}
            </View>

            {updatedBaseline && (
              <View style={styles.baselineCard}>
                <View style={styles.baselineHeader}>
                  <BarChart3 size={14} color="#748B75" />
                  <Text style={styles.baselineTitle}>
                    Updated Cognitive Baseline
                  </Text>
                </View>
                <View style={styles.baselineMetrics}>
                  {[
                    {
                      val: updatedBaseline.object_average,
                      label: "Object\nRecall",
                    },
                    {
                      val: updatedBaseline.orientation_average,
                      label: "Orientation",
                    },
                    {
                      val: updatedBaseline.recent_event_average,
                      label: "Event\nRecall",
                    },
                  ].map((m) => (
                    <View key={m.label} style={styles.baselineMetric}>
                      <Text style={styles.baselineVal}>{m.val}%</Text>
                      <Text style={styles.baselineLbl}>{m.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.baselineSample}>
                  Session {updatedBaseline.sample_count} · Avg{" "}
                  {updatedBaseline.average_response_time}s
                </Text>
              </View>
            )}

            {planReminders.length > 0 && (
              <View style={styles.ackCard}>
                <CheckCircle2 size={14} color="#748B75" />
                <Text style={styles.ackText}>
                  {acknowledgedIds.size} of {planReminders.length} tasks
                  acknowledged
                </Text>
              </View>
            )}

            <Pressable
              onPress={() => setShowCareAdd(true)}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Plus size={14} color="#748B75" />
              <Text style={styles.addBtnText}>
                Add or Update a Task for Patient
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onComplete(updatedBaseline!)}
              style={({ pressed }) => [
                styles.goHomeBtn,
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={styles.goHomeBtnText}>Go to Health Dashboard</Text>
              <ArrowRight size={17} color="#fff" />
            </Pressable>
          </Animated.View>
        </ScrollView>
      )}

      {/* ── CAREGIVER QUICK-ADD MODAL ── */}
      <Modal
        visible={showCareAdd}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCareAdd(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Task for Patient</Text>
            <Text style={styles.modalSub}>
              Caregivers can add or update today's tasks here. Changes are
              immediately visible to the patient.
            </Text>
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Task / Reminder Title *</Text>
              <TextInput
                value={careAddTitle}
                onChangeText={setCareAddTitle}
                placeholder="e.g. Take afternoon walk"
                placeholderTextColor="#6B7280"
                style={styles.fieldInput}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Scheduled Time (optional)</Text>
              <TextInput
                value={careAddTime}
                onChangeText={setCareAddTime}
                placeholder="e.g. 03:00 PM"
                placeholderTextColor="#6B7280"
                style={styles.fieldInput}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 6 }}
              >
                {(
                  [
                    "medication",
                    "appointment",
                    "meal",
                    "activity",
                    "custom",
                  ] as const
                ).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCareAddCat(cat)}
                    style={[
                      styles.catChip,
                      careAddCat === cat && styles.catChipActive,
                    ]}
                  >
                    {catIcon(cat)}
                    <Text
                      style={[
                        styles.catChipText,
                        careAddCat === cat && styles.catChipTextActive,
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowCareAdd(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCareAddSave}
                disabled={!careAddTitle.trim() || careAddSaving}
                style={[
                  styles.saveBtn,
                  (!careAddTitle.trim() || careAddSaving) && { opacity: 0.55 },
                ]}
              >
                {careAddSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Add Task</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const PRIMARY = "#748B75";
const GLASS = "rgba(255,255,255,0.07)";
const GLASS_BORDER = "rgba(255,255,255,0.12)";
const PT = Platform.OS === "ios" ? 60 : 44;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
    backgroundColor: "rgba(10,20,12,0.97)",
    zIndex: 999,
  },
  closeVoiceButton: {
    position: "absolute",
    top: 46,
    right: 18,
    zIndex: 10,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  orb: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.18,
  },
  orbTL: { backgroundColor: "#748B75", top: -80, left: -80 },
  orbBR: { backgroundColor: "#4A6B4C", bottom: -80, right: -80 },
  // Greeting
  centerPane: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  greetOrb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(116,139,117,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(116,139,117,0.55)",
    marginBottom: 8,
  },
  orbitControlRow: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  voiceOrbitRow: {
    alignItems: "center",
    justifyContent: "center",
    height: 190,
    marginBottom: 2,
  },
  voiceOrbitStatus: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  dailyOrbStage: {
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyOrbHalo: {
    position: "absolute",
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 1,
    borderColor: "rgba(116,139,117,0.18)",
  },
  dailyOrbHaloActive: { borderColor: "rgba(116,139,117,0.42)" },
  dailyOrbRing: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: "rgba(116,139,117,0.55)",
  },
  dailyOrbCore: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  orbitMicButton: {
    position: "absolute",
    right: 2,
    bottom: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.75)",
  },
  orbitMicButtonMuted: { backgroundColor: "#4B5563" },
  greetHello: {
    fontSize: 18,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "400",
  },
  greetName: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  greetSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  listeningLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 10,
  },
  greetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  greetPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
  // Waveform
  waveRow: { flexDirection: "row", alignItems: "center", gap: 4, height: 30 },
  waveBar: { width: 4, height: 24, borderRadius: 2, backgroundColor: PRIMARY },
  // Voice panel
  voicePanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  voiceSub: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  // Mute / Unmute pill button
  mutePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  mutePillActive: {
    borderColor: PRIMARY,
    backgroundColor: "rgba(116,139,117,0.22)",
  },
  mutePillText: { fontSize: 11, fontWeight: "700" },
  // Questions
  qScroll: { padding: 20, paddingTop: PT, paddingBottom: 48, gap: 14 },
  qTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  qDots: { flexDirection: "row", gap: 6 },
  qDot: { height: 8, borderRadius: 4 },
  qDotDone: { width: 8, backgroundColor: PRIMARY },
  qDotActive: { width: 24, backgroundColor: PRIMARY },
  qDotPending: { width: 8, backgroundColor: "rgba(255,255,255,0.2)" },
  qCounter: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "600",
  },
  loadingBox: { alignItems: "center", paddingVertical: 80, gap: 16 },
  loadingText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
  qCard: {
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  catBadge: {
    backgroundColor: "rgba(116,139,117,0.22)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  catBadgeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "600",
  },
  questionText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 30,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontStyle: "italic",
    flex: 1,
  },
  optionsList: { gap: 10 },
  optBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS,
  },
  optBtnCorrect: {
    backgroundColor: "rgba(45,122,70,0.22)",
    borderColor: "#2D7A46",
  },
  optBtnWrong: {
    backgroundColor: "rgba(220,38,38,0.18)",
    borderColor: "#DC2626",
  },
  optRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  optRadioCorrect: { backgroundColor: "#2D7A46", borderColor: "#2D7A46" },
  optText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF", flex: 1 },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(45,122,70,0.18)",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D7A46",
  },
  feedbackTitle: { color: "#6ECC8A", fontSize: 13, fontWeight: "800" },
  feedbackDesc: {
    color: "rgba(110,204,138,0.85)",
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  nextBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  nextBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  // Plan
  planScroll: { padding: 20, paddingTop: PT, paddingBottom: 48, gap: 14 },
  planTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  planSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 16,
    lineHeight: 20,
  },
  planList: { gap: 10, marginBottom: 16 },
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  planItemAcked: {
    backgroundColor: "rgba(45,122,70,0.18)",
    borderColor: "rgba(45,122,70,0.45)",
  },
  planItemReading: {
    borderColor: PRIMARY,
    backgroundColor: "rgba(116,139,117,0.18)",
  },
  planItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  planItemTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  planItemTitleAcked: {
    textDecorationLine: "line-through",
    color: "rgba(255,255,255,0.4)",
  },
  planItemTime: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  planCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  planCheckAcked: { backgroundColor: "#2D7A46", borderColor: "#2D7A46" },
  emptyBox: { paddingVertical: 40, alignItems: "center" },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(116,139,117,0.12)",
    borderWidth: 1,
    borderColor: "rgba(116,139,117,0.38)",
    borderStyle: "dashed",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  addBtnText: { fontSize: 14, color: PRIMARY, fontWeight: "700" },
  planDoneBtn: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  planDoneBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  // Summary
  summaryScroll: {
    padding: 24,
    paddingTop: PT,
    paddingBottom: 48,
    alignItems: "center",
    gap: 16,
  },
  summaryIconOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(116,139,117,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(116,139,117,0.45)",
  },
  summaryIconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  summarySub: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
  },
  scoreRing: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  scorePercent: { fontSize: 28, fontWeight: "900" },
  scoreLabel: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  breakdownList: { width: "100%", gap: 8 },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: GLASS,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 18,
  },
  breakdownResult: { fontSize: 16, fontWeight: "900" },
  baselineCard: {
    width: "100%",
    backgroundColor: GLASS,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(116,139,117,0.38)",
    gap: 12,
  },
  baselineHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  baselineTitle: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  baselineMetrics: { flexDirection: "row", justifyContent: "space-around" },
  baselineMetric: { alignItems: "center", gap: 3 },
  baselineVal: { fontSize: 22, fontWeight: "900", color: PRIMARY },
  baselineLbl: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },
  baselineSample: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
  },
  ackCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GLASS,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(116,139,117,0.28)",
  },
  ackText: { fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: "600" },
  goHomeBtn: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    width: "100%",
    marginTop: 4,
  },
  goHomeBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  // Caregiver modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1A2B1C",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(116,139,117,0.28)",
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  modalSub: { fontSize: 13, color: "rgba(255,255,255,0.48)", lineHeight: 18 },
  modalField: { gap: 4 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "rgba(116,139,117,0.38)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(116,139,117,0.3)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  catChipActive: {
    backgroundColor: "rgba(116,139,117,0.28)",
    borderColor: PRIMARY,
  },
  catChipText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
  },
  catChipTextActive: { color: "#FFFFFF" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  cancelText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    fontWeight: "700",
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: PRIMARY,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
