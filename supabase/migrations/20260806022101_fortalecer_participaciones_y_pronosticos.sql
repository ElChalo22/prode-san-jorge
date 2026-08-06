-- =========================================================
-- PRODE SAN JORGE
-- Fortalecer participaciones y pronósticos
-- =========================================================

-- Ranking incremental
alter table public.participations
add column if not exists hits integer not null default 0;

alter table public.participations
add column if not exists processed_matches integer not null default 0;

-- Validaciones
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'participations_hits_non_negative_check'
  ) then
    alter table public.participations
    add constraint participations_hits_non_negative_check
    check (hits >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'participations_processed_matches_non_negative_check'
  ) then
    alter table public.participations
    add constraint participations_processed_matches_non_negative_check
    check (processed_matches >= 0);
  end if;
end $$;

-- Un usuario solo puede participar una vez por Prode
create unique index if not exists
participations_prode_game_user_unique
on public.participations (
    prode_game_id,
    user_id
);

-- Un pronóstico por partido
create unique index if not exists
predictions_participation_match_unique
on public.predictions (
    participation_id,
    match_id
);

-- Índices
create index if not exists
participations_prode_game_idx
on public.participations (
    prode_game_id
);

create index if not exists
participations_status_idx
on public.participations (
    status
);

create index if not exists
participations_user_idx
on public.participations (
    user_id
);

create index if not exists
predictions_match_idx
on public.predictions (
    match_id
);

create index if not exists
predictions_participation_idx
on public.predictions (
    participation_id
);