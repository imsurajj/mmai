import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ShieldCheck, X } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { useColor } from '@/hooks/useColor';

type AddTimelineModalProps = {
  visible: boolean;
  onClose: () => void;
  eventTitle: string;
  setEventTitle: (val: string) => void;
  eventDate: string;
  setEventDate: (val: string) => void;
  eventTime: string;
  setEventTime: (val: string) => void;
  eventPeople: string;
  setEventPeople: (val: string) => void;
  onSubmit: () => void;
};

export function AddTimelineModal({
  visible,
  onClose,
  eventTitle,
  setEventTitle,
  eventDate,
  setEventDate,
  eventTime,
  setEventTime,
  eventPeople,
  setEventPeople,
  onSubmit,
}: AddTimelineModalProps) {
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
              <ShieldCheck size={16} color={primary} />
              <Text style={[styles.modalTitle, { color: text }]}>Add Verified Memory</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={16} color={muted} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: text }]}>Event Title *</Text>
            <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
              <TextInput
                value={eventTitle}
                onChangeText={setEventTitle}
                placeholder="e.g. Morning Walk with Grandkids"
                placeholderTextColor={muted}
                style={[styles.modalTextInput, { color: text }]}
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: text }]}>Date</Text>
              <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                <TextInput
                  value={eventDate}
                  onChangeText={setEventDate}
                  placeholder="Today"
                  placeholderTextColor={muted}
                  style={[styles.modalTextInput, { color: text }]}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: text }]}>Time</Text>
              <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
                <TextInput
                  value={eventTime}
                  onChangeText={setEventTime}
                  placeholder="10:00 AM"
                  placeholderTextColor={muted}
                  style={[styles.modalTextInput, { color: text }]}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: text }]}>People Involved</Text>
            <View style={[styles.textInputWrap, { borderColor: border, backgroundColor: card }]}>
              <TextInput
                value={eventPeople}
                onChangeText={setEventPeople}
                placeholder="e.g. Sarah (daughter)"
                placeholderTextColor={muted}
                style={[styles.modalTextInput, { color: text }]}
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <Button variant="outline" size="default" onPress={onClose} style={styles.modalBtn}>
              Cancel
            </Button>
            <Button variant="default" size="default" onPress={onSubmit} style={styles.modalBtn}>
              Save Memory
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
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
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
