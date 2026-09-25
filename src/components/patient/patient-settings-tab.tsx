import { useColor } from "@/hooks/useColor";
import { useModeToggle } from "@/hooks/useModeToggle";
import { CurrentSessionUser } from "@/lib/supabase";
import {
    ChevronRight,
    Heart,
    LogOut,
    Moon,
    ShieldCheck,
    Sparkles,
    Sun,
} from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useChip } from "@/components/ui/bottom-chip";
import {
    startMonitoringZone,
    stopMonitoringZone,
} from "@/lib/location-monitor";
import {
    computeCentroidSafeZone,
    SafeZone,
    saveSafeZone,
} from "@/lib/safezone-service";
import { Alert } from "react-native";

type PatientSettingsTabProps = {
  user: CurrentSessionUser | null;
  onConfirmLogout: () => void;
};

export function PatientSettingsTab({
  user,
  onConfirmLogout,
}: PatientSettingsTabProps) {
  const card = useColor("card");
  const text = useColor("text");
  const muted = useColor("textMuted");
  const border = useColor("border");
  const primary = useColor("primary");
  const { isDark, toggleMode } = useModeToggle();
  const { showChip } = useChip();
  const [generatedZone, setGeneratedZone] = React.useState<SafeZone | null>(
    null,
  );
  const [monitoring, setMonitoring] = React.useState(false);

  async function handleGenerateZone() {
    // In a real app we'd gather recent patient task points; here we sample current location
    try {
      const { status } = await (
        await import("expo-location")
      ).getForegroundPermissionsAsync();
      if (status !== "granted") {
        const r = await (
          await import("expo-location")
        ).requestForegroundPermissionsAsync();
        if (r.status !== "granted") {
          Alert.alert(
            "Location permission required",
            "Please enable location to compute safe zone.",
          );
          return;
        }
      }
      const loc = await (
        await import("expo-location")
      ).getCurrentPositionAsync({ accuracy: 3 });
      const pts = [
        { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
      ];
      const zone = computeCentroidSafeZone(pts, 100);
      if (zone) {
        zone.patient_id = user?.id || "";
        setGeneratedZone(zone);
        showChip("Safe zone generated");
      }
    } catch (err) {
      console.warn("generate zone err", err);
      Alert.alert("Error", "Unable to compute safe zone.");
    }
  }

  async function handleSaveZone() {
    if (!generatedZone) return;
    try {
      const saved = await saveSafeZone(generatedZone);
      setGeneratedZone(saved);
      showChip("Safe zone saved");
    } catch (err) {
      console.warn(err);
      Alert.alert("Save failed", "Could not save safe zone.");
    }
  }

  async function handleToggleMonitoring() {
    if (!generatedZone) {
      Alert.alert("No zone", "Generate or load a safe zone first.");
      return;
    }
    if (monitoring) {
      await stopMonitoringZone();
      setMonitoring(false);
      showChip("Monitoring stopped");
    } else {
      await startMonitoringZone(generatedZone, ({ latitude, longitude }) => {
        // placeholder for future ElevenLabs voice
        console.log("Exited zone at", latitude, longitude);
      });
      setMonitoring(true);
      showChip("Monitoring started");
    }
  }

  function handleZoneSaved(updated: SafeZone) {
    setGeneratedZone(updated);
    showChip("Zone updated");
  }

  function handleZoneDeleted() {
    setGeneratedZone(null);
    showChip("Zone deleted");
  }

  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={[styles.headerTitle, { color: text }]}>Settings</Text>
        <Text style={[styles.headerSub, { color: muted }]}>
          Your health profile and workspace preferences
        </Text>
      </View>

      {/* Profile Row */}
      <View style={styles.categoryWrap}>
        <View style={styles.profileRow}>
          <View style={[styles.avatarCircle, { backgroundColor: primary }]}>
            <Heart size={24} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.profileName, { color: text }]}>
              {user?.name || "Patient"}
            </Text>
            <Text style={[styles.profileSub, { color: muted }]}>
              {user?.email || "Caregiver Linked Access"}
            </Text>
          </View>
        </View>
        <View style={[styles.rowItem, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: text }]}>
              Auto-generate safe zone
            </Text>
            <Text style={[styles.rowSub, { color: muted }]}>
              Create a simple centroid-based safe zone from current location.
            </Text>
            {generatedZone && (
              <Text style={[styles.rowSub, { color: muted }]}>
                Center: {generatedZone.center.latitude.toFixed(5)},{" "}
                {generatedZone.center.longitude.toFixed(5)} · Radius:{" "}
                {generatedZone.radius_m}m
              </Text>
            )}
          </View>
          <Pressable
            onPress={handleGenerateZone}
            style={({ pressed }) => [
              styles.iconAction,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: primary }}>Generate</Text>
          </Pressable>
        </View>

        <View style={styles.rowItem}>
          <Pressable
            onPress={handleSaveZone}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: "#fff" }}>Save Zone</Text>
          </Pressable>
          <Pressable
            onPress={handleToggleMonitoring}
            style={({ pressed }) => [
              styles.actionBtnSecondary,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: primary }}>
              {monitoring ? "Stop Monitoring" : "Start Monitoring"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Category: Caregiver Connection */}
      <View style={styles.categoryWrap}>
        <Text style={[styles.categoryHeading, { color: muted }]}>
          CARE NETWORK
        </Text>

        <View style={styles.rowItem}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isDark ? "#262F29" : "#F1F5F2" },
            ]}
          >
            <ShieldCheck size={18} color="#748B75" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: text }]}>
              Caregiver Sync
            </Text>
            <Text style={[styles.rowSub, { color: muted }]}>
              Linked with Dr. Suraj (Neurology)
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isDark ? "#1C261E" : "#EAF2EA",
                borderColor: "#748B75",
              },
            ]}
          >
            <Text style={[styles.statusPillText, { color: "#748B75" }]}>
              Active
            </Text>
          </View>
        </View>

        <View style={styles.rowItem}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isDark ? "#262F29" : "#F1F5F2" },
            ]}
          >
            <Sparkles size={18} color="#748B75" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: text }]}>
              Cognitive Voice Assistant
            </Text>
            <Text style={[styles.rowSub, { color: muted }]}>
              ElevenLabs + Gemini Dynamic Model
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isDark ? "#1C261E" : "#EAF2EA",
                borderColor: "#748B75",
              },
            ]}
          >
            <Text style={[styles.statusPillText, { color: "#748B75" }]}>
              Ready
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Category: Preferences */}
      <View style={styles.categoryWrap}>
        <Text style={[styles.categoryHeading, { color: muted }]}>
          PREFERENCES
        </Text>

        <Pressable
          onPress={() => {
            toggleMode();
            showChip(!isDark ? "Dark Theme enabled" : "Light Theme enabled");
          }}
          style={({ pressed }) => [styles.rowItem, pressed && { opacity: 0.7 }]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isDark ? "#262F29" : "#F1F5F2" },
            ]}
          >
            {isDark ? (
              <Moon size={18} color="#748B75" strokeWidth={2.2} />
            ) : (
              <Sun size={18} color="#748B75" strokeWidth={2.2} />
            )}
          </View>
          <Text style={[styles.rowLabel, { color: text }]}>Theme Mode</Text>
          <Text style={[styles.valueBadge, { color: muted }]}>
            {isDark ? "Dark Theme" : "Light Theme"}
          </Text>
          <ChevronRight size={18} color={muted} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Category: Account Actions */}
      <View style={styles.categoryWrap}>
        <Text style={[styles.categoryHeading, { color: muted }]}>
          WORKSPACE ACTIONS
        </Text>

        <Pressable
          onPress={onConfirmLogout}
          style={({ pressed }) => [styles.rowItem, pressed && { opacity: 0.7 }]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
              },
            ]}
          >
            <LogOut size={18} color="#EF4444" strokeWidth={2.2} />
          </View>
          <Text style={[styles.rowLabel, { color: "#DC2626" }]}>
            Exit Patient Workspace
          </Text>
          <ChevronRight size={18} color="#DC2626" strokeWidth={2.2} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 110,
    paddingTop: 6,
  },
  headerBlock: {
    gap: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 13,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
  },
  profileSub: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  categoryWrap: {
    gap: 4,
  },
  categoryHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  rowSub: {
    fontSize: 12,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  valueBadge: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  iconAction: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtn: {
    backgroundColor: "#2F855A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  actionBtnSecondary: {
    borderWidth: 1,
    borderColor: "#2F855A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
