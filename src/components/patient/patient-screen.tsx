import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColor } from '@/hooks/useColor';
import { CurrentSessionUser } from '@/lib/supabase';
import { CareReminder, TimelineEvent, PersonalBaseline } from '@/lib/caregiver-service';
import { PatientTab } from './patient-types';
import { PatientTopBar } from './patient-top-bar';
import { PatientBottomNavBar } from './patient-bottom-nav-bar';
import { PatientHomeTab } from './patient-home-tab';
import { PatientTimelineTab } from './patient-timeline-tab';
import { PatientRemindersTab } from './patient-reminders-tab';
import { PatientSettingsTab } from './patient-settings-tab';

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
  baseline,
  reminders,
  timelineEvents,
  onToggleReminder,
  onConfirmLogout,
}: PatientScreenProps) {
  const bg = useColor('background');
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<PatientTab>('home');

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Top Header */}
      <PatientTopBar user={user} insetsTop={insets.top} />

      {/* Main View Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 105 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'home' && (
          <PatientHomeTab
            user={user}
            baseline={baseline}
            reminders={reminders}
            timelineEvents={timelineEvents}
            onToggleReminder={onToggleReminder}
            onNavigateToTimeline={() => setActiveTab('timeline')}
            onNavigateToReminders={() => setActiveTab('reminders')}
          />
        )}

        {activeTab === 'timeline' && (
          <PatientTimelineTab timelineEvents={timelineEvents} />
        )}

        {activeTab === 'reminders' && (
          <PatientRemindersTab
            reminders={reminders}
            onToggleReminder={onToggleReminder}
          />
        )}

        {activeTab === 'settings' && (
          <PatientSettingsTab
            user={user}
            onConfirmLogout={onConfirmLogout}
          />
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <PatientBottomNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        insetsBottom={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
