import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useChip } from '@/components/ui/bottom-chip';
import { useColor } from '@/hooks/useColor';
import {
  CareAlert,
  CareReminder,
  MemoryCheckResult,
  PersonalBaseline,
  TimelineEvent,
  addCareReminder,
  addTimelineEvent,
  calculatePersonalBaseline,
  deleteCareReminder,
  deleteTimelineEvent,
  getCareAlerts,
  getCareReminders,
  getMemoryChecks,
  getTimelineEvents,
  markAlertStatus,
  toggleReminderStatus,
} from '@/lib/caregiver-service';
import {
  CurrentSessionUser,
  PatientAccessKey,
  appSignOut,
  createPatient,
  deleteDoctorPatient,
  getActiveSessionUser,
  getDoctorPatients,
} from '@/lib/supabase';

import { DoctorBottomNavBar } from './doctor/bottom-nav-bar';
import {
  DoctorTab,
  PatientDetailSubTab,
  ReminderFilter,
  SettingsSubPage,
  formatDoctorName,
} from './doctor/doctor-types';
import { AddPatientModal } from './doctor/modals/add-patient-modal';
import { AddReminderModal } from './doctor/modals/add-reminder-modal';
import { AddTimelineModal } from './doctor/modals/add-timeline-modal';
import { NotificationsTab } from './doctor/notifications-tab';
import { OverviewTab } from './doctor/overview-tab';
import { PatientDetailView } from './doctor/patient-detail-view';
import { PatientsTab } from './doctor/patients-tab';
import { RemindersTab } from './doctor/reminders-tab';
import { SettingsTab } from './doctor/settings-tab';
import { TimelineTab } from './doctor/timeline-tab';
import { DoctorTopBar } from './doctor/top-nav-bar';
import { PatientScreen } from './patient/patient-screen';

type AuthenticatedScreenProps = {
  onLogout: () => void;
};

