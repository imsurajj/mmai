import * as Notifications from "expo-notifications";
import { Alert, Linking } from "react-native";

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;

    const requested = await Notifications.requestPermissionsAsync();
    if (requested.granted) return true;

    Alert.alert(
      "Notifications disabled",
      "Enable notifications in your device Settings to receive safe-zone alerts.",
      [
        { text: "Open Settings", onPress: () => Linking.openSettings() },
        { text: "Cancel", style: "cancel" },
      ],
    );

    return false;
  } catch (err) {
    console.warn("notification permission error", err);
    return false;
  }
}

export async function checkNotificationPermissions() {
  return Notifications.getPermissionsAsync();
}

export function openAppNotificationSettings() {
  // Best-effort open settings
  Linking.openSettings();
}
