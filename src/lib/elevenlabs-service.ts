import { Platform } from "react-native";
import { PatientCapacityLevel } from "./patient-reports-service";

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking(): void {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.speechSynthesis
  ) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

export function speakQuestion({
  text,
  capacity = "moderate",
  onStart,
  onEnd,
  onError,
}: {
  text: string;
  capacity?: PatientCapacityLevel;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}): void {
  stopSpeaking();

  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.speechSynthesis
  ) {
    onStart?.();
    onEnd?.();
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate =
      capacity === "supported" ? 0.82 : capacity === "moderate" ? 0.9 : 0.98;
    utterance.pitch = capacity === "supported" ? 1.05 : 1;
    utterance.onstart = () => onStart?.();
    utterance.onend = () => {
      activeUtterance = null;
      onEnd?.();
    };
    utterance.onerror = (error) => {
      activeUtterance = null;
      onError?.(error);
      onEnd?.();
    };
    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    onError?.(error);
    onEnd?.();
  }
}
