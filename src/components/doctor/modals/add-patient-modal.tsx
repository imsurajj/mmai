import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { UserPlus, X } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { useColor } from '@/hooks/useColor';

type AddPatientModalProps = {
  visible: boolean;
  onClose: () => void;
  patientName: string;
  setPatientName: (val: string) => void;
  patientEmail: string;
  setPatientEmail: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export function AddPatientModal({
  visible,
  onClose,
  patientName,
  setPatientName,
  patientEmail,
  setPatientEmail,
  isSubmitting,
  onSubmit,
}: AddPatientModalProps) {
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeIn.duration(160)} style={[styles.modalBox, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.rowAlign}>
              <UserPlus size={16} color={primary} />
              <Text style={[styles.modalTitle, { color: text }]}>Add New Patient</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={16} color={muted} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: text }]}>Full Name *</Text>
            <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
              <TextInput
                value={patientName}
                onChangeText={setPatientName}
                placeholder="e.g. Eleanor Vance"
                placeholderTextColor={muted}
                style={[styles.modalTextInput, { color: text }]}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: text }]}>Email (Optional)</Text>
            <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
              <TextInput
                value={patientEmail}
                onChangeText={setPatientEmail}
                placeholder="patient@example.com"
                placeholderTextColor={muted}
                style={[styles.modalTextInput, { color: text }]}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <Button variant="outline" size="default" onPress={onClose} style={styles.modalBtn}>
              Cancel
            </Button>
            <Button variant="default" size="default" loading={isSubmitting} onPress={onSubmit} style={styles.modalBtn}>
              Create Key
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  textInputWrap: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  modalTextInput: {
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  modalBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
  },
});
