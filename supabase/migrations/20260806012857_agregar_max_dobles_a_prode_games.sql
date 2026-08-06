alter table public.prode_games
add column max_double_predictions integer not null default 2;

alter table public.prode_games
add constraint prode_games_max_double_predictions_check
check (max_double_predictions >= 0);