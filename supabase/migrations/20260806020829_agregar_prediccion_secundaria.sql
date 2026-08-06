alter table public.predictions
add column secondary_prediction text null;

alter table public.predictions
add constraint predictions_secondary_prediction_check
check (
  secondary_prediction is null
  or secondary_prediction in ('1', 'X', '2')
);

alter table public.predictions
add constraint predictions_double_prediction_check
check (
  secondary_prediction is null
  or (
    prediction = '1'
    and secondary_prediction = 'X'
  )
  or (
    prediction = 'X'
    and secondary_prediction = '2'
  )
);