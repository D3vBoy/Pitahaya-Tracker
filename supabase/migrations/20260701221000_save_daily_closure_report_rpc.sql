create or replace function public.save_daily_closure_report(
  p_report_date date,
  p_leads_nuevos integer,
  p_llamadas_realizadas integer,
  p_llamadas_seguimiento integer,
  p_videollamadas_ejecutadas integer,
  p_videollamadas_agendadas integer,
  p_apartados_del_mes integer,
  p_enganches_del_mes integer,
  p_prospectos_calientes integer
)
returns public.daily_closure_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.daily_closure_reports%rowtype;
  v_report public.daily_closure_reports;
  v_now timestamptz := timezone('utc', now());
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select *
    into v_existing
  from public.daily_closure_reports
  where user_id = v_user_id
    and report_date = p_report_date
  limit 1;

  if found then
    if v_existing.report_date <> current_date
      and (v_existing.edit_unlocked_until is null or v_existing.edit_unlocked_until <= v_now) then
      raise exception 'No tienes permiso para editar este cierre';
    end if;

    update public.daily_closure_reports
      set leads_nuevos = p_leads_nuevos,
          llamadas_realizadas = p_llamadas_realizadas,
          llamadas_seguimiento = p_llamadas_seguimiento,
          videollamadas_ejecutadas = p_videollamadas_ejecutadas,
          videollamadas_agendadas = p_videollamadas_agendadas,
          apartados_del_mes = p_apartados_del_mes,
          enganches_del_mes = p_enganches_del_mes,
          prospectos_calientes = p_prospectos_calientes,
          updated_at = v_now,
          edit_unlocked_until = null
    where id = v_existing.id
    returning * into v_report;
  else
    if p_report_date <> current_date then
      raise exception 'No puedes registrar cierres históricos';
    end if;

    insert into public.daily_closure_reports (
      user_id,
      report_date,
      leads_nuevos,
      llamadas_realizadas,
      llamadas_seguimiento,
      videollamadas_ejecutadas,
      videollamadas_agendadas,
      apartados_del_mes,
      enganches_del_mes,
      prospectos_calientes,
      updated_at,
      edit_unlocked_until
    )
    values (
      v_user_id,
      p_report_date,
      p_leads_nuevos,
      p_llamadas_realizadas,
      p_llamadas_seguimiento,
      p_videollamadas_ejecutadas,
      p_videollamadas_agendadas,
      p_apartados_del_mes,
      p_enganches_del_mes,
      p_prospectos_calientes,
      v_now,
      null
    )
    returning * into v_report;
  end if;

  return v_report;
end;
$$;

grant execute on function public.save_daily_closure_report(
  date,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) to authenticated;