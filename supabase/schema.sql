-- Data Story Dashboard — Supabase schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).

create extension if not exists "pgcrypto";

-- One row per uploaded or preloaded dataset
create table if not exists datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'upload',        -- 'upload' | 'sample'
  original_filename text,
  row_count integer not null default 0,
  columns jsonb not null default '[]'::jsonb,     -- [{ name, type: 'numeric'|'date'|'categorical'|'string', nullable }]
  storage_path text,                              -- path in the 'datasets' storage bucket, if the raw file was kept
  created_at timestamptz not null default now()
);

-- The actual rows, stored as JSONB so the schema stays generic across any
-- uploaded CSV/JSON shape. `data` holds one parsed record.
create table if not exists dataset_records (
  id bigint generated always as identity primary key,
  dataset_id uuid not null references datasets(id) on delete cascade,
  row_index integer not null,
  data jsonb not null
);

create index if not exists idx_dataset_records_dataset_id on dataset_records(dataset_id);
create index if not exists idx_dataset_records_data on dataset_records using gin (data);

-- Row Level Security: open read for demo purposes, writes via service role only.
alter table datasets enable row level security;
alter table dataset_records enable row level security;

create policy "public read datasets" on datasets
  for select using (true);

create policy "public read dataset_records" on dataset_records
  for select using (true);

-- Inserts/updates/deletes are performed by the backend using the service_role
-- key (which bypasses RLS), so no insert/update policies are defined here.
-- If you want to allow direct client-side uploads instead of going through the
-- backend, add explicit insert policies scoped to an authenticated user.

-- Storage bucket for the raw uploaded files (optional, keeps an audit trail).
insert into storage.buckets (id, name, public)
values ('datasets', 'datasets', false)
on conflict (id) do nothing;
