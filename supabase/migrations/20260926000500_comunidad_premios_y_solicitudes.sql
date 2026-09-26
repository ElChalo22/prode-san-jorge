-- Acceso a los pronósticos de otros jugadores solo para participantes confirmados.
create or replace function public.game_confirmed_picks(target_game_id uuid)
returns table(participation_id uuid, username text, match_id uuid, prediction public.prediction_value, secondary_prediction text)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(nullif(prof.username, ''), 'Jugador')::text,
    pred.match_id, pred.prediction, pred.secondary_prediction
  from public.participations p
  join public.payments pay on pay.participation_id = p.id and pay.status = 'approved'
  join public.profiles prof on prof.id = p.user_id
  join public.predictions pred on pred.participation_id = p.id
  where p.prode_game_id = target_game_id and p.status = 'confirmed'
    and exists (select 1 from public.participations mine
      join public.payments mypay on mypay.participation_id = mine.id and mypay.status = 'approved'
      where mine.prode_game_id = target_game_id and mine.user_id = auth.uid() and mine.status = 'confirmed')
  order by p.confirmed_at, prof.username, pred.match_id;
$$;
revoke all on function public.game_confirmed_picks(uuid) from anon;

create function public.game_confirmed_players(target_game_id uuid)
returns table(participation_id uuid, user_id uuid, username text, hits integer, total_matches integer)
language sql stable security definer set search_path = '' as $$
  select p.id, p.user_id, coalesce(nullif(prof.username, ''), 'Jugador')::text,
    p.hits, (select count(*)::integer from public.predictions pred where pred.participation_id = p.id)
  from public.participations p
  join public.payments pay on pay.participation_id = p.id and pay.status = 'approved'
  join public.profiles prof on prof.id = p.user_id
  where p.prode_game_id = target_game_id and p.status = 'confirmed'
    and exists (select 1 from public.participations mine
      join public.payments mypay on mypay.participation_id = mine.id and mypay.status = 'approved'
      where mine.prode_game_id = target_game_id and mine.user_id = auth.uid() and mine.status = 'confirmed')
  order by lower(prof.username), prof.id;
$$;
revoke all on function public.game_confirmed_players(uuid) from public;
grant execute on function public.game_confirmed_players(uuid) to authenticated;

-- Datos públicos de perfil limitados a apodo, escudo, avatar y aciertos.
create function public.public_player_directory()
returns table(id uuid, username text, avatar_url text, team_name text, team_logo text, hits bigint, games bigint)
language sql stable security definer set search_path = '' as $$
  select prof.id, coalesce(nullif(prof.username, ''), 'Jugador')::text, prof.avatar_url,
    team.name, team.logo_url, coalesce(sum(p.hits) filter (where p.status = 'confirmed'), 0)::bigint,
    count(p.id) filter (where p.status = 'confirmed')::bigint
  from public.profiles prof
  left join public.teams team on team.id = prof.favorite_team_id
  left join public.participations p on p.user_id = prof.id
  where prof.username is not null and prof.onboarding_completed
  group by prof.id, prof.username, prof.avatar_url, team.name, team.logo_url
  order by coalesce(sum(p.hits) filter (where p.status = 'confirmed'), 0) desc, lower(prof.username);
$$;
revoke all on function public.public_player_directory() from public;
grant execute on function public.public_player_directory() to authenticated;

