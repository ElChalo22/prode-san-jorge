-- Campera personalizada para quienes alcanzan 200 aciertos acumulados.
alter table public.reward_claims
  add column reward_type text not null default 'cash'
    check (reward_type in ('cash', 'jacket')),
  add column team_id uuid references public.teams(id);

alter table public.reward_claims drop constraint if exists reward_claims_milestone_check;
alter table public.reward_claims
  add constraint reward_claims_milestone_check check (milestone in (125, 200));

alter table public.reward_claims drop constraint if exists reward_claims_status_check;
alter table public.reward_claims
  add constraint reward_claims_status_check check (status in ('pending', 'paid', 'delivered'));

create or replace function public.grant_hit_rewards(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  total_hits bigint;
  favorite_team uuid;
begin
  select coalesce(sum(hits), 0) into total_hits
  from public.participations
  where user_id = target_user_id and status = 'confirmed';

  select favorite_team_id into favorite_team
  from public.profiles
  where id = target_user_id;

  if total_hits >= 55 then
    insert into public.reward_credits(user_id, kind, source)
    values (target_user_id, 'argentina', '55_hits')
    on conflict (user_id, source) do nothing;
  end if;

  if total_hits >= 125 then
    insert into public.reward_claims(user_id, milestone, amount, reward_type)
    values (target_user_id, 125, 25000, 'cash')
    on conflict (user_id, milestone) do nothing;
  end if;

  if total_hits >= 200 then
    insert into public.reward_claims(user_id, milestone, amount, reward_type, team_id)
    values (target_user_id, 200, 0, 'jacket', favorite_team)
    on conflict (user_id, milestone) do nothing;
  end if;
end;
$$;
revoke all on function public.grant_hit_rewards(uuid) from public;

create or replace function public.review_cash_reward(target_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Acceso denegado'; end if;
  update public.reward_claims
  set status = 'paid', reviewed_by = auth.uid(), reviewed_at = now()
  where id = target_id and status = 'pending' and reward_type = 'cash';
  if not found then raise exception 'Premio en efectivo no disponible'; end if;
end;
$$;
revoke all on function public.review_cash_reward(uuid) from public;
grant execute on function public.review_cash_reward(uuid) to authenticated;

create function public.review_jacket_reward(target_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Acceso denegado'; end if;
  update public.reward_claims
  set status = 'delivered', reviewed_by = auth.uid(), reviewed_at = now()
  where id = target_id and status = 'pending' and reward_type = 'jacket';
  if not found then raise exception 'Premio de campera no disponible'; end if;
end;
$$;
revoke all on function public.review_jacket_reward(uuid) from public;
grant execute on function public.review_jacket_reward(uuid) to authenticated;

-- Crear el reclamo de campera para participantes que ya hayan alcanzado el nuevo hito.
do $$
declare player record;
begin
  for player in
    select distinct user_id from public.participations where status = 'confirmed'
  loop
    perform public.grant_hit_rewards(player.user_id);
  end loop;
end;
$$;
