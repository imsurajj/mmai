import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AlertCircle, Check, CheckCircle2 } from 'lucide-react-native';
import { useColor } from '@/hooks/useColor';
import { useModeToggle } from '@/hooks/useModeToggle';
import { CareAlert } from '@/lib/caregiver-service';

type NotificationsTabProps = {
  careAlerts: CareAlert[];
  onBackToDashboard: () => void;
  onResolveAlert: (alertId: string) => void;
};

export function NotificationsTab({
  careAlerts,
  onBackToDashboard,
  onResolveAlert,
}: NotificationsTabProps) {
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const border = useColor('border');
  const { isDark } = useModeToggle();

  const openAlerts = careAlerts.filter((a) => a.status === 'open');

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.sectionWrap}>
      <View style={styles.listHeaderRow}>
        <View style={styles.listHeaderTextWrap}>
          <Text style={[styles.listHeaderTitle, { color: text }]}>Attention Queue & Alerts</Text>
          <Text style={[styles.listHeaderSub, { color: muted }]}>
            Priority cognitive alerts requiring caregiver review.
          </Text>
        </View>
        <Pressable
          onPress={onBackToDashboard}
          style={[styles.outlineActionButton, { borderColor: border }]}
        >
          <Text style={[styles.outlineActionText, { color: '#748B75' }]}>&larr; Overview</Text>
        </Pressable>
      </View>

      {openAlerts.length > 0 ? (
        <View style={[styles.settingsCard, { borderColor: border, backgroundColor: card }]}>
          <View style={styles.alertHeaderRow}>
            <AlertCircle size={16} color="#DC2626" />
            <Text style={[styles.alertHeaderTitle, { color: text }]}>
              Active Attention Items ({openAlerts.length})
            </Text>
          </View>

          {openAlerts.map((alt) => (
            <View key={alt.id} style={[styles.cleanAlertRow, { borderBottomColor: border }]}>
              <View style={styles.alertCardHeader}>
                <View style={styles.alertTitleRow}>
                  <View style={[styles.alertDot, { backgroundColor: '#DC2626' }]} />
                  <Text style={[styles.alertCardTitle, { color: text }]} numberOfLines={2}>
                    {alt.title}
                  </Text>
                </View>
                <Pressable onPress={() => onResolveAlert(alt.id)} style={styles.ackBtnLink} hitSlop={8}>
                  <Check size={12} color="#748B75" />
                  <Text style={[styles.ackBtnLinkText, { color: '#748B75' }]}>Acknowledge</Text>
                </Pressable>
              </View>
              <Text style={[styles.alertCardReason, { color: muted }]}>{alt.reason}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyNotificationCard, { borderColor: border, backgroundColor: card }]}>
          <View style={[styles.emptyNotifCircle, { backgroundColor: isDark ? '#1C261E' : '#F0F6F0' }]}>
            <CheckCircle2 size={32} color="#748B75" />
          </View>
          <Text style={[styles.emptyNotifTitle, { color: text }]}>All Caught Up!</Text>
          <Text style={[styles.emptyNotifSub, { color: muted }]}>
            No pending urgent alerts in your caregiver queue. All memory observations are verified.
          </Text>
        </View>
      )}

      {/* Historical Observational Records */}
      <View style={[styles.settingsCard, { borderColor: border, backgroundColor: card, marginTop: 4 }]}>
        <Text style={[styles.settingCardTitle, { color: text }]}>Past Verification History</Text>
        <View style={[styles.cleanAlertRow, { borderBottomColor: border }]}>
          <View style={styles.historyTitleRow}>
            <CheckCircle2 size={15} color="#748B75" style={{ marginTop: 2, flexShrink: 0 }} />
            <Text style={[styles.alertCardTitle, { color: muted, flex: 1 }]}>
              Routine Medication Verification
            </Text>
          </View>
          <Text style={[styles.alertCardReason, { color: muted }]}>
            Daily medication prompts completed and logged by caregiver.
          </Text>
        </View>
        <View style={[styles.cleanAlertRow, { borderBottomColor: 'transparent' }]}>
          <View style={styles.historyTitleRow}>
            <CheckCircle2 size={15} color="#748B75" style={{ marginTop: 2, flexShrink: 0 }} />
            <Text style={[styles.alertCardTitle, { color: muted, flex: 1 }]}>
              Weekly Cognitive Index Calculation
            </Text>
          </View>
          <Text style={[styles.alertCardReason, { color: muted }]}>
            Baseline performance scored at 85% within normal personal variance.
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    gap: 14,
    width: '100%',
    paddingBottom: 24,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  listHeaderTextWrap: {
    flex: 1,
    gap: 3,
  },
  listHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  listHeaderSub: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  outlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  outlineActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    width: '100%',
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  alertHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  cleanAlertRow: {
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
    width: '100%',
  },
  alertCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  alertCardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  ackBtnLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(116, 139, 117, 0.12)',
    flexShrink: 0,
  },
  ackBtnLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  alertCardReason: {
    fontSize: 13.5,
    lineHeight: 19,
    paddingLeft: 16,
  },
  settingCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyNotificationCard: {
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  emptyNotifCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyNotifTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptyNotifSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
});
