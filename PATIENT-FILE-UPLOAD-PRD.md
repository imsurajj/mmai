# Patient File Uploads - Feature PRD

## 1. Feature Summary

Allow a patient to upload and review their own files from the Patient screen.
The feature is intended for the hackathon MVP and must remain simple, private,
and easy to scale later.

Patients can:

- Open a dedicated Files tab from the Patient screen.
- Upload a file from the device.
- See all files belonging to their patient profile.
- See the original file name, file type/format badge, size, and upload date.
- Open or download a file when the device supports that format.
- Delete their own uploaded files.
- See clear loading, empty, permission, and upload error states.

The feature must not expose files belonging to another patient.

## 2. Goals

- Give patients one clear place to manage personal documents.
- Support common healthcare-related file formats for the demo.
- Keep files private by default.
- Reuse the existing Patient navigation, authentication, theme, and Supabase
  project.
- Avoid storing file contents in the mobile app or committing files to the
  repository.

## 3. Non-Goals for the Hackathon

- Medical document OCR or automatic diagnosis.
- AI interpretation of uploaded documents.
- Multi-user file sharing.
- Version history.
- Full document editing.
- Background uploads.
- Large media and video processing.
- Public file URLs.

## 4. Patient User Flow

```text
Patient Dashboard
      |
      v
Patient Files tab
      |
      +--> Empty state: Upload your first file
      |
      +--> File list: All uploaded files
                    |
                    +--> Upload file
                    +--> Open file
                    +--> Delete file
```

### Upload flow

1. Patient opens the Files tab.
2. Patient taps the Upload file button.
3. The native document picker opens.
4. Patient selects one supported file.
5. The app validates file type and size before uploading.
6. The app uploads the file to the private storage bucket.
7. The app creates a metadata record linked to the patient.
8. The new file appears at the top of the list.
9. The app shows a success message with the file name.

### Permission and cancellation behavior

- If the patient cancels the picker, remain on the Files tab without an error.
- If device file access is denied, show a human-readable settings message.
- Disable the upload action while an upload is in progress.
- Never create a metadata row if the file upload fails.
- If metadata creation fails after upload, remove the orphaned storage object
  or mark it for cleanup.

## 5. Files Screen UX

### Header

- Title: `My Files`
- Subtitle: `Private files uploaded to your health workspace`
- Upload icon button with an accessible label: `Upload file`

### Empty state

- Document icon or existing app icon component.
- Text: `No files yet`.
- Supporting text: `Upload a document, image, or report to keep it here.`
- Primary action: `Upload file`.

### File list

Each file row must display:

- File name, truncated safely when long.
- Format badge, such as `PDF`, `JPG`, `PNG`, or `DOCX`.
- Human-readable file size.
- Upload date and time.
- File icon based on format.
- More/action button for open and delete.

Example:

```text
[PDF]  blood-report-september.pdf
       1.2 MB  |  25 Sep 2026
                                      [ ... ]
```

The list should be sorted newest first. The latest uploaded file should be
visually prominent without becoming a large decorative card.

### Supported hackathon formats

- PDF: `application/pdf`
- Images: `image/jpeg`, `image/png`, `image/webp`
- Documents: `application/msword`,
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Plain text: `text/plain`

Recommended maximum size: 10 MB per file for the hackathon.

## 6. Data Model

### `patient_files` table

| Column            | Type                                  | Requirements                   |
| ----------------- | ------------------------------------- | ------------------------------ |
| `id`              | `uuid`                                | Primary key                    |
| `patient_id`      | `uuid` or existing patient identifier | Required owner                 |
| `storage_path`    | `text`                                | Private bucket path            |
| `file_name`       | `text`                                | Original display name          |
| `mime_type`       | `text`                                | Validated format               |
| `file_extension`  | `text`                                | Normalized lowercase extension |
| `file_size_bytes` | `bigint`                              | Required                       |
| `created_at`      | `timestamptz`                         | Server-generated               |
| `uploaded_by`     | `text` or `uuid`                      | Audit field                    |

The storage path should be namespaced, for example:

```text
patients/{patient_id}/{file_id}-{safe_file_name}
```

Never use the original filename as the only storage key.

## 7. Storage Recommendation for the Hackathon

### Recommended: Supabase Storage free tier

Use a private Supabase Storage bucket because the project already uses
Supabase. This avoids adding another vendor, supports signed URLs, and keeps
file metadata and patient records in the same backend.

Suggested bucket:

```text
patient-files
```

Bucket rules:

- Private bucket; no public URLs.
- Upload only to the authenticated patient's namespace.
- Read only files belonging to the current patient.
- Delete only files owned by the current patient.
- Use short-lived signed URLs for opening files.
- Enforce the file size and MIME type checks in the client and backend.

