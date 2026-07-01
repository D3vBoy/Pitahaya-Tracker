"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NOT_AVAILABLE_LABEL, displayValue } from "@/lib/prospects/status";

interface PipelineProspect {
  id: string;
  nombre_cliente: string;
  fecha_primer_contacto: string;
  fecha_primer_zoom: string | null;
  fecha_segundo_zoom: string | null;
  metros_cuadrados_tentativos: number | null;
  monto_total: number | null;
  plan_financiamiento: string | null;
  estatus_enganche: string;
  estatus_general: string;
  proxima_accion: string | null;
  proximo_seguimiento: string | null;
  probabilidad_cierre: number | null;
  apartado_realizado: boolean;
  fecha_apartado: string | null;
  monto_apartado: number | null;
  fecha_enganche: string | null;
  firma_pcv: string | null;
  fecha_cierre: string | null;
  observaciones: string | null;
  profiles?: { full_name: string | null } | null;
}

interface Props {
  data: PipelineProspect[];
  loading?: boolean;
  onRowClick?: (prospect: PipelineProspect) => void;
}

const formatFecha = (fecha?: string | null) => {
  if (!fecha) return NOT_AVAILABLE_LABEL;
  return format(new Date(fecha), "dd MMM yyyy", { locale: es });
};

const formatMoneda = (value?: number | null) => {
  if (value === null || value === undefined) return NOT_AVAILABLE_LABEL;
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
};

export default function PipelineExcelTable({ data, loading = false, onRowClick }: Props) {
  return (
    <div className="premium-panel w-full overflow-hidden rounded-2xl shadow-xl">
      <div className="border-b border-[#39065E]/50 p-6">
        <h2 className="text-xl font-bold text-white">Pipeline completo ({data.length})</h2>
        <p className="mt-1 text-sm text-pitahaya-gray-500">Vista integral tipo Excel con todos los campos del prospecto</p>
        <p className="mt-2 text-xs text-pitahaya-gray-500 md:hidden">Desliza horizontalmente para ver todas las columnas.</p>
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="min-w-[2400px] border-collapse text-left text-sm whitespace-nowrap">
          <thead className="bg-[#130E12]/65 text-[11px] uppercase tracking-[0.18em] text-pitahaya-gray-300">
            <tr className="border-b border-[#39065E]">
              <th className="sticky left-0 z-20 w-56 min-w-56 border-r border-[#39065E]/30 bg-[#130E12] px-4 py-4">Cliente</th>
              <th className="sticky left-56 z-20 w-52 min-w-52 border-r border-[#39065E]/30 bg-[#130E12] px-4 py-4">Asesor</th>
              <th className="px-4 py-4">Estatus general</th>
              <th className="px-4 py-4">Estatus enganche</th>
              <th className="px-4 py-4">Prob. cierre</th>
              <th className="px-4 py-4">Monto total</th>
              <th className="px-4 py-4">m2 tentativos</th>
              <th className="px-4 py-4">Plan financiamiento</th>
              <th className="px-4 py-4">Apartado</th>
              <th className="px-4 py-4">Fecha apartado</th>
              <th className="px-4 py-4">Monto apartado</th>
              <th className="px-4 py-4">Fecha enganche</th>
              <th className="px-4 py-4">Firma PCV</th>
              <th className="px-4 py-4">Fecha cierre</th>
              <th className="px-4 py-4">1er contacto</th>
              <th className="px-4 py-4">1er zoom</th>
              <th className="px-4 py-4">2do zoom</th>
              <th className="px-4 py-4">Proxima accion</th>
              <th className="px-4 py-4">Prox. seguimiento</th>
              <th className="px-4 py-4">Observaciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#39065E]/35 text-sm text-pitahaya-gray-300">
            {loading ? (
              <tr>
                <td colSpan={20} className="px-6 py-14 text-center text-pitahaya-gray-500">
                  Cargando pipeline...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={20} className="px-6 py-14 text-center text-pitahaya-gray-500">
                  Sin datos para mostrar en pipeline.
                </td>
              </tr>
            ) : (
              data.map((prospect) => (
                <tr
                  key={prospect.id}
                  className="cursor-pointer transition-colors hover:bg-[#39065E]/16"
                  onClick={() => onRowClick?.(prospect)}
                >
                  <td className="sticky left-0 z-10 w-56 min-w-56 border-r border-[#39065E]/25 bg-[#100b1b] px-4 py-3 font-semibold text-white">
                    {prospect.nombre_cliente}
                  </td>
                  <td className="sticky left-56 z-10 w-52 min-w-52 border-r border-[#39065E]/25 bg-[#100b1b] px-4 py-3">
                    {displayValue(prospect.profiles?.full_name)}
                  </td>
                  <td className="px-4 py-3">{displayValue(prospect.estatus_general)}</td>
                  <td className="px-4 py-3">{displayValue(prospect.estatus_enganche)}</td>
                  <td className="px-4 py-3 font-semibold text-white">{prospect.probabilidad_cierre ?? 0}%</td>
                  <td className="px-4 py-3 font-semibold text-emerald-300">{formatMoneda(prospect.monto_total)}</td>
                  <td className="px-4 py-3">{displayValue(prospect.metros_cuadrados_tentativos)}</td>
                  <td className="px-4 py-3">{displayValue(prospect.plan_financiamiento)}</td>
                  <td className="px-4 py-3">{prospect.apartado_realizado ? "Si" : "No"}</td>
                  <td className="px-4 py-3">{formatFecha(prospect.fecha_apartado)}</td>
                  <td className="px-4 py-3">{formatMoneda(prospect.monto_apartado)}</td>
                  <td className="px-4 py-3">{formatFecha(prospect.fecha_enganche)}</td>
                  <td className="px-4 py-3">{formatFecha(prospect.firma_pcv)}</td>
                  <td className="px-4 py-3">{formatFecha(prospect.fecha_cierre)}</td>
                  <td className="px-4 py-3">{formatFecha(prospect.fecha_primer_contacto)}</td>
                  <td className="px-4 py-3">{formatFecha(prospect.fecha_primer_zoom)}</td>
                  <td className="px-4 py-3">{formatFecha(prospect.fecha_segundo_zoom)}</td>
                  <td className="max-w-72 truncate px-4 py-3">{displayValue(prospect.proxima_accion)}</td>
                  <td className="px-4 py-3">{formatFecha(prospect.proximo_seguimiento)}</td>
                  <td className="max-w-96 truncate px-4 py-3">{displayValue(prospect.observaciones)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
