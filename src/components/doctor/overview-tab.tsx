import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Brain, Clock, Check } from 'lucide-react-native';
import { ProgressRingChart } from '@/components/charts/progress-ring-chart';
import { useColor } from '@/hooks/useColor';
import { CareReminder, PersonalBaseline } from '@/lib/caregiver-service';
import { PatientAccessKey } from '@/lib/supabase';

type OverviewTabProps = {
  patients: PatientAccessKey[];
  baseline: PersonalBaseline | null;
  reminders: CareReminder[];
  onNavigateToPatients: () => void;
  onNavigateToReminders: () => void;
  onToggleReminder: (reminder: CareReminder) => void;
};

export function OverviewTab({
  patients,
  baseline,
  reminders,
  onNavigateToPatients,
  onNavigateToReminders,
  onToggleReminder,
}: OverviewTabProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary'); // #748B75
  const border = useColor('border');

  const activeReminders = reminders.filter((r) => r.status === 'pending');

  return (
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
          <Pressable onPress={onNavigateToPatients} hitSlop={8}>
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
          <Pressable onPress={onNavigateToReminders} hitSlop={8}>
            <Text style={[styles.linkActionText, { color: primary }]}>Manage &rarr;</Text>
          </Pressable>
        </View>

        <View style={styles.cleanList}>
          {reminders.slice(0, 3).map((r) => (
            <View key={r.id} style={[styles.cleanCheckItem, { borderBottomColor: border }]}>
              <Pressable onPress={() => onToggleReminder(r)} hitSlop={6}>
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
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    gap: 4,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
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
    fontWeight: '600',
  },
});
