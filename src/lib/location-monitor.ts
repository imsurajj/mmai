import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { canUseBackgroundLocation } from "./location-runtime";
import { SafeZone, isPointInZone } from "./safezone-service";
import { speakText } from "./tts-service";

let Notifications: typeof import("expo-notifications") | null = null;
async function getNotifications() {
  if (Notifications) return Notifications;
  try {
    Notifications = await import("expo-notifications");
    return Notifications;
  } catch (err) {
    console.warn("expo-notifications not available in this environment", err);
    Notifications = null;
    return null;
  }
}

let _locationSubscriber: Location.LocationSubscription | null = null;
let _monitoredZone: SafeZone | null = null;
let _onExit: ((pos: { latitude: number; longitude: number }) => void) | undefined;

const BACKGROUND_TASK_NAME = "PATIENT_SAFEZONE_TASK";

async function handlePossibleExit(
  latitude: number,
  longitude: number,
  zone: SafeZone,
) {
  if (isPointInZone({ latitude, longitude }, zone)) return;

  const N = await getNotifications();
  if (N) {
    try {
      await N.scheduleNotificationAsync({
        content: {
          title: "Safe zone alert",
          body: "You have left your approved safe zone.",
        },
        trigger: null,
      });
    } catch (e) {
      console.warn("scheduleNotificationAsync failed", e);
    }
  }
  try {
    await speakText("You have left your approved safe zone.");
  } catch {}
  _onExit?.({ latitude, longitude });
}

if (Platform.OS !== "web") {
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ data, error }) => {
    if (error || !_monitoredZone) return;
    const locations = (data as { locations?: Location.LocationObject[] } | undefined)
      ?.locations;
    if (!locations?.length) return;
    const loc = locations[0];
    await handlePossibleExit(
      loc.coords.latitude,
      loc.coords.longitude,
      _monitoredZone,
    );
  });
}

/**
 * Foreground live GPS (Expo Go + Android Studio). Background updates only in
 * a development/production build — Expo Go cannot do Android background GPS.
 */
export async function startMonitoringZone(
  zone: SafeZone,
  onExit?: (pos: { latitude: number; longitude: number }) => void,
) {
  _monitoredZone = zone;
  _onExit = onExit;

  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") {
    const req = await Location.requestForegroundPermissionsAsync();
    if (req.status !== "granted") throw new Error("Location permission denied");
  }

  await Location.enableNetworkProviderAsync().catch(() => {});

  _locationSubscriber = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 3000,
      mayShowUserSettingsDialog: true,
    },
    async (loc) => {
      if (!_monitoredZone) return;
      await handlePossibleExit(
        loc.coords.latitude,
        loc.coords.longitude,
        _monitoredZone,
      );
    },
  );

  if (canUseBackgroundLocation()) {
    try {
      const bgStatus = await Location.getBackgroundPermissionsAsync();
      if (bgStatus.status !== "granted") {
        await Location.requestBackgroundPermissionsAsync();
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 30,
        deferredUpdatesInterval: 60000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Safe zone monitoring",
          notificationBody: "Monitoring location for safe zone",
        },
      });
    } catch (err) {
      console.warn("background monitor unavailable, using live foreground GPS", err);
    }
  }

  return _locationSubscriber;
}

export async function stopMonitoringZone() {
  _monitoredZone = null;
  _onExit = undefined;
  if (_locationSubscriber) {
    _locationSubscriber.remove();
    _locationSubscriber = null;
  }
  if (!canUseBackgroundLocation()) return;
  try {
    const running =
      await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK_NAME);
    if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME);
  } catch (err) {
    console.warn("stop background failed", err);
  }
}
