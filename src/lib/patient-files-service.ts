import { supabase } from "@/lib/supabase";

export type PatientFile = {
  id: string;
  patient_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_extension: string;
  file_size_bytes: number;
  created_at: string;
  uploaded_by?: string;
};

export async function uploadPatientFile({
  patientId,
  filePath,
  fileName,
  mimeType,
  onProgress,
}: {
  patientId: string;
  filePath: string; // local file uri
  fileName: string;
  mimeType: string;
  onProgress?: (p: number) => void;
}) {
  // Placeholder implementation: upload to Supabase storage under patients/{patientId}/
  const fileId = cryptoRandomId();
  const safeName = `${fileId}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const storagePath = `patient-files/${patientId}/${safeName}`;

  // Read file into a blob (works on web and React Native cached uri)
  const fetched = await fetch(filePath);
  const blob = await fetched.blob();

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("patient-files")
    .upload(storagePath, blob, { contentType: mimeType });
  if (uploadErr) throw uploadErr;

  // create metadata row if your Supabase table exists
  const { data: row, error: rowErr } = await supabase
    .from("patient_files")
    .insert([
      {
        patient_id: patientId,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: mimeType,
        file_size_bytes: (blob as any)?.size ?? null,
        file_extension: getExtension(fileName),
      },
    ])
    .select()
    .single();
  if (rowErr) {
    // best-effort: delete created object
    await supabase.storage.from("patient-files").remove([storagePath]);
    throw rowErr;
  }

  return row as PatientFile;
}

export async function listPatientFiles(patientId: string) {
  const { data, error } = await supabase
    .from("patient_files")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as PatientFile[];
}

export async function deletePatientFile(file: PatientFile) {
  // delete metadata then remove storage object
  const { error } = await supabase
    .from("patient_files")
    .delete()
    .eq("id", file.id);
  if (error) throw error;
  const { error: rmErr } = await supabase.storage
    .from("patient-files")
    .remove([file.storage_path]);
  if (rmErr) throw rmErr;
  return true;
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

export async function getSignedUrl(storagePath: string, expiresSec = 60) {
  const { data, error } = await supabase.storage
    .from("patient-files")
    .createSignedUrl(storagePath, expiresSec);
  if (error) throw error;
  return data.signedUrl as string;
}

function getExtension(name: string) {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx + 1).toLowerCase();
}