Important: the Supabase service-role key must never be included in the Expo
mobile bundle. Storage policies or a server-side endpoint must enforce access.

### Other free or low-cost options

| Option                     | Good for                                     | Limitation                                             |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| Supabase Storage           | Best fit for this existing project           | Free quota and bandwidth limits                        |
| Firebase Storage           | Good alternative if Firebase is already used | Adds another backend and billing setup                 |
| Cloudinary                 | Image-heavy demos and transformations        | Less natural for private healthcare documents          |
| Device-only storage        | Offline prototype                            | Files are not available across devices and can be lost |
| Google Drive/Dropbox links | Manual demo workaround                       | Not integrated, inconsistent permissions               |

Do not use GitHub, public object storage, or public file URLs for patient files.

## 8. Technical Implementation Plan

### Mobile

Use the already installed `expo-document-picker` package:

- Pick one file with `copyToCacheDirectory: true`.
- Read the selected file URI, name, MIME type, and size.
- Validate supported MIME types and the 10 MB limit.
- Upload with the Supabase Storage client or a secure backend upload endpoint.
- Refresh the patient's metadata list after success.
- Use `expo-file-system` only if the chosen upload flow requires streaming or
  explicit file-size inspection.
- Use React Native `Linking` or the platform document viewer to open a signed
  URL.

### Backend

Add a Supabase migration containing:

1. `patient_files` table.
2. Index on `patient_id, created_at desc`.
3. Row-level policies for select, insert, and delete.
4. Storage object policies for the `patient-files` bucket.
5. Optional cleanup function for orphaned objects.

Because the app's patient login currently uses a custom patient session, the
implementation must verify how that session maps to Supabase authorization.
If standard Supabase Auth claims are not available for patients, use a small
server-side endpoint or protected RPC that validates the active patient session
before issuing signed upload/read URLs.

### App integration

- Add `files` to the existing `PatientTab` type.
- Add a Files item to the existing Patient bottom navigation.
- Create `PatientFilesTab` using the existing `Text`, `View`, `Button`, icon,
  toast, and theme patterns.
- Create a small `patient-files-service.ts` for list, upload, signed URL, and
  delete operations.
- Keep upload state local to the Files tab.
- Do not change the existing authentication or caregiver flows.

## 9. Security and Privacy Requirements

- Files are private by default.
- Every metadata query is filtered by the active patient ID.
- Storage paths include the patient namespace and generated file ID.
- Never trust a client-provided `patient_id` without server authorization.
- Never expose service-role credentials in `.env` variables prefixed with
  `EXPO_PUBLIC_`.
- Generate short-lived signed URLs only when the patient opens a file.
- Log upload and delete actions without logging file contents.
- Do not send uploaded documents to Gemini or ElevenLabs in this phase.
- Display a short privacy note on the Files screen.

## 10. Acceptance Criteria

- A logged-in patient can open the Files tab.
- A patient can upload a supported file under 10 MB.
- Unsupported formats show a clear validation message.
- Files appear newest first after upload.
- Each row shows file name, format badge, size, and upload date.
- A patient can open a file through a short-lived signed URL.
- A patient can delete their own file after confirmation.
- A patient cannot list, open, or delete another patient's files.
- Cancelling the picker does not show an error.
- Upload failures do not leave misleading metadata rows.
- The feature uses the existing theme and navigation.
- The feature works on Android and iOS development builds.

## 11. Manual Test Checklist

- Upload a PDF.
- Upload a JPG or PNG.
- Upload a DOCX.
- Try an unsupported file type.
- Try a file larger than 10 MB.
- Cancel the picker.
- Disable file permission and retry.
- Open each supported file type.
- Delete a file and confirm it disappears.
- Log out and log in as another patient; verify files are isolated.
- Kill and reopen the app; verify metadata persists.
- Test with slow or disconnected network.

## 12. Scale-Up Plan

When usage grows:

- Move uploads behind a dedicated authenticated upload endpoint.
- Use resumable or multipart uploads for large files.
- Add virus/malware scanning before making a file available.
- Add background upload and retry queues.
- Add retention policies and storage lifecycle rules.
- Add audit logs and caregiver sharing with explicit consent.
- Add OCR as a separate opt-in workflow with redaction and review.
- Add pagination and database-backed search.
- Consider a dedicated object storage provider only after Supabase quotas or
  bandwidth become a real constraint.

## 13. Hackathon Decision

Use Supabase Storage with a private `patient-files` bucket and a
`patient_files` metadata table. Reuse the existing Expo Document Picker and
Supabase project. Keep the first implementation limited to patient-owned file
upload, listing, opening, and deletion. Do not add AI document processing in
this feature.
