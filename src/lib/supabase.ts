import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { sendPatientAccessKeyEmail, sendPatientLoginOtpEmail } from "./resend";

function isValidConfig(val: string | undefined): boolean {
  return Boolean(
    val &&
    !val.includes("your-project") &&
    !val.includes("your_") &&
    !val.includes("_here"),
  );
}

const envUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = isValidConfig(envUrl)
  ? envUrl!
  : "https://placeholder.supabase.co";

const envKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseAnonKey = isValidConfig(envKey)
  ? envKey!
  : "placeholder-anon-key";

// Secure storage adapter compatible with React Native (AsyncStorage) and Web
export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        window.localStorage
      ) {
        return window.localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        window.localStorage
      ) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      // storage error fallback
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        window.localStorage
      ) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      // storage error fallback
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const PATIENT_SESSION_STORAGE_KEY = "@mmai_patient_session";

export type PatientSession = {
  patient_id: string | null;
  patient_name: string;
  doctor_id: string | null;
  key_id: string;
  role: "patient";
  login_at: string;
};

export type CurrentSessionUser = {
  id: string;
  email?: string;
  name: string;
  role: "doctor" | "patient";
};

export type PatientAccessKey = {
  id: string;
  patient_name: string;
  patient_email: string | null;
  access_code: string;
  is_active: boolean;
  doctor_id: string | null;
  created_at: string;
  last_used_at?: string | null;
};

/**
 * Doctor Sign Up via Supabase Auth
 */
export async function signUpDoctor({
  email,
  password,
  fullName,
}: {
  email: string;
  password: string;
  fullName: string;
}) {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        role: "doctor",
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Doctor Verify 6-digit Email OTP
 */
export async function verifyDoctorOtp({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  // Try signup token type first
  let { data, error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: "signup",
  });

  // Fallback to standard email OTP if already registered
  if (error) {
    const fallback = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "email",
    });
    if (!fallback.error) {
      data = fallback.data;
      error = null;
    }
  }

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Doctor Sign In with Email & Password
 */
export async function signInDoctor({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Resend Email Verification Code
 */
export async function resendDoctorOtp(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: cleanEmail,
  });

  if (error) {
    throw error;
  }
}

/**
 * Patient Login with 6-digit Secret Key via secure RPC
 */
export async function loginPatientWithSecretKey(
  secretCode: string,
): Promise<PatientSession> {
  const cleanCode = secretCode.trim();

  const { data, error } = await supabase.rpc("verify_patient_access_key", {
    p_code: cleanCode,
  });

  if (error) {
    throw new Error(error.message || "Failed to verify access key.");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Invalid or expired access key.");
  }

  const session: PatientSession = {
    patient_id: data.patient_id,
    patient_name: data.patient_name || "Patient",
    doctor_id: data.doctor_id,
    key_id: data.key_id,
    role: "patient",
    login_at: new Date().toISOString(),
  };

  // Persist patient session
  await safeStorage.setItem(
    PATIENT_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );

  return session;
}

/**
 * Patient Login Step 1: Verify secret key and send 6-digit OTP to patient email via Resend
 */
export async function requestPatientLoginOtp(secretCode: string) {
  const cleanCode = secretCode.trim();

  const { data, error } = await supabase.rpc("request_patient_login_otp", {
    p_code: cleanCode,
  });

  if (error) {
    throw new Error(
      error.message || "Failed to request login verification code.",
    );
  }

  if (!data?.success) {
    throw new Error(data?.error || "Invalid or expired access key.");
  }

  // If patient has an email, dispatch the 6-digit OTP via Resend
  if (data.patient_email && data.otp) {
    await sendPatientLoginOtpEmail({
      to: data.patient_email,
      patientName: data.patient_name || "Patient",
      otpCode: data.otp,
    });
  }

  return {
    patient_id: data.patient_id,
    patient_name: data.patient_name,
    patient_email: data.patient_email,
    doctor_id: data.doctor_id,
    key_id: data.key_id,
    otp: data.otp,
  };
}

