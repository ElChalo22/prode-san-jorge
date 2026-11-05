-- Horarios oficiales de la Fecha 16 publicados por AFA el 2 de noviembre de 2026.
-- El feed de Promiedos conservó las horas previas, dos horas antes.
WITH official(provider_id, kickoff_at) AS (
  VALUES
    ('egddcaa','2026-11-05 15:00:00-03'::timestamptz),
    ('egddbjj','2026-11-05 19:15:00-03'::timestamptz),
    ('egddcab','2026-11-06 15:00:00-03'::timestamptz),
    ('egddcag','2026-11-06 19:15:00-03'::timestamptz),
    ('egddcba','2026-11-06 19:15:00-03'::timestamptz),
    ('egddcaj','2026-11-06 19:15:00-03'::timestamptz),
    ('egddcae','2026-11-06 22:00:00-03'::timestamptz),
    ('egddcac','2026-11-06 22:00:00-03'::timestamptz),
    ('egddcah','2026-11-07 15:00:00-03'::timestamptz),
    ('egddcbc','2026-11-07 15:00:00-03'::timestamptz),
    ('egddcad','2026-11-07 17:30:00-03'::timestamptz),
    ('egddbji','2026-11-07 17:30:00-03'::timestamptz),
    ('egddcaf','2026-11-07 17:30:00-03'::timestamptz),
    ('egddcai','2026-11-07 22:00:00-03'::timestamptz),
    ('egddcbb','2026-11-08 19:30:00-03'::timestamptz)
)
UPDATE public.matches m
SET kickoff_at = o.kickoff_at
FROM official o
WHERE m.provider = 'promiedos'
  AND m.provider_id = o.provider_id;

UPDATE public.matchdays d
SET starts_at = times.first_kickoff,
    ends_at = times.last_kickoff
FROM (
  SELECT m.matchday_id, min(m.kickoff_at) AS first_kickoff, max(m.kickoff_at) AS last_kickoff
  FROM public.matches m
  WHERE m.provider = 'promiedos'
    AND m.provider_id IN (
      'egddcaa','egddbjj','egddcab','egddcag','egddcba','egddcaj','egddcae',
      'egddcac','egddcah','egddcbc','egddcad','egddbji','egddcaf','egddcai','egddcbb'
    )
  GROUP BY m.matchday_id
) times
WHERE d.id = times.matchday_id;

WITH first_kickoffs AS (
  SELECT gm.prode_game_id, min(m.kickoff_at) AS first_kickoff
  FROM public.prode_game_matchdays gm
  JOIN public.matches m ON m.matchday_id = gm.matchday_id
  WHERE gm.matchday_id IN (
    SELECT DISTINCT m.matchday_id FROM public.matches m
    WHERE m.provider='promiedos'
      AND m.provider_id IN (
        'egddcaa','egddbjj','egddcab','egddcag','egddcba','egddcaj','egddcae',
        'egddcac','egddcah','egddcbc','egddcad','egddbji','egddcaf','egddcai','egddcbb'
      )
  )
  GROUP BY gm.prode_game_id
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
WHERE g.id=f.prode_game_id
  AND g.status IN ('open','closed')
  AND g.archived_at IS NULL;

NOTIFY pgrst, 'reload schema';
