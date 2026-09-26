alter table public.prode_games add column description text;
update public.prode_games set description = 'Elegí tus pronósticos para este Prode Express.'
where game_type = 'express';
-- Retirar de Inicio los Express de prueba publicados sin precio.
update public.prode_games set status = 'cancelled'
where game_type = 'express' and entry_fee = 0 and status = 'open';
alter table public.participations
  add column reviewed_by uuid references public.profiles(id),
  add column reviewed_at timestamptz;

alter table public.app_settings
  add column argentina_entry_fee numeric(12,2) not null default 0,
  add column argentina_payment_alias text;
update public.prode_games set status = 'draft'
where game_type = 'automatic' and status = 'open' and entry_fee = 0;

-- Mantener el Express gratuito anterior únicamente como prueba histórica.
create function public.require_paid_game()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'open' and new.entry_fee <= 0 then
    raise exception 'Un prode abierto necesita un precio mayor a cero';
  end if;
  if new.game_type = 'express' and new.entry_fee <= 0 and tg_op = 'INSERT' then
    raise exception 'El Prode Express necesita un precio mayor a cero';
  end if;
  return new;
end;
$$;
create trigger prode_games_require_paid before insert or update on public.prode_games
for each row execute function public.require_paid_game();

create function public.configure_argentina_payment(new_fee numeric, new_alias text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid()
    and role in ('admin', 'superadmin')) then raise exception 'Acceso denegado'; end if;
  if new_fee is null or new_fee <= 0 then raise exception 'Ingresá un precio mayor a cero'; end if;
  if char_length(trim(coalesce(new_alias, ''))) not between 3 and 100 then
    raise exception 'Ingresá un alias válido'; end if;
  update public.app_settings set argentina_entry_fee = new_fee,
    argentina_payment_alias = trim(new_alias), updated_at = now();
  update public.prode_games set entry_fee = new_fee, payment_alias = trim(new_alias),
    status = 'open'
  where game_type = 'automatic' and status in ('draft','open') and closes_at > now()
    and not exists (select 1 from public.participations where prode_game_id = prode_games.id);
end;
$$;
revoke all on function public.configure_argentina_payment(numeric, text) from public;
grant execute on function public.configure_argentina_payment(numeric, text) to authenticated;

