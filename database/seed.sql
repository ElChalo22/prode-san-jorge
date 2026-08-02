-- Datos iniciales de Prode San Jorge
-- Ejecutar después de schema.sql

-- =========================================================
-- GRUPOS DE PRODE
-- =========================================================

insert into public.prode_groups (
  id,
  slug,
  name,
  description,
  emoji,
  active
)
values
(
  '11111111-1111-1111-1111-111111111111',
  'argentina',
  'Prode Argentina',
  'Fecha completa de la Liga Profesional Argentina',
  '🇦🇷',
  true
),
(
  '22222222-2222-2222-2222-222222222222',
  'internacional',
  'Prode Internacional',
  'Champions League, Copa Libertadores y Copa Sudamericana',
  '🌎',
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  emoji = excluded.emoji,
  active = excluded.active;

-- =========================================================
-- COMPETICIONES
-- Los provider_id definitivos se ajustarán al conectar
-- el sincronizador de Promiedos.
-- =========================================================

insert into public.competitions (
  id,
  provider,
  provider_id,
  name,
  short_name,
  country,
  active
)
values
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'promiedos',
  'liga-profesional-argentina',
  'Liga Profesional Argentina',
  'Liga Argentina',
  'Argentina',
  true
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  'promiedos',
  'uefa-champions-league',
  'UEFA Champions League',
  'Champions',
  'Europa',
  true
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  'promiedos',
  'copa-libertadores',
  'Copa Libertadores',
  'Libertadores',
  'Sudamérica',
  true
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
  'promiedos',
  'copa-sudamericana',
  'Copa Sudamericana',
  'Sudamericana',
  'Sudamérica',
  true
)
on conflict (provider, provider_id) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  country = excluded.country,
  active = excluded.active;

-- =========================================================
-- RELACIÓN ENTRE PRODES Y COMPETICIONES
-- =========================================================

insert into public.prode_group_competitions (
  prode_group_id,
  competition_id,
  active
)
values
(
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  true
),
(
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  true
),
(
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  true
),
(
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
  true
)
on conflict (prode_group_id, competition_id) do update
set active = excluded.active;