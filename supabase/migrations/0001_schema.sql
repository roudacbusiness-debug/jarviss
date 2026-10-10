-- Jarvis : schéma principal
create extension if not exists pgcrypto;

create type public.subject_priority as enum ('haute', 'normale', 'light');
create type public.event_status     as enum ('prevu', 'fait', 'rate');
create type public.eval_type        as enum ('ds', 'controle', 'oral');
create type public.doc_type         as enum ('cours', 'exos', 'annale', 'corrige');
create type public.doc_status       as enum ('a_faire', 'en_cours', 'fait');

-- Préférences (une ligne par utilisateur)
create table public.settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  theme           text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  timezone        text not null default 'Africa/Casablanca',
  week_start      smallint not null default 1 check (week_start between 0 and 6),
  day_start_hour  smallint not null default 0 check (day_start_hour between 0 and 23),
  day_end_hour    smallint not null default 23 check (day_end_hour between 1 and 24),
  focus_minutes   smallint not null default 50 check (focus_minutes between 5 and 180),
  break_minutes   smallint not null default 10 check (break_minutes between 1 and 60),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Matières
create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  color       text not null default '#6366F1' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon        text not null default 'book-open',
  priority    public.subject_priority not null default 'normale',
  position    integer not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index subjects_user_position_idx on public.subjects (user_id, position);

-- Blocs de révision
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid not null references public.subjects(id) on delete restrict,
  title        text not null default '',
  description  text not null default '',
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       public.event_status not null default 'prevu',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint events_time_order check (ends_at > starts_at)
);
create index events_user_starts_idx on public.events (user_id, starts_at);
create index events_subject_idx on public.events (subject_id);

-- Évaluations (DS, contrôles, oraux)
create table public.evaluations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid not null references public.subjects(id) on delete restrict,
  title        text not null default '',
  eval_type    public.eval_type not null default 'ds',
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint evaluations_time_order check (ends_at > starts_at)
);
create index evaluations_user_starts_idx on public.evaluations (user_id, starts_at);
create index evaluations_subject_idx on public.evaluations (subject_id);

-- Checklist d'un bloc
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,
  label       text not null,
  done        boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index tasks_event_position_idx on public.tasks (event_id, position);

-- Bibliothèque PDF
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id    uuid references public.subjects(id) on delete set null,
  title         text not null,
  chapter       text not null default '',
  doc_type      public.doc_type not null default 'cours',
  status        public.doc_status not null default 'a_faire',
  storage_path  text not null unique,
  file_size     bigint not null default 0,
  page_count    integer,
  last_page     integer not null default 1 check (last_page >= 1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index documents_user_subject_idx on public.documents (user_id, subject_id);
create index documents_user_status_idx on public.documents (user_id, status);

-- Liaison bloc <-> PDF
create table public.event_documents (
  event_id     uuid not null references public.events(id) on delete cascade,
  document_id  uuid not null references public.documents(id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (event_id, document_id)
);
create index event_documents_document_idx on public.event_documents (document_id);

-- Flux iCal (Pronote)
create table public.ical_feeds (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null default 'Pronote',
  url             text not null,
  enabled         boolean not null default true,
  last_synced_at  timestamptz,
  last_error      text,
  created_at      timestamptz not null default now()
);

create table public.ical_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  feed_id     uuid not null references public.ical_feeds(id) on delete cascade,
  uid         text not null,
  summary     text not null default '',
  location    text not null default '',
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  unique (feed_id, uid, starts_at)
);
create index ical_events_user_starts_idx on public.ical_events (user_id, starts_at);

-- Emploi du temps fixe hebdomadaire (cours récurrents)
create table public.timetable_slots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7), -- 1 = lundi
  start_time  time not null,
  end_time    time not null,
  label       text not null,
  teacher     text not null default '',
  room        text not null default '',
  created_at  timestamptz not null default now(),
  constraint timetable_time_order check (end_time > start_time)
);
create index timetable_slots_user_weekday_idx on public.timetable_slots (user_id, weekday, start_time);

-- updated_at automatique
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger evaluations_set_updated_at before update on public.evaluations
  for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
