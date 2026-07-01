"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { STATUS_OPTIONS, displayValue, isActiveStatus } from "@/lib/prospects/status";

interface ActionProspect {
  id: string;
  nombre_cliente: string;
  estatus_general: string;
  probabilidad_cierre: number | null;
  monto_total: number | null;
  proximo_seguimiento: string | null;
  fecha_primer_contacto: string;
  fecha_enganche: string | null;
  apartado_realizado: boolean;
  profiles?: { full_name: string | null } | null;
}

interface Props {
  data: ActionProspect[];
  loading?: boolean;
  onRowClick?: (prospect: ActionProspect) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "N/A";
  return format(date, "dd MMM", { locale: es });
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return "N/A";
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

function ProspectChip({
  prospect,
  onClick,
}: {
  prospect: ActionProspect;
  onClick?: (prospect: ActionProspect) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(prospect)}
      className="w-full rounded-lg border border-[#39065E]/35 bg-[#100B1B]/55 px-3 py-2 text-left transition-colors hover:bg-[#39065E]/16"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-white">{displayValue(prospect.nombre_cliente)}</p>
        <span className="text-xs text-pitahaya-gray-500">{prospect.probabilidad_cierre ?? 0}%</span>
      </div>
      <p className="mt-1 truncate text-xs text-pitahaya-gray-400">Asesor: {displayValue(prospect.profiles?.full_name)}</p>
      <p className="mt-0.5 text-xs text-pitahaya-gray-500">Seguimiento: {formatDate(prospect.proximo_seguimiento)}</p>
    </button>
  );
}

function SectionCard({
  title,
  subtitle,
  count,
  prospects,
  onRowClick,
}: {
  title: string;
  subtitle: string;
  count: number;
  prospects: ActionProspect[];
  onRowClick?: (prospect: ActionProspect) => void;
}) {
  return (
    <div className="premium-panel rounded-2xl p-4">
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-[#39065E]/35 pb-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-pitahaya-gray-500">{subtitle}</p>
        </div>
        <span className="rounded-full border border-[#39065E]/50 bg-[#39065E]/18 px-2.5 py-1 text-xs font-semibold text-white">
          {count}
        </span>
      </div>
      <div className="space-y-2">
        {prospects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#39065E]/35 px-3 py-5 text-center text-xs text-pitahaya-gray-500">
            Sin prospectos en este bloque.
          </p>
        ) : (
          prospects.slice(0, 5).map((prospect) => (
            <ProspectChip key={prospect.id} prospect={prospect} onClick={onRowClick} />
          ))
        )}
      </div>
    </div>
  );
}

