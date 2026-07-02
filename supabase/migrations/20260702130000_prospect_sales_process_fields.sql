alter table if exists public.prospects
  add column if not exists metraje_exacto numeric,
  add column if not exists precio_m2_pactado numeric,
  add column if not exists fecha_compromiso_cierre date,
  add column if not exists unidad_lote text,
  add column if not exists manzana_lote text,
  add column if not exists tipo_financiamiento_venta text,
  add column if not exists condiciones_financiamiento text;

alter table if exists public.prospects
  drop constraint if exists prospects_tipo_financiamiento_venta_check;

alter table if exists public.prospects
  add constraint prospects_tipo_financiamiento_venta_check
  check (
    tipo_financiamiento_venta is null
    or tipo_financiamiento_venta in ('36_meses', '24_meses', 'contado', 'otro')
  );

create index if not exists prospects_fecha_compromiso_cierre_idx
  on public.prospects (fecha_compromiso_cierre);

create index if not exists prospects_tipo_financiamiento_venta_idx
  on public.prospects (tipo_financiamiento_venta);
