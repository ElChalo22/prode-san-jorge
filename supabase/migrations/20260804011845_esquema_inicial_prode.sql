-- =========================================================
-- PRODE SAN JORGE — ESQUEMA INICIAL
-- =========================================================

-- Limpiamos únicamente el esquema público.
-- auth.users y la configuración de Supabase Auth NO se eliminan.
drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema public
grant usage, select on sequences to anon, authenticated;

create extension if not exists pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================

create type public.user_role as enum (
  'player',
  'admin',
  'superadmin'
);

create type public.match_status as enum (
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled'
);

create type public.game_status as enum (
  'draft',
  'open',
  'closed',
  'finished',
  'cancelled'
);

create type public.participation_status as enum (
  'draft',
  'pending_payment',
  'payment_under_review',
  'confirmed',
  'rejected',
  'expired'
);

create type public.prediction_value as enum (
  '1',
  'X',
  '2'
);

create type public.payment_status as enum (
  'pending',
  'uploaded',
  'approved',
  'rejected',
  'expired'
);

-- =========================================================
-- FUNCIONES GENERALES
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- PERFILES
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  username text unique,
  avatar_url text,
  role public.user_role not null default 'player',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Se ejecuta al crear un usuario por email, Google o Apple.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    role,
    onboarding_completed
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    'player',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- GRUPOS DEL PRODE
-- Argentina / Internacional
-- =========================================================

create table public.prode_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  emoji text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger prode_groups_set_updated_at
before update on public.prode_groups
for each row execute function public.set_updated_at();

-- =========================================================
-- COMPETICIONES
-- =========================================================

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'promiedos',
  provider_id text not null,
  name text not null,
  short_name text,
  country text,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (provider, provider_id)
);

create trigger competitions_set_updated_at
before update on public.competitions
for each row execute function public.set_updated_at();

create table public.prode_group_competitions (
  id uuid primary key default gen_random_uuid(),
  prode_group_id uuid not null
    references public.prode_groups(id) on delete cascade,
  competition_id uuid not null
    references public.competitions(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),

  unique (prode_group_id, competition_id)
);

-- =========================================================
-- EQUIPOS
-- =========================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'promiedos',
  provider_id text not null,
  name text not null,
  short_name text,
  country text,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (provider, provider_id)
);

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

-- =========================================================
-- FECHAS Y PARTIDOS
-- =========================================================

create table public.matchdays (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null
    references public.competitions(id) on delete cascade,
  provider text not null default 'promiedos',
  provider_id text not null,
  name text not null,
  round_number integer,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (provider, provider_id)
);

create trigger matchdays_set_updated_at
before update on public.matchdays
for each row execute function public.set_updated_at();

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null
    references public.matchdays(id) on delete cascade,
  home_team_id uuid not null
    references public.teams(id),
  away_team_id uuid not null
    references public.teams(id),
  provider text not null default 'promiedos',
  provider_id text not null,
  kickoff_at timestamptz not null,
  status public.match_status not null default 'scheduled',
  home_score integer,
  away_score integer,
  result public.prediction_value,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (provider, provider_id),

  check (home_team_id <> away_team_id),
  check (home_score is null or home_score >= 0),
  check (away_score is null or away_score >= 0)
);

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

-- =========================================================
-- EDICIONES DEL PRODE
-- =========================================================

create table public.prode_games (
  id uuid primary key default gen_random_uuid(),
  prode_group_id uuid not null
    references public.prode_groups(id),
  name text not null,
  entry_fee numeric(12, 2) not null default 0,
  currency text not null default 'ARS',
  status public.game_status not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz not null,
  double_chance_limit integer not null default 2,
  payment_alias text,
  payment_cbu text,
  payment_holder text,
  payment_qr_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (entry_fee >= 0),
  check (double_chance_limit >= 0)
);

create trigger prode_games_set_updated_at
before update on public.prode_games
for each row execute function public.set_updated_at();

create table public.prode_game_matchdays (
  id uuid primary key default gen_random_uuid(),
  prode_game_id uuid not null
    references public.prode_games(id) on delete cascade,
  matchday_id uuid not null
    references public.matchdays(id) on delete cascade,
  created_at timestamptz not null default now(),

  unique (prode_game_id, matchday_id)
);

-- =========================================================
-- PARTICIPACIONES Y PRONÓSTICOS
-- =========================================================

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  prode_game_id uuid not null
    references public.prode_games(id) on delete cascade,
  user_id uuid not null
    references public.profiles(id) on delete cascade,
  status public.participation_status not null default 'draft',
  payment_deadline timestamptz,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (prode_game_id, user_id)
);

create trigger participations_set_updated_at
before update on public.participations
for each row execute function public.set_updated_at();

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null
    references public.participations(id) on delete cascade,
  match_id uuid not null
    references public.matches(id) on delete cascade,
  prediction public.prediction_value not null,
  is_double_chance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (participation_id, match_id)
);

