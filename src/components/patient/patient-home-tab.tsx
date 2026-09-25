import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Heart, Check, Clock, Calendar, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { useColor } from '@/hooks/useColor';
import { CareReminder, TimelineEvent, PersonalBaseline } from '@/lib/caregiver-service';
import { CurrentSessionUser } from '@/lib/supabase';

type PatientHomeTabProps = {
  user: CurrentSessionUser | null;
  baseline: PersonalBaseline | null;
  reminders: CareReminder[];
  timelineEvents: TimelineEvent[];
  onToggleReminder: (reminder: CareReminder) => void;
  onNavigateToTimeline: () => void;
  onNavigateToReminders: () => void;
};

export function PatientHomeTab({
  user,
  baseline,
  reminders,
  timelineEvents,
  onToggleReminder,
  onNavigateToTimeline,
  onNavigateToReminders,
}: PatientHomeTabProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');

  const todayReminders = reminders.slice(0, 4);
  const latestMemory = timelineEvents[0];

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.container}>
      {/* Welcome & Daily Health Sync Banner */}
      <View style={[styles.welcomeBlock, { borderBottomColor: border }]}>
        <View style={styles.welcomeTopRow}>
          <View style={[styles.avatarCircle, { borderColor: border }]}>
            <Heart size={24} color={primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.welcomeTitle, { color: text }]}>
              Hello, {user?.name || 'Friend'}!
            </Text>
            <Text style={[styles.welcomeSub, { color: muted }]}>
              Your health & memory support is active today.
            </Text>
          </View>
        </View>

        {/* Cognitive Baseline Score Status Strip */}
        <View style={[styles.stabilityStrip, { borderColor: border }]}>
          <ShieldCheck size={16} color={primary} />
          <Text style={[styles.stabilityText, { color: text }]}>
            Cognitive Stability Index:{' '}
            <Text style={{ color: primary, fontWeight: '800' }}>
              {baseline?.object_average || 85}%
            </Text>
          </Text>
        </View>
      </View>

      {/* Section 1: Today's Routine Prompts */}
      <View style={[styles.sectionBlock, { borderBottomColor: border }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.rowAlign}>
            <Clock size={16} color={primary} />
            <Text style={[styles.sectionTitle, { color: text }]}>Today's Routines</Text>
          </View>
          <Pressable onPress={onNavigateToReminders} hitSlop={8}>
            <Text style={[styles.linkActionText, { color: primary }]}>View all &rarr;</Text>
          </Pressable>
        </View>

        {todayReminders.length > 0 ? (
          <View style={styles.listWrap}>
            {todayReminders.map((r) => {
              const isDone = r.status === 'completed';
              return (
                <View key={r.id} style={[styles.checkItemRow, { borderBottomColor: border }]}>
                  <Pressable onPress={() => onToggleReminder(r)} hitSlop={6}>
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          borderColor: isDone ? primary : border,
                          backgroundColor: isDone ? primary : 'transparent',
                        },
                      ]}
                    >
                      {isDone && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </Pressable>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.remTitle,
                        {
                          color: text,
                          textDecorationLine: isDone ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {r.title}
                    </Text>
                    {r.instructions ? (
                      <Text style={[styles.remInstr, { color: muted }]}>{r.instructions}</Text>
                    ) : null}
                  </View>

                  <Text style={[styles.remTime, { color: primary }]}>{r.scheduled_time}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: muted }]}>No routine prompts scheduled for today.</Text>
        )}
      </View>

      {/* Section 2: Latest Verified Family Memory */}
      <View style={[styles.sectionBlock, { borderBottomColor: border }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.rowAlign}>
            <Calendar size={16} color={primary} />
            <Text style={[styles.sectionTitle, { color: text }]}>Recent Memory</Text>
          </View>
          <Pressable onPress={onNavigateToTimeline} hitSlop={8}>
            <Text style={[styles.linkActionText, { color: primary }]}>All Memories &rarr;</Text>
          </Pressable>
        </View>

        {latestMemory ? (
          <Pressable
            onPress={onNavigateToTimeline}
            style={({ pressed }) => [
              styles.memoryCard,
              { borderColor: border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={styles.memoryTopRow}>
              <View style={styles.rowAlign}>
                <ShieldCheck size={14} color={primary} />
                <Text style={[styles.verifiedTag, { color: primary }]}>Verified Memory</Text>
              </View>
              <Text style={[styles.memoryDate, { color: muted }]}>
                {latestMemory.event_date} {latestMemory.event_time ? `(${latestMemory.event_time})` : ''}
              </Text>
            </View>

            <Text style={[styles.memoryTitle, { color: text }]}>{latestMemory.title}</Text>

            {latestMemory.description ? (
              <Text style={[styles.memoryDesc, { color: muted }]}>{latestMemory.description}</Text>
            ) : null}

            {latestMemory.people_involved ? (
              <Text style={[styles.memoryPeople, { color: muted }]}>
                With: {latestMemory.people_involved}
              </Text>
            ) : null}
          </Pressable>
        ) : (
          <Text style={[styles.emptyText, { color: muted }]}>No memories recorded yet.</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  welcomeBlock: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  welcomeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  welcomeSub: {
    fontSize: 14,
  },
  stabilityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  stabilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionBlock: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  linkActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listWrap: {
    gap: 2,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  remInstr: {
    fontSize: 13,
    marginTop: 2,
  },
  remTime: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    paddingVertical: 8,
  },
  memoryCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  memoryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  memoryDate: {
    fontSize: 12,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  memoryDesc: {
    fontSize: 14,
    lineHeight: 19,
  },
  memoryPeople: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
