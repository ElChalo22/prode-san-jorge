-- Admins and superadmins can inspect every prediction in a prode without
-- joining it, paying, waiting for approval, or waiting for kickoff.
-- Regular players keep the existing confirmed-entry and kickoff restrictions.

create or replace function public.game_confirmed_picks(target_game_id uuid)
returns table (
  participation_id uuid,
  username text,
  match_id uuid,
  prediction public.prediction_value,
  secondary_prediction text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p.id,
    case
      when o.id is not null then o.username
      else coalesce(nullif(prof.username, ''), 'Jugador')
    end::text,
    pred.match_id,
    pred.prediction,
    pred.secondary_prediction
  from public.participations p
  left join public.profiles prof on prof.id = p.user_id
  left join public.offline_players o on o.id = p.offline_player_id
  join public.predictions pred on pred.participation_id = p.id
  where p.prode_game_id = target_game_id
    and (
      (select public.is_staff())
      or (
        p.status = 'confirmed'
        and exists (
          select 1
          from public.payments pay
          where pay.participation_id = p.id
            and pay.status = 'approved'
        )
        and exists (
          select 1
          from public.participations mine
          join public.payments mypay
            on mypay.participation_id = mine.id
            and mypay.status = 'approved'
          where mine.prode_game_id = target_game_id
            and mine.user_id = (select auth.uid())
            and mine.status = 'confirmed'
        )
        and exists (
          select 1
          from public.prode_games game
          where game.id = target_game_id
            and now() >= (
              select min(m.kickoff_at)
              from public.matches m
              where (
                game.game_type = 'express'
                and exists (
                  select 1
                  from public.express_game_matches express_match
                  where express_match.prode_game_id = game.id
                    and express_match.match_id = m.id
                )
              )
              or (
                game.game_type = 'automatic'
                and exists (
                  select 1
                  from public.prode_game_matchdays game_matchday
                  where game_matchday.prode_game_id = game.id
                    and game_matchday.matchday_id = m.matchday_id
                )
              )
            )
        )
      )
    )
  order by p.confirmed_at, 2, pred.match_id;
$function$;

create or replace function public.game_confirmed_players(target_game_id uuid)
returns table (
  participation_id uuid,
  user_id uuid,
  username text,
  hits integer,
  total_matches integer,
  is_friend boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p.id,
    coalesce(p.user_id, o.id),
    case
      when o.id is not null then o.username
      else coalesce(nullif(prof.username, ''), 'Jugador')
    end::text,
    p.hits,
    (
      select count(*)::integer
      from public.predictions pred
      where pred.participation_id = p.id
    ),
    case
      when o.id is not null then false
      else exists (
        select 1
        from public.friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.requester_id = (select auth.uid()) and fr.recipient_id = p.user_id)
            or (fr.requester_id = p.user_id and fr.recipient_id = (select auth.uid()))
          )
      )
    end
  from public.participations p
  left join public.profiles prof on prof.id = p.user_id
  left join public.offline_players o on o.id = p.offline_player_id
  where p.prode_game_id = target_game_id
    and (
      (select public.is_staff())
      or (
        p.status = 'confirmed'
        and exists (
          select 1
          from public.payments pay
          where pay.participation_id = p.id
            and pay.status = 'approved'
        )
        and exists (
          select 1
          from public.participations mine
          join public.payments mypay
            on mypay.participation_id = mine.id
            and mypay.status = 'approved'
          where mine.prode_game_id = target_game_id
            and mine.user_id = (select auth.uid())
            and mine.status = 'confirmed'
        )
        and exists (
          select 1
          from public.prode_games game
          where game.id = target_game_id
            and now() >= (
              select min(m.kickoff_at)
              from public.matches m
              where (
                game.game_type = 'express'
                and exists (
                  select 1
                  from public.express_game_matches express_match
                  where express_match.prode_game_id = game.id
                    and express_match.match_id = m.id
                )
              )
              or (
                game.game_type = 'automatic'
                and exists (
                  select 1
                  from public.prode_game_matchdays game_matchday
                  where game_matchday.prode_game_id = game.id
                    and game_matchday.matchday_id = m.matchday_id
                )
              )
            )
        )
      )
    )
  order by 3, p.id;
$function$;

revoke all privileges on function public.game_confirmed_picks(uuid) from PUBLIC, anon;
revoke all privileges on function public.game_confirmed_players(uuid) from PUBLIC, anon;
grant execute on function public.game_confirmed_picks(uuid) to authenticated;
grant execute on function public.game_confirmed_players(uuid) to authenticated;
