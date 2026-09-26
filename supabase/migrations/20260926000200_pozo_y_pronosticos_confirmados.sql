-- Solo las entradas aprobadas alimentan el pozo. No exponer pagos ni datos privados.
create function public.game_public_summary(target_game_id uuid)
returns table(players bigint, jackpot numeric)
language sql stable security definer set search_path = '' as $$
  select count(*)::bigint, coalesce(round(sum(pay.amount) * 0.78, 2), 0)::numeric
  from public.participations p
  join public.payments pay on pay.participation_id = p.id
  where p.prode_game_id = target_game_id and p.status = 'confirmed' and pay.status = 'approved';
$$;
revoke all on function public.game_public_summary(uuid) from public;
grant execute on function public.game_public_summary(uuid) to anon, authenticated;

create function public.game_confirmed_picks(target_game_id uuid)
returns table(participation_id uuid, username text, match_id uuid, prediction public.prediction_value, secondary_prediction text)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(nullif(prof.username, ''), 'Jugador')::text,
    pred.match_id, pred.prediction, pred.secondary_prediction
  from public.participations p
  join public.payments pay on pay.participation_id = p.id and pay.status = 'approved'
  join public.profiles prof on prof.id = p.user_id
  join public.predictions pred on pred.participation_id = p.id
  where p.prode_game_id = target_game_id and p.status = 'confirmed'
  order by p.confirmed_at, prof.username, pred.match_id;
$$;
revoke all on function public.game_confirmed_picks(uuid) from public;
grant execute on function public.game_confirmed_picks(uuid) to anon, authenticated;

-- Un pronóstico aprobado es definitivo, aun si el jugador llama a la API directamente.
create function public.freeze_confirmed_entry()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'confirmed' and new.status is distinct from old.status
    and current_user <> 'postgres' then
    raise exception 'La participación aprobada ya está cerrada';
  end if;
  return new;
end;
$$;
create trigger participations_freeze_confirmed before update on public.participations
for each row execute function public.freeze_confirmed_entry();

create function public.freeze_confirmed_predictions()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.participations p
    where p.id = case when tg_op = 'DELETE' then old.participation_id else new.participation_id end
    and p.status = 'confirmed') then
    raise exception 'Los pronósticos aprobados no se pueden modificar';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger predictions_freeze_confirmed before insert or update or delete on public.predictions
for each row execute function public.freeze_confirmed_predictions();

-- Aviso persistente para el jugador, creado en la misma transacción de aprobación.
create table public.player_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prode_game_id uuid not null references public.prode_games(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index player_notifications_user_created_idx on public.player_notifications(user_id, created_at desc);
alter table public.player_notifications enable row level security;
create policy "Jugador lee sus avisos" on public.player_notifications
for select to authenticated using (user_id = auth.uid());

create function public.notify_approved_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    insert into public.player_notifications(user_id, prode_game_id, message)
    select new.user_id, new.prode_game_id,
      'Tu participación en ' || g.name || ' fue aprobada. Tus pronósticos ya están confirmados.'
    from public.prode_games g where g.id = new.prode_game_id;
  end if;
  return new;
end;
$$;
create trigger participations_notify_approval after update on public.participations
for each row execute function public.notify_approved_entry();

-- Transmitir el aviso al dispositivo si la aplicación está abierta.
alter publication supabase_realtime add table public.player_notifications;
