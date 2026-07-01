"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NOT_AVAILABLE_LABEL, displayValue } from "@/lib/prospects/status";

const TODAY_MS = Date.now();

interface Prospect {
  id: string;
  nombre_cliente: string;
  estatus_general: string;
  profiles?: { full_name: string | null } | null;
  fecha_primer_contacto?: string;
  probabilidad_cierre?: number | null;
  proxima_accion?: string | null;
  proximo_seguimiento?: string | null;
}

interface Props {
  data?: Prospect[];
  loading?: boolean;
  onRowClick?: (prospect: Prospect) => void;
  showAsesorColumn?: boolean;
}

export default function ProspectsTable({ data = [], loading = false, onRowClick, showAsesorColumn = true }: Props) {
  const formatFecha = (fecha?: string | null) => {
    if (!fecha) return NOT_AVAILABLE_LABEL;
    return format(new Date(fecha), "dd MMM yy", { locale: es });
  };

  return (
    <div className="premium-panel w-full overflow-hidden rounded-2xl shadow-xl">
      <div className="border-b border-[#39065E]/50 p-6">
        <h2 className="flex items-center gap-3 text-xl font-bold text-white">
          <svg className="w-6 h-6 text-[#CF3790]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          Vista maestra ({data?.length || 0})
        </h2>
      </div>
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left whitespace-nowrap">
          <thead className="bg-[#130E12]/50">
            <tr className="border-b border-[#39065E]">
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-pitahaya-gray-300">Cliente</th>
              {showAsesorColumn && <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-pitahaya-gray-300">Asesor</th>}
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-pitahaya-gray-300">1er contacto</th>
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-pitahaya-gray-300">Dias</th>
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-pitahaya-gray-300">Estatus</th>
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-pitahaya-gray-300">Prob. cierre</th>
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-pitahaya-gray-300">Prox. accion</th>
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-pitahaya-gray-300">Prox. seguimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#39065E]/35 text-sm">
            {loading ? (
              <tr>
                <td colSpan={showAsesorColumn ? 8 : 7} className="px-6 py-12 text-center text-pitahaya-gray-500">
                  Cargando prospectos...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={showAsesorColumn ? 8 : 7} className="px-6 py-12 text-center text-pitahaya-gray-500">
                  Sin prospectos para mostrar.
                </td>
              </tr>
            ) : (
              data.map((prospecto) => {
                const dias = prospecto.fecha_primer_contacto
                  ? Math.max(0, Math.floor((TODAY_MS - new Date(prospecto.fecha_primer_contacto).getTime()) / 86400000))
                  : 0;

                return (
                  <tr
                    key={prospecto.id}
                    className="cursor-pointer transition-colors hover:bg-[#39065E]/16"
                    onClick={() => onRowClick?.(prospecto)}
                  >
                    <td className="px-6 py-4 text-white font-semibold">{prospecto.nombre_cliente}</td>
                    {showAsesorColumn && <td className="px-6 py-4 text-gray-300">{displayValue(prospecto.profiles?.full_name)}</td>}
                    <td className="px-6 py-4 text-gray-300">{formatFecha(prospecto.fecha_primer_contacto)}</td>
                    <td className="px-6 py-4 text-gray-300">{dias} dias</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full border border-[#39065E]/40 bg-[#39065E]/20 px-3 py-1 text-xs text-white">
                        {displayValue(prospecto.estatus_general)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-bold">{prospecto.probabilidad_cierre ?? 0}%</td>
                    <td className="max-w-56 truncate px-6 py-4 text-gray-300">{displayValue(prospecto.proxima_accion)}</td>
                    <td className="px-6 py-4 text-gray-300">{formatFecha(prospecto.proximo_seguimiento)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
