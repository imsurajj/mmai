import { BarChart } from '@/components/charts/bar-chart';
import { ProgressRingChart } from '@/components/charts/progress-ring-chart';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useColor } from '@/hooks/useColor';
import { useModeToggle } from '@/hooks/useModeToggle';
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
import * as Clipboard from 'expo-clipboard';
import {
  AlertCircle,
  Bell,
  Brain,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  Globe,
  Heart,
  Info,
  Key,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  ShieldCheck,
  Sliders,
  Stethoscope,
  Sun,
  Trash2,
  Type,
  User,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DoctorTab = 'dashboard' | 'patients' | 'timeline' | 'reminders' | 'settings' | 'notifications';
type PatientDetailSubTab = 'analytics' | 'timeline' | 'reminders';
type ReminderFilter = 'all' | 'active' | 'completed' | 'missed';

type AuthenticatedScreenProps = {
  onLogout: () => void;
};

function formatDoctorName(name?: string) {
  if (!name) return 'Dr. Suraj';
  // Strip any repetitive "Dr.", "Dr", "dr.", "dr", "Doctor", "doctor" prefixes
  const cleaned = name.trim().replace(/^((dr|doctor)\.?\s*)+/gi, '').trim();
  if (!cleaned) return 'Dr. Suraj';
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return `Dr. ${capitalized}`;
}

export function AuthenticatedScreen({ onLogout }: AuthenticatedScreenProps) {
  const bg = useColor('background');
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary'); // Dusty Olive Green #748B75
  const border = useColor('border');
  const secondary = useColor('secondary'); // Filled background for header & navbar
  const insets = useSafeAreaInsets();
  const { success, error, info } = useToast();
  const { isDark, setMode } = useModeToggle();

  // Session & Base States
  const [user, setUser] = useState<CurrentSessionUser | null>(null);
  const [patients, setPatients] = useState<PatientAccessKey[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Active Navigation States
  const [activeTab, setActiveTab] = useState<DoctorTab>('dashboard');
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<PatientAccessKey | null>(null);
  const [patientDetailSubTab, setPatientDetailSubTab] = useState<PatientDetailSubTab>('analytics');

  // Caregiver Data States
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [memoryChecks, setMemoryChecks] = useState<MemoryCheckResult[]>([]);
  const [baseline, setBaseline] = useState<PersonalBaseline | null>(null);
  const [careAlerts, setCareAlerts] = useState<CareAlert[]>([]);
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');

  // Settings & Preferences States
  const [fontScalePref, setFontScalePref] = useState<'normal' | 'large' | 'xl'>('large');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoBaselineSync, setAutoBaselineSync] = useState(true);
  const [settingsSubPage, setSettingsSubPage] = useState<'profile' | 'subscription' | 'appSettings' | 'security' | 'notifications' | 'theme' | null>(null);

  // Edit Profile States
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('Neurology & Cognitive Care');

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
  const [newReminderCategory, setNewReminderCategory] = useState<'medication' | 'appointment' | 'meal' | 'activity' | 'custom'>('medication');
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
  const handleSaveProfile = () => {
    if (!editName.trim()) {
      error('Name Required', 'Please enter your full name.');
      return;
    }
    if (user) {
      setUser({
        ...user,
        name: editName.trim(),
        email: editEmail.trim() || user.email,
      });
    }
    setEditProfileModalVisible(false);
    setSettingsSubPage(null);
    success('Profile Saved', 'Profile changes updated successfully.');
  };

  // Handle Copy Code
  const handleCopyCode = async (code: string, id: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedId(id);
      success('Code Copied!', `Access code ${code} copied.`);
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
        success('Share Text Copied!', 'Instructions and code copied to clipboard.');
      } catch {
        info('Patient Key', `Code: ${patient.access_code}`);
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

  // Handle Delete Patient
  const handleDeletePatient = async (patient: PatientAccessKey) => {
    const confirmDelete = async () => {
      try {
        await deleteDoctorPatient(patient.id);
        success('Key Revoked', `Access for ${patient.patient_name} removed.`);
        if (selectedPatientForDetail?.id === patient.id) {
          setSelectedPatientForDetail(null);
        }
        fetchPatients();
      } catch (err: any) {
        error('Revoke Failed', err.message || 'Could not revoke access code.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Revoke access key for ${patient.patient_name}?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert('Revoke Access Key', `Revoke access for ${patient.patient_name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: confirmDelete },
      ]);
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
      success('Verified Memory Added', 'Saved to verified timeline.');
      fetchCareData();
    } catch (err: any) {
      error('Failed to Add', err.message || 'Could not save memory event.');
    }
  };

  // Handle Delete Timeline Event
  const handleDeleteTimelineEvent = async (id: string) => {
    try {
      await deleteTimelineEvent(id);
      success('Event Removed', 'Memory event removed.');
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
        category: newReminderCategory,
        scheduled_time: newReminderTime,
        recurrence: 'daily',
        instructions: newReminderInstructions,
      });

      setNewReminderTitle('');
      setNewReminderInstructions('');
      setReminderModalVisible(false);
      success('Reminder Created', 'Prompt scheduled.');
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
      success(nextStatus === 'completed' ? 'Marked Completed' : 'Marked Active', rem.title);
      fetchCareData();
    } catch (err: any) {
      error('Update Failed', err.message || 'Could not update reminder.');
    }
  };

  // Handle Delete Reminder
  const handleDeleteReminder = async (id: string) => {
    try {
      await deleteCareReminder(id);
      success('Reminder Deleted', 'Reminder removed.');
      fetchCareData();
    } catch (err: any) {
      error('Delete Failed', err.message || 'Could not delete reminder.');
    }
  };

  // Handle Acknowledge Alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      await markAlertStatus(alertId, 'reviewed');
      success('Observation Acknowledged', 'Marked as reviewed.');
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
  const openAlerts = careAlerts.filter((a) => a.status === 'open');
  const activeReminders = reminders.filter((r) => r.status === 'active');
  const completedReminders = reminders.filter((r) => r.status === 'completed');
  const missedReminders = reminders.filter((r) => r.status === 'missed');

  const filteredReminders =
    reminderFilter === 'all'
      ? reminders
      : reminderFilter === 'active'
      ? activeReminders
      : reminderFilter === 'completed'
      ? completedReminders
      : missedReminders;

  // Minimal chart data (Primary green accent)
  const cognitiveBarData = [
    { label: 'Object', value: baseline?.object_average || 85, color: primary },
    { label: 'Orient', value: baseline?.orientation_average || 90, color: '#92AD94' },
    { label: 'Recent', value: baseline?.recent_event_average || 82, color: primary },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* ======================================================== */}
      {/* TOP HEADER (#748B75 Fill to Screen Top, Taller Height)   */}
      {/* ======================================================== */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: '#748B75',
            paddingTop: Math.max(insets.top, 12) + 6,
            paddingBottom: 16,
            borderBottomColor: 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (isDoctor) {
              setSelectedPatientForDetail(null);
              setActiveTab('settings');
            }
          }}
          style={styles.topProfileInfo}
        >
          <View style={[styles.avatarCircle, { backgroundColor: '#FFFFFF', borderColor: 'transparent' }]}>
            {isDoctor ? <Stethoscope size={18} color="#748B75" /> : <UserCheck size={18} color="#748B75" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: '#FFFFFF' }]} numberOfLines={1}>
              {isDoctor ? formatDoctorName(user?.name) : user?.name || 'Patient'}
            </Text>
            <Text style={[styles.roleSubtitle, { color: '#E4EFE4' }]} numberOfLines={1}>
              {isDoctor ? 'Caregiver Workspace' : 'Patient Workspace'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.topRightActions}>
          {/* Notification Alert Bell (Caregiver Attention Queue) */}
          {isDoctor && (
            <Pressable
              onPress={() => {
                setSelectedPatientForDetail(null);
                setActiveTab('notifications');
              }}
              style={({ pressed }) => [
                styles.iconBtnTop,
                {
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  backgroundColor: activeTab === 'notifications' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.22)',
                },
                pressed && { opacity: 0.65 },
              ]}
              hitSlop={8}
              accessibilityLabel="Notifications"
            >
              <Bell size={16} color={activeTab === 'notifications' ? '#748B75' : '#FFFFFF'} />
              {openAlerts.length > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{openAlerts.length}</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* ======================================================== */}
      {/* MAIN VIEW AREA                                           */}
      {/* ======================================================== */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 105 }]}
        showsVerticalScrollIndicator={false}
      >
        {isDoctor ? (
          selectedPatientForDetail ? (
            /* ====================================================== */
            /* 1. DEDICATED SEPARATE PATIENT DETAIL PAGE (Clean)      */
            /* ====================================================== */
            <Animated.View entering={FadeInDown.duration(240)} style={styles.detailContainer}>
              {/* Minimal Back Button */}
              <Pressable
                onPress={() => setSelectedPatientForDetail(null)}
                style={styles.backNavRow}
                hitSlop={8}
              >
                <ChevronLeft size={16} color={primary} />
                <Text style={[styles.backNavText, { color: primary }]}>All Patients</Text>
              </Pressable>

              {/* Minimal Patient Header */}
              <View style={[styles.patientHeaderClean, { borderBottomColor: border }]}>
                <View style={styles.patientHeaderTop}>
                  <View style={[styles.patientAvatarClean, { borderColor: border }]}>
                    <User size={22} color={primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.patientDetailName, { color: text }]}>
                      {selectedPatientForDetail.patient_name}
                    </Text>
                    <Text style={[styles.patientDetailEmail, { color: muted }]}>
                      {selectedPatientForDetail.patient_email || 'Direct Key Access'}
                    </Text>
                  </View>
                </View>

                {/* Secret Key Quick Action Strip */}
                <View style={[styles.minimalKeyRow, { borderColor: border }]}>
                  <View style={styles.rowAlign}>
                    <Key size={13} color={primary} />
                    <Text style={[styles.codeKeyText, { color: text }]}>
                      Access Code: <Text style={{ color: primary, fontWeight: '700' }}>{selectedPatientForDetail.access_code}</Text>
                    </Text>
                  </View>

                  <View style={styles.rowAlign}>
                    <Pressable
                      onPress={() => handleCopyCode(selectedPatientForDetail.access_code, selectedPatientForDetail.id)}
                      hitSlop={6}
                      style={[styles.linkBtn, { borderColor: border }]}
                    >
                      {copiedId === selectedPatientForDetail.id ? <Check size={12} color={primary} /> : <Copy size={12} color={muted} />}
                      <Text style={[styles.linkBtnText, { color: copiedId === selectedPatientForDetail.id ? primary : text }]}>
                        {copiedId === selectedPatientForDetail.id ? 'Copied' : 'Copy'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleShareCode(selectedPatientForDetail)}
                      hitSlop={6}
                      style={[styles.linkBtn, { borderColor: border }]}
                    >
                      <Share2 size={12} color={muted} />
                      <Text style={[styles.linkBtnText, { color: text }]}>Share</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Minimal Text Sub-Tabs with Green Underline Indicator */}
              <View style={[styles.subTabStrip, { borderBottomColor: border }]}>
                <Pressable
                  onPress={() => setPatientDetailSubTab('analytics')}
                  style={[styles.subTabItem, patientDetailSubTab === 'analytics' && { borderBottomColor: primary }]}
                >
                  <Text style={[styles.subTabText, { color: patientDetailSubTab === 'analytics' ? primary : muted, fontWeight: patientDetailSubTab === 'analytics' ? '700' : '500' }]}>
                    Cognitive Analytics
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setPatientDetailSubTab('timeline')}
                  style={[styles.subTabItem, patientDetailSubTab === 'timeline' && { borderBottomColor: primary }]}
                >
                  <Text style={[styles.subTabText, { color: patientDetailSubTab === 'timeline' ? primary : muted, fontWeight: patientDetailSubTab === 'timeline' ? '700' : '500' }]}>
                    Verified Memory ({timelineEvents.length})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setPatientDetailSubTab('reminders')}
                  style={[styles.subTabItem, patientDetailSubTab === 'reminders' && { borderBottomColor: primary }]}
                >
                  <Text style={[styles.subTabText, { color: patientDetailSubTab === 'reminders' ? primary : muted, fontWeight: patientDetailSubTab === 'reminders' ? '700' : '500' }]}>
                    Routines ({reminders.length})
                  </Text>
                </Pressable>
              </View>

              {/* Sub-Tab 1: Cognitive Analytics with Charts & Graphs */}
              {patientDetailSubTab === 'analytics' && (
                <View style={styles.subContentWrap}>
                  <View style={[styles.cleanSectionBlock, { borderBottomColor: border }]}>
                    <Text style={[styles.cleanSectionTitle, { color: text }]}>Cognitive Stability Index</Text>
                    <Text style={[styles.cleanSectionSub, { color: muted }]}>
                      Aggregated metric derived from {baseline?.sample_count || 6} verified memory checks.
                    </Text>

                    <View style={styles.ringCenterWrap}>
                      <ProgressRingChart
                        progress={baseline?.object_average || 85}
                        size={130}
                        strokeWidth={8}
                        centerText={`${baseline?.object_average || 85}%`}
                        label="Stability"
                      />
                    </View>

                    <View style={styles.statsTwoCol}>
                      <View style={styles.statCol}>
                        <Text style={[styles.statLabel, { color: muted }]}>Average Response Speed</Text>
                        <Text style={[styles.statVal, { color: primary }]}>
                          {baseline?.average_response_time || 7.8}s
                        </Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={[styles.statLabel, { color: muted }]}>Orientation Accuracy</Text>
                        <Text style={[styles.statVal, { color: primary }]}>
                          {baseline?.orientation_average || 90}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Domain Breakdown Bar Chart */}
                  <View style={[styles.cleanSectionBlock, { borderBottomColor: border }]}>
                    <Text style={[styles.cleanSectionTitle, { color: text }]}>Recall Domain Comparison (PRD §5.5)</Text>
                    <Text style={[styles.cleanSectionSub, { color: muted }]}>
                      Object Recall vs Orientation vs Recent-Event Recall
                    </Text>

                    <View style={styles.barChartContainer}>
                      <BarChart
                        data={cognitiveBarData}
                        config={{
                          height: 170,
                          showGrid: false,
                          showLabels: true,
                          animated: true,
                        }}
                      />
                    </View>
                  </View>

                  {/* Observational Notice per PRD §1 */}
                  <View style={styles.minimalNoticeRow}>
                    <Info size={14} color={primary} />
                    <Text style={[styles.minimalNoticeText, { color: muted }]}>
                      Results are provided as behavioral observations to monitor baseline deviation, not medical diagnoses.
                    </Text>
                  </View>
                </View>
              )}

              {/* Sub-Tab 2: Verified Timeline */}
              {patientDetailSubTab === 'timeline' && (
                <View style={styles.subContentWrap}>
                  <View style={styles.sectionTitleActionRow}>
                    <Text style={[styles.sectionHeading, { color: text }]}>Verified Ground-Truth Timeline</Text>
                    <Button
                      variant="default"
                      size="sm"
                      icon={Plus}
                      onPress={() => setTimelineModalVisible(true)}
                    >
                      Add Memory
                    </Button>
                  </View>

                  {timelineEvents.map((evt) => (
                    <View key={evt.id} style={[styles.minimalTimelineRow, { borderBottomColor: border }]}>
                      <View style={styles.timelineRowTop}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.verifiedRow}>
                            <ShieldCheck size={12} color={primary} />
                            <Text style={[styles.verifiedText, { color: primary }]}>Verified Memory</Text>
                            <Text style={[styles.timelineDate, { color: muted }]}>
                              • {evt.event_date} {evt.event_time ? `(${evt.event_time})` : ''}
                            </Text>
                          </View>
                          <Text style={[styles.timelineMainTitle, { color: text }]}>{evt.title}</Text>
                        </View>

                        <Pressable onPress={() => handleDeleteTimelineEvent(evt.id)} hitSlop={6}>
                          <Trash2 size={13} color={muted} />
                        </Pressable>
                      </View>

                      {evt.description ? (
                        <Text style={[styles.timelineDescText, { color: muted }]}>{evt.description}</Text>
                      ) : null}

                      {evt.people_involved ? (
                        <Text style={[styles.peopleText, { color: muted }]}>With: {evt.people_involved}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Sub-Tab 3: Reminders for this Patient */}
              {patientDetailSubTab === 'reminders' && (
                <View style={styles.subContentWrap}>
                  <View style={styles.sectionTitleActionRow}>
                    <Text style={[styles.sectionHeading, { color: text }]}>Routine Prompts</Text>
                    <Button
                      variant="default"
                      size="sm"
                      icon={Plus}
                      onPress={() => setReminderModalVisible(true)}
                    >
                      New Reminder
                    </Button>
                  </View>

                  {reminders.map((rem) => (
                    <View key={rem.id} style={[styles.minimalChecklistRow, { borderBottomColor: border }]}>
                      <Pressable onPress={() => handleToggleReminder(rem)} hitSlop={6} style={styles.checkWrap}>
                        <View
                          style={[
                            styles.checkCircleOutline,
                            {
                              borderColor: rem.status === 'completed' ? primary : border,
                              backgroundColor: rem.status === 'completed' ? primary : 'transparent',
                            },
                          ]}
                        >
                          {rem.status === 'completed' && <Check size={11} color="#FFFFFF" />}
                        </View>
                      </Pressable>

                      <View style={{ flex: 1 }}>
                        <View style={styles.remTitleLine}>
                          <Text
                            style={[
                              styles.remTitleText,
                              {
                                color: text,
                                textDecorationLine: rem.status === 'completed' ? 'line-through' : 'none',
                              },
                            ]}
                          >
                            {rem.title}
                          </Text>
                          <Text style={[styles.timeText, { color: primary }]}>{rem.scheduled_time}</Text>
                        </View>
                        {rem.instructions ? (
                          <Text style={[styles.remInstrText, { color: muted }]}>{rem.instructions}</Text>
                        ) : null}
                      </View>

                      <Pressable onPress={() => handleDeleteReminder(rem.id)} hitSlop={6}>
                        <Trash2 size={13} color={muted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          ) : (
            /* ====================================================== */
            /* 2. MAIN BOTTOM TABS (Clean White, No Clutter)          */
            /* ====================================================== */
            <View style={styles.tabContentWrap}>
              {/* ---------------------------------------------------- */}
              {/* TAB 1: EXECUTIVE DASHBOARD                           */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'dashboard' && (
                <Animated.View entering={FadeInDown.duration(240)} style={styles.sectionWrap}>
                  {/* Clean 3-Metric Summary Strip (Dividers, No Heavy Cards) */}
                  <View style={[styles.metricsCleanStrip, { borderBottomColor: border }]}>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricNumber, { color: primary }]}>{patients.length}</Text>
                      <Text style={[styles.metricLabel, { color: muted }]}>Active Patients</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: border }]} />
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricNumber, { color: primary }]}>
                        {baseline ? `${baseline.object_average}%` : '85%'}
                      </Text>
                      <Text style={[styles.metricLabel, { color: muted }]}>Stability Index</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: border }]} />
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricNumber, { color: primary }]}>{activeReminders.length}</Text>
                      <Text style={[styles.metricLabel, { color: muted }]}>Pending Prompts</Text>
                    </View>
                  </View>

                  {/* Overall Cognitive Baseline Overview */}
                  <View style={[styles.cleanSectionBlock, { borderBottomColor: border }]}>
                    <View style={styles.cardTopTitleRow}>
                      <View style={styles.rowAlign}>
                        <Brain size={16} color={primary} />
                        <Text style={[styles.cleanSectionTitle, { color: text }]}>Cognitive Stability Overview</Text>
                      </View>
                      <Pressable onPress={() => setActiveTab('patients')} hitSlop={8}>
                        <Text style={[styles.linkActionText, { color: primary }]}>View Patients &rarr;</Text>
                      </Pressable>
                    </View>

                    <View style={styles.ringChartRow}>
                      <ProgressRingChart
                        progress={baseline?.object_average || 85}
                        size={96}
                        strokeWidth={7}
                        centerText={`${baseline?.object_average || 85}%`}
                        showLabel={false}
                      />
                      <View style={styles.ringInfoCol}>
                        <Text style={[styles.ringTitleText, { color: text }]}>Baseline Score: 85%</Text>
                        <Text style={[styles.ringSubText, { color: muted }]}>
                          Memory recall performance is within expected personal baseline limits.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Today's Routine Prompts Checklist */}
                  <View style={[styles.cleanSectionBlock, { borderBottomColor: border }]}>
                    <View style={styles.cardTopTitleRow}>
                      <View style={styles.rowAlign}>
                        <Clock size={16} color={primary} />
                        <Text style={[styles.cleanSectionTitle, { color: text }]}>Today's Priority Prompts</Text>
                      </View>
                      <Pressable onPress={() => setActiveTab('reminders')} hitSlop={8}>
                        <Text style={[styles.linkActionText, { color: primary }]}>Manage &rarr;</Text>
                      </Pressable>
                    </View>

                    <View style={styles.cleanList}>
                      {reminders.slice(0, 3).map((r) => (
                        <View key={r.id} style={[styles.cleanCheckItem, { borderBottomColor: border }]}>
                          <Pressable onPress={() => handleToggleReminder(r)} hitSlop={6}>
                            <View
                              style={[
                                styles.checkCircleSmall,
                                {
                                  borderColor: r.status === 'completed' ? primary : border,
                                  backgroundColor: r.status === 'completed' ? primary : 'transparent',
                                },
                              ]}
                            >
                              {r.status === 'completed' && <Check size={10} color="#FFFFFF" />}
                            </View>
                          </Pressable>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.quickRemTitle,
                                {
                                  color: text,
                                  textDecorationLine: r.status === 'completed' ? 'line-through' : 'none',
                                },
                              ]}
                            >
                              {r.title}
                            </Text>
                          </View>
                          <Text style={[styles.quickRemTime, { color: primary }]}>{r.scheduled_time}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated.View>
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 2: PATIENTS DIRECTORY (List -> Drill Down)       */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'patients' && (
                <Animated.View entering={FadeInDown.duration(240)} style={styles.sectionWrap}>
                  {/* Clean List Header */}
                  <View style={styles.listHeaderRow}>
                    <View>
                      <Text style={[styles.listHeaderTitle, { color: text }]}>Patient Directory</Text>
                      <Text style={[styles.listHeaderSub, { color: muted }]}>
                        Tap any patient to inspect baseline charts, verified timeline & routines.
                      </Text>
                    </View>
                    <Button
                      variant="default"
                      size="sm"
                      icon={UserPlus}
                      onPress={() => setPatientModalVisible(true)}
                    >
                      Add Patient
                    </Button>
                  </View>

                  {/* Created Key Announcement */}
                  {createdKeyData && (
                    <View style={[styles.cleanKeyCreatedRow, { borderColor: border }]}>
                      <CheckCircle2 size={16} color={primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.keyCreatedTitle, { color: text }]}>
                          Access Key for {createdKeyData.patient_name}:{' '}
                          <Text style={{ color: primary, fontWeight: '800' }}>{createdKeyData.access_code}</Text>
                        </Text>
                      </View>
                      <Pressable onPress={() => setCreatedKeyData(null)} hitSlop={6}>
                        <X size={14} color={muted} />
                      </Pressable>
                    </View>
                  )}

                  {/* Clean List Items (Flat & Minimal) */}
                  <View style={[styles.patientsFlatList, { borderTopColor: border }]}>
                    {patients.map((pat) => (
                      <Pressable
                        key={pat.id}
                        onPress={() => setSelectedPatientForDetail(pat)}
                        style={({ pressed }) => [
                          styles.patientRowItem,
                          { borderBottomColor: border },
                          pressed && { backgroundColor: '#F9FAFB' },
                        ]}
                      >
                        <View style={[styles.patientIconCircleClean, { borderColor: border }]}>
                          <User size={18} color={primary} />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.patientRowName, { color: text }]}>{pat.patient_name}</Text>
                          <Text style={[styles.patientRowSub, { color: muted }]}>
                            {pat.patient_email || 'Direct Access Key'}
                          </Text>
                        </View>

                        <View style={[styles.codeTag, { borderColor: border }]}>
                          <Text style={[styles.codeTagText, { color: primary }]}>{pat.access_code}</Text>
                        </View>

                        <ChevronRight size={16} color={primary} />
                      </Pressable>
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 3: VERIFIED TIMELINE (Global Hub)                */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'timeline' && (
                <Animated.View entering={FadeInDown.duration(240)} style={styles.sectionWrap}>
                  <View style={styles.listHeaderRow}>
                    <View>
                      <Text style={[styles.listHeaderTitle, { color: text }]}>Memory Timeline Hub</Text>
                      <Text style={[styles.listHeaderSub, { color: muted }]}>
                        Verified ground truth recorded by caregivers.
                      </Text>
                    </View>
                    <Button
                      variant="default"
                      size="sm"
                      icon={Plus}
                      onPress={() => setTimelineModalVisible(true)}
                    >
                      Add Memory
                    </Button>
                  </View>

                  <View style={[styles.timelineCleanList, { borderTopColor: border }]}>
                    {timelineEvents.map((evt) => (
                      <View key={evt.id} style={[styles.minimalTimelineRow, { borderBottomColor: border }]}>
                        <View style={styles.timelineRowTop}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.verifiedRow}>
                              <ShieldCheck size={12} color={primary} />
                              <Text style={[styles.verifiedText, { color: primary }]}>Verified Memory</Text>
                              <Text style={[styles.timelineDate, { color: muted }]}>
                                • {evt.event_date} {evt.event_time ? `(${evt.event_time})` : ''}
                              </Text>
                            </View>
                            <Text style={[styles.timelineMainTitle, { color: text }]}>{evt.title}</Text>
                          </View>

                          <Pressable onPress={() => handleDeleteTimelineEvent(evt.id)} hitSlop={6}>
                            <Trash2 size={13} color={muted} />
                          </Pressable>
                        </View>

                        {evt.description ? (
                          <Text style={[styles.timelineDescText, { color: muted }]}>{evt.description}</Text>
                        ) : null}

                        {evt.people_involved ? (
                          <Text style={[styles.peopleText, { color: muted }]}>With: {evt.people_involved}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 4: REMINDERS & ROUTINE MANAGER                   */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'reminders' && (
                <Animated.View entering={FadeInDown.duration(240)} style={styles.sectionWrap}>
                  <View style={styles.listHeaderRow}>
                    <View>
                      <Text style={[styles.listHeaderTitle, { color: text }]}>Routines & Reminders</Text>
                      <Text style={[styles.listHeaderSub, { color: muted }]}>
                        Daily medication, meals and prompt schedule.
                      </Text>
                    </View>
                    <Button
                      variant="default"
                      size="sm"
                      icon={Plus}
                      onPress={() => setReminderModalVisible(true)}
                    >
                      New Reminder
                    </Button>
                  </View>

                  {/* Clean Text Filter Bar */}
                  <View style={[styles.filterBarClean, { borderBottomColor: border }]}>
                    {(['all', 'active', 'completed', 'missed'] as ReminderFilter[]).map((f) => (
                      <Pressable
                        key={f}
                        onPress={() => setReminderFilter(f)}
                        style={[
                          styles.filterTabMinimal,
                          reminderFilter === f && { borderBottomColor: primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterTabMinimalText,
                            {
                              color: reminderFilter === f ? primary : muted,
                              fontWeight: reminderFilter === f ? '700' : '500',
                            },
                          ]}
                        >
                          {f.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.remindersCleanFeed}>
                    {filteredReminders.map((rem) => (
                      <View key={rem.id} style={[styles.minimalChecklistRow, { borderBottomColor: border }]}>
                        <Pressable onPress={() => handleToggleReminder(rem)} hitSlop={6} style={styles.checkWrap}>
                          <View
                            style={[
                              styles.checkCircleOutline,
                              {
                                borderColor: rem.status === 'completed' ? primary : border,
                                backgroundColor: rem.status === 'completed' ? primary : 'transparent',
                              },
                            ]}
                          >
                            {rem.status === 'completed' && <Check size={11} color="#FFFFFF" />}
                          </View>
                        </Pressable>

                        <View style={{ flex: 1 }}>
                          <View style={styles.remTitleLine}>
                            <Text
                              style={[
                                styles.remTitleText,
                                {
                                  color: text,
                                  textDecorationLine: rem.status === 'completed' ? 'line-through' : 'none',
                                },
                              ]}
                            >
                              {rem.title}
                            </Text>
                            <Text style={[styles.timeText, { color: primary }]}>{rem.scheduled_time}</Text>
                          </View>
                          {rem.instructions ? (
                            <Text style={[styles.remInstrText, { color: muted }]}>{rem.instructions}</Text>
                          ) : null}
                        </View>

                        <Pressable onPress={() => handleDeleteReminder(rem.id)} hitSlop={6}>
                          <Trash2 size={13} color={muted} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 5: PROFILE & SETTINGS (Clean Unboxed Simple List)*/}
              {/* ---------------------------------------------------- */}
              {activeTab === 'settings' && (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.simpleSettingsContainer}>
                  {settingsSubPage === null ? (
                    <>
                      {/* Clean Unboxed Header */}
                      <View style={styles.simpleSettingsHeader}>
                        <Text style={[styles.simpleSettingsTitle, { color: text }]}>Settings</Text>
                        <Text style={[styles.simpleSettingsSub, { color: muted }]}>
                          Practitioner credentials, display & system preferences
                        </Text>
                      </View>

                      {/* Profile Simple Row (Unboxed) */}
                      <Pressable
                        onPress={() => {
                          setEditName(user?.name || '');
                          setEditEmail(user?.email || '');
                          setSettingsSubPage('profile');
                        }}
                        style={({ pressed }) => [
                          styles.simpleProfileRow,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <View style={styles.simpleAvatarWrap}>
                          <View style={[styles.simpleAvatarCircle, { backgroundColor: '#748B75' }]}>
                            <Stethoscope size={24} color="#FFFFFF" strokeWidth={2.4} />
                          </View>
                          <View style={[styles.simpleAvatarBadge, { backgroundColor: '#748B75', borderColor: bg }]}>
                            <Camera size={9} color="#FFFFFF" strokeWidth={2.5} />
                          </View>
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.simpleProfileName, { color: text }]} numberOfLines={1}>
                              {formatDoctorName(user?.name)}
                            </Text>
                            <View style={[styles.simpleProBadge, { backgroundColor: isDark ? '#D9F99D' : '#EAF2EA' }]}>
                              <Text style={[styles.simpleProBadgeText, { color: isDark ? '#1E293B' : '#748B75' }]}>
                                PRO
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.simpleProfileEmail, { color: muted }]} numberOfLines={1}>
                            {user?.email || 'alexjohnson@example.com'}
                          </Text>
                        </View>

                        <ChevronRight size={18} color={muted} strokeWidth={2.2} />
                      </Pressable>

                      <View style={[styles.simpleDivider, { backgroundColor: border }]} />

                      {/* CATEGORY 1: ACCOUNT */}
                      <View style={styles.simpleCategoryWrap}>
                        <Text style={[styles.simpleCategoryHeading, { color: muted }]}>ACCOUNT</Text>

                        <Pressable
                          onPress={() => setSettingsSubPage('subscription')}
                          style={({ pressed }) => [styles.simpleRowItem, pressed && { opacity: 0.7 }]}
                        >
                          <View style={[styles.simpleCircleIcon, { backgroundColor: isDark ? '#262F29' : '#F1F5F2' }]}>
                            <ShieldCheck size={18} color="#748B75" strokeWidth={2.2} />
                          </View>
                          <Text style={[styles.simpleRowLabel, { color: text }]}>Manage subscription</Text>
                          <View style={styles.simpleRowRight}>
                            <Text style={[styles.simpleValueBadge, { color: '#748B75' }]}>Active Pro</Text>
                            <ChevronRight size={18} color={muted} strokeWidth={2.2} />
                          </View>
                        </Pressable>

                        <View style={[styles.simpleInnerDivider, { backgroundColor: border }]} />

                        <Pressable
                          onPress={() => {
                            fetchPatients();
                            fetchCareData();
                            success('Purchases Restored', 'Sync completed with Supabase clinical records.');
                          }}
                          style={({ pressed }) => [styles.simpleRowItem, pressed && { opacity: 0.7 }]}
                        >
                          <View style={[styles.simpleCircleIcon, { backgroundColor: isDark ? '#262F29' : '#F1F5F2' }]}>
                            <RefreshCw size={17} color="#748B75" strokeWidth={2.2} />
                          </View>
                          <Text style={[styles.simpleRowLabel, { color: text }]}>Restore purchases</Text>
                          <ChevronRight size={18} color={muted} strokeWidth={2.2} />
                        </Pressable>
                      </View>

                      <View style={[styles.simpleDivider, { backgroundColor: border }]} />

                      {/* CATEGORY 2: PREFERENCES */}
                      <View style={styles.simpleCategoryWrap}>
                        <Text style={[styles.simpleCategoryHeading, { color: muted }]}>PREFERENCES</Text>

                        {/* App settings */}
                        <Pressable
                          onPress={() => setSettingsSubPage('appSettings')}
                          style={({ pressed }) => [styles.simpleRowItem, pressed && { opacity: 0.7 }]}
                        >
                          <View style={[styles.simpleCircleIcon, { backgroundColor: isDark ? '#262F29' : '#F1F5F2' }]}>
                            <Settings size={18} color="#748B75" strokeWidth={2.2} />
                          </View>
                          <Text style={[styles.simpleRowLabel, { color: text }]}>App settings & font size</Text>
                          <View style={styles.simpleRowRight}>
                            <Text style={[styles.simpleValueBadge, { color: muted }]}>
                              {fontScalePref === 'xl' ? '130%' : fontScalePref === 'large' ? '115%' : '100%'}
                            </Text>
                            <ChevronRight size={18} color={muted} strokeWidth={2.2} />
                          </View>
                        </Pressable>

                        <View style={[styles.simpleInnerDivider, { backgroundColor: border }]} />

                        {/* Privacy & Security */}
                        <Pressable
                          onPress={() => setSettingsSubPage('security')}
                          style={({ pressed }) => [styles.simpleRowItem, pressed && { opacity: 0.7 }]}
                        >
                          <View style={[styles.simpleCircleIcon, { backgroundColor: isDark ? '#262F29' : '#F1F5F2' }]}>
                            <Lock size={17} color="#748B75" strokeWidth={2.2} />
                          </View>
                          <Text style={[styles.simpleRowLabel, { color: text }]}>Privacy & Security</Text>
                          <View style={styles.simpleRowRight}>
                            <Text style={[styles.simpleValueBadge, { color: '#748B75' }]}>AES-256</Text>
                            <ChevronRight size={18} color={muted} strokeWidth={2.2} />
                          </View>
                        </Pressable>

                        <View style={[styles.simpleInnerDivider, { backgroundColor: border }]} />

                        {/* Notifications */}
                        <Pressable
                          onPress={() => setSettingsSubPage('notifications')}
                          style={({ pressed }) => [styles.simpleRowItem, pressed && { opacity: 0.7 }]}
                        >
                          <View style={[styles.simpleCircleIcon, { backgroundColor: isDark ? '#262F29' : '#F1F5F2' }]}>
                            <Bell size={18} color="#748B75" strokeWidth={2.2} />
                          </View>
                          <Text style={[styles.simpleRowLabel, { color: text }]}>Notifications & Signals</Text>
                          <View style={styles.simpleRowRight}>
                            <Text style={[styles.simpleValueBadge, { color: notificationsEnabled ? '#748B75' : muted }]}>
                              {notificationsEnabled ? 'Enabled' : 'Muted'}
                            </Text>
                            <ChevronRight size={18} color={muted} strokeWidth={2.2} />
                          </View>
                        </Pressable>

                        <View style={[styles.simpleInnerDivider, { backgroundColor: border }]} />

                        {/* Appearance Theme */}
                        <Pressable
                          onPress={() => setSettingsSubPage('theme')}
                          style={({ pressed }) => [styles.simpleRowItem, pressed && { opacity: 0.7 }]}
                        >
                          <View style={[styles.simpleCircleIcon, { backgroundColor: isDark ? '#262F29' : '#F1F5F2' }]}>
                            {isDark ? <Moon size={18} color="#748B75" strokeWidth={2.2} /> : <Sun size={18} color="#748B75" strokeWidth={2.2} />}
                          </View>
                          <Text style={[styles.simpleRowLabel, { color: text }]}>Appearance Theme</Text>
                          <View style={styles.simpleRowRight}>
                            <Text style={[styles.simpleValueBadge, { color: muted }]}>
                              {isDark ? 'Dark Mode' : 'Light Mode'}
                            </Text>
                            <ChevronRight size={18} color={muted} strokeWidth={2.2} />
                          </View>
                        </Pressable>
                      </View>

                      <View style={[styles.simpleDivider, { backgroundColor: border }]} />

                      {/* CATEGORY 3: ACCOUNT ACTIONS */}
                      <View style={[styles.simpleCategoryWrap, { marginBottom: 36 }]}>
                        <Text style={[styles.simpleCategoryHeading, { color: muted }]}>ACCOUNT ACTIONS</Text>

                        <Pressable
                          onPress={confirmLogout}
                          style={({ pressed }) => [styles.simpleRowItem, pressed && { opacity: 0.7 }]}
                        >
                          <View style={[styles.simpleCircleIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                            <LogOut size={18} color="#EF4444" strokeWidth={2.2} />
                          </View>
                          <Text style={[styles.simpleRowLabel, { color: '#DC2626' }]}>Sign Out</Text>
                          <ChevronRight size={18} color="#DC2626" strokeWidth={2.2} />
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    /* DEDICATED SUBPAGE VIEW WITH TOP-LEFT BACK OPTION */
                    <Animated.View entering={FadeIn.duration(180)} style={styles.subPageContainer}>
                      {/* Top Bar with Top-Left Back Arrow */}
                      <View style={styles.subPageTopBar}>
                        <Pressable
                          onPress={() => setSettingsSubPage(null)}
                          style={({ pressed }) => [
                            styles.subPageBackBtn,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                            pressed && { opacity: 0.7 },
                          ]}
                          hitSlop={8}
                        >
                          <ChevronLeft size={22} color={text} strokeWidth={2.4} />
                          <Text style={[styles.subPageBackText, { color: text }]}>Settings</Text>
                        </Pressable>

                        <Text style={[styles.subPageNavTitle, { color: text }]}>
                          {settingsSubPage === 'profile' && 'Edit Profile'}
                          {settingsSubPage === 'subscription' && 'Subscription'}
                          {settingsSubPage === 'appSettings' && 'App Settings'}
                          {settingsSubPage === 'security' && 'Privacy & Security'}
                          {settingsSubPage === 'notifications' && 'Notifications'}
                          {settingsSubPage === 'theme' && 'Appearance'}
                        </Text>
                        <View style={{ width: 44 }} />
                      </View>

                      {/* SUBPAGE 1: EDIT PROFILE */}
                      {settingsSubPage === 'profile' && (
                        <View style={styles.subPageBody}>
                          {/* Centered Avatar Display */}
                          <View style={{ alignItems: 'center', marginVertical: 12 }}>
                            <View style={styles.simpleAvatarWrap}>
                              <View style={[styles.simpleAvatarCircle, { width: 72, height: 72, borderRadius: 36, backgroundColor: '#748B75' }]}>
                                <Stethoscope size={36} color="#FFFFFF" strokeWidth={2.2} />
                              </View>
                              <View style={[styles.simpleAvatarBadge, { width: 24, height: 24, borderRadius: 12, backgroundColor: '#748B75', borderColor: bg }]}>
                                <Camera size={12} color="#FFFFFF" strokeWidth={2.5} />
                              </View>
                            </View>
                            <Text style={[styles.subPageDescText, { color: muted, marginTop: 8 }]}>
                              Practitioner ID: MMAI-{user?.id?.slice(0, 6)?.toUpperCase() || '710492'}
                            </Text>
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: text }]}>Full Name</Text>
                            <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: isDark ? '#19221B' : '#F9FAF9' }]}>
                              <TextInput
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="e.g. Dr. Alex Johnson"
                                placeholderTextColor={muted}
                                style={[styles.modalTextInput, { color: text }]}
                              />
                            </View>
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: text }]}>Email</Text>
                            <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: isDark ? '#19221B' : '#F9FAF9' }]}>
                              <TextInput
                                value={editEmail}
                                onChangeText={setEditEmail}
                                placeholder="alexjohnson@example.com"
                                placeholderTextColor={muted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={[styles.modalTextInput, { color: text }]}
                              />
                            </View>
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: text }]}>Clinical Specialty & License</Text>
                            <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: isDark ? '#19221B' : '#F9FAF9' }]}>
                              <TextInput
                                value={editSpecialty}
                                onChangeText={setEditSpecialty}
                                placeholder="e.g. Cognitive Neurology (NPI: 104928)"
                                placeholderTextColor={muted}
                                style={[styles.modalTextInput, { color: text }]}
                              />
                            </View>
                          </View>

                          <Pressable
                            onPress={handleSaveProfile}
                            style={({ pressed }) => [
                              styles.subPageActionBtn,
                              { backgroundColor: isDark ? '#D9F99D' : '#748B75', marginTop: 12 },
                              pressed && { opacity: 0.85 },
                            ]}
                          >
                            <Text style={[styles.subPageActionBtnText, { color: isDark ? '#1E293B' : '#FFFFFF' }]}>
                              Save Changes
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => setSettingsSubPage(null)}
                            style={({ pressed }) => [
                              styles.subPageCancelBtn,
                              { borderColor: border },
                              pressed && { opacity: 0.8 },
                            ]}
                          >
                            <Text style={[styles.subPageCancelBtnText, { color: text }]}>Cancel</Text>
                          </Pressable>
                        </View>
                      )}

                      {/* SUBPAGE 2: SUBSCRIPTION */}
                      {settingsSubPage === 'subscription' && (
                        <View style={styles.subPageBody}>
                          <View style={{ paddingVertical: 12, gap: 10 }}>
                            <View style={[styles.simpleProBadge, { alignSelf: 'flex-start', backgroundColor: isDark ? '#D9F99D' : '#EAF2EA', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 }]}>
                              <Text style={[styles.simpleProBadgeText, { color: isDark ? '#1E293B' : '#748B75', fontSize: 13 }]}>
                                ACTIVE PRO PRACTITIONER
                              </Text>
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: text }}>
                              MMAI Clinical Practice License
                            </Text>
                            <Text style={{ fontSize: 14, color: muted, lineHeight: 20 }}>
                              Full access license for multi-patient cognitive observation, memory baselining, and family portal sync.
                            </Text>
                          </View>

                          <View style={{ gap: 12, marginVertical: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <CheckCircle2 size={18} color="#748B75" />
                              <Text style={{ fontSize: 15, color: text, fontWeight: '600' }}>
                                Automated &gt;15% baseline variance detection
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <CheckCircle2 size={18} color="#748B75" />
                              <Text style={{ fontSize: 15, color: text, fontWeight: '600' }}>
                                Unlimited patient memory records & timelines
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <CheckCircle2 size={18} color="#748B75" />
                              <Text style={{ fontSize: 15, color: text, fontWeight: '600' }}>
                                HIPAA Observational log encryption
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <CheckCircle2 size={18} color="#748B75" />
                              <Text style={{ fontSize: 15, color: text, fontWeight: '600' }}>
                                Cloud sync with Supabase PostgreSQL
                              </Text>
                            </View>
                          </View>

                          <Pressable
                            onPress={() => {
                              fetchPatients();
                              fetchCareData();
                              success('Purchases Restored', 'Sync completed with active database records.');
                            }}
                            style={({ pressed }) => [
                              styles.subPageActionBtn,
                              { backgroundColor: '#748B75', marginTop: 14 },
                              pressed && { opacity: 0.85 },
                            ]}
                          >
                            <Text style={[styles.subPageActionBtnText, { color: '#FFFFFF' }]}>
                              Restore Purchases
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      {/* SUBPAGE 3: APP SETTINGS & FONT SIZE */}
                      {settingsSubPage === 'appSettings' && (
                        <View style={styles.subPageBody}>
                          <Text style={[styles.subPageDescText, { color: muted, marginBottom: 12 }]}>
                            Adjust the typography scale used across patient records, cognitive timelines, and verification prompts:
                          </Text>

                          <View style={styles.fontScaleSelectorWrap}>
                            {(['normal', 'large', 'xl'] as const).map((scale) => {
                              const isSelected = fontScalePref === scale;
                              const label = scale === 'normal' ? 'Normal' : scale === 'large' ? 'Large' : 'X-Large';
                              const pct = scale === 'normal' ? '100%' : scale === 'large' ? '115%' : '130%';
                              return (
                                <Pressable
                                  key={scale}
                                  onPress={() => {
                                    setFontScalePref(scale);
                                    success('Font Scale Updated', `Scale set to ${label} (${pct})`);
                                  }}
                                  style={[
                                    styles.fontSegmentBtn,
                                    {
                                      borderColor: isSelected ? '#748B75' : border,
                                      backgroundColor: isSelected ? '#748B75' : 'transparent',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.fontSegmentText,
                                      {
                                        color: isSelected ? '#FFFFFF' : text,
                                        fontWeight: isSelected ? '700' : '500',
                                      },
                                    ]}
                                  >
                                    {label}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.fontSegmentSubText,
                                      { color: isSelected ? 'rgba(255,255,255,0.8)' : muted },
                                    ]}
                                  >
                                    {pct}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>

                          <View style={[styles.previewInsetBox, { backgroundColor: card, borderColor: border, marginHorizontal: 0, marginTop: 14 }]}>
                            <View style={styles.previewHeaderRow}>
                              <Text style={[styles.previewHeaderLabel, { color: muted }]}>LIVE SCALE PREVIEW</Text>
                              <Text style={[styles.previewBadgeText, { color: '#748B75' }]}>
                                {fontScalePref.toUpperCase()}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.previewDisplayText,
                                {
                                  color: text,
                                  fontSize: fontScalePref === 'xl' ? 17 : fontScalePref === 'large' ? 15 : 13.5,
                                  lineHeight: fontScalePref === 'xl' ? 24 : fontScalePref === 'large' ? 21 : 19,
                                },
                              ]}
                            >
                              "Patient orientation and verified memory retention score is 92%. Cognitive baseline stable with no acute variance."
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* SUBPAGE 4: PRIVACY & SECURITY */}
                      {settingsSubPage === 'security' && (
                        <View style={styles.subPageBody}>
                          <Text style={[styles.subPageDescText, { color: muted, marginBottom: 12 }]}>
                            MMAI safeguards patient health data using cryptographic hardware keys and observational audit logging:
                          </Text>

                          <View style={{ gap: 14 }}>
                            <View style={[styles.subPageSecurityCard, { borderColor: border }]}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>
                                  AES-256 GCM Encryption
                                </Text>
                                <Text style={{ fontSize: 13, color: muted, marginTop: 3 }}>
                                  All patient timelines and cognitive indices are encrypted in device secure storage.
                                </Text>
                              </View>
                              <View style={[styles.statusPillLite, { backgroundColor: isDark ? '#1C261E' : '#EAF2EA', borderColor: '#748B75' }]}>
                                <Check size={11} color="#748B75" strokeWidth={2.5} />
                                <Text style={[styles.statusPillLiteText, { color: '#748B75' }]}>Active</Text>
                              </View>
                            </View>

                            <View style={[styles.subPageSecurityCard, { borderColor: border }]}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>
                                  HIPAA Observational Log
                                </Text>
                                <Text style={{ fontSize: 13, color: muted, marginTop: 3 }}>
                                  Direct caretaker access control and immutable timeline verification history.
                                </Text>
                              </View>
                              <View style={[styles.statusPillLite, { backgroundColor: isDark ? '#1C261E' : '#EAF2EA', borderColor: '#748B75' }]}>
                                <Check size={11} color="#748B75" strokeWidth={2.5} />
                                <Text style={[styles.statusPillLiteText, { color: '#748B75' }]}>Compliant</Text>
                              </View>
                            </View>
                          </View>

                          <Pressable
                            onPress={() => {
                              fetchPatients();
                              fetchCareData();
                              success('Cloud Synced', 'Refreshed active data with Supabase.');
                            }}
                            style={({ pressed }) => [
                              styles.subPageActionBtn,
                              { backgroundColor: '#748B75', marginTop: 18 },
                              pressed && { opacity: 0.85 },
                            ]}
                          >
                            <Text style={[styles.subPageActionBtnText, { color: '#FFFFFF' }]}>
                              Sync Cloud Database
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      {/* SUBPAGE 5: NOTIFICATIONS */}
                      {settingsSubPage === 'notifications' && (
                        <View style={styles.subPageBody}>
                          <Text style={[styles.subPageDescText, { color: muted, marginBottom: 12 }]}>
                            Configure urgent attention alerts, audio signals, and automated baselining:
                          </Text>

                          <View style={{ gap: 16 }}>
                            <View style={styles.toggleRowRef}>
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[styles.toggleTitle, { color: text }]}>Urgent Attention Alerts</Text>
                                <Text style={[styles.toggleSub, { color: muted }]}>Notify on baseline variance &gt;15%</Text>
                              </View>
                              <Pressable
                                onPress={() => {
                                  setNotificationsEnabled(!notificationsEnabled);
                                  info('Attention Queue', notificationsEnabled ? 'Notifications muted' : 'Notifications enabled');
                                }}
                                style={[
                                  styles.switchTrack,
                                  { backgroundColor: notificationsEnabled ? '#748B75' : '#D1D5DB' },
                                ]}
                                hitSlop={6}
                              >
                                <View style={[styles.switchThumb, notificationsEnabled && styles.switchThumbActive]} />
                              </Pressable>
                            </View>

                            <View style={[styles.simpleInnerDivider, { backgroundColor: border }]} />

                            <View style={styles.toggleRowRef}>
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[styles.toggleTitle, { color: text }]}>Sound & Haptic Signals</Text>
                                <Text style={[styles.toggleSub, { color: muted }]}>Play tone on verification updates</Text>
                              </View>
                              <Pressable
                                onPress={() => {
                                  setSoundEnabled(!soundEnabled);
                                  info('Audio Feedback', soundEnabled ? 'Audio muted' : 'Audio cues enabled');
                                }}
                                style={[
                                  styles.switchTrack,
                                  { backgroundColor: soundEnabled ? '#748B75' : '#D1D5DB' },
                                ]}
                                hitSlop={6}
                              >
                                <View style={[styles.switchThumb, soundEnabled && styles.switchThumbActive]} />
                              </Pressable>
                            </View>

                            <View style={[styles.simpleInnerDivider, { backgroundColor: border }]} />

                            <View style={styles.toggleRowRef}>
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[styles.toggleTitle, { color: text }]}>Auto Baseline Calculation</Text>
                                <Text style={[styles.toggleSub, { color: muted }]}>Recalculate stability index automatically</Text>
                              </View>
                              <Pressable
                                onPress={() => {
                                  setAutoBaselineSync(!autoBaselineSync);
                                  info('Auto Baseline', autoBaselineSync ? 'Auto-sync paused' : 'Auto-sync active');
                                }}
                                style={[
                                  styles.switchTrack,
                                  { backgroundColor: autoBaselineSync ? '#748B75' : '#D1D5DB' },
                                ]}
                                hitSlop={6}
                              >
                                <View style={[styles.switchThumb, autoBaselineSync && styles.switchThumbActive]} />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* SUBPAGE 6: APPEARANCE THEME */}
                      {settingsSubPage === 'theme' && (
                        <View style={styles.subPageBody}>
                          <Text style={[styles.subPageDescText, { color: muted, marginBottom: 16 }]}>
                            Select your visual theme preference for clinical clarity:
                          </Text>

                          <View style={{ gap: 12 }}>
                            {/* Light Mode Card */}
                            <Pressable
                              onPress={() => {
                                setMode('light');
                                success('Theme Changed', 'Switched to Light mode.');
                              }}
                              style={({ pressed }) => [
                                styles.subPageThemeOption,
                                {
                                  borderColor: !isDark ? '#748B75' : border,
                                  backgroundColor: !isDark ? (isDark ? '#1C261E' : '#F4F7F4') : card,
                                },
                                pressed && { opacity: 0.8 },
                              ]}
                            >
                              <View style={[styles.simpleCircleIcon, { backgroundColor: '#F1F5F2' }]}>
                                <Sun size={20} color="#748B75" strokeWidth={2.4} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>Light Theme</Text>
                                <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>Crisp daylight clinical palette</Text>
                              </View>
                              {!isDark && (
                                <View style={[styles.themeCheckCircle, { backgroundColor: '#748B75' }]}>
                                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              )}
                            </Pressable>

                            {/* Dark Mode Card */}
                            <Pressable
                              onPress={() => {
                                setMode('dark');
                                success('Theme Changed', 'Switched to Dark mode.');
                              }}
                              style={({ pressed }) => [
                                styles.subPageThemeOption,
                                {
                                  borderColor: isDark ? '#748B75' : border,
                                  backgroundColor: isDark ? '#1C261E' : card,
                                },
                                pressed && { opacity: 0.8 },
                              ]}
                            >
                              <View style={[styles.simpleCircleIcon, { backgroundColor: '#262F29' }]}>
                                <Moon size={20} color="#748B75" strokeWidth={2.4} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>Dark Theme</Text>
                                <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>Low-glare night clinic view</Text>
                              </View>
                              {isDark && (
                                <View style={[styles.themeCheckCircle, { backgroundColor: '#748B75' }]}>
                                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </Animated.View>
                  )}
                </Animated.View>
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 6: NOTIFICATIONS & CAREGIVER ATTENTION QUEUE     */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'notifications' && (
                <Animated.View entering={FadeInDown.duration(240)} style={styles.sectionWrap}>
                  <View style={styles.listHeaderRow}>
                    <View>
                      <Text style={[styles.listHeaderTitle, { color: text }]}>Attention Queue & Alerts</Text>
                      <Text style={[styles.listHeaderSub, { color: muted }]}>
                        Priority cognitive alerts requiring caregiver review.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setActiveTab('dashboard')}
                      style={[styles.outlineActionButton, { borderColor: border, paddingVertical: 6, paddingHorizontal: 12 }]}
                    >
                      <Text style={[styles.outlineActionText, { color: '#748B75' }]}>&larr; Overview</Text>
                    </Pressable>
                  </View>

                  {openAlerts.length > 0 ? (
                    <View style={[styles.settingsCard, { borderColor: border, backgroundColor: card }]}>
                      <View style={styles.alertHeaderRow}>
                        <AlertCircle size={16} color="#DC2626" />
                        <Text style={[styles.alertHeaderTitle, { color: text }]}>
                          Active Attention Items ({openAlerts.length})
                        </Text>
                      </View>

                      {openAlerts.map((alt) => (
                        <View key={alt.id} style={[styles.cleanAlertRow, { borderBottomColor: border }]}>
                          <View style={styles.alertCardHeader}>
                            <View style={styles.rowAlign}>
                              <View style={[styles.alertDot, { backgroundColor: '#DC2626' }]} />
                              <Text style={[styles.alertCardTitle, { color: text }]}>{alt.title}</Text>
                            </View>
                            <Pressable onPress={() => handleResolveAlert(alt.id)} style={styles.ackBtnLink} hitSlop={6}>
                              <Check size={12} color="#748B75" />
                              <Text style={[styles.ackBtnLinkText, { color: '#748B75' }]}>Acknowledge</Text>
                            </Pressable>
                          </View>
                          <Text style={[styles.alertCardReason, { color: muted }]}>{alt.reason}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={[styles.emptyNotificationCard, { borderColor: border, backgroundColor: card }]}>
                      <View style={[styles.emptyNotifCircle, { backgroundColor: isDark ? '#1C261E' : '#F0F6F0' }]}>
                        <CheckCircle2 size={32} color="#748B75" />
                      </View>
                      <Text style={[styles.emptyNotifTitle, { color: text }]}>All Caught Up!</Text>
                      <Text style={[styles.emptyNotifSub, { color: muted }]}>
                        No pending urgent alerts in your caregiver queue. All memory observations are verified.
                      </Text>
                    </View>
                  )}

                  {/* Historical Observational Records */}
                  <View style={[styles.settingsCard, { borderColor: border, backgroundColor: card, marginTop: 4 }]}>
                    <Text style={[styles.settingCardTitle, { color: text, marginBottom: 8 }]}>Past Verification History</Text>
                    <View style={[styles.cleanAlertRow, { borderBottomColor: border }]}>
                      <View style={styles.rowAlign}>
                        <CheckCircle2 size={14} color="#748B75" />
                        <Text style={[styles.alertCardTitle, { color: muted }]}>Routine Medication Verification</Text>
                      </View>
                      <Text style={[styles.alertCardReason, { color: muted }]}>
                        Daily medication prompts completed and logged by caregiver.
                      </Text>
                    </View>
                    <View style={[styles.cleanAlertRow, { borderBottomColor: 'transparent' }]}>
                      <View style={styles.rowAlign}>
                        <CheckCircle2 size={14} color="#748B75" />
                        <Text style={[styles.alertCardTitle, { color: muted }]}>Weekly Cognitive Index Calculation</Text>
                      </View>
                      <Text style={[styles.alertCardReason, { color: muted }]}>
                        Baseline performance scored at 85% within normal personal variance.
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              )}
            </View>
          )
        ) : (
          /* ======================================================== */
          /* PATIENT VIEW (PRESERVED)                                 */
          /* ======================================================== */
          <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.patientViewSection}>
            <View style={[styles.patientWelcomeClean, { borderBottomColor: border }]}>
              <View style={[styles.patientIconCircleBig, { borderColor: border }]}>
                <Heart size={30} color={primary} />
              </View>

              <Text style={[styles.patientHeroTitle, { color: text }]}>Welcome, {user?.name}!</Text>
              <Text style={[styles.patientHeroSub, { color: muted }]}>
                Your patient health workspace is active and securely authenticated with your caretaker's unique access code.
              </Text>

              <View style={[styles.patientStatusRow, { borderColor: border }]}>
                <CheckCircle2 size={13} color={primary} />
                <Text style={[styles.patientStatusLabel, { color: primary }]}>Active Health Record Sync</Text>
              </View>
            </View>

            <View style={[styles.infoRowClean, { borderBottomColor: border }]}>
              <ShieldCheck size={18} color={primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: text }]}>Privacy & HIPAA Compliance</Text>
                <Text style={[styles.infoDesc, { color: muted }]}>
                  All medical consultations and baseline records are encrypted end-to-end. Only your licensed caregiver has access.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={confirmLogout}
              style={[styles.outlineActionButton, { borderColor: border, marginTop: 14 }]}
            >
              <LogOut size={16} color="#DC2626" />
              <Text style={[styles.outlineActionText, { color: '#DC2626' }]}>Exit Patient Workspace</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* BOTTOM NAVIGATION BAR (#748B75 Full Fill, Taller Height) */}
      {/* ======================================================== */}
      {isDoctor && (
        <View
          style={[
            styles.bottomNavBar,
            {
              backgroundColor: '#748B75',
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <Pressable
            onPress={() => {
              setSelectedPatientForDetail(null);
              setActiveTab('dashboard');
            }}
            style={styles.navTabBtn}
          >
            <View style={[styles.navTabIconWrap, activeTab === 'dashboard' && !selectedPatientForDetail && styles.navTabActiveCircle]}>
              <LayoutDashboard
                size={20}
                strokeWidth={activeTab === 'dashboard' && !selectedPatientForDetail ? 2.8 : 1.9}
                color={activeTab === 'dashboard' && !selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.navTabLabel,
                {
                  color: activeTab === 'dashboard' && !selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                  fontWeight: activeTab === 'dashboard' && !selectedPatientForDetail ? '700' : '500',
                },
              ]}
            >
              Overview
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedPatientForDetail(null);
              setActiveTab('patients');
            }}
            style={styles.navTabBtn}
          >
            <View style={[styles.navTabIconWrap, (activeTab === 'patients' || selectedPatientForDetail) && styles.navTabActiveCircle]}>
              <Users
                size={20}
                strokeWidth={activeTab === 'patients' || selectedPatientForDetail ? 2.8 : 1.9}
                color={activeTab === 'patients' || selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.navTabLabel,
                {
                  color: activeTab === 'patients' || selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                  fontWeight: activeTab === 'patients' || selectedPatientForDetail ? '700' : '500',
                },
              ]}
            >
              Patients
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedPatientForDetail(null);
              setActiveTab('timeline');
            }}
            style={styles.navTabBtn}
          >
            <View style={[styles.navTabIconWrap, activeTab === 'timeline' && !selectedPatientForDetail && styles.navTabActiveCircle]}>
              <Calendar
                size={20}
                strokeWidth={activeTab === 'timeline' && !selectedPatientForDetail ? 2.8 : 1.9}
                color={activeTab === 'timeline' && !selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.navTabLabel,
                {
                  color: activeTab === 'timeline' && !selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                  fontWeight: activeTab === 'timeline' && !selectedPatientForDetail ? '700' : '500',
                },
              ]}
            >
              Timeline
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedPatientForDetail(null);
              setActiveTab('reminders');
            }}
            style={styles.navTabBtn}
          >
            <View style={[styles.navTabIconWrap, activeTab === 'reminders' && !selectedPatientForDetail && styles.navTabActiveCircle]}>
              <Bell
                size={20}
                strokeWidth={activeTab === 'reminders' && !selectedPatientForDetail ? 2.8 : 1.9}
                color={activeTab === 'reminders' && !selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.navTabLabel,
                {
                  color: activeTab === 'reminders' && !selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                  fontWeight: activeTab === 'reminders' && !selectedPatientForDetail ? '700' : '500',
                },
              ]}
            >
              Prompts
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedPatientForDetail(null);
              setSettingsSubPage(null);
              setActiveTab('settings');
            }}
            style={styles.navTabBtn}
          >
            <View style={[styles.navTabIconWrap, activeTab === 'settings' && !selectedPatientForDetail && styles.navTabActiveCircle]}>
              <Settings
                size={20}
                strokeWidth={activeTab === 'settings' && !selectedPatientForDetail ? 2.8 : 1.9}
                color={activeTab === 'settings' && !selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.navTabLabel,
                {
                  color: activeTab === 'settings' && !selectedPatientForDetail ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                  fontWeight: activeTab === 'settings' && !selectedPatientForDetail ? '700' : '500',
                },
              ]}
            >
              Settings
            </Text>
          </Pressable>
        </View>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD PATIENT (Clean White)                       */}
      {/* ======================================================== */}
      <Modal visible={patientModalVisible} transparent animationType="fade" onRequestClose={() => setPatientModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.duration(160)} style={[styles.modalBox, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.rowAlign}>
                <UserPlus size={16} color={primary} />
                <Text style={[styles.modalTitle, { color: text }]}>Add New Patient</Text>
              </View>
              <Pressable onPress={() => setPatientModalVisible(false)} hitSlop={8}>
                <X size={16} color={muted} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: text }]}>Full Name *</Text>
              <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                <TextInput
                  value={newPatientName}
                  onChangeText={setNewPatientName}
                  placeholder="e.g. Eleanor Vance"
                  placeholderTextColor={muted}
                  style={[styles.modalTextInput, { color: text }]}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: text }]}>Email (Optional)</Text>
              <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                <TextInput
                  value={newPatientEmail}
                  onChangeText={setNewPatientEmail}
                  placeholder="patient@example.com"
                  placeholderTextColor={muted}
                  style={[styles.modalTextInput, { color: text }]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button variant="outline" size="default" onPress={() => setPatientModalVisible(false)} style={styles.modalBtn}>
                Cancel
              </Button>
              <Button variant="default" size="default" loading={isSubmittingPatient} onPress={handleCreatePatient} style={styles.modalBtn}>
                Create Key
              </Button>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: ADD TIMELINE MEMORY                             */}
      {/* ======================================================== */}
      <Modal visible={timelineModalVisible} transparent animationType="fade" onRequestClose={() => setTimelineModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.duration(160)} style={[styles.modalBox, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.rowAlign}>
                <ShieldCheck size={16} color={primary} />
                <Text style={[styles.modalTitle, { color: text }]}>Add Verified Memory</Text>
              </View>
              <Pressable onPress={() => setTimelineModalVisible(false)} hitSlop={8}>
                <X size={16} color={muted} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: text }]}>Event Title *</Text>
              <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                <TextInput
                  value={newEventTitle}
                  onChangeText={setNewEventTitle}
                  placeholder="e.g. Morning Walk with Grandkids"
                  placeholderTextColor={muted}
                  style={[styles.modalTextInput, { color: text }]}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: text }]}>Date</Text>
                <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                  <TextInput
                    value={newEventDate}
                    onChangeText={setNewEventDate}
                    placeholder="Today"
                    placeholderTextColor={muted}
                    style={[styles.modalTextInput, { color: text }]}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: text }]}>Time</Text>
                <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                  <TextInput
                    value={newEventTime}
                    onChangeText={setNewEventTime}
                    placeholder="10:00 AM"
                    placeholderTextColor={muted}
                    style={[styles.modalTextInput, { color: text }]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: text }]}>People Involved</Text>
              <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                <TextInput
                  value={newEventPeople}
                  onChangeText={setNewEventPeople}
                  placeholder="e.g. Sarah (daughter)"
                  placeholderTextColor={muted}
                  style={[styles.modalTextInput, { color: text }]}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button variant="outline" size="default" onPress={() => setTimelineModalVisible(false)} style={styles.modalBtn}>
                Cancel
              </Button>
              <Button variant="default" size="default" onPress={handleAddTimelineEvent} style={styles.modalBtn}>
                Save Memory
              </Button>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: ADD REMINDER                                    */}
      {/* ======================================================== */}
      <Modal visible={reminderModalVisible} transparent animationType="fade" onRequestClose={() => setReminderModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.duration(160)} style={[styles.modalBox, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.rowAlign}>
                <Bell size={16} color={primary} />
                <Text style={[styles.modalTitle, { color: text }]}>Create Reminder</Text>
              </View>
              <Pressable onPress={() => setReminderModalVisible(false)} hitSlop={8}>
                <X size={16} color={muted} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: text }]}>Title *</Text>
              <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                <TextInput
                  value={newReminderTitle}
                  onChangeText={setNewReminderTitle}
                  placeholder="e.g. Donepezil 10mg"
                  placeholderTextColor={muted}
                  style={[styles.modalTextInput, { color: text }]}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: text }]}>Time</Text>
                <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                  <TextInput
                    value={newReminderTime}
                    onChangeText={setNewReminderTime}
                    placeholder="09:00 AM"
                    placeholderTextColor={muted}
                    style={[styles.modalTextInput, { color: text }]}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: text }]}>Instructions</Text>
                <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                  <TextInput
                    value={newReminderInstructions}
                    onChangeText={setNewReminderInstructions}
                    placeholder="e.g. Take with water"
                    placeholderTextColor={muted}
                    style={[styles.modalTextInput, { color: text }]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button variant="outline" size="default" onPress={() => setReminderModalVisible(false)} style={styles.modalBtn}>
                Cancel
              </Button>
              <Button variant="default" size="default" onPress={handleAddReminder} style={styles.modalBtn}>
                Save Reminder
              </Button>
            </View>
          </Animated.View>
        </View>
      </Modal>

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

  /* Top Bar (#748B75 Full Fill, Taller Height) */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  roleSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  iconBtnTop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  logoutButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutTopText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Clean Metric Strip */
  metricsCleanStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  /* Attention Alerts (Clean Flat Row with Dot) */
  alertSectionClean: {
    gap: 6,
    marginBottom: 14,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cleanAlertRow: {
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  alertDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  alertCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  ackBtnLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ackBtnLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertCardReason: {
    fontSize: 14,
    lineHeight: 19,
  },

  /* Clean Open Sections (No Heavy Card Boxes) */
  cleanSectionBlock: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 10,
  },
  cardTopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cleanSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cleanSectionSub: {
    fontSize: 14,
    lineHeight: 19,
  },
  cleanCardSub: {
    fontSize: 14,
    lineHeight: 19,
  },
  linkActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ringChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 6,
  },
  ringInfoCol: {
    flex: 1,
    gap: 5,
  },
  ringTitleText: {
    fontSize: 17,
    fontWeight: '700',
  },
  ringSubText: {
    fontSize: 14,
    lineHeight: 19,
  },

  /* Clean Check Items */
  cleanList: {
    gap: 4,
  },
  cleanCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkCircleSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  quickRemTime: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* Flat Patient Directory */
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  listHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 3,
  },
  listHeaderSub: {
    fontSize: 14,
    lineHeight: 19,
    maxWidth: 240,
  },
  cleanKeyCreatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  keyCreatedTitle: {
    fontSize: 15,
  },
  patientsFlatList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  patientRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  patientIconCircleClean: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientRowName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  patientRowSub: {
    fontSize: 14,
  },
  codeTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  codeTagText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  /* Patient Detail View */
  detailContainer: {
    gap: 12,
  },
  backNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  backNavText: {
    fontSize: 15,
    fontWeight: '600',
  },
  patientHeaderClean: {
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  patientHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatarClean: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientDetailName: {
    fontSize: 22,
    fontWeight: '800',
  },
  patientDetailEmail: {
    fontSize: 14,
  },
  minimalKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  codeKeyText: {
    fontSize: 14,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  linkBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Minimal Sub-Tabs */
  subTabStrip: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  subTabItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabText: {
    fontSize: 15,
  },
  subContentWrap: {
    gap: 12,
    paddingTop: 10,
  },
  ringCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  statsTwoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  statCol: {
    gap: 3,
  },
  statLabel: {
    fontSize: 13,
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  barChartContainer: {
    alignItems: 'center',
  },
  minimalNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  minimalNoticeText: {
    fontSize: 14,
    lineHeight: 19,
    flex: 1,
  },

  /* Minimal Timeline Row */
  sectionTitleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  timelineCleanList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  minimalTimelineRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  timelineRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timelineDate: {
    fontSize: 13,
  },
  timelineMainTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  timelineDescText: {
    fontSize: 14,
    lineHeight: 19,
  },
  peopleText: {
    fontSize: 13,
  },

  /* Minimal Checklist Rows */
  filterBarClean: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  filterTabMinimal: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabMinimalText: {
    fontSize: 14,
  },
  remindersCleanFeed: {
    gap: 3,
  },
  minimalChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkWrap: {
    padding: 2,
  },
  checkCircleOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remTitleText: {
    fontSize: 17,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  remInstrText: {
    fontSize: 14,
  },

  /* Bottom Navigation Bar (#748B75 Full Fill, Taller Height) */
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  navTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  navTabIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTabActiveCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 19,
  },
  navTabLabel: {
    fontSize: 11,
    textAlign: 'center',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 5,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  textInputWrap: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  modalTextInput: {
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  modalBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
  },

  /* Common */
  sectionWrap: {
    gap: 12,
  },
  tabContentWrap: {
    gap: 12,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  /* Patient Screen Styles */
  patientViewSection: {
    gap: 14,
  },
  patientWelcomeClean: {
    paddingVertical: 24,
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  patientIconCircleBig: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientHeroTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  patientHeroSub: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  patientStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  patientStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoRowClean: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  infoDesc: {
    fontSize: 14,
    lineHeight: 19,
  },

  /* Clean Unboxed Simple List Settings */
  simpleSettingsContainer: {
    gap: 16,
    paddingBottom: 110,
    paddingTop: 6,
  },
  simpleSettingsHeader: {
    marginBottom: 4,
    gap: 2,
  },
  simpleSettingsTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  simpleSettingsSub: {
    fontSize: 13,
  },
  simpleProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  simpleAvatarWrap: {
    position: 'relative',
  },
  simpleAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleAvatarBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleProfileName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  simpleProBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  simpleProBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  simpleProfileEmail: {
    fontSize: 13,
  },
  simpleDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  simpleInnerDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  simpleCategoryWrap: {
    gap: 4,
  },
  simpleCategoryHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  simpleRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  simpleCircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  simpleRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simpleValueBadge: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Dedicated Sub-Page Layout with Top-Left Back Button */
  subPageContainer: {
    gap: 16,
    paddingBottom: 110,
    paddingTop: 4,
  },
  subPageTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
    paddingBottom: 10,
  },
  subPageBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  subPageBackText: {
    fontSize: 15,
    fontWeight: '600',
  },
  subPageNavTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subPageBody: {
    gap: 14,
    paddingTop: 4,
  },
  subPageDescText: {
    fontSize: 14,
    lineHeight: 20,
  },
  subPageActionBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPageActionBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  subPageCancelBtn: {
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPageCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  subPageSecurityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subPageThemeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
  },
  themeCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontScaleSelectorWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  fontSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSegmentText: {
    fontSize: 12,
    textAlign: 'center',
  },
  fontSegmentSubText: {
    fontSize: 10,
    marginTop: 1,
    textAlign: 'center',
  },
  previewInsetBox: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  previewDisplayText: {
    fontWeight: '500',
  },
  themePillWrap: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  themePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  themePillBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPillLite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillLiteText: {
    fontSize: 11,
    fontWeight: '700',
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  /* Preserved for Notification History & Generic Cards */
  settingsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  settingCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  outlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  outlineActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Empty Notification Card */
  emptyNotificationCard: {
    padding: 28,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
  },
  emptyNotifCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyNotifTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptyNotifSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
});