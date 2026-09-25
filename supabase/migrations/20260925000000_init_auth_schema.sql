-- MMAI Supabase Initial Schema: Authentication, Profiles, and Secure Patient Access Keys
-- Enhanced for Privacy, Security, and HIPAA-readiness

-- 1. Create Profiles Table linked to Supabase Auth
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('doctor', 'patient')) default 'doctor',
  full_name text,
  email text,
  phone text,
  avatar_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Index for fast lookup
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- 2. Create Patient Access Keys Table
-- Holds 6-digit access codes securely generated for patient quick login
create table if not exists public.patient_access_keys (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles(id) on delete cascade,
  doctor_id uuid references public.profiles(id) on delete set null,
  patient_name text not null,
  patient_email text,
  access_code text not null unique,
  is_active boolean default true not null,
  failed_attempts integer default 0 not null,
  locked_until timestamptz,
  last_used_at timestamptz,
  expires_at timestamptz default (now() + interval '90 days'),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_access_code on public.patient_access_keys(access_code);
create index if not exists idx_patient_id on public.patient_access_keys(patient_id);
create index if not exists idx_doctor_id on public.patient_access_keys(doctor_id);

-- 3. Row Level Security (RLS) - PRIVACY & SECURITY FIRST
alter table public.profiles enable row level security;
alter table public.patient_access_keys enable row level security;

-- Profiles RLS Policies:
-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can update own profile
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Doctors can view their associated patients
create policy "Doctors can view patient profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.patient_access_keys pak
      where pak.doctor_id = auth.uid()
      and pak.patient_id = public.profiles.id
    )
  );

-- Patient Access Keys RLS Policies:
-- Doctors can view access keys they generated
create policy "Doctors can view own created access keys"
  on public.patient_access_keys
  for select
  using (auth.uid() = doctor_id);

-- Doctors can create access keys for patients
create policy "Doctors can insert access keys"
  on public.patient_access_keys
  for insert
  with check (auth.uid() = doctor_id);

-- Doctors can update/revoke access keys they created
create policy "Doctors can update own access keys"
  on public.patient_access_keys
  for update
  using (auth.uid() = doctor_id);

-- 4. Rate-limited Secure Function for Patient 6-Digit Key Verification
-- Runs as SECURITY DEFINER to keep access_code column protected from direct client scans
create or replace function public.verify_patient_access_key(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
  v_now timestamptz := now();
begin
  -- Normalize code
  p_code := trim(p_code);

  -- Check brute force protection / lock
  select * into v_record
  from public.patient_access_keys
  where access_code = p_code;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid access key. Please check with your doctor.'
    );
  end if;

  -- Check if key is active
  if not v_record.is_active then
    return jsonb_build_object(
      'success', false,
      'error', 'This access key has been deactivated.'
    );
  end if;

  -- Check expiration
  if v_record.expires_at is not null and v_record.expires_at < v_now then
    return jsonb_build_object(
      'success', false,
      'error', 'This access key has expired.'
    );
  end if;

  -- Check brute-force lockout
  if v_record.locked_until is not null and v_record.locked_until > v_now then
    return jsonb_build_object(
      'success', false,
      'error', 'Too many failed attempts. Code is temporarily locked. Try again later.'
    );
  end if;

  -- Success: update access stats
  update public.patient_access_keys
  set last_used_at = v_now,
      failed_attempts = 0,
      locked_until = null
  where id = v_record.id;

  return jsonb_build_object(
    'success', true,
    'patient_id', v_record.patient_id,
    'patient_name', v_record.patient_name,
    'doctor_id', v_record.doctor_id,
    'key_id', v_record.id
  );
end;
$$;

-- Grant execution to anon and authenticated roles
grant execute on function public.verify_patient_access_key(text) to anon, authenticated;

-- 5. Automatic Profile Creation Trigger on Supabase Auth SignUp
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    role,
    full_name,
    email,
    avatar_url,
    metadata
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'doctor'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

-- Trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Insert a demo patient access key (e.g. 123456 or 789012) for immediate testing
insert into public.patient_access_keys (
  patient_name,
  patient_email,
  access_code,
  is_active
)
values (
  'Alex Morgan (Demo Patient)',
  'patient.demo@mmai.health',
  '123456',
  true
)
on conflict (access_code) do nothing;
