-- =========================================================
-- PRODE SAN JORGE
-- Cálculo automático e idempotente de aciertos y ranking
-- =========================================================

-- ---------------------------------------------------------
-- 1. Calcular automáticamente el resultado 1 / X / 2
-- ---------------------------------------------------------

create or replace function public.set_match_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null then

    new.result :=
      case
        when new.home_score > new.away_score then '1'::public.prediction_value
        when new.home_score = new.away_score then 'X'::public.prediction_value
        else '2'::public.prediction_value
      end;

  elsif new.status <> 'finished' then
    new.result := null;
  end if;

  return new;
end;
$$;

drop trigger if exists matches_set_result on public.matches;

create trigger matches_set_result
before insert or update
on public.matches
for each row
execute function public.set_match_result();


-- ---------------------------------------------------------
-- 2. Recalcular una participación completa
--
-- Se recalcula desde cero para evitar que un partido sea
-- contado dos veces por cron, Realtime o correcciones.
-- ---------------------------------------------------------

create or replace function public.refresh_participation_score(
  target_participation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_hits integer := 0;
  calculated_processed_matches integer := 0;
begin
  select
    count(*) filter (
      where prediction_match.result = prediction.prediction
         or prediction_match.result::text = prediction.secondary_prediction
    )::integer,

    count(*)::integer

  into
    calculated_hits,
    calculated_processed_matches

  from public.predictions prediction

  join public.matches prediction_match
    on prediction_match.id = prediction.match_id

  join public.participations participation
    on participation.id = prediction.participation_id

  where prediction.participation_id = target_participation_id
    and prediction_match.status = 'finished'
    and prediction_match.result is not null

    and exists (
      select 1
      from public.prode_game_matchdays game_matchday
      where game_matchday.prode_game_id = participation.prode_game_id
        and game_matchday.matchday_id = prediction_match.matchday_id
    );

  update public.participations
  set
    hits = coalesce(calculated_hits, 0),
    processed_matches = coalesce(calculated_processed_matches, 0)
  where id = target_participation_id;
end;
$$;


-- ---------------------------------------------------------
-- 3. Recalcular las participaciones afectadas por un partido
-- ---------------------------------------------------------

create or replace function public.refresh_scores_for_match(
  target_match_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_participation_id uuid;
begin
  for affected_participation_id in
    select distinct participation.id
    from public.matches affected_match

    join public.prode_game_matchdays game_matchday
      on game_matchday.matchday_id = affected_match.matchday_id

    join public.participations participation
      on participation.prode_game_id = game_matchday.prode_game_id

    where affected_match.id = target_match_id
  loop
    perform public.refresh_participation_score(
      affected_participation_id
    );
  end loop;
end;
$$;


-- ---------------------------------------------------------
-- 4. Actualizar ranking cuando cambia un partido
-- ---------------------------------------------------------

create or replace function public.process_match_score_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or old.status is distinct from new.status
     or old.result is distinct from new.result
     or old.home_score is distinct from new.home_score
     or old.away_score is distinct from new.away_score then

    perform public.refresh_scores_for_match(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists matches_refresh_scores on public.matches;

create trigger matches_refresh_scores
after insert or update
on public.matches
for each row
execute function public.process_match_score_change();


-- ---------------------------------------------------------
-- 5. Recalcular si se crea, modifica o elimina un pronóstico
-- ---------------------------------------------------------

create or replace function public.process_prediction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_participation_score(
      old.participation_id
    );

    return old;
  end if;

  perform public.refresh_participation_score(
    new.participation_id
  );

  if tg_op = 'UPDATE'
     and old.participation_id is distinct from new.participation_id then

    perform public.refresh_participation_score(
      old.participation_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists predictions_refresh_score
on public.predictions;

create trigger predictions_refresh_score
after insert or update or delete
on public.predictions
for each row
execute function public.process_prediction_change();


-- ---------------------------------------------------------
-- 6. Completar resultados de partidos ya finalizados
-- ---------------------------------------------------------

update public.matches
set result =
  case
    when home_score > away_score then '1'::public.prediction_value
    when home_score = away_score then 'X'::public.prediction_value
    else '2'::public.prediction_value
  end
where status = 'finished'
  and home_score is not null
  and away_score is not null;


-- ---------------------------------------------------------
-- 7. Recalcular todas las participaciones existentes
-- ---------------------------------------------------------

do $$
declare
  existing_participation_id uuid;
begin
  for existing_participation_id in
    select id
    from public.participations
  loop
    perform public.refresh_participation_score(
      existing_participation_id
    );
  end loop;
end;
$$;


-- ---------------------------------------------------------
-- 8. Restringir la ejecución manual
-- ---------------------------------------------------------

revoke all on function public.set_match_result()
from public;

revoke all on function public.refresh_participation_score(uuid)
from public;

revoke all on function public.refresh_scores_for_match(uuid)
from public;

revoke all on function public.process_match_score_change()
from public;

revoke all on function public.process_prediction_change()
from public;