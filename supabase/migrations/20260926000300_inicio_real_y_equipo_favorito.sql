-- El equipo elegido se guarda como referencia al catálogo que ya mantiene Promiedos.
alter table public.profiles
add column favorite_team_id uuid references public.teams(id) on delete set null;

-- Ranking resumido de la última fecha con resultados procesados y jugadores confirmados.
-- Devuelve solamente el apodo y los aciertos, nunca pagos ni datos privados.
create function public.latest_home_ranking()
returns table(game_name text, username text, hits integer, position integer)
language sql stable security definer set search_path = '' as $$
  with latest as (
    select g.id, g.name
    from public.prode_games g
    where g.closes_at <= now()
      and exists (select 1 from public.participations p
        where p.prode_game_id = g.id and p.status = 'confirmed' and p.processed_matches > 0)
    order by g.closes_at desc, g.id desc limit 1
  ), ranked as (
    select latest.name as game_name, prof.username, p.hits,
      rank() over (order by p.hits desc, p.processed_matches desc)::integer as position,
      row_number() over (order by p.hits desc, p.processed_matches desc, prof.username)::integer as row_number
    from latest
    join public.participations p on p.prode_game_id = latest.id and p.status = 'confirmed'
    join public.profiles prof on prof.id = p.user_id
  )
  select ranked.game_name::text, coalesce(nullif(ranked.username, ''), 'Jugador')::text,
    ranked.hits, ranked.position from ranked where ranked.row_number <= 3 order by ranked.row_number;
$$;
revoke all on function public.latest_home_ranking() from public;
grant execute on function public.latest_home_ranking() to anon, authenticated;
