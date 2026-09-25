import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Bell,
  Settings,
} from 'lucide-react-native';
import { DoctorTab } from './doctor-types';

type DoctorBottomNavBarProps = {
  activeTab: DoctorTab;
  hasSelectedPatient: boolean;
  onSelectTab: (tab: DoctorTab) => void;
  insetsBottom: number;
};

export function DoctorBottomNavBar({
  activeTab,
  hasSelectedPatient,
  onSelectTab,
  insetsBottom,
}: DoctorBottomNavBarProps) {
  const isTabActive = (tab: DoctorTab) => {
    if (tab === 'patients') {
      return activeTab === 'patients' || hasSelectedPatient;
    }
    return activeTab === tab && !hasSelectedPatient;
  };

  return (
    <View
      style={[
        styles.bottomNavBar,
        {
          backgroundColor: '#748B75',
          paddingTop: 12,
          paddingBottom: Math.max(insetsBottom, 16),
        },
      ]}
    >
      {/* 1: Overview */}
      <Pressable onPress={() => onSelectTab('dashboard')} style={styles.navTabBtn}>
        <View style={[styles.navTabIconWrap, isTabActive('dashboard') && styles.navTabActiveCircle]}>
          <LayoutDashboard
            size={20}
            strokeWidth={isTabActive('dashboard') ? 2.8 : 1.9}
            color={isTabActive('dashboard') ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color: isTabActive('dashboard') ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
              fontWeight: isTabActive('dashboard') ? '700' : '500',
            },
          ]}
        >
          Overview
        </Text>
      </Pressable>

      {/* 2: Patients */}
      <Pressable onPress={() => onSelectTab('patients')} style={styles.navTabBtn}>
        <View style={[styles.navTabIconWrap, isTabActive('patients') && styles.navTabActiveCircle]}>
          <Users
            size={20}
            strokeWidth={isTabActive('patients') ? 2.8 : 1.9}
            color={isTabActive('patients') ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color: isTabActive('patients') ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
              fontWeight: isTabActive('patients') ? '700' : '500',
            },
          ]}
        >
          Patients
        </Text>
      </Pressable>

      {/* 3: Timeline */}
      <Pressable onPress={() => onSelectTab('timeline')} style={styles.navTabBtn}>
        <View style={[styles.navTabIconWrap, isTabActive('timeline') && styles.navTabActiveCircle]}>
          <Calendar
            size={20}
            strokeWidth={isTabActive('timeline') ? 2.8 : 1.9}
            color={isTabActive('timeline') ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color: isTabActive('timeline') ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
              fontWeight: isTabActive('timeline') ? '700' : '500',
            },
          ]}
        >
          Timeline
        </Text>
      </Pressable>

      {/* 4: Prompts */}
      <Pressable onPress={() => onSelectTab('reminders')} style={styles.navTabBtn}>
        <View style={[styles.navTabIconWrap, isTabActive('reminders') && styles.navTabActiveCircle]}>
          <Bell
            size={20}
            strokeWidth={isTabActive('reminders') ? 2.8 : 1.9}
            color={isTabActive('reminders') ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color: isTabActive('reminders') ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
              fontWeight: isTabActive('reminders') ? '700' : '500',
            },
          ]}
        >
          Prompts
        </Text>
      </Pressable>

      {/* 5: Settings */}
      <Pressable onPress={() => onSelectTab('settings')} style={styles.navTabBtn}>
        <View style={[styles.navTabIconWrap, isTabActive('settings') && styles.navTabActiveCircle]}>
          <Settings
            size={20}
            strokeWidth={isTabActive('settings') ? 2.8 : 1.9}
            color={isTabActive('settings') ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color: isTabActive('settings') ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
              fontWeight: isTabActive('settings') ? '700' : '500',
            },
          ]}
        >
          Settings
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
