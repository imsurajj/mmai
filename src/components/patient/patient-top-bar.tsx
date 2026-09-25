import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart, ShieldCheck } from 'lucide-react-native';
import { CurrentSessionUser } from '@/lib/supabase';

type PatientTopBarProps = {
  user: CurrentSessionUser | null;
  insetsTop: number;
};

export function PatientTopBar({ user, insetsTop }: PatientTopBarProps) {
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
      <View style={styles.topProfileInfo}>
        <View style={[styles.avatarCircle, { backgroundColor: '#FFFFFF' }]}>
          <Heart size={20} color="#748B75" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: '#FFFFFF' }]} numberOfLines={1}>
            {user?.name || 'Patient'}
          </Text>
          <Text style={[styles.roleSubtitle, { color: '#E4EFE4' }]} numberOfLines={1}>
            Patient Health Workspace
          </Text>
        </View>
      </View>

      <View style={styles.statusBadge}>
        <ShieldCheck size={13} color="#FFFFFF" />
        <Text style={styles.statusBadgeText}>Sync Active</Text>
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
