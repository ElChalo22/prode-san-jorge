-- Lectura pública para la demo sin inicio de sesión.
-- Solo permite leer información pública del Prode.
-- Participaciones, pronósticos y pagos siguen protegidos.

create policy "Publico lee grupos activos"
on public.prode_groups
for select
to anon
using (active = true);

create policy "Publico lee competiciones activas"
on public.competitions
for select
to anon
using (active = true);

create policy "Publico lee relaciones de competiciones"
on public.prode_group_competitions
for select
to anon
using (active = true);

create policy "Publico lee equipos activos"
on public.teams
for select
to anon
using (active = true);

create policy "Publico lee fechas"
on public.matchdays
for select
to anon
using (true);

create policy "Publico lee partidos"
on public.matches
for select
to anon
using (true);

create policy "Publico lee prodes publicados"
on public.prode_games
for select
to anon
using (status in ('open', 'closed', 'finished'));

create policy "Publico lee fechas de prodes"
on public.prode_game_matchdays
for select
to anon
using (true);

notify pgrst, 'reload schema';