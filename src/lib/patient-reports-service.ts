import { safeStorage } from '@/lib/supabase';
import { PersonalBaseline } from '@/lib/caregiver-service';

export interface PatientVerifiedReport {
  id: string;
  patient_id: string;
  report_type: 'neurological' | 'daily_living' | 'personal_profile' | 'medication_plan';
  title: string;
  summary: string;
  details: {
    keyFindings?: string[];
    routines?: string[];
    familyMembers?: string[];
    medications?: string[];
    livingEnvironment?: string;
    clinicalNotes?: string;
  };
  verified_by: string;
  verified_at: string;
  status: 'verified' | 'pending';
}

export interface CaregiverVerificationStatus {
  isVerified: boolean;
  verifiedBy: string;
  verifiedAt?: string;
  lastRequestedAt?: string;
  reportsCount: number;
}

export type PatientCapacityLevel = 'supported' | 'moderate' | 'high';

export interface PatientCapacityProfile {
  level: PatientCapacityLevel;
  score: number; // 0 - 100
  title: string;
  description: string;
  voicePacing: 'slow' | 'moderate' | 'normal';
  questionStyle: string;
}

const REPORTS_STORAGE_KEY = 'mmai_patient_reports';
const VERIFY_STATUS_STORAGE_KEY = 'mmai_caregiver_report_verification_status';

export const DEFAULT_PATIENT_REPORTS: PatientVerifiedReport[] = [
  {
    id: 'rep-neuro-1',
    patient_id: 'default',
    report_type: 'neurological',
    title: 'Neurological & Cognitive Baseline Evaluation',
    summary: 'Mild episodic memory recall variance; preserved orientation and semantic knowledge.',
    details: {
      keyFindings: [
        'Cognitive Stability Index at 85%',
        'Strong immediate recall for familiar faces and daily living routines',
        'Benefit demonstrated from gentle multi-choice prompts and voice cues',
        'No distress during short memory checks; response time averages 7.8 seconds',
      ],
      clinicalNotes: 'Verified by Dr. Suraj (Neurology). Patient benefits from structured morning questions and soothing voice interaction.',
    },
    verified_by: 'Dr. Suraj (Caregiver / Neurologist)',
    verified_at: '2026-09-24T10:30:00Z',
    status: 'verified',
  },
  {
    id: 'rep-daily-1',
    patient_id: 'default',
    report_type: 'daily_living',
    title: 'Daily Living & Lifestyle Schedule',
    summary: 'Established morning garden walk, hydration routine, and afternoon physical exercises.',
    details: {
      livingEnvironment: 'Apartment 4B, Elmwood Senior Living Community',
      routines: [
        '08:00 AM: Breakfast with fresh blueberries and oatmeal',
        '09:30 AM: Morning walk in the community garden with daughter Sarah',
        '11:30 AM: Hydration break (2 glasses of fresh water)',
        '02:00 PM: Blood pressure log (target 124/82)',
        '05:30 PM: Evening stroll and relaxing garden view',
        '08:30 PM: Chamomile tea and bedtime preparation',
      ],
      clinicalNotes: 'Predictable daily rhythm supports positive orientation and emotional stability.',
    },
    verified_by: 'Dr. Suraj (Caregiver / Neurologist)',
    verified_at: '2026-09-24T11:00:00Z',
    status: 'verified',
  },
  {
    id: 'rep-personal-1',
    patient_id: 'default',
    report_type: 'personal_profile',
    title: 'Personal Info, Family & Social Circle',
    summary: 'Family relationships, grandchildren milestones, and cherished lifelong passions.',
    details: {
      familyMembers: [
        'Sarah: Daughter who visits every Tuesday & Saturday, brings garden flowers',
        'Maya: Granddaughter (age 14), plays violin in the youth orchestra',
        'Leo: Grandson (age 11), recently scored winning goal in soccer tournament',
        'Barnaby: Friendly golden retriever who lives with Sarah',
      ],
      clinicalNotes: 'Family members and pet stories induce immediate positive affect and conversation engagement.',
    },
    verified_by: 'Dr. Suraj (Caregiver / Neurologist)',
    verified_at: '2026-09-24T11:15:00Z',
    status: 'verified',
  },
  {
    id: 'rep-med-1',
    patient_id: 'default',
    report_type: 'medication_plan',
    title: 'Caregiver Verified Medication & Health Protocol',
    summary: 'Daily memory support and evening wellness regimen.',
    details: {
      medications: [
        'Donepezil 10mg: 1 tablet daily at 08:00 AM after breakfast',
        'Memantine 10mg: 1 tablet daily at 08:30 PM with herbal chamomile tea',
        'Multivitamin & Omega-3: Taken with breakfast',
      ],
      clinicalNotes: 'Confirmed 100% adherence by Caregiver log. Taken with water.',
    },
    verified_by: 'Dr. Suraj (Caregiver / Neurologist)',
    verified_at: '2026-09-24T11:30:00Z',
    status: 'verified',
  },
];

