-- Migration: Add Patient Management Helpers & Policies for Doctors

-- 1. Allow doctors to delete their own created patient keys
drop policy if exists "Doctors can delete own access keys" on public.patient_access_keys;
create policy "Doctors can delete own access keys"
  on public.patient_access_keys
  for delete
  using (auth.uid() = doctor_id);

-- 2. Secure Function to Create a Patient with an Auto-Generated Unique 6-Digit Code
create or replace function public.create_patient_with_access_code(
  p_patient_name text,
  p_patient_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_exists boolean;
  v_record record;
  v_doctor_id uuid := auth.uid();
begin
  if p_patient_name is null or trim(p_patient_name) = '' then
    raise exception 'Patient name is required.';
  end if;

  -- Generate unique 6-digit numeric access code
  loop
    v_code := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
    select exists(select 1 from public.patient_access_keys where access_code = v_code) into v_exists;
    if not v_exists then
      exit;
    end if;
  end loop;

  -- Insert new patient access key
  insert into public.patient_access_keys (
    patient_name,
    patient_email,
    access_code,
    doctor_id,
    is_active
  )
  values (
    trim(p_patient_name),
    nullif(trim(p_patient_email), ''),
    v_code,
    v_doctor_id,
    true
  )
  returning * into v_record;

  return jsonb_build_object(
    'id', v_record.id,
    'patient_name', v_record.patient_name,
    'patient_email', v_record.patient_email,
    'access_code', v_record.access_code,
    'is_active', v_record.is_active,
    'created_at', v_record.created_at,
    'doctor_id', v_record.doctor_id
  );
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.create_patient_with_access_code(text, text) to authenticated;