export default function ActionCenterDashboard({ data, loading = false, onRowClick }: Props) {
  const today = toDayStart(new Date());
  const nextThreeDays = new Date(today.getTime() + DAY_MS * 3);

  const active = data.filter((p) => isActiveStatus(p.estatus_general));

  const overdue = active
    .filter((p) => {
      const follow = parseDate(p.proximo_seguimiento);
      if (!follow) return false;
      return toDayStart(follow).getTime() < today.getTime();
    })
    .sort((a, b) => {
      const aDate = parseDate(a.proximo_seguimiento)?.getTime() || 0;
      const bDate = parseDate(b.proximo_seguimiento)?.getTime() || 0;
      return aDate - bDate;
    });

  const dueToday = active.filter((p) => {
    const follow = parseDate(p.proximo_seguimiento);
    if (!follow) return false;
    return toDayStart(follow).getTime() === today.getTime();
  });

  const nextUp = active
    .filter((p) => {
      const follow = parseDate(p.proximo_seguimiento);
      if (!follow) return false;
      const day = toDayStart(follow).getTime();
      return day > today.getTime() && day <= nextThreeDays.getTime();
    })
    .sort((a, b) => {
      const aDate = parseDate(a.proximo_seguimiento)?.getTime() || 0;
      const bDate = parseDate(b.proximo_seguimiento)?.getTime() || 0;
      return aDate - bDate;
    });

  const hotLeads = active
    .filter((p) => (p.probabilidad_cierre || 0) >= 70)
    .sort((a, b) => (b.probabilidad_cierre || 0) - (a.probabilidad_cierre || 0));

  const riskNoDate = active.filter((p) => !p.proximo_seguimiento);
  const riskStale = active.filter((p) => {
    const follow = parseDate(p.proximo_seguimiento);
    if (!follow) return false;
    const daysLate = Math.floor((today.getTime() - toDayStart(follow).getTime()) / DAY_MS);
    return daysLate >= 5;
  });
  const riskApartado = active.filter((p) => p.apartado_realizado && !p.fecha_enganche);

  const statusMap = new Map<string, ActionProspect[]>();
  STATUS_OPTIONS.forEach((status) => statusMap.set(status, []));
  active.forEach((prospect) => {
    const key = prospect.estatus_general;
    if (!statusMap.has(key)) {
      statusMap.set(key, []);
    }
    statusMap.get(key)?.push(prospect);
  });

  const kanbanColumns = Array.from(statusMap.entries())
    .filter(([, prospects]) => prospects.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="premium-panel rounded-2xl p-10 text-center text-pitahaya-gray-500">
        Cargando centro de accion...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <SectionCard
          title="Vencidos"
          subtitle="Seguimientos pendientes al dia de hoy"
          count={overdue.length}
          prospects={overdue}
          onRowClick={onRowClick}
        />
        <SectionCard
          title="Hoy"
          subtitle="Acciones que deben atenderse hoy"
          count={dueToday.length}
          prospects={dueToday}
          onRowClick={onRowClick}
        />
        <SectionCard
          title="Proximos 3 dias"
          subtitle="Seguimientos inmediatos"
          count={nextUp.length}
          prospects={nextUp}
          onRowClick={onRowClick}
        />
        <SectionCard
          title="Leads calientes"
          subtitle="Probabilidad de cierre >= 70%"
          count={hotLeads.length}
          prospects={hotLeads}
          onRowClick={onRowClick}
        />
      </div>

      <div className="premium-panel rounded-2xl p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Mini Kanban de seguimiento</h3>
            <p className="text-xs text-pitahaya-gray-500">Vista rapida por status (solo lectura)</p>
          </div>
          <span className="rounded-full border border-[#39065E]/45 bg-[#39065E]/20 px-2.5 py-1 text-xs text-pitahaya-gray-300">
            {active.length} activos
          </span>
        </div>

        {kanbanColumns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#39065E]/35 px-3 py-8 text-center text-sm text-pitahaya-gray-500">
            No hay prospectos activos para mostrar en kanban.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {kanbanColumns.map(([status, prospects]) => (
              <div key={status} className="rounded-xl border border-[#39065E]/35 bg-[#0E0918]/65 p-3">
                <div className="mb-2 border-b border-[#39065E]/30 pb-2">
                  <p className="line-clamp-2 text-xs font-semibold uppercase tracking-[0.08em] text-white">{status}</p>
                  <p className="mt-1 text-xs text-pitahaya-gray-500">{prospects.length} prospectos</p>
                </div>
                <div className="space-y-2">
                  {prospects.slice(0, 3).map((prospect) => (
                    <ProspectChip key={prospect.id} prospect={prospect} onClick={onRowClick} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="premium-panel rounded-2xl p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">Radar de riesgos</h3>
          <p className="text-xs text-pitahaya-gray-500">Alertas automaticas para evitar oportunidades perdidas</p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/8 p-4">
            <p className="text-sm font-semibold text-rose-200">Sin fecha de seguimiento</p>
            <p className="mt-1 text-2xl font-bold text-white">{riskNoDate.length}</p>
            <p className="mt-1 text-xs text-pitahaya-gray-300">Prospectos activos sin proxima fecha definida.</p>
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-amber-500/8 p-4">
            <p className="text-sm font-semibold text-amber-200">Seguimiento atrasado (+5 dias)</p>
            <p className="mt-1 text-2xl font-bold text-white">{riskStale.length}</p>
            <p className="mt-1 text-xs text-pitahaya-gray-300">Casos con riesgo de enfriamiento comercial.</p>
          </div>

          <div className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/8 p-4">
            <p className="text-sm font-semibold text-fuchsia-200">Apartado sin fecha de enganche</p>
            <p className="mt-1 text-2xl font-bold text-white">{riskApartado.length}</p>
            <p className="mt-1 text-xs text-pitahaya-gray-300">Casos apartados que necesitan empuje de cierre.</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#39065E]/35 bg-[#0F0A19]/60 p-3 text-xs text-pitahaya-gray-400">
          Top impacto potencial: {hotLeads.slice(0, 3).map((p) => `${displayValue(p.nombre_cliente)} (${formatMoney(p.monto_total)})`).join(" • ") || "N/A"}
        </div>
      </div>
    </div>
  );
}
