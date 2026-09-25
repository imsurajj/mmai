import { safeStorage } from '@/lib/supabase';
import { Platform } from 'react-native';
import { PatientCapacityLevel } from './patient-reports-service';

const ELEVENLABS_KEY_STORAGE = 'mmai_elevenlabs_api_key';
const ELEVENLABS_VOICE_STORAGE = 'mmai_elevenlabs_voice_id';

// Default voice: Rachel (warm, calm, natural American female voice)
export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export async function getStoredElevenLabsKey(): Promise<string> {
  const envKey =
    process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ||
    process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ||
    process.env.ELEVENLABS_API_KEY ||
    '';
  // Ignore placeholder values from .env.example templates
  if (envKey && !envKey.includes('your_') && !envKey.includes('_here')) return envKey.trim();
  const stored = await safeStorage.getItem(ELEVENLABS_KEY_STORAGE);
  return stored || '';
}

export async function saveStoredElevenLabsKey(key: string): Promise<void> {
  await safeStorage.setItem(ELEVENLABS_KEY_STORAGE, key.trim());
}

export async function getStoredVoiceId(): Promise<string> {
  const stored = await safeStorage.getItem(ELEVENLABS_VOICE_STORAGE);
  return stored || DEFAULT_VOICE_ID;
}

export async function saveStoredVoiceId(voiceId: string): Promise<void> {
  await safeStorage.setItem(ELEVENLABS_VOICE_STORAGE, voiceId.trim());
}

let activeAudio: any = null;

export function stopSpeaking(): void {
  try {
    if (activeAudio) {
      if (typeof activeAudio.pause === 'function') {
        activeAudio.pause();
      }
      activeAudio = null;
    }

    const win: any = typeof window !== 'undefined' ? window : null;
    if (win?.speechSynthesis && typeof win.speechSynthesis.cancel === 'function') {
      win.speechSynthesis.cancel();
    }
  } catch (err) {
    console.warn('Error stopping speech:', err);
  }
}

/**
 * Fallback Web Speech Synthesis (zero external API key required)
 */
function speakWithWebSynthesis(
  text: string,
  capacity: PatientCapacityLevel,
  onStart?: () => void,
  onEnd?: () => void
): void {
  const win: any = typeof window !== 'undefined' ? window : null;

  if (Platform.OS === 'web' && win?.speechSynthesis && win?.SpeechSynthesisUtterance) {
    try {
      win.speechSynthesis.cancel();
      const UtteranceClass = win.SpeechSynthesisUtterance;
      const utterance = new UtteranceClass(text);

      // Adapt rate according to cognitive capacity
      if (capacity === 'supported') {
        utterance.rate = 0.82; // Gentle, slower, very clear
        utterance.pitch = 1.05;
      } else if (capacity === 'moderate') {
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
      } else {
        utterance.rate = 0.98;
        utterance.pitch = 1.0;
      }

      if (onStart) utterance.onstart = () => onStart();
      if (onEnd) utterance.onend = () => onEnd();
      utterance.onerror = () => {
        if (onEnd) onEnd();
      };

      win.speechSynthesis.speak(utterance);
      return;
    } catch {
      // Fallback to simulated duration
    }
  }

  // If running in environment without Web Speech, simulate timer
  if (onStart) onStart();
  const duration = Math.min(Math.max(text.length * 70, 2000), 7000);
  setTimeout(() => {
    if (onEnd) onEnd();
  }, duration);
}

/**
 * Speak text using ElevenLabs Text-to-Speech API with capacity-adapted pacing,
 * with automatic fallback to Web Speech Synthesis.
 */
export async function speakQuestion({
  text,
  capacity = 'moderate',
  onStart,
  onEnd,
  onError,
}: {
  text: string;
  capacity?: PatientCapacityLevel;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}): Promise<void> {
  stopSpeaking();

  const apiKey = await getStoredElevenLabsKey();
  const voiceId = await getStoredVoiceId();

  if (apiKey) {
    try {
      if (onStart) onStart();

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: capacity === 'supported' ? 0.75 : 0.6,
              similarity_boost: 0.8,
              style: 0.2,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs error: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const win: any = typeof window !== 'undefined' ? window : null;
      const btoaFn = win?.btoa || (typeof btoa !== 'undefined' ? btoa : null);
      const base64 = btoaFn ? btoaFn(binary) : null;

      if (base64 && win?.Audio) {
        const audioDataUrl = `data:audio/mpeg;base64,${base64}`;
        const AudioConstructor = win.Audio;
        const audio = new AudioConstructor(audioDataUrl);
        activeAudio = audio;

        if (capacity === 'supported') {
          audio.playbackRate = 0.9;
        } else {
          audio.playbackRate = 1.0;
        }

        audio.onended = () => {
          activeAudio = null;
          if (onEnd) onEnd();
        };

        audio.onerror = () => {
          activeAudio = null;
          speakWithWebSynthesis(text, capacity, onStart, onEnd);
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('ElevenLabs API invocation failed, falling back to Web Speech:', err);
      if (onError) onError(err);
      speakWithWebSynthesis(text, capacity, onStart, onEnd);
      return;
    }
  }

  // Fallback to Web Speech Synthesis
  speakWithWebSynthesis(text, capacity, onStart, onEnd);
}
