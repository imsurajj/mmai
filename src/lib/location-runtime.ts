import Constants from "expo-constants";
import { Platform } from "react-native";

/** True inside Expo Go, where Android background location is unavailable. */
export function isExpoGoRuntime() {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  );
}

/** Background GPS is only reliable in a native/dev build, not Expo Go. */
export function canUseBackgroundLocation() {
  return Platform.OS !== "web" && !isExpoGoRuntime();
}
