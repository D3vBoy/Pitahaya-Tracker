"use client";
export const dynamic = "force-dynamic";
import { useCallback, useEffect, useState, useMemo } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import ProspectForm from "@/components/prospects/ProspectForm";
import SearchAndFilter from "@/components/prospects/SearchAndFilter";
import ProspectsTable from "@/components/prospects/ProspectsTable";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import KPICard from "@/components/ui/KPICard";
import TabsNavigation from "@/components/ui/TabsNavigation";

interface Prospect {
  id: string;
  nombre_cliente: string;
  fecha_primer_contacto: string;
  estatus_general: string;
  probabilidad_cierre: number | null;
  proximo_seguimiento: string | null;
  proxima_accion: string | null;
  monto_total: number | null;
  apartado_realizado: boolean;
  user_id: string;
}

export default function AsesorPage() {
  const supabase = createClientSupabase();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Partial<Prospect> | null>(null);
  const [tab, setTab] = useState<"list" | "analytics">("list");
  const [filters, setFilters] = useState({
    search: "",
    estatus: "",
    probabilidadMin: "" as number | "",
    asesorId: "",
    apartado: "",
  });

  const fetchProspects = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("prospects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setProspects(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProspects();
  }, [fetchProspects]);

  const filtered = useMemo(
    () =>
      prospects.filter((p) => {
        const nameMatch = p.nombre_cliente.toLowerCase().includes(filters.search.toLowerCase());
        const estatusMatch = !filters.estatus || p.estatus_general === filters.estatus;
        const probMatch =
          filters.probabilidadMin === "" ||
          (p.probabilidad_cierre !== null && p.probabilidad_cierre >= filters.probabilidadMin);
        const apartadoMatch =
          !filters.apartado ||
          (filters.apartado === "apartados_activos" &&
            p.apartado_realizado &&
            p.estatus_general !== "Cerrado" &&
            p.estatus_general !== "Perdido");
        return nameMatch && estatusMatch && probMatch && apartadoMatch;
      }),
    [prospects, filters]
  );

  const kpis = useMemo(() => {
    const total = filtered.length;
    const avgProb = total > 0 ? filtered.reduce((a, p) => a + (p.probabilidad_cierre || 0), 0) / total : 0;
    const montoTotal = filtered.reduce((a, p) => a + (p.monto_total || 0), 0);
    const activos = filtered.filter((p) => p.estatus_general !== "Cerrado" && p.estatus_general !== "Perdido").length;
    return { total, avgProb, montoTotal, activos };
  }, [filtered]);

  const searchTerm = filters.search;
  const setSearchTerm = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };
  const uiFilters = {
    estatus: filters.estatus,
    probabilidad: filters.probabilidadMin === "" ? "" : String(filters.probabilidadMin),
    asesor: filters.asesorId,
    apartado: filters.apartado,
  };
  const setUiFilters = (next: { estatus?: string; probabilidad?: string; asesor?: string; apartado?: string }) => {
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
    }));
  };

  return (
    <div className="app-shell flex w-full flex-col gap-6 pb-6 text-white">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard titulo="Total prospectos" valor={kpis.total} glowColor="bg-[#CF3790]/20" />
        <KPICard titulo="Activos" valor={kpis.activos} glowColor="bg-[#F38D62]/20" />
        <KPICard titulo="Prob. promedio" valor={`${kpis.avgProb.toFixed(1)}%`} />
        <KPICard
          titulo="Monto pipeline"
          valor={`$${kpis.montoTotal.toLocaleString("es-MX")}`}
          textAccent="text-emerald-300"
        />
      </div>

      <div className="flex w-full justify-start">
        <TabsNavigation
          activeTab={tab}
          setActiveTab={setTab}
          items={[
            { id: "list", label: "Lista" },
            { id: "analytics", label: "Analiticas" },
          ]}
        />
      </div>

      {tab === "list" ? (
        <>
          <SearchAndFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filters={uiFilters}
            setFilters={setUiFilters}
            showAsesorFilter={false}
            onNewProspect={() => {
              setEditingProspect(null);
              setModalOpen(true);
            }}
          />
          <ProspectsTable
            data={filtered}
            loading={loading}
            showAsesorColumn={false}
            onRowClick={(prospect) => {
              setEditingProspect(prospect);
              setModalOpen(true);
            }}
          />
        </>
      ) : (
        <div className="space-y-6">
          <AnalyticsDashboard prospects={prospects} />
        </div>
      )}

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
        />
      </Modal>
    </div>
  );
}