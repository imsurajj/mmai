import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import {
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  X,
  Settings2,
  Key,
  Award,
  Smile,
} from 'lucide-react-native';
import { useColor } from '@/hooks/useColor';
import { useToast } from '@/components/ui/toast';
import { useChip } from '@/components/ui/bottom-chip';
import {
  DynamicQuestion,
  generateGeminiPatientQuestion,
  getStoredGeminiKey,
  saveStoredGeminiKey,
} from '@/lib/gemini-service';
import {
  speakQuestion,
  stopSpeaking,
  getStoredElevenLabsKey,
  saveStoredElevenLabsKey,
} from '@/lib/elevenlabs-service';
import {
  getPatientReports,
  getPatientCapacityProfile,
  PatientVerifiedReport,
} from '@/lib/patient-reports-service';
import { PersonalBaseline, TimelineEvent, CareReminder } from '@/lib/caregiver-service';
import { CurrentSessionUser } from '@/lib/supabase';

type PatientGeminiAssistantProps = {
  visible: boolean;
  onClose: () => void;
  user: CurrentSessionUser | null;
  baseline: PersonalBaseline | null;
  timelineEvents: TimelineEvent[];
  reminders: CareReminder[];
};

export function PatientGeminiAssistant({
  visible,
  onClose,
  user,
  baseline,
  timelineEvents,
  reminders,
}: PatientGeminiAssistantProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const card = useColor('card');
  const border = useColor('border');
  const { showChip } = useChip();
  const { success } = useToast();

  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<DynamicQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // default UNMUTED
  const audioUnlocked = useRef(false);
  const [showConfig, setShowConfig] = useState(false);

  // API Config keys
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [elevenLabsKeyInput, setElevenLabsKeyInput] = useState('');
  const [reports, setReports] = useState<PatientVerifiedReport[]>([]);

  const capacity = getPatientCapacityProfile(baseline);

  // Unlock AudioContext on mobile (required before Web Speech can auto-play)
  const unlockAudio = () => {
    if (audioUnlocked.current) return;
    audioUnlocked.current = true;
    try {
      const win: any = typeof window !== 'undefined' ? window : null;
      if (win?.AudioContext || win?.webkitAudioContext) {
        const AC = win.AudioContext || win.webkitAudioContext;
        const ctx = new AC();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        ctx.resume();
      }
    } catch {}
  };

  // Waveform animation
  const wave1 = useSharedValue(0.4);
  const wave2 = useSharedValue(0.8);
  const wave3 = useSharedValue(0.5);
  const wave4 = useSharedValue(0.9);

  useEffect(() => {
    if (isSpeaking) {
      wave1.value = withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0.3, { duration: 300 })), -1, true);
      wave2.value = withRepeat(withSequence(withTiming(1, { duration: 250 }), withTiming(0.2, { duration: 250 })), -1, true);
      wave3.value = withRepeat(withSequence(withTiming(1, { duration: 350 }), withTiming(0.4, { duration: 350 })), -1, true);
      wave4.value = withRepeat(withSequence(withTiming(1, { duration: 280 }), withTiming(0.3, { duration: 280 })), -1, true);
    } else {
      wave1.value = withTiming(0.3);
      wave2.value = withTiming(0.3);
      wave3.value = withTiming(0.3);
      wave4.value = withTiming(0.3);
    }
  }, [isSpeaking]);

  const animWave1 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave1.value }] }));
  const animWave2 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave2.value }] }));
  const animWave3 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave3.value }] }));
  const animWave4 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave4.value }] }));

  useEffect(() => {
    if (visible) {
      loadInitial();
    } else {
      stopSpeaking();
      setIsSpeaking(false);
    }
    return () => {
      stopSpeaking();
    };
  }, [visible]);

  const loadInitial = async () => {
    const [reps, gKey, elKey] = await Promise.all([
      getPatientReports(),
      getStoredGeminiKey(),
      getStoredElevenLabsKey(),
    ]);
    setReports(reps);
    setGeminiKeyInput(gKey);
    setElevenLabsKeyInput(elKey);
    fetchNextQuestion(reps);
  };

  const fetchNextQuestion = async (loadedReports?: PatientVerifiedReport[]) => {
    setLoading(true);
    setSelectedOption(null);
    setIsAnswered(false);
    stopSpeaking();
    setIsSpeaking(false);

    try {
      const q = await generateGeminiPatientQuestion({
        patientName: user?.name || 'Friend',
        baseline,
        capacity,
        reports: loadedReports || reports,
        timelineEvents,
        reminders,
      });
      setQuestion(q);

      // Auto-play voice prompt with ElevenLabs / Web Voice
      setTimeout(() => {
        playQuestionVoice(q.speechPrompt || q.questionText);
      }, 350);
    } catch (err) {
      console.error('Error fetching question:', err);
    } finally {
      setLoading(false);
    }
  };

  const playQuestionVoice = (voiceText: string) => {
    if (isMuted) return; // respect mute
    unlockAudio();
    speakQuestion({
      text: voiceText,
      capacity: capacity.level,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const toggleMute = () => {
    if (!isMuted) {
      stopSpeaking();
      setIsSpeaking(false);
      setIsMuted(true);
    } else {
      setIsMuted(false);
      // replay question after unmute
      if (question) {
        setTimeout(() => {
          unlockAudio();
          speakQuestion({
            text: question.speechPrompt || question.questionText,
            capacity: capacity.level,
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false),
          });
        }, 200);
      }
    }
  };

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    if (question) {
      const feedback = question.encouragingFeedback;
      playQuestionVoice(feedback);
      showChip(feedback);
    }
  };

  const handleSaveKeys = async () => {
    await Promise.all([
      saveStoredGeminiKey(geminiKeyInput),
      saveStoredElevenLabsKey(elevenLabsKeyInput),
    ]);
    setShowConfig(false);
    showChip('AI Voice Assistant configured');
    success('Settings Updated', 'Gemini & ElevenLabs API keys stored.');
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'living':
        return 'Daily Living Routine';
      case 'personal':
        return 'Personal & Family Memory';
      case 'reports':
        return 'Caregiver Verified Report';
      default:
        return 'Cognitive Wellness';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        stopSpeaking();
        onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#EBF5ED' }]}>
                <Sparkles size={20} color={primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: text }]}>
                  Gemini Memory Assistant
                </Text>
                <Text style={[styles.headerSub, { color: muted }]}>
                  Voice powered by ElevenLabs • Adaptive Capacity
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <Pressable
                onPress={() => setShowConfig(!showConfig)}
                hitSlop={8}
                style={styles.actionIconBtn}
              >
                <Settings2 size={19} color={muted} />
              </Pressable>
              <Pressable
                onPress={() => {
                  stopSpeaking();
                  onClose();
                }}
                hitSlop={8}
                style={styles.actionIconBtn}
              >
                <X size={21} color={muted} />
              </Pressable>
            </View>
          </View>

          {/* Collapsible API Keys Config */}
          {showConfig && (
            <Animated.View entering={FadeInDown.duration(200)} style={[styles.configDrawer, { borderBottomColor: border, backgroundColor: '#F8FAF9' }]}>
              <View style={styles.configHeader}>
                <Key size={16} color={primary} />
                <Text style={[styles.configTitle, { color: text }]}>API Configuration</Text>
              </View>
              <Text style={[styles.configSubtitle, { color: muted }]}>
                Add your Gemini & ElevenLabs API keys for live cloud model execution, or leave empty for intelligent offline mode.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: text }]}>Gemini API Key</Text>
                <TextInput
                  value={geminiKeyInput}
                  onChangeText={setGeminiKeyInput}
                  placeholder="AIzaSy..."
                  placeholderTextColor={muted}
                  secureTextEntry={true}
                  style={[styles.keyInput, { borderColor: border, color: text }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: text }]}>ElevenLabs API Key</Text>
                <TextInput
                  value={elevenLabsKeyInput}
                  onChangeText={setElevenLabsKeyInput}
                  placeholder="sk_..."
                  placeholderTextColor={muted}
                  secureTextEntry={true}
                  style={[styles.keyInput, { borderColor: border, color: text }]}
                />
              </View>

              <Pressable
                onPress={handleSaveKeys}
                style={[styles.saveKeysBtn, { backgroundColor: primary }]}
              >
                <Text style={styles.saveKeysBtnText}>Save Keys & Resume</Text>
              </Pressable>
            </Animated.View>
          )}

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Capacity Profile Banner */}
            <View style={[styles.capacityBadgeStrip, { borderColor: border, backgroundColor: '#F3F6F4' }]}>
              <View style={styles.capacityBadgeLeft}>
                <Award size={16} color={primary} />
                <Text style={[styles.capacityBadgeLabel, { color: text }]}>
                  Adaptive Capacity: <Text style={{ color: primary, fontWeight: '800' }}>{capacity.title}</Text>
                </Text>
              </View>
              <View style={[styles.categoryPill, { backgroundColor: '#FFFFFF', borderColor: border }]}>
                <Text style={[styles.categoryPillText, { color: primary }]}>
                  {question ? getCategoryLabel(question.category) : 'Daily Check'}
                </Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={primary} />
                <Text style={[styles.loadingText, { color: muted }]}>
                  Gemini is preparing your personalized question...
                </Text>
              </View>
            ) : question ? (
              <Animated.View entering={FadeIn.duration(260)} style={styles.questionSection}>
                {/* ── REDESIGNED VOICE CARD ── */}
                <View style={[
                  styles.voiceCard,
                  { borderColor: isSpeaking ? primary : border }
                ]}>
                  {/* Row 1: Icon + Status + Waveform */}
                  <View style={styles.voiceCardTop}>
                    <View style={[styles.voiceIconCircle, { backgroundColor: isMuted ? '#E5E7EB' : isSpeaking ? '#EBF5ED' : '#F3F6F4' }]}>
                      {isMuted
                        ? <VolumeX size={20} color="#9CA3AF" />
                        : isSpeaking
                          ? <Volume2 size={20} color={primary} />
                          : <Volume2 size={20} color={primary} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.voiceCardTitle, { color: text }]}>
                        {isMuted ? '🔇 Speaker Muted' : isSpeaking ? '🔊 Speaking…' : '🎙 Voice Assistant Ready'}
                      </Text>
                      <Text style={[styles.voiceCardSub, { color: muted }]}>
                        {isMuted ? 'Tap Unmute to hear the question' : isSpeaking ? 'Tap Stop to pause' : 'Tap Play to hear question aloud'}
                      </Text>
                    </View>
                    {/* Waveform bars */}
                    <View style={[styles.waveContainer, { opacity: isMuted ? 0.2 : 1 }]}>
                      <Animated.View style={[styles.waveBar, { backgroundColor: primary }, animWave1]} />
                      <Animated.View style={[styles.waveBar, { backgroundColor: primary }, animWave2]} />
                      <Animated.View style={[styles.waveBar, { backgroundColor: primary }, animWave3]} />
                      <Animated.View style={[styles.waveBar, { backgroundColor: primary }, animWave4]} />
                    </View>
                  </View>

                  {/* Row 2: Separated action buttons */}
                  <View style={styles.voiceCardActions}>
                    {/* PLAY / STOP button */}
                    <Pressable
                      onPress={() => {
                        if (isMuted) { toggleMute(); return; }
                        if (isSpeaking) { stopSpeaking(); setIsSpeaking(false); }
                        else { playQuestionVoice(question.speechPrompt || question.questionText); }
                      }}
                      style={({ pressed }) => [
                        styles.voiceActionBtn,
                        { backgroundColor: isSpeaking ? '#FEF2F2' : '#EBF5ED', borderColor: isSpeaking ? '#DC2626' : primary },
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      {isSpeaking
                        ? <VolumeX size={16} color="#DC2626" />
                        : <Volume2 size={16} color={primary} />}
                      <Text style={[styles.voiceActionText, { color: isSpeaking ? '#DC2626' : primary }]}>
                        {isMuted ? 'Unmute & Play' : isSpeaking ? 'Stop' : 'Play Question'}
                      </Text>
                    </Pressable>

                    {/* MUTE / UNMUTE button — always visible, clearly separated */}
                    <Pressable
                      onPress={toggleMute}
                      style={({ pressed }) => [
                        styles.voiceActionBtn,
                        styles.voiceMuteBtn,
                        isMuted && styles.voiceUnmuteBtn,
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      {isMuted
                        ? <Volume2 size={16} color={primary} />
                        : <VolumeX size={16} color="#6B7280" />}
                      <Text style={[styles.voiceActionText, { color: isMuted ? primary : '#6B7280' }]}>
                        {isMuted ? '🔊 Unmute Speaker' : '🔇 Mute Speaker'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Question Big Text */}
                <View style={styles.questionCard}>
                  <Text style={[styles.questionText, { color: text }]}>
                    {question.questionText}
                  </Text>
                  {question.hint && !isAnswered && (
                    <View style={styles.hintWrap}>
                      <HelpCircle size={14} color={primary} />
                      <Text style={[styles.hintText, { color: muted }]}>
                        Hint: {question.hint}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Options List */}
                <View style={styles.optionsWrap}>
                  {question.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === question.correctIndex;

                    let btnBg = '#FFFFFF';
                    let btnBorder = border;
                    let fontColor = text;

                    if (isAnswered) {
                      if (isCorrect) {
                        btnBg = '#EBF5ED';
                        btnBorder = '#2D7A46';
                        fontColor = '#2D7A46';
                      } else if (isSelected) {
                        btnBg = '#FEF2F2';
                        btnBorder = '#DC2626';
                        fontColor = '#DC2626';
                      }
                    }

                    return (
                      <Pressable
                        key={idx}
                        onPress={() => handleSelectOption(idx)}
                        disabled={isAnswered}
                        style={({ pressed }) => [
                          styles.optionBtn,
                          {
                            backgroundColor: btnBg,
                            borderColor: btnBorder,
                          },
                          pressed && !isAnswered && { opacity: 0.8, backgroundColor: '#F1F5F2' },
                        ]}
                      >
                        <View style={styles.optionContentRow}>
                          <View
                            style={[
                              styles.optionRadio,
                              {
                                borderColor: isAnswered && isCorrect ? '#2D7A46' : primary,
                                backgroundColor: isAnswered && isCorrect ? '#2D7A46' : 'transparent',
                              },
                            ]}
                          >
                            {isAnswered && isCorrect && (
                              <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={3} />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.optionText,
                              { color: fontColor, fontWeight: isSelected || (isAnswered && isCorrect) ? '700' : '600' },
                            ]}
                          >
                            {opt}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Feedback & Reassurance */}
                {isAnswered && (
                  <Animated.View entering={FadeInDown.duration(200)} style={[styles.feedbackBanner, { backgroundColor: '#EBF5ED', borderColor: '#2D7A46' }]}>
                    <Smile size={20} color="#2D7A46" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.feedbackTitle}>Great engagement!</Text>
                      <Text style={styles.feedbackText}>{question.encouragingFeedback}</Text>
                    </View>
                  </Animated.View>
                )}

                {/* Next Question Button */}
                <Pressable
                  onPress={() => fetchNextQuestion()}
                  style={({ pressed }) => [
                    styles.nextBtn,
                    { backgroundColor: primary },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <RefreshCw size={17} color="#FFFFFF" />
                  <Text style={styles.nextBtnText}>Ask Another Question</Text>
                </Pressable>
              </Animated.View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconBtn: {
    padding: 6,
  },
  configDrawer: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  configSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  keyInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#FFFFFF',
  },
  saveKeysBtn: {
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  saveKeysBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollBody: {
    padding: 18,
    gap: 16,
  },
  capacityBadgeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  capacityBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  questionSection: {
    gap: 16,
  },
  // ── Redesigned Voice Card ──────────────────────────────────────────────────
  voiceCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#F8FAF8',
  },
  voiceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingBottom: 10,
  },
  voiceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  voiceCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  voiceCardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 6,
  },
  voiceActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  voiceActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  voiceMuteBtn: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  voiceUnmuteBtn: {
    backgroundColor: '#EBF5ED',
    borderColor: '#748B75',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingRight: 6,
  },
  waveBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  questionCard: {
    paddingVertical: 4,
    gap: 8,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  hintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAF9',
    padding: 8,
    borderRadius: 6,
  },
  hintText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  optionsWrap: {
    gap: 10,
  },
  optionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackTitle: {
    color: '#2D7A46',
    fontSize: 13,
    fontWeight: '800',
  },
  feedbackText: {
    color: '#2D7A46',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
