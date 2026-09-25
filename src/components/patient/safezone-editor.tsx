import { useColor } from "@/hooks/useColor";
import {
    SafeZone,
    deleteSafeZone,
    updateSafeZone,
} from "@/lib/safezone-service";
import React from "react";
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type Props = {
  zone: SafeZone;
  onSaved?: (z: SafeZone) => void;
  onDeleted?: () => void;
};

export function SafeZoneEditor({ zone, onSaved, onDeleted }: Props) {
  const text = useColor("text");
  const muted = useColor("textMuted");
  const [name, setName] = React.useState(zone.name || "");
  const [radius, setRadius] = React.useState(String(zone.radius_m || 50));

  async function save() {
    try {
      const updated = await updateSafeZone(zone.id, {
        name,
        radius_m: Number(radius),
      });
      onSaved?.(updated);
    } catch (err) {
      console.warn(err);
      Alert.alert("Save failed", "Could not update safe zone");
    }
  }

  async function remove() {
    Alert.alert("Delete zone", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSafeZone(zone.id);
            onDeleted?.();
          } catch (err) {
            Alert.alert("Delete failed");
          }
        },
      },
    ]);
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: muted }}>Edit Safe Zone</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder="Zone name"
        placeholderTextColor="#888"
      />
      <TextInput
        value={radius}
        onChangeText={setRadius}
        style={styles.input}
        keyboardType="numeric"
        placeholder="Radius meters"
        placeholderTextColor="#888'"
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={save} style={styles.saveBtn}>
          <Text style={{ color: "#fff" }}>Save</Text>
        </Pressable>
        <Pressable onPress={remove} style={styles.delBtn}>
          <Text style={{ color: "#fff" }}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: "#DDD", padding: 8, borderRadius: 8 },
  saveBtn: { backgroundColor: "#2F855A", padding: 10, borderRadius: 8 },
  delBtn: { backgroundColor: "#C53030", padding: 10, borderRadius: 8 },
});
