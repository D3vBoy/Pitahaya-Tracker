"use client";
export const dynamic = "force-dynamic";
import { useCallback, useEffect, useState, useMemo } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import ProspectForm from "@/components/prospects/ProspectForm";
import SearchAndFilter from "@/components/prospects/SearchAndFilter";
import ProspectsTable from "@/components/prospects/ProspectsTable";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import DailyClosureAdvisorPanel from "../../components/reports/DailyClosureAdvisorPanel";
import TeamChatPanel from "@/components/chat/TeamChatPanel";
import KPICard from "@/components/ui/KPICard";
import ResponsiveDashboardNav from "@/components/ui/ResponsiveDashboardNav";
import { useTeamNotifications } from "@/components/providers/TeamNotificationsProvider";
import { isTeamChatRole } from "@/lib/chat";
import { FiBarChart2, FiList, FiMessageCircle, FiMoon } from "react-icons/fi";
import {
  getPipelineBreakdownTotals,
  hasApartadoHistory,
  hasMissingRequiredProspectFields,
  isActiveStatus,
} from "@/lib/prospects/status";
import {
  DAILY_CLOSURE_SETUP_MESSAGE,
  DailyClosureEditRequestRow,
  DailyClosureFormValues,
  DailyClosureReportRow,
  getTodayDateKey,
  isMissingDailyClosureRelationError,
} from "@/lib/reports/dailyClosure";

interface Prospect {
  id: string;
  nombre_cliente: string;
  fecha_primer_contacto: string;
  estatus_general: string;
  probabilidad_cierre: number | null;
  proximo_seguimiento: string | null;
  proxima_accion: string | null;
  monto_total: number | null;
  metros_cuadrados_tentativos?: number | null;
  metraje_exacto?: number | null;
  apartado_realizado: boolean;
  fecha_apartado: string | null;
  fecha_enganche: string | null;
  firma_pcv: string | null;
  fecha_cierre?: string | null;
  user_id: string;
}

interface TeamDirectoryMember {
  id: string;
  full_name: string | null;
  role?: string | null;
}

