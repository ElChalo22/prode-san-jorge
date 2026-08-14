-- =========================================================
-- PRODE SAN JORGE
-- Permisos de backend para service_role
-- =========================================================

-- Permite al backend administrativo trabajar con todas
-- las tablas actuales del esquema public.
grant select, insert, update, delete
on all tables in schema public
to service_role;

-- Permite usar secuencias actuales.
grant usage, select
on all sequences in schema public
to service_role;

-- Garantiza que las tablas que creemos más adelante
-- también sean accesibles desde service_role.
alter default privileges in schema public
grant select, insert, update, delete
on tables
to service_role;

-- Lo mismo para futuras secuencias.
alter default privileges in schema public
grant usage, select
on sequences
to service_role;