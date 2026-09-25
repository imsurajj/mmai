import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { useColor } from '@/hooks/useColor';
import { CareReminder } from '@/lib/caregiver-service';

type PatientRemindersTabProps = {
  reminders: CareReminder[];
  onToggleReminder: (reminder: CareReminder) => void;
};

export function PatientRemindersTab({
  reminders,
  onToggleReminder,
}: PatientRemindersTabProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');

  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const activeReminders = reminders.filter((r) => r.status === 'active');
  const completedReminders = reminders.filter((r) => r.status === 'completed');

  const displayedReminders =
    filter === 'all'
      ? reminders
      : filter === 'active'
      ? activeReminders
      : completedReminders;

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={[styles.headerTitle, { color: text }]}>My Daily Routines</Text>
        <Text style={[styles.headerSub, { color: muted }]}>
          Medications, meals, and prompts scheduled by your caregiver.
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { borderBottomColor: border }]}>
        {(['all', 'active', 'completed'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterTab,
              filter === f && { borderBottomColor: primary },
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                {
                  color: filter === f ? primary : muted,
                  fontWeight: filter === f ? '700' : '500',
                },
              ]}
            >
              {f.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.remindersFeed}>
        {displayedReminders.map((rem) => {
          const isDone = rem.status === 'completed';
          return (
            <View key={rem.id} style={[styles.checkRow, { borderBottomColor: border }]}>
              <Pressable onPress={() => onToggleReminder(rem)} hitSlop={8}>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: isDone ? primary : border,
                      backgroundColor: isDone ? primary : 'transparent',
                    },
                  ]}
                >
                  {isDone && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </Pressable>

              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.remTitle,
                      {
                        color: text,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {rem.title}
                  </Text>
                  <Text style={[styles.remTime, { color: primary }]}>{rem.scheduled_time}</Text>
                </View>
                {rem.instructions ? (
                  <Text style={[styles.remInstr, { color: muted }]}>{rem.instructions}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerBlock: {
    gap: 3,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 14,
    lineHeight: 20,
  },
  filterBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabText: {
    fontSize: 13,
  },
  remindersFeed: {
    gap: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  remTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  remTime: {
    fontSize: 13,
    fontWeight: '700',
  },
  remInstr: {
    fontSize: 13,
    marginTop: 2,
  },
});
