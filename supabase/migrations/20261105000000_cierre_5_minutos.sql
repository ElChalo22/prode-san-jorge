-- PRODE22: permitir pronósticos hasta cinco minutos antes del primer partido.
-- review_paid_prode queda sin cierre temporal para aprobar comprobantes
-- correspondientes a jugadas guardadas antes del cierre.
DO $migration$
DECLARE
  target record;
  definition text;
  old_interval constant text := $literal$interval '15 minutes'$literal$;
  actual_count integer;
BEGIN
  FOR target IN
    SELECT routine AS signature, expected
    FROM (VALUES
      ('public.create_express_game(text,uuid[],numeric)'::regprocedure, 3),
      ('public.save_prode_entry(uuid,jsonb,uuid,uuid)'::regprocedure, 1),
      ('public.confirm_offline_entry(uuid,uuid,jsonb,text,boolean)'::regprocedure, 1)
    ) AS routines(routine, expected)
  LOOP
    SELECT pg_get_functiondef(target.signature) INTO definition;
    actual_count :=
      (length(definition) - length(replace(definition, old_interval, '')))
      / length(old_interval);
    IF actual_count <> target.expected THEN
      RAISE EXCEPTION 'Se esperaban % límites de 15 minutos en %, se encontraron %',
        target.expected, target.signature, actual_count;
    END IF;
    definition := replace(definition, old_interval, $literal$interval '5 minutes'$literal$);
    definition := replace(definition,
      '15 minutos antes del primer partido',
      '5 minutos antes del primer partido');
    EXECUTE definition;
  END LOOP;
END
$migration$;

-- Actualiza cierres de fechas activas. Reabre las que habían cerrado por
-- el margen anterior de 15 minutos y todavía tienen más de 5 minutos.
WITH first_kickoffs AS (
  SELECT g.id, min(m.kickoff_at) AS first_kickoff
  FROM public.prode_games g
  JOIN public.matches m ON (
    (g.game_type = 'express' AND EXISTS (
      SELECT 1 FROM public.express_game_matches em
      WHERE em.prode_game_id = g.id AND em.match_id = m.id
    ))
    OR
    (g.game_type = 'automatic' AND EXISTS (
      SELECT 1 FROM public.prode_game_matchdays gm
      WHERE gm.prode_game_id = g.id AND gm.matchday_id = m.matchday_id
    ))
  )
  WHERE g.status IN ('open', 'closed')
    AND g.archived_at IS NULL
  GROUP BY g.id
)
UPDATE public.prode_games g
SET closes_at = f.first_kickoff - interval '5 minutes',
    status = CASE
      WHEN g.status = 'closed'
        AND g.closes_at <= now()
        AND f.first_kickoff - interval '5 minutes' > now()
        THEN 'open'::public.game_status
      ELSE g.status
    END
FROM first_kickoffs f
WHERE g.id = f.id
  AND f.first_kickoff > now();

NOTIFY pgrst, 'reload schema';
