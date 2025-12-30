-- Supplement Tracker CRM v2 schema (Supabase Postgres)
-- Assumes Supabase auth enabled.

create extension if not exists "uuid-ossp";

-- App users profile (maps to auth.users id)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('Admin','User')),
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('Roofing Company','Carrier','Other')),
  primary_contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.status_options (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('internal_primary','internal_sub','customer_status')),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tag_options (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.document_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default uuid_generate_v4(),
  insured_name text not null,
  property_address text not null,
  claim_number text,
  carrier_company_id uuid references public.companies(id),
  adjuster_name text,
  adjuster_email text,
  adjuster_phone text,
  roofing_company_id uuid references public.companies(id),
  assigned_estimator_id uuid references public.users(id),

  internal_primary_status_id uuid not null references public.status_options(id),
  internal_sub_status_id uuid references public.status_options(id),
  customer_status_id uuid references public.status_options(id),

  adjuster_notes text,
  date_file_created date not null default current_date,
  date_xactimate_built date,
  date_supplement_sent date,
  last_updated timestamptz not null default now(),

  initial_rcv numeric,
  requested_rcv numeric,
  final_approved_rcv numeric,

  created_at timestamptz not null default now()
);

create table if not exists public.job_tag_map (
  job_id uuid not null references public.jobs(id) on delete cascade,
  tag_id uuid not null references public.tag_options(id),
  primary key (job_id, tag_id)
);

create table if not exists public.financial_worksheet_rows (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  category text not null,
  description text not null,
  amount numeric not null default 0,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  is_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_mentions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  mentioned_user_id uuid not null references public.users(id),
  primary key (comment_id, mentioned_user_id)
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_user_id uuid not null references public.users(id),
  job_id uuid references public.jobs(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  type text not null check (type in ('mention')),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create unique index if not exists notifications_dedupe on public.notifications(recipient_user_id, comment_id, type);

create table if not exists public.activity (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  actor_user_id uuid not null references public.users(id),
  type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  category_id uuid references public.document_categories(id),
  original_file_name text not null,
  display_name text not null,
  mime_type text not null,
  file_size bigint not null,
  storage_path text not null,
  uploaded_by_user_id uuid not null references public.users(id),
  upload_date timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.users(id),
  due_date date,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  status text not null default 'Open' check (status in ('Open','In Progress','Blocked','Done')),
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Basic RLS: only allow authenticated users to read/write (internal app).
alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.status_options enable row level security;
alter table public.tag_options enable row level security;
alter table public.document_categories enable row level security;
alter table public.jobs enable row level security;
alter table public.job_tag_map enable row level security;
alter table public.financial_worksheet_rows enable row level security;
alter table public.comments enable row level security;
alter table public.comment_mentions enable row level security;
alter table public.notifications enable row level security;
alter table public.activity enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;

-- Policies: authenticated users can do everything (tighten later if desired).
create policy "auth read/write users" on public.users for all to authenticated using (true) with check (true);
create policy "auth rw companies" on public.companies for all to authenticated using (true) with check (true);
create policy "auth rw status_options" on public.status_options for all to authenticated using (true) with check (true);
create policy "auth rw tag_options" on public.tag_options for all to authenticated using (true) with check (true);
create policy "auth rw document_categories" on public.document_categories for all to authenticated using (true) with check (true);
create policy "auth rw jobs" on public.jobs for all to authenticated using (true) with check (true);
create policy "auth rw job_tag_map" on public.job_tag_map for all to authenticated using (true) with check (true);
create policy "auth rw worksheet" on public.financial_worksheet_rows for all to authenticated using (true) with check (true);
create policy "auth rw comments" on public.comments for all to authenticated using (true) with check (true);
create policy "auth rw comment_mentions" on public.comment_mentions for all to authenticated using (true) with check (true);
create policy "auth rw notifications" on public.notifications for all to authenticated using (true) with check (true);
create policy "auth rw activity" on public.activity for all to authenticated using (true) with check (true);
create policy "auth rw documents" on public.documents for all to authenticated using (true) with check (true);
create policy "auth rw tasks" on public.tasks for all to authenticated using (true) with check (true);

-- Storage: create bucket manually named 'job-documents'.
-- Add Storage policies in Supabase dashboard:
--   allow authenticated users to insert/select/update/delete objects in bucket 'job-documents'.
