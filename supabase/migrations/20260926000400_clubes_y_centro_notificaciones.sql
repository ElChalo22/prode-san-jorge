-- Solo clubes con partidos en la última fecha importada de Primera División (Promiedos hc).
create function public.argentina_first_division_teams()
returns table(id uuid, name text, logo_url text)
language sql stable security definer set search_path = '' as $$
  with latest as (
    select md.id from public.matchdays md
    join public.competitions c on c.id = md.competition_id
    where c.provider = 'promiedos' and c.provider_id = 'hc'
    order by coalesce(md.starts_at, md.created_at) desc, md.id desc limit 1
  ), ids as (
    select m.home_team_id as id from public.matches m join latest on latest.id = m.matchday_id
    union
    select m.away_team_id from public.matches m join latest on latest.id = m.matchday_id
  )
  select t.id, t.name, t.logo_url from ids join public.teams t on t.id = ids.id
  where t.active order by t.name;
$$;
revoke all on function public.argentina_first_division_teams() from public;
grant execute on function public.argentina_first_division_teams() to authenticated;

-- Validar también escrituras directas a profiles; el catálogo no depende del cliente.
create function public.validate_favorite_team()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.favorite_team_id is distinct from old.favorite_team_id and new.favorite_team_id is not null
     and not exists (select 1 from public.argentina_first_division_teams() t where t.id = new.favorite_team_id) then
    raise exception 'Elegí un club de Primera División';
  end if;
  return new;
end;
$$;
create trigger profiles_validate_favorite_team before update on public.profiles
for each row execute function public.validate_favorite_team();

-- Solo el propietario puede marcar sus avisos como vistos.
create function public.read_my_notifications()
returns void language sql security definer set search_path = '' as $$
  update public.player_notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;
revoke all on function public.read_my_notifications() from public;
grant execute on function public.read_my_notifications() to authenticated;
