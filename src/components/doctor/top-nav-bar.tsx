import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Stethoscope, UserCheck, Bell } from 'lucide-react-native';
import { CurrentSessionUser } from '@/lib/supabase';
import { DoctorTab, formatDoctorName } from './doctor-types';

type DoctorTopBarProps = {
  user: CurrentSessionUser | null;
  isDoctor: boolean;
  activeTab: DoctorTab;
  openAlertsCount: number;
  insetsTop: number;
  onProfilePress: () => void;
  onNotificationPress: () => void;
};

export function DoctorTopBar({
  user,
  isDoctor,
  activeTab,
  openAlertsCount,
  insetsTop,
  onProfilePress,
  onNotificationPress,
}: DoctorTopBarProps) {
  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor: '#748B75',
          paddingTop: Math.max(insetsTop, 12) + 6,
          paddingBottom: 16,
          borderBottomColor: 'rgba(0,0,0,0.08)',
        },
      ]}
    >
      <Pressable onPress={onProfilePress} style={styles.topProfileInfo}>
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
            onPress={onNotificationPress}
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
            {openAlertsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{openAlertsCount}</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
