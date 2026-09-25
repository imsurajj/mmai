import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { User, UserPlus, CheckCircle2, X, ChevronRight } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { useColor } from '@/hooks/useColor';
import { PatientAccessKey } from '@/lib/supabase';

type PatientsTabProps = {
  patients: PatientAccessKey[];
  createdKeyData: PatientAccessKey | null;
  onClearCreatedKey: () => void;
  onSelectPatient: (patient: PatientAccessKey) => void;
  onOpenAddPatient: () => void;
};

export function PatientsTab({
  patients,
  createdKeyData,
  onClearCreatedKey,
  onSelectPatient,
  onOpenAddPatient,
}: PatientsTabProps) {
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.sectionWrap}>
      {/* Clean List Header */}
      <View style={styles.listHeaderRow}>
        <View>
          <Text style={[styles.listHeaderTitle, { color: text }]}>Patient Directory</Text>
          <Text style={[styles.listHeaderSub, { color: muted }]}>
            Tap any patient to inspect baseline charts, verified timeline & routines.
          </Text>
        </View>
        <Button
          variant="default"
          size="sm"
          icon={UserPlus}
          onPress={onOpenAddPatient}
        >
          Add Patient
        </Button>
      </View>

      {/* Created Key Announcement */}
      {createdKeyData && (
        <View style={[styles.cleanKeyCreatedRow, { borderColor: border }]}>
          <CheckCircle2 size={16} color={primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.keyCreatedTitle, { color: text }]}>
              Access Key for {createdKeyData.patient_name}:{' '}
              <Text style={{ color: primary, fontWeight: '800' }}>{createdKeyData.access_code}</Text>
            </Text>
          </View>
          <Pressable onPress={onClearCreatedKey} hitSlop={6}>
            <X size={14} color={muted} />
          </Pressable>
        </View>
      )}

      {/* Clean List Items (Flat & Minimal) */}
      <View style={[styles.patientsFlatList, { borderTopColor: border }]}>
        {patients.map((pat) => (
          <Pressable
            key={pat.id}
            onPress={() => onSelectPatient(pat)}
            style={({ pressed }) => [
              styles.patientRowItem,
              { borderBottomColor: border },
              pressed && { backgroundColor: '#F9FAFB' },
            ]}
          >
            <View style={[styles.patientIconCircleClean, { borderColor: border }]}>
              <User size={18} color={primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.patientRowName, { color: text }]}>{pat.patient_name}</Text>
              <Text style={[styles.patientRowSub, { color: muted }]}>
                {pat.patient_email || 'Direct Access Key'}
              </Text>
            </View>

            <View style={[styles.codeTag, { borderColor: border }]}>
              <Text style={[styles.codeTagText, { color: primary }]}>{pat.access_code}</Text>
            </View>

            <ChevronRight size={16} color={primary} />
          </Pressable>
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
  cleanKeyCreatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  keyCreatedTitle: {
    fontSize: 15,
  },
  patientsFlatList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  patientRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  patientIconCircleClean: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientRowName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  patientRowSub: {
    fontSize: 14,
  },
  codeTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  codeTagText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