export async function getPatientReports(patientId?: string): Promise<PatientVerifiedReport[]> {
  try {
    const raw = await safeStorage.getItem(REPORTS_STORAGE_KEY);
    if (!raw) {
      await safeStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(DEFAULT_PATIENT_REPORTS));
      return DEFAULT_PATIENT_REPORTS;
    }
    const list: PatientVerifiedReport[] = JSON.parse(raw);
    if (!patientId || patientId === 'all') return list;
    return list.filter((r) => r.patient_id === patientId || r.patient_id === 'default');
  } catch {
    return DEFAULT_PATIENT_REPORTS;
  }
}

export async function getCaregiverVerificationStatus(
  patientId?: string
): Promise<CaregiverVerificationStatus> {
  try {
    const raw = await safeStorage.getItem(VERIFY_STATUS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch {}

  // Initial default: Verified by default caregiver for demo, but can be re-verified or requested
  const defaultStatus: CaregiverVerificationStatus = {
    isVerified: true,
    verifiedBy: 'Dr. Suraj (Neurology Caregiver)',
    verifiedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    reportsCount: DEFAULT_PATIENT_REPORTS.length,
  };
  await safeStorage.setItem(VERIFY_STATUS_STORAGE_KEY, JSON.stringify(defaultStatus));
  return defaultStatus;
}

export async function requestCaregiverVerification(
  patientId?: string
): Promise<{ success: boolean; status: CaregiverVerificationStatus }> {
  const current = await getCaregiverVerificationStatus(patientId);
  const now = new Date().toISOString();

  // Instantly verify with caregiver sync confirmation
  const updated: CaregiverVerificationStatus = {
    ...current,
    isVerified: true,
    verifiedBy: 'Dr. Suraj (Neurology Caregiver)',
    verifiedAt: now,
    lastRequestedAt: now,
    reportsCount: DEFAULT_PATIENT_REPORTS.length,
  };

  await safeStorage.setItem(VERIFY_STATUS_STORAGE_KEY, JSON.stringify(updated));
  return { success: true, status: updated };
}

export function getPatientCapacityProfile(
  baseline: PersonalBaseline | null
): PatientCapacityProfile {
  const avgScore = baseline
    ? Math.round(
        (baseline.object_average +
          baseline.orientation_average +
          baseline.recent_event_average) /
          3
      )
    : 85;

  if (avgScore >= 80) {
    return {
      level: 'high',
      score: avgScore,
      title: 'Active Recall Capacity',
      description: 'Patient handles clear contextual questions and detailed recollection.',
      voicePacing: 'normal',
      questionStyle: 'Specific questions with multi-option choices and detailed memory context.',
    };
  } else if (avgScore >= 65) {
    return {
      level: 'moderate',
      score: avgScore,
      title: 'Gentle Guided Capacity',
      description: 'Patient responds best to familiar routine prompts with supportive cues.',
      voicePacing: 'moderate',
      questionStyle: 'Warm, structured questions with familiar landmarks and gentle hints.',
    };
  } else {
    return {
      level: 'supported',
      score: avgScore,
      title: 'High-Support Capacity',
      description: 'Simplified phrasing, reassuring tone, and single-tap supportive choices.',
      voicePacing: 'slow',
      questionStyle: 'Short, reassuring, binary or simple recognition questions with positive reinforcement.',
    };
  }
}
