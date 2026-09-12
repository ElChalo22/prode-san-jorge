create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Ejecuta el importador cada 30 minutos.
-- Antes de aplicar esta migración deben existir en Vault:
--   project_url           -> https://TU-PROYECTO.supabase.co
--   publishable_key       -> clave publishable/anon del proyecto
--   import_cron_secret    -> el mismo IMPORT_CRON_SECRET de la Edge Function

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'prode-san-jorge-import-promiedos'
  ) then
    perform cron.unschedule('prode-san-jorge-import-promiedos');
  end if;
end
$$;

select cron.schedule(
  'prode-san-jorge-import-promiedos',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'project_url'
      limit 1
    ) || '/functions/v1/import-promiedos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'publishable_key'
        limit 1
      ),
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'import_cron_secret'
        limit 1
      )
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'requested_at', now()
    ),
    timeout_milliseconds := 120000
  );
  $$
);
