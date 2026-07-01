"use client";

import { STATUS_OPTIONS } from "@/lib/prospects/status";

interface FiltersShape {
  estatus?: string;
  probabilidad?: string;
  asesor?: string;
  apartado?: string;
  corte?: string;
}

interface Props {
  searchTerm?: string;
  setSearchTerm?: (value: string) => void;
  filters?: FiltersShape;
  setFilters?: (filters: FiltersShape) => void;
  asesores?: { id: string; full_name: string | null }[];
  showAsesorFilter?: boolean;
  showCorteFilter?: boolean;
  corteOptions?: Array<{ value: string; label: string }>;
  onNewProspect?: () => void;
}

export default function SearchAndFilter({
  searchTerm = "",
  setSearchTerm,
  filters,
  setFilters,
  asesores = [],
  showAsesorFilter = true,
  showCorteFilter = false,
  corteOptions = [],
  onNewProspect,
}: Props) {
  return (
    <div className="premium-panel w-full rounded-2xl p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-pitahaya-gray-300">Filtros de busqueda</h3>
        {onNewProspect && (
          <button
            type="button"
            onClick={onNewProspect}
            className="rounded-lg bg-linear-to-r from-[#CF3790] to-[#B828E8] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_28px_rgba(207,55,144,0.25)] transition-opacity hover:opacity-90"
          >
            + Nuevo Prospecto
          </button>
        )}
      </div>
      <div className="flex flex-col xl:flex-row items-end gap-5 w-full">
        <div className="flex-1 w-full flex flex-col gap-2">
          <label className="text-sm font-semibold text-pitahaya-gray-300 tracking-wide">Buscar cliente</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              value={searchTerm || ""}
              onChange={(e) => setSearchTerm?.(e.target.value)}
              placeholder="Nombre del cliente..."
              className="w-full rounded-xl border border-pitahaya-border bg-[#0A0612]/90 py-3 pl-11 pr-4 text-sm text-white transition-all focus:border-[#CF3790] focus:outline-none focus:ring-1 focus:ring-[#CF3790]"
            />
          </div>
        </div>
        <div className="w-full xl:w-56 flex flex-col gap-2">
          <label className="text-sm font-semibold text-pitahaya-gray-300 tracking-wide">Estatus</label>
          <select value={filters?.estatus || ""} onChange={(e) => setFilters?.({ ...filters, estatus: e.target.value })} className="w-full appearance-none rounded-xl border border-pitahaya-border bg-[#0A0612]/90 px-4 py-3 text-sm text-white focus:border-[#CF3790] focus:outline-none">
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="w-full xl:w-48 flex flex-col gap-2">
          <label className="text-sm font-semibold text-pitahaya-gray-300 tracking-wide">Prob. minima</label>
          <select value={filters?.probabilidad || ""} onChange={(e) => setFilters?.({ ...filters, probabilidad: e.target.value })} className="w-full appearance-none rounded-xl border border-pitahaya-border bg-[#0A0612]/90 px-4 py-3 text-sm text-white focus:border-[#CF3790] focus:outline-none">
            <option value="">Cualquiera</option>
            <option value="25">25% o mas</option>
            <option value="50">50% o más</option>
            <option value="75">75% o mas</option>
          </select>
        </div>
        <div className="w-full xl:w-56 flex flex-col gap-2">
          <label className="text-sm font-semibold text-pitahaya-gray-300 tracking-wide">Apartado</label>
          <select value={filters?.apartado || ""} onChange={(e) => setFilters?.({ ...filters, apartado: e.target.value })} className="w-full appearance-none rounded-xl border border-pitahaya-border bg-[#0A0612]/90 px-4 py-3 text-sm text-white focus:border-[#CF3790] focus:outline-none">
            <option value="">Todos</option>
            <option value="apartados_activos">Apartados activos (pendientes de cierre)</option>
          </select>
        </div>
        {showCorteFilter && (
          <div className="w-full xl:w-56 flex flex-col gap-2">
            <label className="text-sm font-semibold text-pitahaya-gray-300 tracking-wide">Corte (mes)</label>
            <select value={filters?.corte || ""} onChange={(e) => setFilters?.({ ...filters, corte: e.target.value })} className="w-full appearance-none rounded-xl border border-pitahaya-border bg-[#0A0612]/90 px-4 py-3 text-sm text-white focus:border-[#CF3790] focus:outline-none">
              <option value="">Todos los cortes</option>
              {corteOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
        {showAsesorFilter && (
          <div className="w-full xl:w-56 flex flex-col gap-2">
            <label className="text-sm font-semibold text-pitahaya-gray-300 tracking-wide">Asesor</label>
            <select value={filters?.asesor || ""} onChange={(e) => setFilters?.({ ...filters, asesor: e.target.value })} className="w-full appearance-none rounded-xl border border-pitahaya-border bg-[#0A0612]/90 px-4 py-3 text-sm text-white focus:border-[#CF3790] focus:outline-none">
              <option value="">Todos los asesores</option>
              {asesores.map((asesor) => (
                <option key={asesor.id} value={asesor.id}>{asesor.full_name || "Sin nombre"}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
