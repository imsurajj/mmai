import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, Check, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { useColor } from '@/hooks/useColor';
import { CareReminder } from '@/lib/caregiver-service';
import { ReminderFilter } from './doctor-types';

type RemindersTabProps = {
  reminders: CareReminder[];
  reminderFilter: ReminderFilter;
  setReminderFilter: (filter: ReminderFilter) => void;
  onOpenAddReminder: () => void;
  onToggleReminder: (reminder: CareReminder) => void;
  onDeleteReminder: (id: string) => void;
};

export function RemindersTab({
  reminders,
  reminderFilter,
  setReminderFilter,
  onOpenAddReminder,
  onToggleReminder,
  onDeleteReminder,
}: RemindersTabProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');

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

  return (
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
          onPress={onOpenAddReminder}
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
            <Pressable onPress={() => onToggleReminder(rem)} hitSlop={6} style={styles.checkWrap}>
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

            <Pressable onPress={() => onDeleteReminder(rem.id)} hitSlop={6}>
              <Trash2 size={13} color={muted} />
            </Pressable>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    gap: 4,
  },
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
    fontSize: 16,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  remInstrText: {
    fontSize: 13,
    marginTop: 2,
  },
});
