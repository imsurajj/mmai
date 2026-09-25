import { useColor } from "@/hooks/useColor";
import { canUseBackgroundLocation } from "@/lib/location-runtime";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible?: boolean;
  onClose?: () => void;
  onGranted?: () => void;
};

export default function LocationPermissionPrompt({
  visible = true,
  onClose,
  onGranted,
}: Props) {
  const [show, setShow] = useState(visible);
  const primary = useColor("primary");

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  async function requestPermissions() {
    try {
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== "granted") {
        // open settings if user denies
        return;
      }

      // Background GPS only in a native/dev build — Expo Go Android cannot use it.
      if (canUseBackgroundLocation()) {
        try {
          await Location.requestBackgroundPermissionsAsync();
        } catch {
          // Foreground live tracking still works without this.
        }
      }

      setShow(false);
      onGranted?.();
      onClose?.();
    } catch (err) {
      console.warn("Permission request failed", err);
    }
  }

  function openSettings() {
    Linking.openSettings();
  }

  if (!show) return null;

  return (
    <Modal visible={show} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{ backgroundColor: "white", borderRadius: 12, padding: 20 }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
            Enable Location
          </Text>
          <Text style={{ color: "#444", marginBottom: 16 }}>
            To provide safe-zone monitoring we need access to your location.
            Please allow location permissions so we can detect if you leave your
            safe zone.
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <Pressable
              onPress={() => {
                setShow(false);
                onClose?.();
              }}
              style={{ padding: 10 }}
            >
              <Text style={{ color: "#666" }}>Maybe later</Text>
            </Pressable>
            <Pressable onPress={requestPermissions} style={{ padding: 10 }}>
              <Text style={{ color: primary }}>Allow location</Text>
            </Pressable>
            <Pressable onPress={openSettings} style={{ padding: 10 }}>
              <Text style={{ color: primary }}>Open settings</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
