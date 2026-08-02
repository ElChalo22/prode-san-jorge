-- Base inicial de Prode San Jorge
-- PostgreSQL / Supabase

create extension if not exists pgcrypto;

-- =========================================================
-- TIPOS
-- =========================================================

create type public.user_role as enum (
  'player',
  'admin'
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
-- PERFILES
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  role public.user_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- GRUPOS DE PRODE
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

-- =========================================================
-- COMPETICIONES REALES
-- Liga Argentina, Champions, Libertadores, Sudamericana
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

-- =========================================================
-- FECHAS REALES DE CADA COMPETICIÓN
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

-- =========================================================
-- PARTIDOS
-- =========================================================

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

-- =========================================================
-- EDICIONES DEL PRODE
-- Cada registro representa un Prode Argentina o Internacional
-- correspondiente a una jornada concreta.
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
  payment_alias text,
  payment_cbu text,
  payment_holder text,
  payment_qr_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (entry_fee >= 0)
);

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
-- PARTICIPACIONES
-- El usuario tiene 10 minutos para subir el comprobante.
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

-- =========================================================
-- PRONÓSTICOS
-- =========================================================

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null
    references public.participations(id) on delete cascade,
  match_id uuid not null
    references public.matches(id) on delete cascade,
  prediction public.prediction_value not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (participation_id, match_id)
);

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

create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null
    references public.payments(id) on delete cascade,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);

-- =========================================================
-- GANADORES Y PREMIOS
-- Si hay empate, habrá varias filas y el pozo se divide.
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
-- ÍNDICES
-- =========================================================

create index matches_matchday_id_idx
  on public.matches(matchday_id);

create index matches_kickoff_at_idx
  on public.matches(kickoff_at);

create index participations_user_id_idx
  on public.participations(user_id);

create index participations_prode_game_id_idx
  on public.participations(prode_game_id);

create index predictions_participation_id_idx
  on public.predictions(participation_id);

create index predictions_match_id_idx
  on public.predictions(match_id);

create index payments_status_idx
  on public.payments(status);

-- =========================================================
-- ACTUALIZACIÓN AUTOMÁTICA DE updated_at
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

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger prode_groups_set_updated_at
before update on public.prode_groups
for each row execute function public.set_updated_at();

create trigger competitions_set_updated_at
before update on public.competitions
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger matchdays_set_updated_at
before update on public.matchdays
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger prode_games_set_updated_at
before update on public.prode_games
for each row execute function public.set_updated_at();

create trigger participations_set_updated_at
before update on public.participations
for each row execute function public.set_updated_at();

create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- =========================================================
-- CREACIÓN AUTOMÁTICA DEL PERFIL AL REGISTRARSE
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'usuario_' || substr(new.id::text, 1, 8)
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- SEGURIDAD INICIAL
-- =========================================================

alter table public.profiles enable row level security;
alter table public.participations enable row level security;
alter table public.predictions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_receipts enable row level security;

create policy "Los usuarios pueden ver su perfil"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Los usuarios pueden actualizar su perfil"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Los usuarios pueden ver sus participaciones"
on public.participations
for select
to authenticated
using (user_id = auth.uid());

create policy "Los usuarios pueden crear sus participaciones"
on public.participations
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Los usuarios pueden actualizar sus participaciones"
on public.participations
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Los usuarios pueden ver sus pronósticos"
on public.predictions
for select
to authenticated
using (
  exists (
    select 1
    from public.participations
    where participations.id = predictions.participation_id
      and participations.user_id = auth.uid()
  )
);

create policy "Los usuarios pueden crear sus pronósticos"
on public.predictions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.participations
    where participations.id = predictions.participation_id
      and participations.user_id = auth.uid()
  )
);

create policy "Los usuarios pueden actualizar sus pronósticos"
on public.predictions
for update
to authenticated
using (
  exists (
    select 1
    from public.participations
    where participations.id = predictions.participation_id
      and participations.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.participations
    where participations.id = predictions.participation_id
      and participations.user_id = auth.uid()
  )
);