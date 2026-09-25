import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { useColor } from '@/hooks/useColor';
import { TimelineEvent } from '@/lib/caregiver-service';

type TimelineTabProps = {
  timelineEvents: TimelineEvent[];
  onOpenAddTimeline: () => void;
  onDeleteTimelineEvent: (id: string) => void;
};

export function TimelineTab({
  timelineEvents,
  onOpenAddTimeline,
  onDeleteTimelineEvent,
}: TimelineTabProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.sectionWrap}>
      <View style={styles.listHeaderRow}>
        <View>
          <Text style={[styles.listHeaderTitle, { color: text }]}>Memory Timeline Hub</Text>
          <Text style={[styles.listHeaderSub, { color: muted }]}>
            Verified ground truth recorded by caregivers.
          </Text>
        </View>
        <Button
          variant="default"
          size="sm"
          icon={Plus}
          onPress={onOpenAddTimeline}
        >
          Add Memory
        </Button>
      </View>

      <View style={[styles.timelineCleanList, { borderTopColor: border }]}>
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
  timelineCleanList: {
    borderTopWidth: StyleSheet.hairlineWidth,
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
});
