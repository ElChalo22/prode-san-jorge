-- Los prodes automáticos conservan la fecha completa; Express elige partidos.
alter table public.prode_games add column game_type text not null default 'automatic'
  check (game_type in ('automatic', 'express'));

create table public.express_game_matches (
  prode_game_id uuid not null references public.prode_games(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete restrict,
  primary key (prode_game_id, match_id)
);
create index express_game_matches_match_idx on public.express_game_matches(match_id);
alter table public.express_game_matches enable row level security;
create policy "Partidos de prodes Express publicados"
on public.express_game_matches for select to anon, authenticated
using (exists (
  select 1 from public.prode_games g
  where g.id = prode_game_id and g.status in ('open', 'closed', 'finished')
));

create or replace function public.create_express_game(
  game_name text, selected_match_ids uuid[], fee numeric default 0
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  first_kickoff timestamptz;
  game_id uuid;
  group_id uuid;
  selected_count integer;
begin
  if not exists (select 1 from public.profiles where id = actor_id and role in ('admin', 'superadmin')) then
    raise exception 'Acceso denegado';
  end if;
  if char_length(trim(coalesce(game_name, ''))) not between 3 and 80 then
    raise exception 'El nombre debe tener entre 3 y 80 caracteres';
  end if;
  if fee is null or fee < 0 then raise exception 'Importe inválido'; end if;
  selected_count := coalesce(array_length(selected_match_ids, 1), 0);
  if selected_count < 1 or selected_count > 30 or
     (select count(distinct id) from unnest(selected_match_ids) as id) <> selected_count then
    raise exception 'Elegí entre 1 y 30 partidos distintos';
  end if;
  select min(kickoff_at) into first_kickoff from public.matches
  where id = any(selected_match_ids) and provider = 'promiedos'
    and status = 'scheduled' and kickoff_at > now() + interval '15 minutes';
  if (select count(*) from public.matches where id = any(selected_match_ids)
      and provider = 'promiedos' and status = 'scheduled'
      and kickoff_at > now() + interval '15 minutes') <> selected_count then
    raise exception 'Algún partido ya comenzó o no proviene de Promiedos';
  end if;
  select id into group_id from public.prode_groups where slug = 'internacional' and active;
  if group_id is null then raise exception 'Falta el grupo Internacional'; end if;

  insert into public.prode_games
    (prode_group_id, name, entry_fee, currency, status, opens_at, closes_at,
     double_chance_limit, created_by, game_type)
  values (group_id, trim(game_name), fee, 'ARS', 'open', now(),
          first_kickoff - interval '15 minutes', 2, actor_id, 'express')
  returning id into game_id;

  insert into public.express_game_matches(prode_game_id, match_id)
  select game_id, unnest(selected_match_ids);
  insert into public.prode_game_matchdays(prode_game_id, matchday_id)
  select distinct game_id, matchday_id from public.matches where id = any(selected_match_ids);
  return game_id;
end;
$$;
revoke all on function public.create_express_game(text, uuid[], numeric) from public;
grant execute on function public.create_express_game(text, uuid[], numeric) to authenticated;

-- Impedir que un pronóstico Express apunte a un partido no seleccionado.
create or replace function public.validate_express_prediction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare game_id uuid;
begin
  select prode_game_id into game_id from public.participations where id = new.participation_id;
  if exists (select 1 from public.prode_games where id = game_id and game_type = 'express')
    and not exists (select 1 from public.express_game_matches
                    where prode_game_id = game_id and match_id = new.match_id) then
    raise exception 'Este partido no pertenece al Prode Express';
  end if;
  return new;
end;
$$;
create trigger predictions_validate_express before insert or update on public.predictions
for each row execute function public.validate_express_prediction();

create or replace function public.refresh_participation_score(target_participation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare calculated_hits integer := 0; calculated_processed_matches integer := 0;
begin
  select count(*) filter (where m.result = p.prediction or m.result::text = p.secondary_prediction)::integer,
         count(*)::integer into calculated_hits, calculated_processed_matches
  from public.predictions p
  join public.matches m on m.id = p.match_id
  join public.participations part on part.id = p.participation_id
  join public.prode_games g on g.id = part.prode_game_id
  where p.participation_id = target_participation_id and m.status = 'finished' and m.result is not null
    and ((g.game_type = 'express' and exists (
        select 1 from public.express_game_matches egm
        where egm.prode_game_id = g.id and egm.match_id = m.id))
      or (g.game_type = 'automatic' and exists (
        select 1 from public.prode_game_matchdays gm
        where gm.prode_game_id = g.id and gm.matchday_id = m.matchday_id)));
  update public.participations set hits = coalesce(calculated_hits, 0),
    processed_matches = coalesce(calculated_processed_matches, 0)
  where id = target_participation_id;
end;
$$;

create or replace function public.refresh_scores_for_match(target_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare affected_participation_id uuid;
begin
  for affected_participation_id in
    select distinct p.id from public.matches m
    join public.prode_games g on
      (g.game_type = 'express' and exists (
        select 1 from public.express_game_matches egm where egm.prode_game_id = g.id and egm.match_id = m.id))
      or (g.game_type = 'automatic' and exists (
        select 1 from public.prode_game_matchdays gm where gm.prode_game_id = g.id and gm.matchday_id = m.matchday_id))
    join public.participations p on p.prode_game_id = g.id
    where m.id = target_match_id
  loop perform public.refresh_participation_score(affected_participation_id); end loop;
end;
$$;
