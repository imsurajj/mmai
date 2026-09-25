/**
 * Caregiver & Doctor Service for MemoryTrack AI (MMAI)
 * Implements PRD specifications for:
 * - Patient Profiles & Caregiver Linking (PRD 5.2)
 * - Verified Memory Timeline (PRD 5.3)
 * - Daily Memory Checks & Personal Baseline (PRD 5.4, 5.5)
 * - Change Detection & Care Alerts (PRD 5.6)
 * - Medication & Appointment Reminders (PRD 5.8)
 * - Help Request Monitoring (PRD 5.10)
 */

import { safeStorage } from '@/lib/supabase';

export interface TimelineEvent {
  id: string;
  patient_id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  people_involved?: string;
  notes?: string;
  source: string;
  verification_status: 'verified' | 'unverified';
  category?: 'routine' | 'family' | 'medical' | 'social' | 'meal';
  created_at: string;
}

export interface CareReminder {
  id: string;
  patient_id: string;
  title: string;
  instructions?: string;
  scheduled_time: string;
  category: 'medication' | 'appointment' | 'meal' | 'activity' | 'custom';
  recurrence: 'daily' | 'weekly' | 'weekdays' | 'once';
  status: 'active' | 'completed' | 'missed';
  completed_at?: string;
  missed_at?: string;
  created_at: string;
}

export interface MemoryCheckResult {
  id: string;
  patient_id: string;
  completed_at: string;
  object_score: number; // percentage (e.g. 80)
  orientation_score: number; // percentage (e.g. 100)
  recent_event_score: number; // percentage (e.g. 75)
  response_time_seconds: number;
  status: 'completed' | 'partial';
  notes?: string;
}

export interface PersonalBaseline {
  patient_id: string;
  object_average: number;
  orientation_average: number;
  recent_event_average: number;
  average_response_time: number;
  sample_count: number;
  updated_at: string;
}

export interface CareAlert {
  id: string;
  patient_id: string;
  type: 'repeated_deviation' | 'missed_reminder' | 'help_request' | 'observation';
  severity: 'attention' | 'warning' | 'info';
  title: string;
  reason: string;
  status: 'open' | 'reviewed' | 'resolved';
  created_at: string;
  reviewed_at?: string;
}

// Storage Keys
const TIMELINE_STORAGE_KEY = 'mmai_caregiver_timeline';
const REMINDERS_STORAGE_KEY = 'mmai_caregiver_reminders';
const CHECKS_STORAGE_KEY = 'mmai_caregiver_checks';
const ALERTS_STORAGE_KEY = 'mmai_caregiver_alerts';

// Initial Demo Seed Data matching PRD specification
const DEFAULT_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'evt-1',
    patient_id: 'default',
    title: 'Morning Walk with Daughter Sarah',
    description: '20-minute stroll around the community garden.',
    event_date: 'Today',
    event_time: '09:30 AM',
    people_involved: 'Sarah (Daughter)',
    notes: 'Walked at steady pace. Recognized neighbor Mr. Jenkins. High energy.',
    source: 'Caregiver Log',
    verification_status: 'verified',
    category: 'family',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'evt-2',
    patient_id: 'default',
    title: 'Breakfast: Oatmeal & Fresh Blueberries',
    description: 'Nutritious breakfast prepared with caretaker.',
    event_date: 'Today',
    event_time: '08:15 AM',
    people_involved: 'Nurse Elena',
    notes: 'Finished entire meal, drank glass of water with morning vitamins.',
    source: 'Caregiver Log',
    verification_status: 'verified',
    category: 'meal',
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'evt-3',
    patient_id: 'default',
    title: 'Cardiologist Check-up with Dr. Miller',
    description: 'Routine six-month cardiovascular examination.',
    event_date: 'Yesterday',
    event_time: '02:00 PM',
    people_involved: 'Dr. Miller, MD',
    notes: 'Blood pressure steady at 124/82. ECG normal. Next evaluation in 6 months.',
    source: 'Clinical Records',
    verification_status: 'verified',
    category: 'medical',
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
  },
  {
    id: 'evt-4',
    patient_id: 'default',
    title: 'Family Video Call with Grandchildren',
    description: 'FaceTime call with Maya and Leo.',
    event_date: 'Sep 23, 2026',
    event_time: '05:00 PM',
    people_involved: 'Grandchildren (Maya, Leo)',
    notes: 'Recalled Leo recent football tournament victory. Joyful interaction.',
    source: 'Caregiver Log',
    verification_status: 'verified',
    category: 'social',
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'evt-5',
    patient_id: 'default',
    title: 'Physical Therapy: Balance & Mobility',
    description: 'Therapy session focusing on lower-body strength and stability.',
    event_date: 'Sep 22, 2026',
    event_time: '11:00 AM',
    people_involved: 'PT David',
    notes: 'Completed 10 chair stands and tandem balance with zero assistance.',
    source: 'PT Clinical Notes',
    verification_status: 'verified',
    category: 'routine',
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
];