export default function AsesorPage() {
  const supabase = createClientSupabase();
  const { totalUnreadCount } = useTeamNotifications();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [chatTeamMembers, setChatTeamMembers] = useState<TeamDirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Partial<Prospect> | null>(null);
  const [pendingInvalidProspect, setPendingInvalidProspect] = useState<Prospect | null>(null);
  const [forcedValidationShown, setForcedValidationShown] = useState(false);
  const [dailyReports, setDailyReports] = useState<DailyClosureReportRow[]>([]);
  const [dailyRequests, setDailyRequests] = useState<DailyClosureEditRequestRow[]>([]);
  const [dailyClosureAvailable, setDailyClosureAvailable] = useState(true);
  const [dailyClosureMessage, setDailyClosureMessage] = useState("");
  const [teamDirectoryHint, setTeamDirectoryHint] = useState("");
  const [selectedReportDate, setSelectedReportDate] = useState(getTodayDateKey());
  const [dailyReportSubmitting, setDailyReportSubmitting] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [advisorName, setAdvisorName] = useState("Asesor");
  const [tab, setTab] = useState<"list" | "dailyClose" | "chat" | "analytics">("list");
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
    setCurrentUserId(user.id);
    const loadTeamMembers = async () => {
      const directoryResponse = await supabase.rpc("get_team_chat_directory");

      if (!directoryResponse.error && Array.isArray(directoryResponse.data)) {
        setTeamDirectoryHint("");
        return (directoryResponse.data as TeamDirectoryMember[])
          .filter((member) => member.id !== user.id && isTeamChatRole(member.role))
          .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "es-MX"));
      }

      if (directoryResponse.error) {
        setTeamDirectoryHint("Para habilitar mensajes entre asesores debes ejecutar la actualizacion SQL del directorio de chat en Supabase.");
      }

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .neq("id", user.id);

      return ((profileRows || []) as TeamDirectoryMember[])
        .filter((member) => isTeamChatRole(member.role))
        .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "es-MX"));
    };

    const [{ data: prospectsData }, dailyReportsResponse, { data: profileData }, requestsResponse, teamMembersData] = await Promise.all([
      supabase
        .from("prospects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("daily_closure_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("report_date", { ascending: false }),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("daily_closure_edit_requests")
        .select("*")
        .eq("requested_by", user.id)
        .order("created_at", { ascending: false }),
      loadTeamMembers(),
    ]);

    const dailyReportsError = dailyReportsResponse.error;
    const requestsError = requestsResponse.error;
    const missingClosureTables =
      isMissingDailyClosureRelationError(dailyReportsError) ||
      isMissingDailyClosureRelationError(requestsError);

    setProspects(prospectsData || []);
    setDailyReports(missingClosureTables ? [] : ((dailyReportsResponse.data || []) as DailyClosureReportRow[]));
    setDailyRequests(missingClosureTables ? [] : ((requestsResponse.data || []) as DailyClosureEditRequestRow[]));
    setAdvisorName(profileData?.full_name || "Asesor");
    setChatTeamMembers(teamMembersData || []);
    setDailyClosureAvailable(!missingClosureTables);
    setDailyClosureMessage(missingClosureTables ? DAILY_CLOSURE_SETUP_MESSAGE : "");
    setLoading(false);
  }, [supabase]);

  const handleSaveDailyReport = async (reportDate: string, values: DailyClosureFormValues, reportId?: string) => {
    if (!dailyClosureAvailable) {
      throw new Error(DAILY_CLOSURE_SETUP_MESSAGE);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("No autenticado");
    }

    setDailyReportSubmitting(true);
    try {
      const query = reportId
        ? supabase
            .from("daily_closure_reports")
            .update({
              ...values,
              updated_at: new Date().toISOString(),
              edit_unlocked_until: reportDate === getTodayDateKey() ? null : null,
            })
            .eq("id", reportId)
            .select("*")
            .single()
        : supabase
            .from("daily_closure_reports")
            .insert({
              user_id: user.id,
              report_date: reportDate,
              ...values,
              updated_at: new Date().toISOString(),
            })
            .select("*")
            .single();

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      setDailyReports((prev) => {
        const next = prev.filter((item) => item.id !== data.id && item.report_date !== data.report_date);
        return [data as DailyClosureReportRow, ...next].sort((a, b) => b.report_date.localeCompare(a.report_date));
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "No se pudo registrar el cierre de día");
    } finally {
      setDailyReportSubmitting(false);
    }
  };

  const handleRequestDailyReportEdit = async (report: DailyClosureReportRow, reason: string) => {
    if (!dailyClosureAvailable) {
      throw new Error(DAILY_CLOSURE_SETUP_MESSAGE);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    setRequestingPermission(true);
    try {
      const { data, error } = await supabase
        .from("daily_closure_edit_requests")
        .insert({
          report_id: report.id,
          report_date: report.report_date,
          requested_by: user.id,
          reason,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      setDailyRequests((prev) => [data as DailyClosureEditRequestRow, ...prev]);
    } finally {
      setRequestingPermission(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProspects();
  }, [fetchProspects]);

  useEffect(() => {
    if (loading || forcedValidationShown) return;
    const invalidProspect = prospects.find((p) => hasMissingRequiredProspectFields(p));
    if (!invalidProspect) return;

    const timer = window.setTimeout(() => {
      setForcedValidationShown(true);
      setTab("list");
      setPendingInvalidProspect(invalidProspect);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [forcedValidationShown, loading, prospects]);

  const handleForceCompleteRequiredFields = () => {
    if (!pendingInvalidProspect) return;
    setEditingProspect(pendingInvalidProspect);
    setPendingInvalidProspect(null);
    setModalOpen(true);
  };

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
          (filters.apartado === "apartado_historial" && hasApartadoHistory(p)) ||
          (filters.apartado === "apartados_activos" && hasApartadoHistory(p) && !p.fecha_cierre);
        return nameMatch && estatusMatch && probMatch && apartadoMatch;
      }),
    [prospects, filters]
  );

  const kpis = useMemo(() => {
    const total = filtered.length;
    const avgProb = total > 0 ? filtered.reduce((a, p) => a + (p.probabilidad_cierre || 0), 0) / total : 0;
    const montoTotal = filtered.reduce((a, p) => a + (p.monto_total || 0), 0);
    const activos = filtered.filter((p) => isActiveStatus(p.estatus_general)).length;
    return { total, avgProb, montoTotal, activos };
  }, [filtered]);

  const pipelineBreakdown = useMemo(() => getPipelineBreakdownTotals(filtered), [filtered]);

  const formatShortCurrency = (value: number) =>
    value.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
      notation: "compact",
    });

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
    <div className="app-shell flex w-full flex-col gap-6 pb-24 text-white md:pb-6">
      {tab === "list" && (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard titulo="Total prospectos" valor={kpis.total} glowColor="bg-[#CF3790]/20" />
          <KPICard titulo="Activos" valor={kpis.activos} glowColor="bg-[#F38D62]/20" />
          <KPICard titulo="Prob. promedio" valor={`${kpis.avgProb.toFixed(1)}%`} />
          <KPICard
            titulo="Pipeline R/P/T"
            valor={`${formatShortCurrency(pipelineBreakdown.cerradoMonto)} / ${formatShortCurrency(pipelineBreakdown.procesoMonto)} / ${formatShortCurrency(pipelineBreakdown.tentativoMonto)}`}
            textAccent="text-emerald-300"
          />
        </div>
      )}

      <div className="flex w-full justify-start">
        <ResponsiveDashboardNav
          activeTab={tab}
          setActiveTab={setTab}
          items={[
            { id: "list", label: "Lista", icon: <FiList /> },
            { id: "dailyClose", label: "Cierre", icon: <FiMoon /> },
            { id: "chat", label: "Chat", icon: <FiMessageCircle />, badgeCount: totalUnreadCount },
            { id: "analytics", label: "Analitica", icon: <FiBarChart2 /> },
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
      ) : tab === "dailyClose" ? (
        <DailyClosureAdvisorPanel
          advisorName={advisorName}
          selectedDate={selectedReportDate}
          onSelectedDateChange={setSelectedReportDate}
          reports={dailyReports}
          requests={dailyRequests}
          loading={loading}
          saving={dailyReportSubmitting}
          requestingPermission={requestingPermission}
          onSave={handleSaveDailyReport}
          onRequestPermission={handleRequestDailyReportEdit}
          unavailableMessage={dailyClosureMessage}
        />
      ) : tab === "chat" ? (
        <TeamChatPanel
          currentUserId={currentUserId}
          currentUserName={advisorName}
          role="asesor"
          teamMembers={chatTeamMembers}
          directoryHint={teamDirectoryHint}
        />
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

      <Modal
        open={Boolean(pendingInvalidProspect)}
        onClose={handleForceCompleteRequiredFields}
        title="Usuarios con campos faltantes"
      >
        <div className="space-y-4">
          <p className="text-sm text-pitahaya-gray-300">
            Detectamos prospectos con campos obligatorios vacíos. Te llevaremos al registro para completarlo ahora.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForceCompleteRequiredFields}
              className="rounded-xl bg-linear-to-r from-[#CF3790] to-[#B828E8] px-4 py-2 text-sm font-semibold text-white"
            >
              Ir a completar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}