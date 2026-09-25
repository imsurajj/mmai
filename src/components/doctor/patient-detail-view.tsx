import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  Key,
  Check,
  Copy,
  Share2,
  ChevronLeft,
  Info,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import { ProgressRingChart } from '@/components/charts/progress-ring-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { Button } from '@/components/ui/button';
import { useColor } from '@/hooks/useColor';
import { CareReminder, PersonalBaseline, TimelineEvent } from '@/lib/caregiver-service';
import { PatientAccessKey } from '@/lib/supabase';
import { PatientDetailSubTab } from './doctor-types';

type PatientDetailViewProps = {
  patient: PatientAccessKey;
  onBack: () => void;
  patientDetailSubTab: PatientDetailSubTab;
  setPatientDetailSubTab: (tab: PatientDetailSubTab) => void;
  baseline: PersonalBaseline | null;
  timelineEvents: TimelineEvent[];
  reminders: CareReminder[];
  copiedId: string | null;
  onCopyCode: (code: string, id: string) => void;
  onShareCode: (patient: PatientAccessKey) => void;
  onOpenAddTimeline: () => void;
  onDeleteTimelineEvent: (id: string) => void;
  onOpenAddReminder: () => void;
  onToggleReminder: (reminder: CareReminder) => void;
  onDeleteReminder: (id: string) => void;
};

export function PatientDetailView({
  patient,
  onBack,
  patientDetailSubTab,
  setPatientDetailSubTab,
  baseline,
  timelineEvents,
  reminders,
  copiedId,
  onCopyCode,
  onShareCode,
  onOpenAddTimeline,
  onDeleteTimelineEvent,
  onOpenAddReminder,
  onToggleReminder,
  onDeleteReminder,
}: PatientDetailViewProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');

  const cognitiveBarData = [
    { label: 'Object', value: baseline?.object_average || 85, color: primary },
    { label: 'Orient', value: baseline?.orientation_average || 90, color: '#92AD94' },
    { label: 'Recent', value: baseline?.recent_event_average || 82, color: primary },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.detailContainer}>
      {/* Minimal Back Button */}
      <Pressable onPress={onBack} style={styles.backNavRow} hitSlop={8}>
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
              {patient.patient_name}
            </Text>
            <Text style={[styles.patientDetailEmail, { color: muted }]}>
              {patient.patient_email || 'Direct Key Access'}
            </Text>
          </View>
        </View>

        {/* Secret Key Quick Action Strip */}
        <View style={[styles.minimalKeyRow, { borderColor: border }]}>
          <View style={styles.rowAlign}>
            <Key size={13} color={primary} />
            <Text style={[styles.codeKeyText, { color: text }]}>
              Access Code: <Text style={{ color: primary, fontWeight: '700' }}>{patient.access_code}</Text>
            </Text>
          </View>

          <View style={styles.rowAlign}>
            <Pressable
              onPress={() => onCopyCode(patient.access_code, patient.id)}
              hitSlop={6}
              style={[styles.linkBtn, { borderColor: border }]}
            >
              {copiedId === patient.id ? <Check size={12} color={primary} /> : <Copy size={12} color={muted} />}
              <Text style={[styles.linkBtnText, { color: copiedId === patient.id ? primary : text }]}>
                {copiedId === patient.id ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onShareCode(patient)}
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
          <Text
            style={[
              styles.subTabText,
              {
                color: patientDetailSubTab === 'analytics' ? primary : muted,
                fontWeight: patientDetailSubTab === 'analytics' ? '700' : '500',
              },
            ]}
          >
            Cognitive Analytics
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setPatientDetailSubTab('timeline')}
          style={[styles.subTabItem, patientDetailSubTab === 'timeline' && { borderBottomColor: primary }]}
        >
          <Text
            style={[
              styles.subTabText,
              {
                color: patientDetailSubTab === 'timeline' ? primary : muted,
                fontWeight: patientDetailSubTab === 'timeline' ? '700' : '500',
              },
            ]}
          >
            Verified Memory ({timelineEvents.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setPatientDetailSubTab('reminders')}
          style={[styles.subTabItem, patientDetailSubTab === 'reminders' && { borderBottomColor: primary }]}
        >
          <Text
            style={[
              styles.subTabText,
              {
                color: patientDetailSubTab === 'reminders' ? primary : muted,
                fontWeight: patientDetailSubTab === 'reminders' ? '700' : '500',
              },
            ]}
          >
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
              onPress={onOpenAddTimeline}
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

                <Pressable onPress={() => onDeleteTimelineEvent(evt.id)} hitSlop={6}>
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
              onPress={onOpenAddReminder}
            >
              New Reminder
            </Button>
          </View>

          {reminders.map((rem) => (
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
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  detailContainer: {
    gap: 12,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  cleanSectionBlock: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 10,
  },
  cleanSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cleanSectionSub: {
    fontSize: 14,
    lineHeight: 19,
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
  minimalTimelineRow: {
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  timelineRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineDate: {
    fontSize: 12,
  },
  timelineMainTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineDescText: {
    fontSize: 14,
    lineHeight: 19,
  },
  peopleText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  minimalChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
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
    gap: 8,
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
