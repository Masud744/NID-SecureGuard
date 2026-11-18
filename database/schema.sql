-- NID SecureGuard database schema
-- Run this in Supabase SQL Editor to set up all tables.

create table if not exists users (
    id              uuid primary key default gen_random_uuid(),
    nid_number      text unique not null,
    full_name       text not null,
    date_of_birth   date,
    address         text,
    phone           text,
    status          text not null default 'pending'
                        check (status in ('pending', 'active', 'suspended')),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

create table if not exists face_profiles (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid unique not null references users(id) on delete cascade,
    model_label     int unique not null,
    status          text check (status in ('pending', 'enrolled', 'failed')),
    samples_folder  text,
    enrolled_at     timestamptz
);

create table if not exists fingerprint_records (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid unique not null references users(id) on delete cascade,
    template_id     int unique not null,
    status          text check (status in ('pending', 'enrolled', 'failed')),
    enrolled_at     timestamptz
);

create table if not exists security_logs (
    id                      uuid primary key default gen_random_uuid(),
    user_id                 uuid references users(id) on delete set null,
    nid_number              text,
    face_result             text,
    face_confidence         float,
    fingerprint_result      text,
    fingerprint_template_id int,
    access_decision         text not null
                                check (access_decision in ('granted', 'denied')),
    failure_reason          text,
    ip_address              text,
    created_at              timestamptz default now()
);


-- Indexes

create index if not exists idx_users_nid_number  on users(nid_number);
create index if not exists idx_users_status       on users(status);
create index if not exists idx_logs_user_id       on security_logs(user_id);
create index if not exists idx_logs_decision      on security_logs(access_decision);
create index if not exists idx_logs_created_at    on security_logs(created_at desc);


-- Row Level Security
--
-- We enable RLS on every table. The authenticated role gets full access
-- (admin dashboard). The service_role key bypasses RLS automatically in
-- Supabase, so the backend can read/write without extra policies.

alter table users              enable row level security;
alter table face_profiles      enable row level security;
alter table fingerprint_records enable row level security;
alter table security_logs      enable row level security;

-- Authenticated role policies (for admin dashboard access)

drop policy if exists "admin_users_all" on users;
create policy "admin_users_all" on users
    for all to authenticated using (true) with check (true);

drop policy if exists "admin_face_profiles_all" on face_profiles;
create policy "admin_face_profiles_all" on face_profiles
    for all to authenticated using (true) with check (true);

drop policy if exists "admin_fingerprint_records_all" on fingerprint_records;
create policy "admin_fingerprint_records_all" on fingerprint_records
    for all to authenticated using (true) with check (true);

drop policy if exists "admin_security_logs_all" on security_logs;
create policy "admin_security_logs_all" on security_logs
    for all to authenticated using (true) with check (true);


-- Auto-update updated_at on users

create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
    before update on users
    for each row execute function update_updated_at();