/**
 * Patient Login Step 2: Verify the 6-digit Email OTP and complete login
 */
export async function verifyPatientLoginOtp({
  secretCode,
  otpCode,
}: {
  secretCode: string;
  otpCode: string;
}): Promise<PatientSession> {
  const cleanCode = secretCode.trim();
  const cleanOtp = otpCode.trim();

  const { data, error } = await supabase.rpc("verify_patient_login_otp", {
    p_code: cleanCode,
    p_otp: cleanOtp,
  });

  if (error) {
    throw new Error(error.message || "Verification failed.");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Incorrect or expired verification code.");
  }

  const session: PatientSession = {
    patient_id: data.patient_id,
    patient_name: data.patient_name || "Patient",
    doctor_id: data.doctor_id,
    key_id: data.key_id,
    role: "patient",
    login_at: new Date().toISOString(),
  };

  // Persist patient session
  await safeStorage.setItem(
    PATIENT_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );

  return session;
}

/**
 * Doctor: Create a Patient with an auto-generated unique 6-digit access code
 */
export async function createPatient({
  patientName,
  patientEmail,
  doctorName,
}: {
  patientName: string;
  patientEmail?: string;
  doctorName?: string;
}): Promise<PatientAccessKey> {
  const cleanName = patientName.trim();
  const cleanEmail = patientEmail?.trim() || null;

  const { data, error } = await supabase.rpc(
    "create_patient_with_access_code",
    {
      p_patient_name: cleanName,
      p_patient_email: cleanEmail,
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to create patient access code.");
  }

  const createdPatient: PatientAccessKey = data as PatientAccessKey;

  // If patient has an email, send them their 6-digit access key via Resend
  if (cleanEmail && createdPatient.access_code) {
    try {
      await sendPatientAccessKeyEmail({
        to: cleanEmail,
        patientName: cleanName,
        accessCode: createdPatient.access_code,
        doctorName: doctorName || "Your Doctor",
      });
    } catch (emailErr) {
      console.warn("[Notice] Could not send email via Resend:", emailErr);
    }
  }

  return createdPatient;
}

/**
 * Doctor: Get all patients managed by this doctor
 */
export async function getDoctorPatients(): Promise<PatientAccessKey[]> {
  const { data, error } = await supabase
    .from("patient_access_keys")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to fetch patients.");
  }

  return (data || []) as PatientAccessKey[];
}

/**
 * Doctor: Delete/Revoke a patient access key
 */
export async function deleteDoctorPatient(patientKeyId: string): Promise<void> {
  const { error } = await supabase
    .from("patient_access_keys")
    .delete()
    .eq("id", patientKeyId);

  if (error) {
    throw new Error(error.message || "Failed to remove patient.");
  }
}

/**
 * Get current active session (either Doctor from Supabase Auth or Patient from Local Session)
 */
export async function getActiveSessionUser(): Promise<CurrentSessionUser | null> {
  // 1. Check Supabase Doctor session
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) {
    const user = data.session.user;
    return {
      id: user.id,
      email: user.email,
      name:
        user.user_metadata?.full_name || user.email?.split("@")[0] || "Doctor",
      role: "doctor",
    };
  }

  // 2. Check Patient session
  const patientRaw = await safeStorage.getItem(PATIENT_SESSION_STORAGE_KEY);
  if (patientRaw) {
    try {
      const patient: PatientSession = JSON.parse(patientRaw);
      return {
        id: patient.patient_id || patient.key_id,
        name: patient.patient_name,
        role: "patient",
      };
    } catch {
      await safeStorage.removeItem(PATIENT_SESSION_STORAGE_KEY);
    }
  }

  return null;
}

/**
 * Global Sign Out
 */
export async function appSignOut() {
  await safeStorage.removeItem(PATIENT_SESSION_STORAGE_KEY);
  await supabase.auth.signOut();
}