const DEFAULT_REMINDERS: CareReminder[] = [
  {
    id: 'rem-1',
    patient_id: 'default',
    title: 'Donepezil 10mg (Memory Support)',
    instructions: 'Take 1 tablet with fresh water after morning breakfast.',
    scheduled_time: '08:00 AM',
    category: 'medication',
    recurrence: 'daily',
    status: 'completed',
    completed_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'rem-2',
    patient_id: 'default',
    title: 'Hydration Check: 2 Full Glasses of Water',
    instructions: 'Drink room temperature water. Refresh water carafe in room.',
    scheduled_time: '11:30 AM',
    category: 'custom',
    recurrence: 'daily',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rem-3',
    patient_id: 'default',
    title: 'Blood Pressure Log',
    instructions: 'Sit comfortably for 5 minutes before applying the arm cuff.',
    scheduled_time: '02:00 PM',
    category: 'activity',
    recurrence: 'daily',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rem-4',
    patient_id: 'default',
    title: 'Evening Neighborhood Walk',
    instructions: 'Wear supportive walking sneakers. Accompanied by family or caretaker.',
    scheduled_time: '05:30 PM',
    category: 'activity',
    recurrence: 'daily',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rem-5',
    patient_id: 'default',
    title: 'Memantine 10mg (Night Medication)',
    instructions: 'Take before bed with warm herbal chamomile tea.',
    scheduled_time: '08:30 PM',
    category: 'medication',
    recurrence: 'daily',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rem-6',
    patient_id: 'default',
    title: 'Afternoon Gentle Stretches',
    instructions: '15 minutes seated shoulder and calf stretching routine.',
    scheduled_time: '03:00 PM',
    category: 'activity',
    recurrence: 'daily',
    status: 'missed',
    missed_at: new Date(Date.now() - 21 * 3600000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_MEMORY_CHECKS: MemoryCheckResult[] = [
  {
    id: 'chk-1',
    patient_id: 'default',
    completed_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    object_score: 80,
    orientation_score: 100,
    recent_event_score: 75,
    response_time_seconds: 7.4,
    status: 'completed',
    notes: 'Recalled 4/5 objects. Complete orientation to date and place.',
  },
  {
    id: 'chk-2',
    patient_id: 'default',
    completed_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    object_score: 85,
    orientation_score: 90,
    recent_event_score: 80,
    response_time_seconds: 8.1,
    status: 'completed',
    notes: 'Smooth recall. Good confidence.',
  },
  {
    id: 'chk-3',
    patient_id: 'default',
    completed_at: new Date(Date.now() - 50 * 3600000).toISOString(),
    object_score: 90,
    orientation_score: 90,
    recent_event_score: 85,
    response_time_seconds: 7.9,
    status: 'completed',
    notes: 'Prompt responses across all 3 domains.',
  },
  {
    id: 'chk-4',
    patient_id: 'default',
    completed_at: new Date(Date.now() - 74 * 3600000).toISOString(),
    object_score: 85,
    orientation_score: 90,
    recent_event_score: 85,
    response_time_seconds: 8.5,
    status: 'completed',
  },
  {
    id: 'chk-5',
    patient_id: 'default',
    completed_at: new Date(Date.now() - 98 * 3600000).toISOString(),
    object_score: 85,
    orientation_score: 90,
    recent_event_score: 85,
    response_time_seconds: 7.2,
    status: 'completed',
  },
  {
    id: 'chk-6',
    patient_id: 'default',
    completed_at: new Date(Date.now() - 122 * 3600000).toISOString(),
    object_score: 85,
    orientation_score: 90,
    recent_event_score: 80,
    response_time_seconds: 7.7,
    status: 'completed',
  },
];

const DEFAULT_ALERTS: CareAlert[] = [
  {
    id: 'alt-1',
    patient_id: 'default',
    type: 'repeated_deviation',
    severity: 'attention',
    title: 'Observation: Recent Event Recall Below Baseline',
    reason: 'Recent event score (75%) was 7% below personal baseline for 2 consecutive checks. Note: Observation only, not a clinical diagnosis.',
    status: 'open',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'alt-2',
    patient_id: 'default',
    type: 'missed_reminder',
    severity: 'warning',
    title: 'Missed Reminder: Afternoon Gentle Stretches',
    reason: 'Scheduled for yesterday at 03:00 PM, unconfirmed after 45 minutes.',
    status: 'reviewed',
    created_at: new Date(Date.now() - 21 * 3600000).toISOString(),
    reviewed_at: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
];

// Helper to safely fetch list
async function getStoredList<T>(key: string, defaultVal: T[]): Promise<T[]> {
  try {
    const raw = await safeStorage.getItem(key);
    if (!raw) {
      await safeStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

async function saveStoredList<T>(key: string, list: T[]): Promise<void> {
  try {
    await safeStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.error(`Error saving ${key}:`, err);
  }
}

// -------------------------------------------------------------
// TIMELINE API (PRD 5.3)
// -------------------------------------------------------------
export async function getTimelineEvents(patientId?: string): Promise<TimelineEvent[]> {
  const events = await getStoredList<TimelineEvent>(TIMELINE_STORAGE_KEY, DEFAULT_TIMELINE_EVENTS);
  if (!patientId || patientId === 'all') return events;
  return events.filter((e) => e.patient_id === patientId || e.patient_id === 'default');
}

export async function addTimelineEvent(
  event: Omit<TimelineEvent, 'id' | 'created_at'>
): Promise<TimelineEvent> {
  const current = await getTimelineEvents();
  const newEvent: TimelineEvent = {
    ...event,
    id: `evt-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const updated = [newEvent, ...current];
  await saveStoredList(TIMELINE_STORAGE_KEY, updated);
  return newEvent;
}

export async function deleteTimelineEvent(eventId: string): Promise<void> {
  const current = await getTimelineEvents();
  const updated = current.filter((e) => e.id !== eventId);
  await saveStoredList(TIMELINE_STORAGE_KEY, updated);
}

// -------------------------------------------------------------
// REMINDERS API (PRD 5.8)
// -------------------------------------------------------------
export async function getCareReminders(patientId?: string): Promise<CareReminder[]> {
  const reminders = await getStoredList<CareReminder>(REMINDERS_STORAGE_KEY, DEFAULT_REMINDERS);
  if (!patientId || patientId === 'all') return reminders;
  return reminders.filter((r) => r.patient_id === patientId || r.patient_id === 'default');
}

export async function addCareReminder(
  reminder: Omit<CareReminder, 'id' | 'created_at' | 'status'>
): Promise<CareReminder> {
  const current = await getCareReminders();
  const newRem: CareReminder = {
    ...reminder,
    id: `rem-${Date.now()}`,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  const updated = [newRem, ...current];
  await saveStoredList(REMINDERS_STORAGE_KEY, updated);
  return newRem;
}

export async function toggleReminderStatus(
  reminderId: string,
  newStatus: 'active' | 'completed' | 'missed'
): Promise<CareReminder | null> {
  const current = await getCareReminders();
  let updatedItem: CareReminder | null = null;
  const updated = current.map((r) => {
    if (r.id === reminderId) {
      updatedItem = {
        ...r,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
        missed_at: newStatus === 'missed' ? new Date().toISOString() : undefined,
      };
      return updatedItem;
    }
    return r;
  });
  await saveStoredList(REMINDERS_STORAGE_KEY, updated);
  return updatedItem;
}

export async function deleteCareReminder(reminderId: string): Promise<void> {
  const current = await getCareReminders();
  const updated = current.filter((r) => r.id !== reminderId);
  await saveStoredList(REMINDERS_STORAGE_KEY, updated);
}

// -------------------------------------------------------------
// MEMORY CHECKS & BASELINE (PRD 5.4, 5.5)
// -------------------------------------------------------------
export async function getMemoryChecks(patientId?: string): Promise<MemoryCheckResult[]> {
  const checks = await getStoredList<MemoryCheckResult>(CHECKS_STORAGE_KEY, DEFAULT_MEMORY_CHECKS);
  if (!patientId || patientId === 'all') return checks;
  return checks.filter((c) => c.patient_id === patientId || c.patient_id === 'default');
}

export async function calculatePersonalBaseline(patientId?: string): Promise<PersonalBaseline> {
  const checks = await getMemoryChecks(patientId);
  const sampleCount = checks.length;

  if (sampleCount === 0) {
    return {
      patient_id: patientId || 'default',
      object_average: 85,
      orientation_average: 90,
      recent_event_average: 82,
      average_response_time: 7.8,
      sample_count: 0,
      updated_at: new Date().toISOString(),
    };
  }

  const sumObj = checks.reduce((acc, c) => acc + c.object_score, 0);
  const sumOri = checks.reduce((acc, c) => acc + c.orientation_score, 0);
  const sumRec = checks.reduce((acc, c) => acc + c.recent_event_score, 0);
  const sumTime = checks.reduce((acc, c) => acc + c.response_time_seconds, 0);

  return {
    patient_id: patientId || 'default',
    object_average: Math.round(sumObj / sampleCount),
    orientation_average: Math.round(sumOri / sampleCount),
    recent_event_average: Math.round(sumRec / sampleCount),
    average_response_time: parseFloat((sumTime / sampleCount).toFixed(1)),
    sample_count: sampleCount,
    updated_at: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// CARE ALERTS (PRD 5.6, 5.9)
// -------------------------------------------------------------
export async function getCareAlerts(patientId?: string): Promise<CareAlert[]> {
  const alerts = await getStoredList<CareAlert>(ALERTS_STORAGE_KEY, DEFAULT_ALERTS);
  if (!patientId || patientId === 'all') return alerts;
  return alerts.filter((a) => a.patient_id === patientId || a.patient_id === 'default');
}

export async function markAlertStatus(
  alertId: string,
  newStatus: 'reviewed' | 'resolved'
): Promise<void> {
  const current = await getCareAlerts();
  const updated = current.map((a) => {
    if (a.id === alertId) {
      return {
        ...a,
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      };
    }
    return a;
  });
  await saveStoredList(ALERTS_STORAGE_KEY, updated);
}
