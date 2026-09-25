-- Migration: Patient Email OTP Verification for 2-Factor / Code-Based Login

-- 1. Add OTP columns to patient_access_keys
alter table public.patient_access_keys
  add column if not exists email_otp text,
  add column if not exists otp_expires_at timestamptz;

-- 2. Secure Function to Request / Generate Email OTP for a Patient
create or replace function public.request_patient_login_otp(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
  v_otp text;
  v_now timestamptz := now();
begin
  p_code := trim(p_code);

  -- Find patient access key
  select * into v_record
  from public.patient_access_keys
  where access_code = p_code;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid secret key. Please check with your caretaker.'
    );
  end if;

  if not v_record.is_active then
    return jsonb_build_object(
      'success', false,
      'error', 'This access key has been deactivated.'
    );
  end if;

  if v_record.expires_at is not null and v_record.expires_at < v_now then
    return jsonb_build_object(
      'success', false,
      'error', 'This access key has expired.'
    );
  end if;

  if v_record.locked_until is not null and v_record.locked_until > v_now then
    return jsonb_build_object(
      'success', false,
      'error', 'Too many failed attempts. Code is temporarily locked. Try again later.'
    );
  end if;

  -- Generate 6-digit random numeric OTP
  v_otp := lpad(floor(random() * 900000 + 100000)::text, 6, '0');

  -- Save OTP with 15-minute expiration
  update public.patient_access_keys
  set email_otp = v_otp,
      otp_expires_at = v_now + interval '15 minutes'
  where id = v_record.id;

  return jsonb_build_object(
    'success', true,
    'otp', v_otp,
    'patient_id', v_record.patient_id,
    'patient_name', v_record.patient_name,
    'patient_email', v_record.patient_email,
    'doctor_id', v_record.doctor_id,
    'key_id', v_record.id
  );
end;
$$;

-- Grant execution to anon and authenticated
grant execute on function public.request_patient_login_otp(text) to anon, authenticated;

-- 3. Secure Function to Verify Patient Email OTP
create or replace function public.verify_patient_login_otp(p_code text, p_otp text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
  v_now timestamptz := now();
begin
  p_code := trim(p_code);
  p_otp := trim(p_otp);

  select * into v_record
  from public.patient_access_keys
  where access_code = p_code;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid secret key session.'
    );
  end if;

  if v_record.locked_until is not null and v_record.locked_until > v_now then
    return jsonb_build_object(
      'success', false,
      'error', 'Account is temporarily locked. Please try again later.'
    );
  end if;

  -- Check OTP code & expiry
  if v_record.email_otp is null or v_record.email_otp != p_otp then
    update public.patient_access_keys
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 5 then v_now + interval '15 minutes' else null end
    where id = v_record.id;

    return jsonb_build_object(
      'success', false,
      'error', 'Incorrect verification code. Please check your email and try again.'
    );
  end if;

  if v_record.otp_expires_at is not null and v_record.otp_expires_at < v_now then
    return jsonb_build_object(
      'success', false,
      'error', 'Verification code has expired. Please request a new one.'
    );
  end if;

  -- Success: clear OTP, reset lockout, update last_used_at
  update public.patient_access_keys
  set email_otp = null,
      otp_expires_at = null,
      failed_attempts = 0,
      locked_until = null,
      last_used_at = v_now
  where id = v_record.id;

  return jsonb_build_object(
    'success', true,
    'patient_id', v_record.patient_id,
    'patient_name', v_record.patient_name,
    'patient_email', v_record.patient_email,
    'doctor_id', v_record.doctor_id,
    'key_id', v_record.id
  );
end;
$$;

-- Grant execution to anon and authenticated
grant execute on function public.verify_patient_login_otp(text, text) to anon, authenticated;
