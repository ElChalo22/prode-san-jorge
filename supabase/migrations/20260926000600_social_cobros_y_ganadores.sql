-- Cuentas de transferencia, comisión editable por fecha y premios configurables.
alter table public.prode_games
  add column house_percentage numeric(5,2) not null default 25
    check (house_percentage >= 0 and house_percentage <= 100),
  add column transfer_account_id uuid;

create table public.transfer_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  alias text,
  cbu text,
  holder text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (nullif(trim(coalesce(alias,'')), '') is not null or nullif(trim(coalesce(cbu,'')), '') is not null)
);
alter table public.transfer_accounts enable row level security;
create policy "Equipo administra cuentas de transferencia" on public.transfer_accounts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Jugadores ven cuentas activas" on public.transfer_accounts
  for select to authenticated using (active);
alter table public.prode_games add constraint prode_games_transfer_account_fk
  foreign key (transfer_account_id) references public.transfer_accounts(id) on delete set null;

create function public.configure_argentina_game(
  target_game_id uuid, new_fee numeric, account_id uuid, new_house_percentage numeric
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Acceso denegado'; end if;
  if new_fee is null or new_fee <= 0 then raise exception 'Ingresá un precio mayor a cero'; end if;
  if new_house_percentage is null or new_house_percentage < 0 or new_house_percentage > 100 then
    raise exception 'La comisión debe estar entre 0 y 100'; end if;
  if account_id is not null and not exists (select 1 from public.transfer_accounts where id=account_id and active) then
    raise exception 'Elegí una cuenta activa'; end if;
  if not exists (select 1 from public.prode_games where id=target_game_id and game_type='automatic'
    and status in ('draft','open') and closes_at>now()
    and not exists(select 1 from public.participations where prode_game_id=target_game_id)) then
    raise exception 'Esta fecha ya tiene participantes o no está disponible'; end if;
  update public.prode_games g set entry_fee=new_fee,
    payment_alias=account.alias, payment_cbu=account.cbu, payment_holder=account.holder,
    transfer_account_id=account_id, house_percentage=new_house_percentage, status='open'
  from (select alias,cbu,holder from public.transfer_accounts where id=account_id) account
  where g.id=target_game_id and account_id is not null;
  if account_id is null then
    update public.prode_games set entry_fee=new_fee, payment_alias=null, payment_cbu=null,
      payment_holder=null, transfer_account_id=null, house_percentage=new_house_percentage, status='open'
    where id=target_game_id;
  end if;
end;
$$;
revoke all on function public.configure_argentina_game(uuid,numeric,uuid,numeric) from public;
grant execute on function public.configure_argentina_game(uuid,numeric,uuid,numeric) to authenticated;

create function public.create_paid_express_with_account(
  game_name text, game_description text, selected_match_ids uuid[], fee numeric,
  account_id uuid, new_house_percentage numeric
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_game_id uuid; account record;
begin
  if account_id is null or new_house_percentage is null or new_house_percentage < 0 or new_house_percentage > 100 then
    raise exception 'Elegí una cuenta y una comisión entre 0 y 100'; end if;
  select * into account from public.transfer_accounts where id=account_id and active;
  if not found then raise exception 'La cuenta seleccionada no está activa'; end if;
  new_game_id := public.create_paid_express(game_name,game_description,selected_match_ids,fee,
    coalesce(nullif(account.alias,''),account.cbu));
  update public.prode_games set payment_alias=account.alias,payment_cbu=account.cbu,
    payment_holder=account.holder,transfer_account_id=account.id,house_percentage=new_house_percentage
  where id=new_game_id;
  return new_game_id;
end;
$$;
revoke all on function public.create_paid_express_with_account(text,text,uuid[],numeric,uuid,numeric) from public;
grant execute on function public.create_paid_express_with_account(text,text,uuid[],numeric,uuid,numeric) to authenticated;

create or replace function public.game_public_summary(target_game_id uuid)
returns table(players bigint, jackpot numeric)
language sql stable security definer set search_path = '' as $$
  select count(pay.id)::bigint,
    coalesce(round(sum(pay.amount) * (1 - g.house_percentage / 100),2),0)::numeric
  from public.prode_games g
  left join public.participations p on p.prode_game_id=g.id and p.status='confirmed'
  left join public.payments pay on pay.participation_id=p.id and pay.status='approved'
  where g.id=target_game_id group by g.house_percentage;
$$;
revoke all on function public.game_public_summary(uuid) from public;
grant execute on function public.game_public_summary(uuid) to anon, authenticated;

-- Solicitudes de amistad: solo cada participante puede ver o decidir sus solicitudes.
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);
create unique index friend_requests_one_pending_pair on public.friend_requests(requester_id,recipient_id) where status='pending';
create index friend_requests_recipient_pending on public.friend_requests(recipient_id,created_at desc) where status='pending';
alter table public.friend_requests enable row level security;
create policy "Participante ve sus solicitudes" on public.friend_requests for select to authenticated
  using (requester_id=auth.uid() or recipient_id=auth.uid());
alter table public.player_notifications alter column prode_game_id drop not null;
alter table public.player_notifications add column kind text not null default 'general',
  add column friend_request_id uuid references public.friend_requests(id) on delete cascade,
  add column prize_amount numeric(12,2);

create function public.notify_profile_photo_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.avatar_url is distinct from old.avatar_url then
    insert into public.player_notifications(user_id,message,kind)
      values(new.id,'La foto de perfil se puede modificar una vez cada 30 días.','profile');
  end if;
  return new;
end;
$$;
create trigger profiles_notify_photo_change after update on public.profiles
for each row execute function public.notify_profile_photo_change();

create function public.send_friend_request(target_player_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_request_id uuid;
begin
  if auth.uid() is null or target_player_id=auth.uid() then raise exception 'No podés agregarte a vos mismo'; end if;
  if not exists(select 1 from public.profiles where id=target_player_id and username is not null and onboarding_completed) then
    raise exception 'Jugador no disponible'; end if;
  if exists(select 1 from public.friend_requests where status='accepted' and
    ((requester_id=auth.uid() and recipient_id=target_player_id) or (requester_id=target_player_id and recipient_id=auth.uid()))) then
    raise exception 'Ya son amigos'; end if;
  if exists(select 1 from public.friend_requests where status='pending' and
    ((requester_id=auth.uid() and recipient_id=target_player_id) or (requester_id=target_player_id and recipient_id=auth.uid()))) then
    raise exception 'Ya hay una solicitud pendiente'; end if;
  insert into public.friend_requests(requester_id,recipient_id) values(auth.uid(),target_player_id)
    returning id into new_request_id;
  insert into public.player_notifications(user_id,message,kind,friend_request_id)
    select target_player_id,'@'||coalesce(nullif(username,''),'Jugador')||' te mandó una solicitud de amistad.',
      'friend_request',new_request_id from public.profiles where id=auth.uid();
  return new_request_id;
end;
$$;
revoke all on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;

create function public.respond_friend_request(target_request_id uuid, accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare request_row record;
begin
  select * into request_row from public.friend_requests where id=target_request_id and recipient_id=auth.uid()
    and status='pending' for update;
  if not found then raise exception 'La solicitud ya no está disponible'; end if;
  update public.friend_requests set status=case when accept then 'accepted' else 'rejected' end,responded_at=now()
    where id=target_request_id;
  insert into public.player_notifications(user_id,message,kind,friend_request_id)
    select request_row.requester_id,
      '@'||coalesce(nullif(username,''),'Jugador')||case when accept then ' aceptó tu solicitud de amistad.' else ' rechazó tu solicitud de amistad.' end,
      case when accept then 'friend_accepted' else 'friend_rejected' end,target_request_id
    from public.profiles where id=auth.uid();
end;
$$;
revoke all on function public.respond_friend_request(uuid,boolean) from public;
grant execute on function public.respond_friend_request(uuid,boolean) to authenticated;

create function public.player_friend_status(target_player_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when target_player_id=auth.uid() then 'self'
    when exists(select 1 from public.friend_requests where status='accepted' and
      ((requester_id=auth.uid() and recipient_id=target_player_id) or (requester_id=target_player_id and recipient_id=auth.uid()))) then 'friends'
    when exists(select 1 from public.friend_requests where status='pending' and requester_id=auth.uid() and recipient_id=target_player_id) then 'sent'
    when exists(select 1 from public.friend_requests where status='pending' and requester_id=target_player_id and recipient_id=auth.uid()) then 'received'
    else 'none' end;
$$;
revoke all on function public.player_friend_status(uuid) from public;
grant execute on function public.player_friend_status(uuid) to authenticated;

drop function if exists public.game_confirmed_players(uuid);
create function public.game_confirmed_players(target_game_id uuid)
returns table(participation_id uuid,user_id uuid,username text,hits integer,total_matches integer,is_friend boolean)
language sql stable security definer set search_path = '' as $$
  select p.id,p.user_id,coalesce(nullif(prof.username,''),'Jugador')::text,p.hits,
    (select count(*)::integer from public.predictions pred where pred.participation_id=p.id),
    exists(select 1 from public.friend_requests fr where fr.status='accepted' and
      ((fr.requester_id=auth.uid() and fr.recipient_id=p.user_id) or (fr.requester_id=p.user_id and fr.recipient_id=auth.uid())))
  from public.participations p join public.payments pay on pay.participation_id=p.id and pay.status='approved'
    join public.profiles prof on prof.id=p.user_id
  where p.prode_game_id=target_game_id and p.status='confirmed'
    and exists(select 1 from public.participations mine join public.payments mypay on mypay.participation_id=mine.id and mypay.status='approved'
      where mine.prode_game_id=target_game_id and mine.user_id=auth.uid() and mine.status='confirmed')
  order by lower(prof.username),prof.id;
$$;
revoke all on function public.game_confirmed_players(uuid) from public;
grant execute on function public.game_confirmed_players(uuid) to authenticated;

-- Ganadores: se calcula solo cuando todos los partidos de la fecha terminaron.
create function public.settle_prode_game(target_game_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare max_hits integer; winner_count integer; total_pool numeric; prize_each numeric; inserted_count integer;
begin
  if not public.is_staff() then raise exception 'Acceso denegado'; end if;
  if exists(select 1 from public.matches m join public.prode_games g on g.id=target_game_id
    where ((g.game_type='express' and exists(select 1 from public.express_game_matches em where em.prode_game_id=g.id and em.match_id=m.id))
      or (g.game_type='automatic' and exists(select 1 from public.prode_game_matchdays gm where gm.prode_game_id=g.id and gm.matchday_id=m.matchday_id)))
      and (m.status<>'finished' or m.result is null)) then raise exception 'Todavía quedan partidos sin resultado final'; end if;
  select max(p.hits) into max_hits from public.participations p where p.prode_game_id=target_game_id and p.status='confirmed';
  if max_hits is null then raise exception 'No hay participaciones confirmadas'; end if;
  select count(*) into winner_count from public.participations where prode_game_id=target_game_id and status='confirmed' and hits=max_hits;
  select coalesce(sum(pay.amount),0) into total_pool from public.participations p join public.payments pay on pay.participation_id=p.id and pay.status='approved'
    where p.prode_game_id=target_game_id and p.status='confirmed';
  select round(total_pool*(1-g.house_percentage/100)/winner_count,2) into prize_each from public.prode_games g where g.id=target_game_id;
  insert into public.winners(prode_game_id,participation_id,hits,prize_amount)
    select target_game_id,p.id,p.hits,prize_each from public.participations p
    where p.prode_game_id=target_game_id and p.status='confirmed' and p.hits=max_hits
    on conflict(prode_game_id,participation_id) do update set hits=excluded.hits,prize_amount=excluded.prize_amount;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.settle_prode_game(uuid) from public;
grant execute on function public.settle_prode_game(uuid) to authenticated;

create function public.notify_prode_winners()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_user_id uuid; game_label text;
begin
  select p.user_id,g.name into target_user_id,game_label from public.participations p
    join public.prode_games g on g.id=new.prode_game_id where p.id=new.participation_id;
  insert into public.player_notifications(user_id,prode_game_id,message,kind,prize_amount)
    values(target_user_id,new.prode_game_id,'¡Ganaste '||game_label||' con '||new.hits||' aciertos!','winner',new.prize_amount);
  return new;
end;
$$;
create trigger winners_notify_player after insert on public.winners for each row execute function public.notify_prode_winners();

alter publication supabase_realtime add table public.friend_requests;
notify pgrst, 'reload schema';