export function AuthenticatedScreen({ onLogout }: AuthenticatedScreenProps) {
  const bg = useColor('background');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const insets = useSafeAreaInsets();
  const { success, error } = useToast();
  const { showChip } = useChip();

  // Session & Base States
  const [user, setUser] = useState<CurrentSessionUser | null>(null);
  const [patients, setPatients] = useState<PatientAccessKey[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [, setLoadingPatients] = useState(false);

  // Active Navigation States
  const [activeTab, setActiveTab] = useState<DoctorTab>('dashboard');
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<PatientAccessKey | null>(null);
  const [patientDetailSubTab, setPatientDetailSubTab] = useState<PatientDetailSubTab>('analytics');

  // Caregiver Data States
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [, setMemoryChecks] = useState<MemoryCheckResult[]>([]);
  const [baseline, setBaseline] = useState<PersonalBaseline | null>(null);
  const [careAlerts, setCareAlerts] = useState<CareAlert[]>([]);
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');

  // Settings & Preferences States
  const [fontScalePref, setFontScalePref] = useState<'normal' | 'large' | 'xl'>('large');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoBaselineSync, setAutoBaselineSync] = useState(true);
  const [settingsSubPage, setSettingsSubPage] = useState<SettingsSubPage>(null);

  // Modals State
  const [patientModalVisible, setPatientModalVisible] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);

  const [timelineModalVisible, setTimelineModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('Today');
  const [newEventTime, setNewEventTime] = useState('10:00 AM');
  const [newEventPeople, setNewEventPeople] = useState('');
  const [newEventNotes, setNewEventNotes] = useState('');

  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('09:00 AM');
  const [newReminderInstructions, setNewReminderInstructions] = useState('');

  // Newly Created Key Card
  const [createdKeyData, setCreatedKeyData] = useState<PatientAccessKey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load User Session
  useEffect(() => {
    async function loadSession() {
      try {
        setLoadingUser(true);
        const activeUser = await getActiveSessionUser();
        setUser(activeUser);
      } catch (err: any) {
        console.error('Failed to load session:', err);
      } finally {
        setLoadingUser(false);
      }
    }
    loadSession();
  }, []);

  // Fetch Patients & Data
  const fetchCareData = useCallback(async () => {
    try {
      const pId = selectedPatientForDetail ? selectedPatientForDetail.id : undefined;
      const [tl, rems, chks, base, alts] = await Promise.all([
        getTimelineEvents(pId),
        getCareReminders(pId),
        getMemoryChecks(pId),
        calculatePersonalBaseline(pId),
        getCareAlerts(pId),
      ]);
      setTimelineEvents(tl);
      setReminders(rems);
      setMemoryChecks(chks);
      setBaseline(base);
      setCareAlerts(alts);
    } catch (err: any) {
      console.error('Error fetching care data:', err);
    }
  }, [selectedPatientForDetail]);

  const fetchPatients = useCallback(async () => {
    try {
      setLoadingPatients(true);
      const data = await getDoctorPatients();
      setPatients(data);
    } catch (err: any) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'doctor') {
      fetchPatients();
      fetchCareData();
    } else if (user?.role === 'patient') {
      fetchCareData();
    }
  }, [user, fetchPatients, fetchCareData]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await appSignOut();
      onLogout();
    } catch {
      onLogout();
    }
  };

  // Safe Logout Confirmation
  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out of your MMAI workspace?')) {
        handleLogout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out of your MMAI workspace?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: handleLogout },
      ]);
    }
  };

  // Handle Save Profile
  const handleUpdateUser = (name: string, email: string) => {
    if (user) {
      setUser({
        ...user,
        name,
        email: email || user.email,
      });
    }
  };

  // Handle Copy Code
  const handleCopyCode = async (code: string, id: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedId(id);
      showChip(`Access code ${code} copied`);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      error('Copy Failed', 'Unable to copy to clipboard.');
    }
  };

  // Handle Share Code
  const handleShareCode = async (patient: PatientAccessKey) => {
    const message = `Hello ${patient.patient_name}, your MMAI access code is: ${patient.access_code}\n\nEnter this 6-digit key in the app to access your medical workspace.`;

    if (Platform.OS === 'web') {
      try {
        await Clipboard.setStringAsync(message);
        showChip('Instructions copied');
      } catch {
        showChip(`Code: ${patient.access_code}`);
      }
      return;
    }

    try {
      await Share.share({ message, title: 'MMAI Patient Access Key' });
    } catch {}
  };

  // Handle Create Patient
  const handleCreatePatient = async () => {
    if (!newPatientName.trim()) {
      error('Missing Name', 'Please enter the patient full name.');
      return;
    }

    try {
      setIsSubmittingPatient(true);
      const created = await createPatient({
        patientName: newPatientName,
        patientEmail: newPatientEmail,
        doctorName: formatDoctorName(user?.name),
      });

      setCreatedKeyData(created);
      setNewPatientName('');
      setNewPatientEmail('');
      setPatientModalVisible(false);
      success('Patient Added!', `Access code ${created.access_code} generated.`);
      fetchPatients();
    } catch (err: any) {
      error('Creation Failed', err.message || 'Could not create patient.');
    } finally {
      setIsSubmittingPatient(false);
    }
  };

  // Handle Add Timeline Event
  const handleAddTimelineEvent = async () => {
    if (!newEventTitle.trim()) {
      error('Missing Title', 'Please enter a title for this timeline event.');
      return;
    }

    try {
      await addTimelineEvent({
        patient_id: selectedPatientForDetail ? selectedPatientForDetail.id : 'default',
        title: newEventTitle,
        event_date: newEventDate,
        event_time: newEventTime,
        people_involved: newEventPeople,
        notes: newEventNotes,
        category: 'routine',
        source: `Caregiver (${formatDoctorName(user?.name)})`,
        verification_status: 'verified',
      });

      setNewEventTitle('');
      setNewEventNotes('');
      setNewEventPeople('');
      setTimelineModalVisible(false);
      showChip('Verified memory saved');
      fetchCareData();
    } catch (err: any) {
      error('Failed to Add', err.message || 'Could not save memory event.');
    }
  };

  // Handle Delete Timeline Event
  const handleDeleteTimelineEvent = async (id: string) => {
    try {
      await deleteTimelineEvent(id);
      showChip('Memory removed');
      fetchCareData();
    } catch (err: any) {
      error('Failed to Remove', err.message || 'Could not delete event.');
    }
  };

  // Handle Add Reminder
  const handleAddReminder = async () => {
    if (!newReminderTitle.trim()) {
      error('Missing Title', 'Please enter a reminder title.');
      return;
    }

    try {
      await addCareReminder({
        patient_id: selectedPatientForDetail ? selectedPatientForDetail.id : 'default',
        title: newReminderTitle,
        category: 'medication',
        scheduled_time: newReminderTime,
        recurrence: 'daily',
        instructions: newReminderInstructions,
      });

      setNewReminderTitle('');
      setNewReminderInstructions('');
      setReminderModalVisible(false);
      showChip('Reminder created');
      fetchCareData();
    } catch (err: any) {
      error('Failed to Create', err.message || 'Could not add reminder.');
    }
  };

  // Handle Toggle Reminder Status
  const handleToggleReminder = async (rem: CareReminder) => {
    const nextStatus = rem.status === 'completed' ? 'active' : 'completed';
    try {
      await toggleReminderStatus(rem.id, nextStatus);
      showChip(nextStatus === 'completed' ? 'Marked completed' : 'Marked active');
      fetchCareData();
    } catch (err: any) {
      error('Update Failed', err.message || 'Could not update reminder.');
    }
  };

  // Handle Delete Reminder
  const handleDeleteReminder = async (id: string) => {
    try {
      await deleteCareReminder(id);
      showChip('Reminder removed');
      fetchCareData();
    } catch (err: any) {
      error('Delete Failed', err.message || 'Could not delete reminder.');
    }
  };

  // Handle Acknowledge Alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      await markAlertStatus(alertId, 'reviewed');
      showChip('Observation acknowledged');
      fetchCareData();
    } catch (err: any) {
      error('Action Failed', err.message || 'Could not update alert.');
    }
  };

  if (loadingUser) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={primary} />
        <Text style={[styles.loadingText, { color: muted }]}>Loading your MMAI session...</Text>
      </View>
    );
  }

  const isDoctor = user?.role === 'doctor';

  // Dedicated Patient Workspace component
  if (!isDoctor) {
    return (
      <PatientScreen
        user={user}
        baseline={baseline}
        reminders={reminders}
        timelineEvents={timelineEvents}
        onToggleReminder={handleToggleReminder}
        onConfirmLogout={confirmLogout}
      />
    );
  }

  const openAlerts = careAlerts.filter((a) => a.status === 'open');

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* TOP HEADER (#748B75 Fill to Screen Top, Taller Height) */}
      <DoctorTopBar
        user={user}
        isDoctor={isDoctor}
        activeTab={activeTab}
        openAlertsCount={openAlerts.length}
        insetsTop={insets.top}
        onProfilePress={() => {
          setSelectedPatientForDetail(null);
          setSettingsSubPage(null);
          setActiveTab('settings');
        }}
        onNotificationPress={() => {
          setSelectedPatientForDetail(null);
          setActiveTab('notifications');
        }}
      />

      {/* MAIN VIEW AREA */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 105 }]}
        showsVerticalScrollIndicator={false}
      >
        {selectedPatientForDetail ? (
          <PatientDetailView
            patient={selectedPatientForDetail}
            onBack={() => setSelectedPatientForDetail(null)}
            patientDetailSubTab={patientDetailSubTab}
            setPatientDetailSubTab={setPatientDetailSubTab}
            baseline={baseline}
            timelineEvents={timelineEvents}
            reminders={reminders}
            copiedId={copiedId}
            onCopyCode={handleCopyCode}
            onShareCode={handleShareCode}
            onOpenAddTimeline={() => setTimelineModalVisible(true)}
            onDeleteTimelineEvent={handleDeleteTimelineEvent}
            onOpenAddReminder={() => setReminderModalVisible(true)}
            onToggleReminder={handleToggleReminder}
            onDeleteReminder={handleDeleteReminder}
          />
        ) : (
          <View style={styles.tabContentWrap}>
            {activeTab === 'dashboard' && (
              <OverviewTab
                patients={patients}
                baseline={baseline}
                reminders={reminders}
                onNavigateToPatients={() => setActiveTab('patients')}
                onNavigateToReminders={() => setActiveTab('reminders')}
                onToggleReminder={handleToggleReminder}
              />
            )}

            {activeTab === 'patients' && (
              <PatientsTab
                patients={patients}
                createdKeyData={createdKeyData}
                onClearCreatedKey={() => setCreatedKeyData(null)}
                onSelectPatient={(pat) => setSelectedPatientForDetail(pat)}
                onOpenAddPatient={() => setPatientModalVisible(true)}
              />
            )}

            {activeTab === 'timeline' && (
              <TimelineTab
                timelineEvents={timelineEvents}
                onOpenAddTimeline={() => setTimelineModalVisible(true)}
                onDeleteTimelineEvent={handleDeleteTimelineEvent}
              />
            )}

            {activeTab === 'reminders' && (
              <RemindersTab
                reminders={reminders}
                reminderFilter={reminderFilter}
                setReminderFilter={setReminderFilter}
                onOpenAddReminder={() => setReminderModalVisible(true)}
                onToggleReminder={handleToggleReminder}
                onDeleteReminder={handleDeleteReminder}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                user={user}
                onUpdateUser={handleUpdateUser}
                settingsSubPage={settingsSubPage}
                setSettingsSubPage={setSettingsSubPage}
                fontScalePref={fontScalePref}
                setFontScalePref={setFontScalePref}
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                autoBaselineSync={autoBaselineSync}
                setAutoBaselineSync={setAutoBaselineSync}
                onRestorePurchases={() => {
                  fetchPatients();
                  fetchCareData();
                  showChip('Clinical records synced');
                }}
                onSyncCloud={() => {
                  fetchPatients();
                  fetchCareData();
                  showChip('Cloud data synced');
                }}
                onConfirmLogout={confirmLogout}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsTab
                careAlerts={careAlerts}
                onBackToDashboard={() => setActiveTab('dashboard')}
                onResolveAlert={handleResolveAlert}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR (#748B75 Full Fill, Circular Active Highlight) */}
      <DoctorBottomNavBar
        activeTab={activeTab}
        hasSelectedPatient={selectedPatientForDetail !== null}
        onSelectTab={(tab) => {
          setSelectedPatientForDetail(null);
          if (tab === 'settings') {
            setSettingsSubPage(null);
          }
          setActiveTab(tab);
        }}
        insetsBottom={insets.bottom}
      />

      {/* MODALS */}
      <AddPatientModal
        visible={patientModalVisible}
        onClose={() => setPatientModalVisible(false)}
        patientName={newPatientName}
        setPatientName={setNewPatientName}
        patientEmail={newPatientEmail}
        setPatientEmail={setNewPatientEmail}
        isSubmitting={isSubmittingPatient}
        onSubmit={handleCreatePatient}
      />

      <AddTimelineModal
        visible={timelineModalVisible}
        onClose={() => setTimelineModalVisible(false)}
        eventTitle={newEventTitle}
        setEventTitle={setNewEventTitle}
        eventDate={newEventDate}
        setEventDate={setNewEventDate}
        eventTime={newEventTime}
        setEventTime={setNewEventTime}
        eventPeople={newEventPeople}
        setEventPeople={setNewEventPeople}
        onSubmit={handleAddTimelineEvent}
      />

      <AddReminderModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        reminderTitle={newReminderTitle}
        setReminderTitle={setNewReminderTitle}
        reminderTime={newReminderTime}
        setReminderTime={setNewReminderTime}
        reminderInstructions={newReminderInstructions}
        setReminderInstructions={setNewReminderInstructions}
        onSubmit={handleAddReminder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabContentWrap: {
    gap: 12,
  },
});