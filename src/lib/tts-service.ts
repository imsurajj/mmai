import { Platform } from "react-native";
let expoSpeech: typeof import("expo-speech") | null = null;

export async function speakText(text: string) {
  try {
    if (!expoSpeech && Platform.OS !== "web") {
      expoSpeech = await import("expo-speech");
    }
    if (expoSpeech) {
      expoSpeech.speak(text);
      return true;
    }
  } catch (err) {
    console.warn("TTS error", err);
  }
  return false;
}
