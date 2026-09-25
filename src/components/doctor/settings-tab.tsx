import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  Stethoscope,
  Camera,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  RefreshCw,
  Settings,
  Lock,
  Bell,
  Sun,
  Moon,
  LogOut,
  Check,
  CheckCircle2,
} from 'lucide-react-native';
import { useColor } from '@/hooks/useColor';
import { useModeToggle } from '@/hooks/useModeToggle';
import { useToast } from '@/components/ui/toast';
import { useChip } from '@/components/ui/bottom-chip';
import { CurrentSessionUser } from '@/lib/supabase';
import { SettingsSubPage, formatDoctorName } from './doctor-types';

type SettingsTabProps = {
  user: CurrentSessionUser | null;
  onUpdateUser: (name: string, email: string) => void;
  settingsSubPage: SettingsSubPage;
  setSettingsSubPage: (page: SettingsSubPage) => void;
  fontScalePref: 'normal' | 'large' | 'xl';
  setFontScalePref: (scale: 'normal' | 'large' | 'xl') => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (val: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  autoBaselineSync: boolean;
  setAutoBaselineSync: (val: boolean) => void;
  onRestorePurchases: () => void;
  onSyncCloud: () => void;
  onConfirmLogout: () => void;
};

export function SettingsTab({
  user,
  onUpdateUser,
  settingsSubPage,
  setSettingsSubPage,
  fontScalePref,
  setFontScalePref,
  notificationsEnabled,
  setNotificationsEnabled,
  soundEnabled,
  setSoundEnabled,
  autoBaselineSync,
  setAutoBaselineSync,
  onRestorePurchases,
  onSyncCloud,
  onConfirmLogout,
}: SettingsTabProps) {
  const bg = useColor('background');
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const border = useColor('border');
  const { isDark, setMode } = useModeToggle();
  const { error } = useToast();
  const { showChip } = useChip();

  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editSpecialty, setEditSpecialty] = useState('Neurology & Cognitive Care');

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      error('Name Required', 'Please enter your full name.');
      return;
    }
    onUpdateUser(editName.trim(), editEmail.trim());
    setSettingsSubPage(null);
    showChip('Profile changes saved');
  };

  return (
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
              onPress={onRestorePurchases}
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
              onPress={onConfirmLogout}
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
                onPress={onRestorePurchases}
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
                        showChip(`Scale set to ${label} (${pct})`);
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
                onPress={onSyncCloud}
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
                      const next = !notificationsEnabled;
                      setNotificationsEnabled(next);
                      showChip(next ? 'Notifications enabled' : 'Notifications muted');
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
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      showChip(next ? 'Audio cues enabled' : 'Audio cues muted');
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
                      const next = !autoBaselineSync;
                      setAutoBaselineSync(next);
                      showChip(next ? 'Auto-sync active' : 'Auto-sync paused');
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
                    showChip('Switched to Light mode');
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
                    showChip('Switched to Dark mode');
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
  );
}

const styles = StyleSheet.create({
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
  inputGroup: {
    gap: 5,
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
  fontScaleSelectorWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
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
  toggleRowRef: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 13,
    marginTop: 2,
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
});
