import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ShieldCheck } from 'lucide-react-native';
import { useColor } from '@/hooks/useColor';
import { TimelineEvent } from '@/lib/caregiver-service';

type PatientTimelineTabProps = {
  timelineEvents: TimelineEvent[];
};

export function PatientTimelineTab({ timelineEvents }: PatientTimelineTabProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={[styles.headerTitle, { color: text }]}>My Verified Memories</Text>
        <Text style={[styles.headerSub, { color: muted }]}>
          Special moments and daily events verified by your family and caregivers.
        </Text>
      </View>

      <View style={[styles.timelineList, { borderTopColor: border }]}>
        {timelineEvents.map((evt) => (
          <View key={evt.id} style={[styles.timelineRow, { borderBottomColor: border }]}>
            <View style={styles.verifiedRow}>
              <ShieldCheck size={13} color={primary} />
              <Text style={[styles.verifiedLabel, { color: primary }]}>Verified Memory</Text>
              <Text style={[styles.timelineDate, { color: muted }]}>
                • {evt.event_date} {evt.event_time ? `(${evt.event_time})` : ''}
              </Text>
            </View>

            <Text style={[styles.timelineTitle, { color: text }]}>{evt.title}</Text>

            {evt.description ? (
              <Text style={[styles.timelineDesc, { color: muted }]}>{evt.description}</Text>
            ) : null}

            {evt.people_involved ? (
              <Text style={[styles.timelinePeople, { color: muted }]}>With: {evt.people_involved}</Text>
            ) : null}
          </View>
        ))}
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
  timelineList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timelineRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  verifiedLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineDate: {
    fontSize: 12,
  },
  timelineTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  timelineDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  timelinePeople: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
