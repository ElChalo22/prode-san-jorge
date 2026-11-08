-- Mantener el club seleccionado en los reclamos de campera pendientes.
create index if not exists reward_claims_team_id_idx
  on public.reward_claims(team_id);

create or replace function public.sync_pending_jacket_claim_team()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.reward_claims
  set team_id = new.favorite_team_id
  where user_id = new.id
    and milestone = 200
    and reward_type = 'jacket'
    and status = 'pending';
  return new;
end;
$$;
revoke all on function public.sync_pending_jacket_claim_team() from public;

create trigger profiles_sync_pending_jacket_claim_team
after update of favorite_team_id on public.profiles
for each row
when (new.favorite_team_id is distinct from old.favorite_team_id)
execute function public.sync_pending_jacket_claim_team();

update public.reward_claims claim
set team_id = profile.favorite_team_id
from public.profiles profile
where claim.user_id = profile.id
  and claim.milestone = 200
  and claim.reward_type = 'jacket'
  and claim.status = 'pending'
  and claim.team_id is distinct from profile.favorite_team_id;
