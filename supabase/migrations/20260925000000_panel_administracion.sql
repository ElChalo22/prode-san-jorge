-- Los roles solo se asignan desde SQL de confianza o por un superadmin.
create or replace function public.protect_profile_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user <> 'postgres' and auth.uid() is not null and (
    new.id is distinct from old.id or
    new.role is distinct from old.role or
    new.email is distinct from old.email
  ) then
    raise exception 'No podés modificar tu identidad o rol';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_identity
before update on public.profiles
for each row execute function public.protect_profile_identity();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'superadmin')
  );
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

create policy "Administradores leen participaciones"
on public.participations for select to authenticated
using (public.is_staff());

create policy "Administradores leen pagos"
on public.payments for select to authenticated
using (public.is_staff());

create policy "Administradores leen comprobantes"
on public.payment_receipts for select to authenticated
using (public.is_staff());

create policy "Administradores leen todos los prodes"
on public.prode_games for select to authenticated
using (public.is_staff());

-- Solo un superadmin puede delegar o quitar acceso. No puede quitarse
-- a sí mismo el último acceso de superadmin.
create or replace function public.set_staff_role(target_id uuid, new_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles where id = actor_id and role = 'superadmin') then
    raise exception 'Acceso denegado';
  end if;
  if target_id is null or new_role is null or new_role not in ('player', 'admin') then
    raise exception 'Solo se puede asignar o quitar el rol de admin';
  end if;
  if target_id = actor_id and new_role <> 'superadmin' then
    raise exception 'No podés quitarte el acceso de superadmin';
  end if;
  update public.profiles set role = new_role where id = target_id;
  if not found then raise exception 'Usuario inexistente'; end if;
end;
$$;
revoke all on function public.set_staff_role(uuid, public.user_role) from public;
grant execute on function public.set_staff_role(uuid, public.user_role) to authenticated;

-- Asignación inicial realizada exclusivamente por migración. Verificamos
-- UUID y correo para evitar otorgar privilegios a una cuenta equivocada.
do $$
begin
  if not exists (
    select 1 from auth.users
    where id = '3232859a-c933-4c78-bf89-10d21af2db10'
      and lower(email) = 'prodesanjorge.app@gmail.com'
  ) or not exists (
    select 1 from auth.users
    where id = 'ded7c9b2-8d44-4495-a7e4-cd2604aca8c0'
      and lower(email) = 'chalorosales22@gmail.com'
  ) then
    raise exception 'No coinciden los usuarios iniciales de Auth; revisar antes de asignar roles';
  end if;

  update public.profiles set role = 'superadmin'
  where id = '3232859a-c933-4c78-bf89-10d21af2db10';
  if not found then raise exception 'Falta el perfil de superadmin'; end if;

  update public.profiles set role = 'admin'
  where id = 'ded7c9b2-8d44-4495-a7e4-cd2604aca8c0';
  if not found then raise exception 'Falta el perfil de admin'; end if;
end;
$$;
