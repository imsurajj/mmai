export type DoctorTab = 'dashboard' | 'patients' | 'timeline' | 'reminders' | 'settings' | 'notifications';
export type PatientDetailSubTab = 'analytics' | 'timeline' | 'reminders';
export type ReminderFilter = 'all' | 'active' | 'completed' | 'missed';
export type SettingsSubPage = 'profile' | 'subscription' | 'appSettings' | 'security' | 'notifications' | 'theme' | null;

export function formatDoctorName(name?: string) {
  if (!name) return 'Dr. Suraj';
  // Strip any repetitive "Dr.", "Dr", "dr.", "dr", "Doctor", "doctor" prefixes
  const cleaned = name.trim().replace(/^((dr|doctor)\.?\s*)+/gi, '').trim();
  if (!cleaned) return 'Dr. Suraj';
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return `Dr. ${capitalized}`;
}