create function public.create_paid_express(
  game_name text, game_description text, selected_match_ids uuid[], fee numeric,
  transfer_alias text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare game_id uuid;
begin
  if fee is null or fee <= 0 then raise exception 'Ingresá un precio mayor a cero'; end if;
  if char_length(trim(coalesce(game_description, ''))) > 160 then
    raise exception 'La descripción no puede superar los 160 caracteres'; end if;
  if char_length(trim(coalesce(transfer_alias, ''))) not between 3 and 100 then
    raise exception 'Ingresá un alias de transferencia válido'; end if;
  -- La función existente valida rol, partidos y horario.
  game_id := public.create_express_game(game_name, selected_match_ids, fee);
  update public.prode_games set
    description = coalesce(nullif(trim(game_description), ''), 'Elegí tus pronósticos para este Prode Express.'),
    payment_alias = trim(transfer_alias)
  where id = game_id;
  return game_id;
end;
$$;
revoke all on function public.create_paid_express(text, text, uuid[], numeric, text) from public;
grant execute on function public.create_paid_express(text, text, uuid[], numeric, text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('prode-receipts', 'prode-receipts', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;
create policy "Jugador sube su comprobante"
on storage.objects for insert to authenticated
with check (bucket_id = 'prode-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Jugador y equipo leen comprobantes"
on storage.objects for select to authenticated
using (bucket_id = 'prode-receipts' and
  ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

create policy "Jugador lee su comprobante" on public.payment_receipts
for select to authenticated using (exists (
  select 1 from public.payments pay join public.participations p on p.id = pay.participation_id
  where pay.id = payment_id and p.user_id = auth.uid()
));

-- El jugador no puede aprobar su propia participación por UPDATE directo.
create function public.protect_participation_review()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user <> 'postgres' and auth.uid() is not null and (
    (new.status in ('confirmed', 'rejected') and new.status is distinct from old.status)
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.confirmed_at is distinct from old.confirmed_at
  ) then raise exception 'La aprobación corresponde al equipo de administración'; end if;
  return new;
end;
$$;
create trigger participations_protect_review before update on public.participations
for each row execute function public.protect_participation_review();

-- Guardar pronósticos inicia una ventana de diez minutos para transferir.
create function public.start_prode_payment(target_participation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target record;
begin
  select p.id, p.user_id, p.status, g.id as game_id, g.game_type, g.entry_fee, g.currency, g.closes_at
  into target from public.participations p join public.prode_games g on g.id = p.prode_game_id
  where p.id = target_participation_id for update of p;
  if not found or target.user_id <> auth.uid() then raise exception 'Participación no disponible'; end if;
  if target.entry_fee <= 0 then raise exception 'Este prode de prueba no admite pagos'; end if;
  if target.closes_at <= now() then raise exception 'El prode ya cerró'; end if;
  if (select count(*) from public.predictions where participation_id = target.id) <>
     (select count(*) from public.matches m where
        (target.game_type = 'express' and exists (select 1 from public.express_game_matches em
          where em.prode_game_id = target.game_id and em.match_id = m.id))
        or (target.game_type = 'automatic' and exists (select 1 from public.prode_game_matchdays gm
          where gm.prode_game_id = target.game_id and gm.matchday_id = m.matchday_id))) then
    raise exception 'Completá todos los pronósticos'; end if;
  if exists (select 1 from public.payments where participation_id = target.id and status = 'approved') then
    update public.payments set status = 'uploaded', reviewed_at = null, reviewed_by = null
    where participation_id = target.id;
    update public.participations set status = 'payment_under_review', submitted_at = now(),
      confirmed_at = null, reviewed_at = null, reviewed_by = null
    where id = target.id;
    return;
  end if;
  insert into public.payments(participation_id, amount, currency, status)
  values (target.id, target.entry_fee, target.currency, 'pending')
  on conflict (participation_id) do update set amount = excluded.amount,
    currency = excluded.currency, status = 'pending', reviewed_at = null,
    reviewed_by = null, rejection_reason = null;
  update public.participations set status = 'pending_payment',
    payment_deadline = now() + interval '10 minutes', submitted_at = now(),
    reviewed_by = null, reviewed_at = null, confirmed_at = null where id = target.id;
end;
$$;
revoke all on function public.start_prode_payment(uuid) from public;
grant execute on function public.start_prode_payment(uuid) to authenticated;

-- El comprobante debe existir en Storage, pertenecer al jugador y llegar antes del plazo.
create function public.submit_prode_receipt(target_participation_id uuid, object_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare target record;
begin
  select p.id, p.user_id, p.payment_deadline, p.status, pay.id as payment_id, pay.status as payment_status
  into target from public.participations p join public.payments pay on pay.participation_id = p.id
  where p.id = target_participation_id for update of p;
  if not found or target.user_id <> auth.uid() or target.status <> 'pending_payment'
    or target.payment_status <> 'pending' then raise exception 'Pago no disponible'; end if;
  if target.payment_deadline <= now() then raise exception 'Venció el plazo para enviar el comprobante'; end if;
  if object_path is null or object_path not like (auth.uid()::text || '/%')
    or not exists (select 1 from storage.objects
      where bucket_id = 'prode-receipts' and name = object_path) then
    raise exception 'Comprobante inválido'; end if;
  delete from public.payment_receipts where payment_id = target.payment_id;
  insert into public.payment_receipts(payment_id, file_url) values (target.payment_id, object_path);
  update public.payments set status = 'uploaded' where id = target.payment_id;
  update public.participations set status = 'payment_under_review' where id = target.id;
end;
$$;
revoke all on function public.submit_prode_receipt(uuid, text) from public;
grant execute on function public.submit_prode_receipt(uuid, text) to authenticated;

create function public.review_paid_prode(target_participation_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare target record;
begin
  if not exists (select 1 from public.profiles where id = auth.uid()
    and role in ('admin', 'superadmin')) then raise exception 'Acceso denegado'; end if;
  if approve is null then raise exception 'Indicá si se aprueba o rechaza'; end if;
  select p.id, p.status, pay.id as payment_id, pay.status as payment_status,
    g.game_type, g.entry_fee, g.id as game_id
  into target from public.participations p join public.payments pay on pay.participation_id = p.id
  join public.prode_games g on g.id = p.prode_game_id
  where p.id = target_participation_id for update of p;
  if not found or target.entry_fee <= 0
    or target.status <> 'payment_under_review' or target.payment_status <> 'uploaded'
    or not exists (select 1 from public.payment_receipts where payment_id = target.payment_id) then
    raise exception 'El comprobante no está pendiente de revisión'; end if;
  if (select count(*) from public.predictions where participation_id = target.id) <>
     (select count(*) from public.matches m where
        (target.game_type = 'express' and exists (select 1 from public.express_game_matches em
          where em.prode_game_id = target.game_id and em.match_id = m.id))
        or (target.game_type = 'automatic' and exists (select 1 from public.prode_game_matchdays gm
          where gm.prode_game_id = target.game_id and gm.matchday_id = m.matchday_id))) then
    raise exception 'Faltan pronósticos'; end if;
  update public.payments set status = case when approve then 'approved'::public.payment_status
    else 'rejected'::public.payment_status end, reviewed_by = auth.uid(), reviewed_at = now()
  where id = target.payment_id;
  update public.participations set status = case when approve then 'confirmed'::public.participation_status
    else 'rejected'::public.participation_status end,
    confirmed_at = case when approve then now() else null end,
    reviewed_by = auth.uid(), reviewed_at = now() where id = target.id;
end;
$$;
revoke all on function public.review_paid_prode(uuid, boolean) from public;
grant execute on function public.review_paid_prode(uuid, boolean) to authenticated;

create policy "Administradores leen pronósticos" on public.predictions
for select to authenticated using (public.is_staff());

-- El Express gratuito que ya se publicó sirve solo como prueba previa.
