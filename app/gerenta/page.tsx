"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import ProspectForm from "@/components/prospects/ProspectForm";
import SearchAndFilter from "@/components/prospects/SearchAndFilter";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import ProspectsTable from "@/components/prospects/ProspectsTable";
import PipelineExcelTable from "@/components/prospects/PipelineExcelTable";
import { exportAnalyticsPDF } from "@/lib/supabase/pdf";
import KPICard from "@/components/ui/KPICard";
import TabsNavigation from "@/components/ui/TabsNavigation";

interface ProspectWithAsesor {
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
  user_id: string;
  profiles: { full_name: string | null } | null;
}

interface Asesor {
  id: string;
  full_name: string | null;
}

export default function GerentaPage() {
  const supabase = createClientSupabase();
  const [prospects, setProspects] = useState<ProspectWithAsesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Partial<ProspectWithAsesor> | null>(null);
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [tab, setTab] = useState<"list" | "pipeline" | "analytics">("list");
  const [filters, setFilters] = useState({
    search: "",
    estatus: "",
    probabilidadMin: "" as number | "",
    asesorId: "",
    apartado: "",
    corte: "",
  });

  const getCorteMonth = (prospect: ProspectWithAsesor) => {
    const referenceDate =
      prospect.proximo_seguimiento || prospect.fecha_apartado || prospect.fecha_primer_contacto || null;
    if (!referenceDate) return "";
    const date = new Date(referenceDate);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const fetchProspects = useCallback(async () => {
    const { data } = await supabase
      .from("prospects")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });
    setProspects(data || []);
    setLoading(false);
  }, [supabase]);

  const fetchAsesores = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "asesor");
    setAsesores(data || []);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProspects();
    void fetchAsesores();
  }, [fetchProspects, fetchAsesores]);

  const filtered = useMemo(
    () =>
      prospects.filter((p) => {
        return (
          p.nombre_cliente.toLowerCase().includes(filters.search.toLowerCase()) &&
          (!filters.estatus || p.estatus_general === filters.estatus) &&
          (filters.probabilidadMin === "" ||
            (p.probabilidad_cierre !== null && p.probabilidad_cierre >= filters.probabilidadMin)) &&
          (!filters.asesorId || p.user_id === filters.asesorId) &&
          (!filters.apartado ||
            (filters.apartado === "apartados_activos" &&
              p.apartado_realizado &&
              p.estatus_general !== "Cerrado" &&
              p.estatus_general !== "Perdido")) &&
          (!filters.corte || getCorteMonth(p) === filters.corte)
        );
      }),
    [prospects, filters]
  );

  const corteOptions = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });
    const unique = new Set<string>();

    prospects.forEach((p) => {
      const month = getCorteMonth(p);
      if (month) unique.add(month);
    });

    return Array.from(unique)
      .sort((a, b) => b.localeCompare(a))
      .map((value) => {
        const [year, month] = value.split("-").map(Number);
        const labelDate = new Date(year, (month || 1) - 1, 1);
        const label = monthFormatter.format(labelDate);
        return {
          value,
          label: `Corte ${label.charAt(0).toUpperCase()}${label.slice(1)}`,
        };
      });
  }, [prospects]);

  const pipelineData = useMemo(
    () => [...filtered].sort((a, b) => (b.probabilidad_cierre || 0) - (a.probabilidad_cierre || 0)),
    [filtered]
  );

  const searchTerm = filters.search;
  const setSearchTerm = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };
  const uiFilters = {
    estatus: filters.estatus,
    probabilidad: filters.probabilidadMin === "" ? "" : String(filters.probabilidadMin),
    asesor: filters.asesorId,
    apartado: filters.apartado,
    corte: filters.corte,
  };
  const setUiFilters = (next: { estatus?: string; probabilidad?: string; asesor?: string; apartado?: string; corte?: string }) => {
    setFilters((prev) => ({
      ...prev,
      estatus: next.estatus ?? prev.estatus,
      probabilidadMin:
        next.probabilidad === undefined
          ? prev.probabilidadMin
          : next.probabilidad === ""
            ? ""
            : Number.parseInt(next.probabilidad, 10),
      asesorId: next.asesor ?? prev.asesorId,
      apartado: next.apartado ?? prev.apartado,
          corte: next.corte ?? prev.corte,
    }));
  };

  const kpis = useMemo(
    () => ({
      total: filtered.length,
      activos: filtered.filter((p) => p.estatus_general !== "Cerrado" && p.estatus_general !== "Perdido").length,
      probPromedio:
        filtered.length > 0
          ? Math.round(filtered.reduce((a, p) => a + (p.probabilidad_cierre || 0), 0) / filtered.length)
          : 0,
      montoPipeline: filtered.reduce((a, p) => a + (p.monto_total || 0), 0),
    }),
    [filtered]
  );

  return (
    <div className="relative app-shell w-full overflow-hidden pb-6 text-white">
      <div className="pointer-events-none absolute -left-28 -top-20 h-72 w-72 rounded-full bg-[#39065E]/20 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#CF3790]/12 blur-[120px]" />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard titulo="Total Prospectos" valor={kpis.total} glowColor="bg-[#CF3790]/20" />
          <KPICard titulo="Activos" valor={kpis.activos} glowColor="bg-[#F38D62]/20" />
          <KPICard titulo="Prob. Promedio" valor={`${kpis.probPromedio}%`} />
          <KPICard titulo="Monto Pipeline" valor={`$${kpis.montoPipeline.toLocaleString("es-MX")}`} textAccent="text-emerald-400" />
        </div>

        <div className="flex w-full justify-start">
          <TabsNavigation
            activeTab={tab}
            setActiveTab={setTab}
            items={[
              { id: "list", label: "Lista" },
              { id: "pipeline", label: "Pipeline" },
              { id: "analytics", label: "Analiticas" },
            ]}
          />
        </div>

        {tab === "analytics" ? (
          <>
            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    await exportAnalyticsPDF(filtered, filters.corte || null);
                    toast.success("PDF generado correctamente");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "No se pudo generar el PDF");
                  }
                }}
                className="bg-linear-to-r from-[#CF3790] to-[#B828E8] text-white h-11 px-5 rounded-xl flex items-center gap-2 font-semibold text-sm shadow-lg shadow-[#CF3790]/20 hover:shadow-[#CF3790]/40 transition-all"
              >
                <FiDownload size={16} /> Exportar PDF
              </motion.button>
            </div>
            <AnalyticsDashboard prospects={prospects} asesores={asesores} />
          </>
        ) : (
          <>
            <SearchAndFilter
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filters={uiFilters}
              setFilters={setUiFilters}
              asesores={asesores}
              showAsesorFilter
              showCorteFilter
              corteOptions={corteOptions}
              onNewProspect={() => {
                setEditingProspect(null);
                setModalOpen(true);
              }}
            />
            {tab === "pipeline" ? (
              <PipelineExcelTable
                data={pipelineData}
                loading={loading}
                onRowClick={(prospect) => {
                  setEditingProspect(prospect);
                  setModalOpen(true);
                }}
              />
            ) : (
              <ProspectsTable
                data={filtered}
                loading={loading}
                showAsesorColumn
                onRowClick={(prospect) => {
                  setEditingProspect(prospect);
                  setModalOpen(true);
                }}
              />
            )}
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProspect ? "Editar prospecto" : "Nuevo prospecto"}
      >
        <ProspectForm
          key={editingProspect?.id ?? "new"}
          prospect={editingProspect}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchProspects}
          isGerenta
        />
      </Modal>
    </div>
  );
}
