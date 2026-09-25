import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Heart,
  Sparkles,
} from 'lucide-react-native';
import { useColor } from '@/hooks/useColor';
import { useModeToggle } from '@/hooks/useModeToggle';
import { CurrentSessionUser } from '@/lib/supabase';

import { useChip } from '@/components/ui/bottom-chip';

type PatientSettingsTabProps = {
  user: CurrentSessionUser | null;
  onConfirmLogout: () => void;
};

export function PatientSettingsTab({
  user,
  onConfirmLogout,
}: PatientSettingsTabProps) {
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const border = useColor('border');
  const primary = useColor('primary');
  const { isDark, toggleMode } = useModeToggle();
  const { showChip } = useChip();

  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={[styles.headerTitle, { color: text }]}>Settings</Text>
        <Text style={[styles.headerSub, { color: muted }]}>
          Your health profile and workspace preferences
        </Text>
      </View>

      {/* Profile Row */}
      <View style={styles.profileRow}>
        <View style={[styles.avatarCircle, { backgroundColor: primary }]}>
          <Heart size={24} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.profileName, { color: text }]}>{user?.name || 'Patient'}</Text>
          <Text style={[styles.profileSub, { color: muted }]}>
            {user?.email || 'Caregiver Linked Access'}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Category: Caregiver Connection */}
      <View style={styles.categoryWrap}>
        <Text style={[styles.categoryHeading, { color: muted }]}>CARE NETWORK</Text>

        <View style={styles.rowItem}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#262F29' : '#F1F5F2' }]}>
            <ShieldCheck size={18} color="#748B75" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: text }]}>Caregiver Sync</Text>
            <Text style={[styles.rowSub, { color: muted }]}>
              Linked with Dr. Suraj (Neurology)
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: isDark ? '#1C261E' : '#EAF2EA', borderColor: '#748B75' }]}>
            <Text style={[styles.statusPillText, { color: '#748B75' }]}>Active</Text>
          </View>
        </View>

        <View style={styles.rowItem}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#262F29' : '#F1F5F2' }]}>
            <Sparkles size={18} color="#748B75" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: text }]}>Cognitive Voice Assistant</Text>
            <Text style={[styles.rowSub, { color: muted }]}>
              ElevenLabs + Gemini Dynamic Model
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: isDark ? '#1C261E' : '#EAF2EA', borderColor: '#748B75' }]}>
            <Text style={[styles.statusPillText, { color: '#748B75' }]}>Ready</Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Category: Preferences */}
      <View style={styles.categoryWrap}>
        <Text style={[styles.categoryHeading, { color: muted }]}>PREFERENCES</Text>

        <Pressable
          onPress={() => {
            toggleMode();
            showChip(!isDark ? 'Dark Theme enabled' : 'Light Theme enabled');
          }}
          style={({ pressed }) => [styles.rowItem, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#262F29' : '#F1F5F2' }]}>
            {isDark ? <Moon size={18} color="#748B75" strokeWidth={2.2} /> : <Sun size={18} color="#748B75" strokeWidth={2.2} />}
          </View>
          <Text style={[styles.rowLabel, { color: text }]}>Theme Mode</Text>
          <Text style={[styles.valueBadge, { color: muted }]}>
            {isDark ? 'Dark Theme' : 'Light Theme'}
          </Text>
          <ChevronRight size={18} color={muted} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Category: Account Actions */}
      <View style={styles.categoryWrap}>
        <Text style={[styles.categoryHeading, { color: muted }]}>WORKSPACE ACTIONS</Text>

        <Pressable
          onPress={onConfirmLogout}
          style={({ pressed }) => [styles.rowItem, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
            <LogOut size={18} color="#EF4444" strokeWidth={2.2} />
          </View>
          <Text style={[styles.rowLabel, { color: '#DC2626' }]}>Exit Patient Workspace</Text>
          <ChevronRight size={18} color="#DC2626" strokeWidth={2.2} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 110,
    paddingTop: 6,
  },
  headerBlock: {
    gap: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 13,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
  },
  profileSub: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  categoryWrap: {
    gap: 4,
  },
  categoryHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  valueBadge: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
});
