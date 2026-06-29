"use client";
import { useEffect, useState, useMemo } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { FiEye, FiPlus, FiBarChart2, FiList, FiDownload } from "react-icons/fi";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Modal from "@/components/ui/Modal";
import ProspectForm from "@/components/prospects/ProspectForm";
import SearchAndFilter from "@/components/prospects/SearchAndFilter";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import { exportAnalyticsPDF } from "@/lib/supabase/pdf";

interface ProspectWithAsesor {
  id: string;
  nombre_cliente: string;
  fecha_primer_contacto: string;
  estatus_general: string;
  probabilidad_cierre: number | null;
  proximo_seguimiento: string | null;
  proxima_accion: string | null;
  fecha_cierre: string | null;
  user_id: string;
  profiles: { full_name: string | null } | null;
  monto_total: number | null;
  apartado_realizado: boolean;
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
  const [tab, setTab] = useState<"list" | "analytics">("list");

  const [filters, setFilters] = useState({
    search: "",
    estatus: "",
    probabilidadMin: "" as number | "",
    asesorId: "",
  });

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("prospects")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProspects(data || []);
    } catch (err: any) {
      toast.error("Error al cargar prospectos");
    } finally {
      setLoading(false);
    }
  };

  const fetchAsesores = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "asesor");
    setAsesores(data || []);
  };

  useEffect(() => {
    fetchProspects();
    fetchAsesores();
  }, []);

  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const nameMatch = p.nombre_cliente
        .toLowerCase()
        .includes(filters.search.toLowerCase());
      const estatusMatch = !filters.estatus || p.estatus_general === filters.estatus;
      const probMatch =
        filters.probabilidadMin === "" ||
        (p.probabilidad_cierre !== null && p.probabilidad_cierre >= filters.probabilidadMin);
      const asesorMatch = !filters.asesorId || p.user_id === filters.asesorId;
      return nameMatch && estatusMatch && probMatch && asesorMatch;
    });
  }, [prospects, filters]);

  const openCreate = () => {
    setEditingProspect(null);
    setModalOpen(true);
  };
  const openEdit = (prospect: ProspectWithAsesor) => {
    setEditingProspect(prospect);
    setModalOpen(true);
  };
  const handleSuccess = () => fetchProspects();

  const diasDesde = (fecha: string) => {
    const diff = Math.floor(
      (new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };
  const probColor = (prob: number | null) => {
    if (prob === null) return "text-pitahaya-gray-500";
    if (prob >= 70) return "text-pitahaya-green";
    if (prob >= 40) return "text-pitahaya-yellow";
    return "text-pitahaya-coral";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 bg-pitahaya-dark/40 rounded-lg p-1 glass">
          <button
            onClick={() => setTab("list")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              tab === "list"
                ? "bg-pitahaya-accent text-white shadow"
                : "text-pitahaya-gray-300 hover:text-white"
            }`}
          >
            <FiList /> Lista
          </button>
          <button
            onClick={() => setTab("analytics")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              tab === "analytics"
                ? "bg-pitahaya-accent text-white shadow"
                : "text-pitahaya-gray-300 hover:text-white"
            }`}
          >
            <FiBarChart2 /> Analíticas
          </button>
        </div>
        {tab === "list" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-pitahaya-accent hover:bg-pitahaya-accent-light text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            onClick={openCreate}
          >
            <FiPlus /> Nuevo prospecto
          </motion.button>
        )}
      </div>

      {tab === "list" ? (
        <>
          <SearchAndFilter
            filters={filters}
            onChange={setFilters}
            showAsesorFilter={true}
            asesores={asesores}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-xl shadow-neumorph"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                <FiEye className="inline mr-2" />
                Vista maestra ({filteredProspects.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-pitahaya-gray-300 border-b border-pitahaya-accent/20">
                  <tr>
                    <th className="py-3 px-2 text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Cliente</th>
                    <th className="py-3 px-2 text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Asesor</th>
                    <th className="py-3 px-2 text-pitahaya-light-secondary dark:text-pitahaya-gray-300">1er contacto</th>
                    <th className="py-3 px-2 text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Días</th>
                    <th className="py-3 px-2 text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Estatus</th>
                    <th className="py-3 px-2 text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Prob. cierre</th>
                    <th className="py-3 px-2 text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Próx. acción</th>
                    <th className="py-3 px-2 text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Próx. seguimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-pitahaya-light-secondary dark:text-pitahaya-gray-500">
                        Cargando prospectos...
                      </td>
                    </tr>
                  ) : filteredProspects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-pitahaya-light-secondary dark:text-pitahaya-gray-500">
                        Sin resultados para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredProspects.map((p) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ backgroundColor: "rgba(124,58,237,0.05)" }}
                        className="border-b border-pitahaya-accent/5 hover:cursor-pointer"
                        onClick={() => openEdit(p)}
                      >
                        <td className="py-3 px-2 font-medium text-white">{p.nombre_cliente}</td>
                        <td className="py-3 px-2 text-pitahaya-gray-300">
                          {p.profiles?.full_name || "Sin nombre"}
                        </td>
                        <td className="py-3 px-2 text-pitahaya-gray-300">
                          {format(new Date(p.fecha_primer_contacto), "dd MMM yy", { locale: es })}
                        </td>
                        <td className="py-3 px-2">
                          <span className="bg-pitahaya-accent/10 text-pitahaya-accent-light px-2 py-0.5 rounded-full text-xs">
                            {diasDesde(p.fecha_primer_contacto)} días
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-full px-2 py-0.5 text-xs">
                            {p.estatus_general}
                          </span>
                        </td>
                        <td className={`py-3 px-2 font-bold ${probColor(p.probabilidad_cierre)}`}>
                          {p.probabilidad_cierre !== null ? `${p.probabilidad_cierre}%` : "—"}
                        </td>
                        <td className="py-3 px-2 text-pitahaya-gray-300 max-w-50 truncate">
                          {p.proxima_accion || "—"}
                        </td>
                        <td className="py-3 px-2 text-pitahaya-gray-300">
                          {p.proximo_seguimiento
                            ? format(new Date(p.proximo_seguimiento), "dd MMM yy", { locale: es })
                            : "—"}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => exportAnalyticsPDF()}
              className="bg-pitahaya-accent hover:bg-pitahaya-accent-light text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FiDownload /> Exportar PDF
            </motion.button>
          </div>
          <AnalyticsDashboard prospects={prospects} asesores={asesores} />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProspect ? "Editar prospecto" : "Nuevo prospecto"}
      >
        <ProspectForm
          prospect={editingProspect}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
          isGerenta={true}
        />
      </Modal>
    </div>
  );
}