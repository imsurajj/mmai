import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import {
  ShieldCheck,
  FileCheck2,
  Sparkles,
  ChevronRight,
  UserCheck,
  X,
  RefreshCw,
  Award,
} from 'lucide-react-native';
import { useColor } from '@/hooks/useColor';
import { useToast } from '@/components/ui/toast';
import { useChip } from '@/components/ui/bottom-chip';
import {
  getPatientReports,
  getCaregiverVerificationStatus,
  requestCaregiverVerification,
  getPatientCapacityProfile,
  PatientVerifiedReport,
  CaregiverVerificationStatus,
} from '@/lib/patient-reports-service';
import { PersonalBaseline } from '@/lib/caregiver-service';
import { CurrentSessionUser } from '@/lib/supabase';

type PatientReportVerificationProps = {
  user: CurrentSessionUser | null;
  baseline: PersonalBaseline | null;
  onOpenGeminiAssistant?: () => void;
};

export function PatientReportVerification({
  user,
  baseline,
  onOpenGeminiAssistant,
}: PatientReportVerificationProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const card = useColor('card');
  const border = useColor('border');
  const { showChip } = useChip();
  const { success } = useToast();

  const [verifyStatus, setVerifyStatus] = useState<CaregiverVerificationStatus | null>(null);
  const [reports, setReports] = useState<PatientVerifiedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const capacityProfile = getPatientCapacityProfile(baseline);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [status, reps] = await Promise.all([
        getCaregiverVerificationStatus(),
        getPatientReports(),
      ]);
      setVerifyStatus(status);
      setReports(reps);
    } catch (err) {
      console.error('Error loading verification status:', err);
    }
  };

  const handleVerifyThroughCaregiver = async () => {
    try {
      setLoading(true);
      const res = await requestCaregiverVerification();
      setVerifyStatus(res.status);
      showChip('Reports verified by caregiver');
      success(
        'Caregiver Verified!',
        'Patient clinical reports and living profile successfully confirmed.'
      );
    } catch (err: any) {
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isVerified = verifyStatus?.isVerified ?? false;

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: isVerified ? '#EBF5ED' : '#FFF7ED' },
            ]}
          >
            {isVerified ? (
              <ShieldCheck size={20} color="#2D7A46" strokeWidth={2.4} />
            ) : (
              <RefreshCw size={20} color="#D97706" strokeWidth={2.4} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.inlineHeader}>
              <Text style={[styles.title, { color: text }]}>Caregiver Report Verification</Text>
              <View
                style={[
                  styles.pill,
                  {
                    backgroundColor: isVerified ? '#EBF5ED' : '#FEF3C7',
                    borderColor: isVerified ? '#2D7A46' : '#D97706',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isVerified ? '#2D7A46' : '#B45309' },
                  ]}
                >
                  {isVerified ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: muted }]}>
              {isVerified
                ? `Confirmed by ${verifyStatus?.verifiedBy || 'Dr. Suraj'}`
                : 'Awaiting caregiver confirmation for patient reports'}
            </Text>
          </View>
        </View>
      </View>

      {/* Capacity & Living Profile Summary Pill */}
      <View style={[styles.capacityStrip, { backgroundColor: '#F8FAF8', borderColor: border }]}>
        <View style={styles.capacityHeader}>
          <Award size={15} color={primary} />
          <Text style={[styles.capacityTitle, { color: text }]}>
            Capacity Profile: <Text style={{ color: primary, fontWeight: '800' }}>{capacityProfile.title}</Text>
          </Text>
        </View>
        <Text style={[styles.capacityDesc, { color: muted }]}>
          {capacityProfile.description}
        </Text>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        {/* Verify through Caregiver Button */}
        <Pressable
          onPress={handleVerifyThroughCaregiver}
          disabled={loading}
          style={({ pressed }) => [
            styles.verifyBtn,
            { borderColor: primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={primary} />
          ) : (
            <>
              <UserCheck size={16} color={primary} />
              <Text style={[styles.verifyBtnText, { color: primary }]}>
                {isVerified ? 'Re-Verify Reports' : 'Verify via Caregiver'}
              </Text>
            </>
          )}
        </Pressable>

        {/* View Details modal button */}
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [
            styles.detailsBtn,
            { borderColor: border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <FileCheck2 size={16} color={text} />
          <Text style={[styles.detailsBtnText, { color: text }]}>
            View Reports ({reports.length})
          </Text>
        </Pressable>
      </View>



      {/* Verified Reports Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: border }]}>
              <View style={styles.modalTitleRow}>
                <FileCheck2 size={20} color={primary} />
                <Text style={[styles.modalTitle, { color: text }]}>Verified Patient Reports</Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={20} color={muted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={[styles.verifiedBanner, { borderColor: '#2D7A46' }]}>
                <ShieldCheck size={18} color="#2D7A46" />
                <Text style={styles.verifiedBannerText}>
                  Caregiver Verified: {verifyStatus?.verifiedBy}
                </Text>
              </View>

              {reports.map((rep) => (
                <View
                  key={rep.id}
                  style={[styles.reportItemCard, { borderColor: border, backgroundColor: '#FFFFFF' }]}
                >
                  <View style={styles.reportItemTop}>
                    <Text style={[styles.reportItemTitle, { color: text }]}>
                      {rep.title}
                    </Text>
                    <View style={styles.reportTag}>
                      <Text style={styles.reportTagText}>{rep.report_type.replace('_', ' ')}</Text>
                    </View>
                  </View>

                  <Text style={[styles.reportItemSummary, { color: muted }]}>
                    {rep.summary}
                  </Text>

                  {rep.details?.routines && (
                    <View style={styles.detailsList}>
                      <Text style={[styles.detailsSectionTitle, { color: text }]}>Daily Living Schedule:</Text>
                      {rep.details.routines.map((r, i) => (
                        <Text key={i} style={[styles.detailBullet, { color: muted }]}>
                          • {r}
                        </Text>
                      ))}
                    </View>
                  )}

                  {rep.details?.familyMembers && (
                    <View style={styles.detailsList}>
                      <Text style={[styles.detailsSectionTitle, { color: text }]}>Family & Social Info:</Text>
                      {rep.details.familyMembers.map((f, i) => (
                        <Text key={i} style={[styles.detailBullet, { color: muted }]}>
                          • {f}
                        </Text>
                      ))}
                    </View>
                  )}

                  {rep.details?.medications && (
                    <View style={styles.detailsList}>
                      <Text style={[styles.detailsSectionTitle, { color: text }]}>Medication Protocol:</Text>
                      {rep.details.medications.map((m, i) => (
                        <Text key={i} style={[styles.detailBullet, { color: muted }]}>
                          • {m}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginVertical: 4,
  },
  topRow: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  capacityStrip: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  capacityDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  verifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  startGeminiBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  geminiBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  geminiBtnTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  geminiBtnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
    gap: 12,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF5ED',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  verifiedBannerText: {
    color: '#2D7A46',
    fontSize: 13,
    fontWeight: '700',
  },
  reportItemCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  reportItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  reportItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  reportTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reportTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#475569',
  },
  reportItemSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  detailsList: {
    marginTop: 4,
    gap: 2,
  },
  detailsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailBullet: {
    fontSize: 12,
    lineHeight: 16,
  },
});
