import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akguioteugcnfokdwlka.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZ3Vpb3RldWdjbmZva2R3bGthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDI5NzEyOCwiZXhwIjoyMTA1ODczMTI4fQ.VI7RCJFvEgTWm1VFUJ4ID-_kftOLE1OB9a3Hfg7SSEg';
const RESEND_API_KEY = 're_KfX5m5M3_KLkhnN2PvqSrEuEuecybef8z';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('--- Seeding Demo Users into Supabase ---');

  const doctorEmail = 'iamsurajbro946@gmail.com';
  const doctorPassword = 'Doctor@12345';
  const doctorName = 'Dr. Suraj';

  const patientEmail = 'abhi.parashar962006@gmail.com';
  const patientName = 'Abhi Parashar';
  const patientCode = '482910';

  // 1. Create or Find Doctor Account
  console.log(`Checking Doctor Account: ${doctorEmail}...`);
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  let doctorUser = usersData.users.find((u) => u.email?.toLowerCase() === doctorEmail.toLowerCase());

  if (!doctorUser) {
    console.log('Creating new Doctor in Supabase Auth...');
    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
      email: doctorEmail,
      password: doctorPassword,
      email_confirm: true,
      user_metadata: {
        full_name: doctorName,
        role: 'doctor',
      },
    });
    if (createErr) throw createErr;
    doctorUser = createData.user;
    console.log('Doctor created successfully with ID:', doctorUser.id);
  } else {
    console.log('Doctor already exists with ID:', doctorUser.id);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(doctorUser.id, {
      password: doctorPassword,
      email_confirm: true,
      user_metadata: {
        full_name: doctorName,
        role: 'doctor',
      },
    });
    if (updateErr) console.warn('Could not update doctor password:', updateErr.message);
    else console.log('Doctor password refreshed to:', doctorPassword);
  }

  // 2. Ensure Profile exists in public.profiles
  console.log('Upserting Doctor Profile...');
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: doctorUser.id,
    role: 'doctor',
    full_name: doctorName,
    email: doctorEmail,
    updated_at: new Date().toISOString(),
  });
  if (profileErr) console.warn('Profile upsert note:', profileErr.message);

  // 3. Upsert Patient in public.patient_access_keys
  console.log(`Upserting Patient Key for ${patientName} (${patientEmail})...`);
  const { data: existingKey } = await supabase
    .from('patient_access_keys')
    .select('*')
    .eq('access_code', patientCode)
    .single();

  let finalPatientKey;
  if (!existingKey) {
    const { data: inserted, error: insertErr } = await supabase
      .from('patient_access_keys')
      .insert({
        patient_name: patientName,
        patient_email: patientEmail,
        access_code: patientCode,
        doctor_id: doctorUser.id,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    finalPatientKey = inserted;
    console.log('Patient access key created:', finalPatientKey);
  } else {
    const { data: updated, error: updErr } = await supabase
      .from('patient_access_keys')
      .update({
        patient_name: patientName,
        patient_email: patientEmail,
        doctor_id: doctorUser.id,
        is_active: true,
        failed_attempts: 0,
        locked_until: null,
      })
      .eq('id', existingKey.id)
      .select()
      .single();

    if (updErr) throw updErr;
    finalPatientKey = updated;
    console.log('Patient access key updated:', finalPatientKey);
  }

  // 4. Send Email via Resend
  console.log(`Sending Resend Email to ${patientEmail}...`);
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MMAI Health <onboarding@resend.dev>',
        to: [patientEmail],
        subject: `Your MMAI Patient Access Code: ${patientCode}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #0D0F12; color: #FFF; border-radius: 12px;">
            <h2 style="color: #38BDF8; margin-top: 0;">MMAI Patient Access</h2>
            <p>Hello <strong>${patientName}</strong>,</p>
            <p>${doctorName} has granted you secure patient access to your medical workspace.</p>
            <div style="background: #1E232B; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
              <span style="font-size: 11px; text-transform: uppercase; color: #94A3B8; letter-spacing: 1px;">Your 6-Digit Secret Key</span>
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #38BDF8; margin-top: 8px; font-family: monospace;">${patientCode}</div>
            </div>
            <p style="font-size: 13px; color: #94A3B8;">Open the MMAI app and enter this 6-digit key on the login screen to access your portal.</p>
          </div>
        `,
      }),
    });

    const resendJson = await emailRes.json();
    console.log('Resend Email Result:', resendJson);
  } catch (emailErr) {
    console.warn('Resend send warning:', emailErr.message);
  }

  console.log('--- SEED COMPLETED SUCCESSFULLY ---');
}

main().catch((err) => {
  console.error('Seed Error:', err);
  process.exit(1);
});