create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

-- =========================================================
-- PAGOS Y COMPROBANTES
-- =========================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null unique
    references public.participations(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency text not null default 'ARS',
  status public.payment_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (amount >= 0)
);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null
    references public.payments(id) on delete cascade,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);

-- =========================================================
-- GANADORES
-- =========================================================

create table public.winners (
  id uuid primary key default gen_random_uuid(),
  prode_game_id uuid not null
    references public.prode_games(id) on delete cascade,
  participation_id uuid not null
    references public.participations(id) on delete cascade,
  hits integer not null,
  prize_amount numeric(12, 2) not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),

  unique (prode_game_id, participation_id),

  check (hits >= 0),
  check (prize_amount >= 0)
);

-- =========================================================
-- CONFIGURACIÓN Y AUDITORÍA
-- =========================================================

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  maintenance_mode boolean not null default false,
  allow_registration boolean not null default true,
  current_app_version text,
  minimum_app_version text,
  support_email text,
  default_language text not null default 'es',
  default_currency text not null default 'ARS',
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ÍNDICES
-- =========================================================

create index matches_matchday_id_idx
  on public.matches(matchday_id);

create index matches_kickoff_at_idx
  on public.matches(kickoff_at);

create index prode_games_status_idx
  on public.prode_games(status);

create index prode_games_closes_at_idx
  on public.prode_games(closes_at);

create index participations_user_id_idx
  on public.participations(user_id);

create index participations_game_id_idx
  on public.participations(prode_game_id);

create index predictions_participation_id_idx
  on public.predictions(participation_id);

create index payments_status_idx
  on public.payments(status);

-- =========================================================
-- DATOS INICIALES
-- =========================================================

insert into public.prode_groups (
  slug,
  name,
  description,
  emoji
)
values
(
  'argentina',
  'Liga Argentina',
  'Pronósticos de la fecha completa de la Liga Argentina.',
  '🇦🇷'
),
(
  'internacional',
  'Internacional',
  'Champions, Libertadores y Sudamericana.',
  '🌎'
);

insert into public.app_settings (
  maintenance_mode,
  allow_registration,
  default_language,
  default_currency
)
values (
  false,
  true,
  'es',
  'ARS'
);

-- =========================================================
-- SEGURIDAD RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.prode_groups enable row level security;
alter table public.competitions enable row level security;
alter table public.prode_group_competitions enable row level security;
alter table public.teams enable row level security;
alter table public.matchdays enable row level security;
alter table public.matches enable row level security;
alter table public.prode_games enable row level security;
alter table public.prode_game_matchdays enable row level security;
alter table public.participations enable row level security;
alter table public.predictions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.winners enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Datos públicos necesarios para navegar en la app.
create policy "Usuarios autenticados leen perfiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Usuario actualiza su perfil"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Usuarios leen grupos activos"
on public.prode_groups
for select
to authenticated
using (active = true);

create policy "Usuarios leen competiciones activas"
on public.competitions
for select
to authenticated
using (active = true);

create policy "Usuarios leen relaciones de competiciones"
on public.prode_group_competitions
for select
to authenticated
using (active = true);

create policy "Usuarios leen equipos activos"
on public.teams
for select
to authenticated
using (active = true);

create policy "Usuarios leen fechas"
on public.matchdays
for select
to authenticated
using (true);

create policy "Usuarios leen partidos"
on public.matches
for select
to authenticated
using (true);

create policy "Usuarios leen prodes publicados"
on public.prode_games
for select
to authenticated
using (status in ('open', 'closed', 'finished'));

create policy "Usuarios leen fechas de prodes"
on public.prode_game_matchdays
for select
to authenticated
using (true);

create policy "Usuario lee sus participaciones"
on public.participations
for select
to authenticated
using (user_id = auth.uid());

create policy "Usuario crea sus participaciones"
on public.participations
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Usuario actualiza sus participaciones"
on public.participations
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Usuario lee sus pronósticos"
on public.predictions
for select
to authenticated
using (
  exists (
    select 1
    from public.participations p
    where p.id = predictions.participation_id
      and p.user_id = auth.uid()
  )
);

create policy "Usuario crea sus pronósticos"
on public.predictions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.participations p
    where p.id = predictions.participation_id
      and p.user_id = auth.uid()
  )
);

create policy "Usuario actualiza sus pronósticos"
on public.predictions
for update
to authenticated
using (
  exists (
    select 1
    from public.participations p
    where p.id = predictions.participation_id
      and p.user_id = auth.uid()
  )
);

create policy "Usuario lee su pago"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.participations p
    where p.id = payments.participation_id
      and p.user_id = auth.uid()
  )
);

create policy "Usuarios leen ganadores"
on public.winners
for select
to authenticated
using (true);

create policy "Usuarios leen configuración"
on public.app_settings
for select
to authenticated
using (true);

-- Recargar el caché de relaciones de PostgREST.
notify pgrst, 'reload schema';