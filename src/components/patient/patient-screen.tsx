import { useColor } from "@/hooks/useColor";
import {
    CareReminder,
    PersonalBaseline,
    TimelineEvent,
} from "@/lib/caregiver-service";
import { CurrentSessionUser, safeStorage } from "@/lib/supabase";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocationPermissionPrompt from "./location-permissions";
import { PatientBottomNavBar } from "./patient-bottom-nav-bar";
import {
    DAILY_CHECK_STORAGE_KEY,
    PatientDailyCheck,
} from "./patient-daily-check";
import PatientFilesTab from "./patient-files-tab";
import { PatientGeminiAssistant } from "./patient-gemini-assistant";
import { PatientHomeTab } from "./patient-home-tab";
import { PatientRemindersTab } from "./patient-reminders-tab";
import { PatientSettingsTab } from "./patient-settings-tab";
import { PatientTimelineTab } from "./patient-timeline-tab";
import { PatientTopBar } from "./patient-top-bar";
import { PatientTab } from "./patient-types";

type PatientScreenProps = {
  user: CurrentSessionUser | null;
  baseline: PersonalBaseline | null;
  reminders: CareReminder[];
  timelineEvents: TimelineEvent[];
  onToggleReminder: (reminder: CareReminder) => void;
  onConfirmLogout: () => void;
};

export function PatientScreen({
  user,
  baseline: initialBaseline,
  reminders,
  timelineEvents,
  onToggleReminder,
  onConfirmLogout,
}: PatientScreenProps) {
  const bg = useColor("background");
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<PatientTab>("home");
  const [geminiAssistantVisible, setGeminiAssistantVisible] = useState(false);

  // Daily check-in gate
  const [checkInDone, setCheckInDone] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(true);
  const [baseline, setBaseline] = useState<PersonalBaseline | null>(
    initialBaseline,
  );
  const [needLocationPermission, setNeedLocationPermission] = useState(false);

  // On mount: see if today's check-in was already completed
  useEffect(() => {
    (async () => {
      try {
        const stored = await safeStorage.getItem(DAILY_CHECK_STORAGE_KEY);
        const today = new Date().toDateString();
        if (stored === today) {
          setCheckInDone(true);
        }
      } catch {
        // If storage fails, just skip check-in and show home
        setCheckInDone(true);
      } finally {
        setCheckInLoading(false);
      }
    })();
  }, []);

  // Keep local baseline in sync if parent prop changes
  useEffect(() => {
    if (initialBaseline) setBaseline(initialBaseline);
  }, [initialBaseline]);

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => setNeedLocationPermission(status !== "granted"))
      .catch(() => setNeedLocationPermission(true));
  }, []);

  const handleCheckInComplete = (updatedBaseline: PersonalBaseline) => {
    setBaseline(updatedBaseline);
    setCheckInDone(true);
  };

  // While checking storage, render nothing (brief flash prevention)
  if (checkInLoading) return null;

  // Show full-screen daily check-in before the main home screen
  if (!checkInDone) {
    return (
      <PatientDailyCheck
        user={user}
        baseline={baseline}
        timelineEvents={timelineEvents}
        reminders={reminders}
        onComplete={handleCheckInComplete}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Top Header */}
      <PatientTopBar
        user={user}
        insetsTop={insets.top}
        onOpenGeminiAssistant={() => setGeminiAssistantVisible(true)}
      />

      {/* Main View Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 105 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "home" && (
          <PatientHomeTab
            user={user}
            baseline={baseline}
            reminders={reminders}
            timelineEvents={timelineEvents}
            onToggleReminder={onToggleReminder}
            onNavigateToTimeline={() => setActiveTab("timeline")}
            onNavigateToReminders={() => setActiveTab("reminders")}
            onOpenGeminiAssistant={() => setGeminiAssistantVisible(true)}
          />
        )}

        {activeTab === "timeline" && (
          <PatientTimelineTab timelineEvents={timelineEvents} />
        )}

        {activeTab === "reminders" && (
          <PatientRemindersTab
            reminders={reminders}
            onToggleReminder={onToggleReminder}
          />
        )}

        {activeTab === "files" && user && (
          <PatientFilesTab currentUser={user} />
        )}

        {activeTab === "settings" && (
          <PatientSettingsTab user={user} onConfirmLogout={onConfirmLogout} />
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <PatientBottomNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        insetsBottom={insets.bottom}
      />

      <LocationPermissionPrompt
        visible={needLocationPermission}
        onGranted={() => setNeedLocationPermission(false)}
        onClose={() => setNeedLocationPermission(false)}
      />

      {/* Gemini Capacity-Adaptive Voice Assistant */}
      <PatientGeminiAssistant
        visible={geminiAssistantVisible}
        onClose={() => setGeminiAssistantVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