-- Archivos privados de identidad y reclamos; avatares públicos por ser fotos elegidas para el perfil.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('identity-documents','identity-documents',false,5242880,array['image/jpeg','image/png','image/webp']),
       ('user-claims','user-claims',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']),
       ('profile-avatars','profile-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Jugador adjunta DNI" on storage.objects for insert to authenticated
with check (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Equipo revisa DNI" on storage.objects for select to authenticated
using (bucket_id = 'identity-documents' and public.is_staff());
create policy "Jugador adjunta reclamo" on storage.objects for insert to authenticated
with check (bucket_id = 'user-claims' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Equipo revisa adjuntos de reclamos" on storage.objects for select to authenticated
using (bucket_id = 'user-claims' and public.is_staff());
create policy "Jugador sube avatar" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Todos ven avatares" on storage.objects for select to public
using (bucket_id = 'profile-avatars');

create table public.identity_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
 file_path text not null, status text not null default 'pending' check (status in ('pending','approved','rejected')),
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
alter table public.identity_requests enable row level security;
create policy "Jugador y equipo ven verificación" on public.identity_requests for select to authenticated
using (user_id = auth.uid() or public.is_staff());

create table public.user_feedback (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('suggestion','claim')), message text not null,
 file_paths text[] not null default array[]::text[], status text not null default 'pending' check (status in ('pending','resolved')),
 created_at timestamptz not null default now()
);
alter table public.user_feedback enable row level security;
create policy "Jugador y equipo ven solicitudes" on public.user_feedback for select to authenticated
using (user_id = auth.uid() or public.is_staff());

create table public.reward_credits (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('express','argentina')),
 source text not null check (source in ('identity','55_hits')),
 redeemed_game_id uuid references public.prode_games(id), created_at timestamptz not null default now(),
 redeemed_at timestamptz, unique(user_id,source)
);
alter table public.reward_credits enable row level security;
create policy "Jugador y equipo ven créditos" on public.reward_credits for select to authenticated
using (user_id = auth.uid() or public.is_staff());

create table public.reward_claims (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 milestone integer not null default 125 check (milestone = 125), amount numeric(12,2) not null default 25000,
 status text not null default 'pending' check (status in ('pending','paid')),
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
 created_at timestamptz not null default now(), unique(user_id,milestone)
);
alter table public.reward_claims enable row level security;
create policy "Jugador y equipo ven premios" on public.reward_claims for select to authenticated
using (user_id = auth.uid() or public.is_staff());

-- Los adjuntos deben existir y pertenecer al usuario; no exponer la ruta del DNI al resto de jugadores.
create function public.submit_identity_request(object_path text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists (select 1 from storage.objects where bucket_id='identity-documents'
    and name=object_path and object_path like auth.uid()::text || '/%') then raise exception 'DNI no disponible'; end if;
 insert into public.identity_requests(user_id,file_path) values(auth.uid(),object_path)
 on conflict (user_id) do update set file_path=excluded.file_path, status='pending', reviewed_by=null, reviewed_at=null
 where identity_requests.status = 'rejected';
 if not found then raise exception 'Tu solicitud ya está pendiente o aprobada'; end if;
end;
$$;
revoke all on function public.submit_identity_request(text) from public;
grant execute on function public.submit_identity_request(text) to authenticated;

create function public.review_identity_request(target_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare target record;
begin
 if not public.is_staff() then raise exception 'Acceso denegado'; end if;
 if approve is null then raise exception 'Elegí aprobar o rechazar'; end if;
 select * into target from public.identity_requests where id=target_id and status='pending' for update;
 if not found then raise exception 'Solicitud no disponible'; end if;
 update public.identity_requests set status=case when approve then 'approved' else 'rejected' end,
  reviewed_by=auth.uid(),reviewed_at=now() where id=target_id;
 if approve then
   insert into public.reward_credits(user_id,kind,source) values(target.user_id,'express','identity')
   on conflict (user_id,source) do nothing;
   insert into public.player_notifications(user_id,prode_game_id,message)
   select target.user_id,g.id,'Tu identidad fue verificada: tenés una entrada gratis para un Prode Express.'
   from public.prode_games g where g.game_type='express' order by g.created_at desc limit 1;
 end if;
end;
$$;
revoke all on function public.review_identity_request(uuid,boolean) from public;
grant execute on function public.review_identity_request(uuid,boolean) to authenticated;

create function public.submit_user_feedback(request_kind text, request_message text, object_paths text[] default array[]::text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or request_kind not in ('suggestion','claim')
  or length(trim(coalesce(request_message,''))) < 5
  or array_length(regexp_split_to_array(trim(request_message),'[[:space:]]+'),1) > 700 then
  raise exception 'Escribí entre 5 caracteres y 700 palabras'; end if;
 if coalesce(array_length(object_paths,1),0) > 3 or exists (
  select 1 from unnest(object_paths) path where path is null or path not like auth.uid()::text || '/%'
  or not exists(select 1 from storage.objects where bucket_id='user-claims' and name=path)
 ) then raise exception 'Adjunto no disponible'; end if;
 insert into public.user_feedback(user_id,kind,message,file_paths)
 values(auth.uid(),request_kind,trim(request_message),object_paths);
end;
$$;
revoke all on function public.submit_user_feedback(text,text,text[]) from public;
grant execute on function public.submit_user_feedback(text,text,text[]) to authenticated;

-- Avatar: 30 días exactos entre cambios, validado por servidor.
alter table public.profiles add column avatar_changed_at timestamptz;
create function public.set_my_avatar(object_path text, public_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare last_change timestamptz;
begin
 select avatar_changed_at into last_change from public.profiles where id=auth.uid() for update;
 if not found then raise exception 'Iniciá sesión'; end if;
 if last_change is not null and last_change > now()-interval '30 days' then
   raise exception 'La foto de perfil se puede cambiar una vez cada 30 días'; end if;
 if object_path not like auth.uid()::text || '/%'
   or public_url not like 'https://%/storage/v1/object/public/profile-avatars/' || object_path
   or not exists (select 1 from storage.objects where bucket_id='profile-avatars' and name=object_path) then
   raise exception 'Imagen no disponible'; end if;
 update public.profiles set avatar_url = public_url, avatar_changed_at=now() where id=auth.uid();
end;
$$;
revoke all on function public.set_my_avatar(text,text) from public;
grant execute on function public.set_my_avatar(text,text) to authenticated;

-- Evitar que el cliente cambie el avatar sin pasar por el límite de 30 días.
create function public.protect_avatar_change()
returns trigger language plpgsql set search_path = '' as $$
begin
 if current_user <> 'postgres' and (new.avatar_url is distinct from old.avatar_url
   or new.avatar_changed_at is distinct from old.avatar_changed_at) then
   raise exception 'Modificá tu foto desde el botón del perfil'; end if;
 return new;
end;
$$;
create trigger profiles_protect_avatar before update on public.profiles
for each row execute function public.protect_avatar_change();

-- Premios automáticos al superar el umbral, con un solo crédito/reclamo por usuario.
create function public.grant_hit_rewards(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare total_hits bigint;
begin
 select coalesce(sum(hits),0) into total_hits from public.participations
 where user_id=target_user_id and status='confirmed';
 if total_hits >= 55 then
   insert into public.reward_credits(user_id,kind,source) values(target_user_id,'argentina','55_hits')
   on conflict (user_id,source) do nothing;
 end if;
 if total_hits >= 125 then
   insert into public.reward_claims(user_id,milestone,amount) values(target_user_id,125,25000)
   on conflict (user_id,milestone) do nothing;
 end if;
end;
$$;
revoke all on function public.grant_hit_rewards(uuid) from public;
create function public.refresh_hit_rewards()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.status = 'confirmed' and (new.hits is distinct from old.hits or old.status is distinct from 'confirmed') then
   perform public.grant_hit_rewards(new.user_id);
 end if;
 return new;
end;
$$;
create trigger participations_reward_milestones after update on public.participations
for each row execute function public.refresh_hit_rewards();
do $$ declare player record; begin
 for player in select distinct user_id from public.participations where status='confirmed' loop
   perform public.grant_hit_rewards(player.user_id);
 end loop;
end $$;

-- El cupón se consume de forma atómica tras guardar todos los pronósticos.
create function public.redeem_free_entry(target_participation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target record; credit_id uuid;
begin
 select p.id,p.user_id,p.status,g.id as game_id,g.game_type,g.closes_at
 into target from public.participations p join public.prode_games g on g.id=p.prode_game_id
 where p.id=target_participation_id for update of p;
 if not found or target.user_id<>auth.uid() or target.status<>'pending_payment'
   or target.closes_at<=now() then raise exception 'Participación no disponible'; end if;
 if (select count(*) from public.predictions where participation_id=target.id) <>
    (select count(*) from public.matches m where
      (target.game_type='express' and exists(select 1 from public.express_game_matches em
        where em.prode_game_id=target.game_id and em.match_id=m.id))
      or (target.game_type='automatic' and exists(select 1 from public.prode_game_matchdays gm
        where gm.prode_game_id=target.game_id and gm.matchday_id=m.matchday_id))) then
    raise exception 'Completá todos los pronósticos'; end if;
 select id into credit_id from public.reward_credits
 where user_id=auth.uid() and kind=case when target.game_type='express' then 'express' else 'argentina' end
   and redeemed_at is null order by created_at for update skip locked limit 1;
 if credit_id is null then raise exception 'No tenés una entrada gratis para este prode'; end if;
 update public.reward_credits set redeemed_at=now(),redeemed_game_id=target.game_id where id=credit_id;
 update public.payments set amount=0,status='approved',reviewed_at=now(),reviewed_by=null where participation_id=target.id;
 if not found then raise exception 'Pago no disponible'; end if;
 update public.participations set status='confirmed',confirmed_at=now() where id=target.id;
end;
$$;
revoke all on function public.redeem_free_entry(uuid) from public;
grant execute on function public.redeem_free_entry(uuid) to authenticated;

create function public.review_cash_reward(target_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_staff() then raise exception 'Acceso denegado'; end if;
 update public.reward_claims set status='paid',reviewed_by=auth.uid(),reviewed_at=now()
 where id=target_id and status='pending';
 if not found then raise exception 'Premio no disponible'; end if;
end;
$$;
revoke all on function public.review_cash_reward(uuid) from public;
grant execute on function public.review_cash_reward(uuid) to authenticated;

alter publication supabase_realtime add table public.user_feedback;
alter publication supabase_realtime add table public.identity_requests;

create function public.resolve_user_feedback(target_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_staff() then raise exception 'Acceso denegado'; end if;
 update public.user_feedback set status='resolved' where id=target_id and status='pending';
 if not found then raise exception 'Solicitud no disponible'; end if;
end;
$$;
revoke all on function public.resolve_user_feedback(uuid) from public;
grant execute on function public.resolve_user_feedback(uuid) to authenticated;

-- Los aciertos determinan premios monetarios; impedir que el jugador los edite por API.
create or replace function public.protect_participation_review()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user <> 'postgres' and auth.uid() is not null and (
    (new.status in ('confirmed', 'rejected') and new.status is distinct from old.status)
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.confirmed_at is distinct from old.confirmed_at
    or new.hits is distinct from old.hits
    or new.processed_matches is distinct from old.processed_matches
  ) then raise exception 'Solo el servidor puede aprobar o calcular aciertos'; end if;
  return new;
end;
$$;
