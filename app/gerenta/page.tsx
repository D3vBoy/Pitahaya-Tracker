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
import PipelineExcelTable from "@/components/prospects/PipelineExcelTable";
import ActionCenterDashboard from "@/components/prospects/ActionCenterDashboard";
import DailyClosureManagerPanel from "@/components/reports/DailyClosureManagerPanel";
import TeamChatPanel from "@/components/chat/TeamChatPanel";
import { exportAnalyticsPDF } from "@/lib/supabase/pdf";
import KPICard from "@/components/ui/KPICard";
import ResponsiveDashboardNav from "@/components/ui/ResponsiveDashboardNav";
import { useTeamNotifications } from "@/components/providers/TeamNotificationsProvider";
import { isAdvisorChatRole, isTeamChatRole } from "@/lib/chat";
import {
  getPipelineBreakdownTotals,
  hasApartadoHistory,
  isActiveStatus,
  isClosedWonStatus,
} from "@/lib/prospects/status";
import { FiBarChart2, FiGrid, FiMessageCircle, FiTarget, FiTrendingUp } from "react-icons/fi";
import {
  exportApartadosStateReport,
  exportDailyMetricsPdf,
  exportGeneralProspectsReport,
  exportVentasCaidasReport,
  filterProspectsForManagerPipelineTyped,
} from "@/lib/reports/managerExports";
import {
  DAILY_CLOSURE_SETUP_MESSAGE,
  DailyClosureEditRequestRow,
  DailyClosureGlobalReportRow,
  DailyClosureReportRow,
  getEndOfTodayIso,
  getMonthKey,
  getTodayDateKey,
  isMissingDailyClosureRelationError,
  isPastReportDate,
  sumReportCalls,
  TEAM_NAME,
} from "@/lib/reports/dailyClosure";

interface ProspectWithAsesor {
  id: string;
  nombre_cliente: string;
  fecha_primer_contacto: string;
  fecha_primer_zoom: string | null;
  fecha_segundo_zoom: string | null;
  metros_cuadrados_tentativos: number | null;
  metraje_exacto: number | null;
  precio_m2_pactado: number | null;
  monto_total: number | null;
  plan_financiamiento: string | null;
  tipo_financiamiento_venta: string | null;
  condiciones_financiamiento: string | null;
  fecha_compromiso_cierre: string | null;
  unidad_lote: string | null;
  manzana_lote: string | null;
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

interface TeamDirectoryMember {
  id: string;
  full_name: string | null;
  role?: string | null;
}

export default function GerentaPage() {
  const supabase = createClientSupabase();
  const { totalUnreadCount } = useTeamNotifications();
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Gerenta");
  const [prospects, setProspects] = useState<ProspectWithAsesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Partial<ProspectWithAsesor> | null>(null);
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [chatTeamMembers, setChatTeamMembers] = useState<TeamDirectoryMember[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyClosureReportRow[]>([]);
  const [monthlyDailyReports, setMonthlyDailyReports] = useState<DailyClosureReportRow[]>([]);
  const [globalReport, setGlobalReport] = useState<DailyClosureGlobalReportRow | null>(null);
  const [pendingEditRequests, setPendingEditRequests] = useState<DailyClosureEditRequestRow[]>([]);
  const [dailyClosureAvailable, setDailyClosureAvailable] = useState(true);
  const [dailyClosureMessage, setDailyClosureMessage] = useState("");
  const [dailyReportsLoading, setDailyReportsLoading] = useState(true);
  const [globalReportSaving, setGlobalReportSaving] = useState(false);
  const [selectedReportDate, setSelectedReportDate] = useState(getTodayDateKey());
  const [tab, setTab] = useState<"action" | "pipeline" | "dailyClose" | "chat" | "analytics">("action");
  const [downloadType, setDownloadType] = useState<"general" | "apartados" | "caidas" | "metricas">("general");
  const [downloadFormat, setDownloadFormat] = useState<"csv" | "pdf">("csv");
  const [metricsPeriod, setMetricsPeriod] = useState<"day" | "week" | "month">("day");
  const [filters, setFilters] = useState({
    search: "",
    estatus: "",
    probabilidadMin: "" as number | "",
    asesorId: "",
    apartado: "",
    corte: "",
    segmento: "",
    periodo: "",
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

  const loadTeamMembers = useCallback(async (excludeUserId?: string) => {
    const directoryResponse = await supabase.rpc("get_team_chat_directory");

    if (!directoryResponse.error && Array.isArray(directoryResponse.data)) {
      return (directoryResponse.data as TeamDirectoryMember[])
        .filter((member) => member.id !== excludeUserId && isTeamChatRole(member.role))
        .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "es-MX"));
    }

    const { data } = await supabase.from("profiles").select("id, full_name, role");
    return ((data || []) as TeamDirectoryMember[])
      .filter((member) => member.id !== excludeUserId && isTeamChatRole(member.role))
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "es-MX"));
  }, [supabase]);

  const fetchCurrentUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    setCurrentUserId(data.user.id);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
    setCurrentUserName(profile?.full_name || "Gerenta");
    const members = await loadTeamMembers(data.user.id);
    setChatTeamMembers(members);
    setAsesores(
      members
        .filter((member) => isAdvisorChatRole(member.role))
        .map((member) => ({ id: member.id, full_name: member.full_name }))
    );
  }, [loadTeamMembers, supabase]);

  const fetchDailyReports = useCallback(async () => {
    if (!dailyClosureAvailable && dailyClosureMessage) {
      setDailyReportsLoading(false);
      return;
    }

    setDailyReportsLoading(true);
    const monthKey = getMonthKey(selectedReportDate);
    const monthStart = `${monthKey}-01`;
    const monthEnd = `${monthKey}-31`;

    const [reportsResponse, globalReportResponse, requestsResponse, monthReportsResponse] = await Promise.all([
      supabase
        .from("daily_closure_reports")
        .select("*, profiles(full_name)")
        .eq("report_date", selectedReportDate),
      supabase
        .from("daily_closure_global_reports")
        .select("*")
        .eq("report_date", selectedReportDate)
        .maybeSingle(),
      supabase
        .from("daily_closure_edit_requests")
        .select("*, requested_by_profile:profiles!daily_closure_edit_requests_requested_by_fkey(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("daily_closure_reports")
        .select("*")
        .gte("report_date", monthStart)
        .lte("report_date", monthEnd),
    ]);

    const missingClosureTables =
      isMissingDailyClosureRelationError(reportsResponse.error) ||
      isMissingDailyClosureRelationError(globalReportResponse.error) ||
      isMissingDailyClosureRelationError(requestsResponse.error) ||
      isMissingDailyClosureRelationError(monthReportsResponse.error);

    setDailyClosureAvailable(!missingClosureTables);
    setDailyClosureMessage(missingClosureTables ? DAILY_CLOSURE_SETUP_MESSAGE : "");
    setDailyReports(missingClosureTables ? [] : ((reportsResponse.data || []) as DailyClosureReportRow[]));
    setMonthlyDailyReports(missingClosureTables ? [] : ((monthReportsResponse.data || []) as DailyClosureReportRow[]));
    setGlobalReport(missingClosureTables ? null : ((globalReportResponse.data || null) as DailyClosureGlobalReportRow | null));
    setPendingEditRequests(missingClosureTables ? [] : ((requestsResponse.data || []) as DailyClosureEditRequestRow[]));
    setDailyReportsLoading(false);
  }, [dailyClosureAvailable, dailyClosureMessage, selectedReportDate, supabase]);

  useEffect(() => {
    if (!dailyClosureAvailable) return;

    const channel = supabase
      .channel("daily-closure-reports-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_closure_reports" },
        () => {
          void fetchDailyReports();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dailyClosureAvailable, fetchDailyReports, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProspects();
    void fetchCurrentUser();
  }, [fetchProspects, fetchCurrentUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDailyReports();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchDailyReports]);

  const filtered = useMemo(
    () => {
      const base = prospects.filter((p) => {
        return (
          p.nombre_cliente.toLowerCase().includes(filters.search.toLowerCase()) &&
          (!filters.estatus || p.estatus_general === filters.estatus) &&
          (filters.probabilidadMin === "" ||
            (p.probabilidad_cierre !== null && p.probabilidad_cierre >= filters.probabilidadMin)) &&
          (!filters.asesorId || p.user_id === filters.asesorId) &&
          (!filters.apartado ||
            (filters.apartado === "apartado_historial" && hasApartadoHistory(p)) ||
            (filters.apartado === "apartados_activos" && hasApartadoHistory(p) && !p.fecha_cierre)) &&
          (!filters.corte || getCorteMonth(p) === filters.corte)
        );
      });

      return filterProspectsForManagerPipelineTyped(base, filters.segmento, filters.periodo);
    },
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

  const dailyClosureMetrics = useMemo(() => {
    const monthKey = getMonthKey(selectedReportDate);
    return {
      videollamadasEjecutadas: dailyReports.reduce((acc, report) => acc + report.videollamadas_ejecutadas, 0),
      apartadosDelDia: prospects.filter((prospect) => prospect.fecha_apartado?.slice(0, 10) === selectedReportDate).length,
      enganchesDelDia: prospects.filter((prospect) => prospect.fecha_enganche?.slice(0, 10) === selectedReportDate).length,
      totalLlamadas: dailyReports.reduce((acc, report) => acc + sumReportCalls(report), 0),
      videollamadasAgendadas: dailyReports.reduce((acc, report) => acc + report.videollamadas_agendadas, 0),
      apartadosDelMes: monthlyDailyReports.reduce((acc, report) => acc + report.apartados_del_mes, 0),
      apartadosFormalizados: prospects.filter((prospect) => {
        const apartadoMonth = prospect.fecha_apartado?.slice(0, 7);
        if (apartadoMonth !== monthKey) return false;
        return Boolean(prospect.fecha_enganche || prospect.firma_pcv || isClosedWonStatus(prospect.estatus_general));
      }).length,
      enganchesDelMes: monthlyDailyReports.reduce((acc, report) => acc + report.enganches_del_mes, 0),
    };
  }, [dailyReports, monthlyDailyReports, prospects, selectedReportDate]);

  const handleSaveGlobalReport = useCallback(async (input: { videollamadasConPresencia: number; notas: string }) => {
    if (!dailyClosureAvailable) {
      throw new Error(DAILY_CLOSURE_SETUP_MESSAGE);
    }

    setGlobalReportSaving(true);
    try {
      const payload = {
        report_date: selectedReportDate,
        team_name: TEAM_NAME,
        videollamadas_ejecutadas: dailyClosureMetrics.videollamadasEjecutadas,
        videollamadas_con_presencia: input.videollamadasConPresencia,
        apartados_del_dia: dailyClosureMetrics.apartadosDelDia,
        enganches_del_dia: dailyClosureMetrics.enganchesDelDia,
        total_llamadas: dailyClosureMetrics.totalLlamadas,
        videollamadas_agendadas: dailyClosureMetrics.videollamadasAgendadas,
        apartados_del_mes: dailyClosureMetrics.apartadosDelMes,
        apartados_formalizados: dailyClosureMetrics.apartadosFormalizados,
        enganches_del_mes: dailyClosureMetrics.enganchesDelMes,
        notas: input.notas,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("daily_closure_global_reports")
        .upsert(payload, { onConflict: "report_date" })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      setGlobalReport(data as DailyClosureGlobalReportRow);
    } finally {
      setGlobalReportSaving(false);
    }
  }, [dailyClosureAvailable, dailyClosureMetrics, selectedReportDate, supabase]);

  const handleApproveEditRequest = async (request: DailyClosureEditRequestRow) => {
    if (!dailyClosureAvailable) {
      throw new Error(DAILY_CLOSURE_SETUP_MESSAGE);
    }

    const unlockUntil = getEndOfTodayIso();

    const { error: reportError } = await supabase
      .from("daily_closure_reports")
      .update({ edit_unlocked_until: unlockUntil, updated_at: new Date().toISOString() })
      .eq("id", request.report_id);
    if (reportError) throw new Error(reportError.message);

    const { error: requestError } = await supabase
      .from("daily_closure_edit_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", request.id);
    if (requestError) throw new Error(requestError.message);

    await fetchDailyReports();
  };

  const handleRejectEditRequest = async (request: DailyClosureEditRequestRow) => {
    if (!dailyClosureAvailable) {
      throw new Error(DAILY_CLOSURE_SETUP_MESSAGE);
    }

    const { error } = await supabase
      .from("daily_closure_edit_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", request.id);
    if (error) throw new Error(error.message);
    await fetchDailyReports();
  };

  useEffect(() => {
    if (dailyReportsLoading || globalReportSaving) return;
    if (!dailyClosureAvailable) return;
    if (!isPastReportDate(selectedReportDate)) return;
    if (dailyReports.length === 0) return;

    const latestReportUpdate = Math.max(
      ...dailyReports.map((report) => new Date(report.updated_at || report.submitted_at).getTime())
    );
    const globalUpdatedAt = globalReport ? new Date(globalReport.updated_at || globalReport.generated_at).getTime() : 0;
    if (globalUpdatedAt >= latestReportUpdate) return;

    const timer = window.setTimeout(() => {
      void handleSaveGlobalReport({
        videollamadasConPresencia: globalReport?.videollamadas_con_presencia ?? 0,
        notas: globalReport?.notas ?? "",
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [dailyClosureAvailable, dailyReports, dailyReportsLoading, globalReport, globalReportSaving, handleSaveGlobalReport, selectedReportDate]);

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
    segmento: filters.segmento,
    periodo: filters.periodo,
  };
  const setUiFilters = (next: { estatus?: string; probabilidad?: string; asesor?: string; apartado?: string; corte?: string; segmento?: string; periodo?: string }) => {
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
      segmento: next.segmento ?? prev.segmento,
      periodo: next.periodo ?? prev.periodo,
    }));
  };

  const kpis = useMemo(
    () => ({
      total: filtered.length,
      activos: filtered.filter((p) => isActiveStatus(p.estatus_general)).length,
      probPromedio:
        filtered.length > 0
          ? Math.round(filtered.reduce((a, p) => a + (p.probabilidad_cierre || 0), 0) / filtered.length)
          : 0,
    }),
    [filtered]
  );

  const pipelineBreakdown = useMemo(() => getPipelineBreakdownTotals(filtered), [filtered]);

  const formatShortCurrency = (value: number) =>
    value.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
      notation: "compact",
    });

  const handleDownloadReport = async () => {
    try {
      if (downloadType === "general") {
        exportGeneralProspectsReport(filtered, downloadFormat);
        toast.success("Reporte general exportado");
        return;
      }

      if (downloadType === "apartados") {
        exportApartadosStateReport(filtered, downloadFormat);
        toast.success("Reporte de apartados exportado");
        return;
      }

      if (downloadType === "caidas") {
        exportVentasCaidasReport(filtered, downloadFormat);
        toast.success("Reporte de ventas caidas exportado");
        return;
      }

      const reportSource = metricsPeriod === "day" ? dailyReports : monthlyDailyReports;
      exportDailyMetricsPdf(reportSource, asesores, metricsPeriod, selectedReportDate);
      toast.success("Reporte de metricas de asesores exportado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo exportar el reporte");
    }
  };

  return (
    <div className="relative app-shell w-full overflow-hidden pb-24 text-white md:pb-6">
      <div className="pointer-events-none absolute -left-28 -top-20 h-72 w-72 rounded-full bg-[#39065E]/20 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#CF3790]/12 blur-[120px]" />

      <div className="relative z-10 flex flex-col gap-6">
        {tab === "pipeline" && (
          <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard titulo="Total Prospectos" valor={kpis.total} glowColor="bg-[#CF3790]/20" />
            <KPICard titulo="Activos" valor={kpis.activos} glowColor="bg-[#F38D62]/20" />
            <KPICard titulo="Prob. Promedio" valor={`${kpis.probPromedio}%`} />
            <KPICard
              titulo="Pipeline R/P/T"
              valor={`${formatShortCurrency(pipelineBreakdown.cerradoMonto)} / ${formatShortCurrency(pipelineBreakdown.procesoMonto)} / ${formatShortCurrency(pipelineBreakdown.tentativoMonto)}`}
              textAccent="text-emerald-400"
            />
          </div>
        )}

        <div className="flex w-full justify-start">
          <ResponsiveDashboardNav
            activeTab={tab}
            setActiveTab={setTab}
            items={[
              { id: "action", label: "Accion", icon: <FiTarget /> },
              { id: "pipeline", label: "Pipeline", icon: <FiTrendingUp /> },
              { id: "dailyClose", label: "Cierre", icon: <FiGrid /> },
              { id: "chat", label: "Chat", icon: <FiMessageCircle />, badgeCount: totalUnreadCount },
              { id: "analytics", label: "Analitica", icon: <FiBarChart2 /> },
            ]}
          />
        </div>

        {tab === "analytics" ? (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="premium-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pitahaya-gray-400">Descargas gerencia</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <select
                    value={downloadType}
                    onChange={(event) => setDownloadType(event.target.value as typeof downloadType)}
                    className="pitahaya-select rounded-xl border border-pitahaya-border bg-[#0A0612]/90 px-4 py-2.5 text-sm text-white"
                  >
                    <option value="general">1) Reporte general de asesores</option>
                    <option value="apartados">2) Reporte de apartados activos/cerrados</option>
                    <option value="caidas">3) Reporte de ventas caidas</option>
                    <option value="metricas">4) PDF metricas cierre del dia</option>
                  </select>

                  <select
                    value={downloadType === "metricas" ? "pdf" : downloadFormat}
                    onChange={(event) => setDownloadFormat(event.target.value as typeof downloadFormat)}
                    disabled={downloadType === "metricas"}
                    className="pitahaya-select rounded-xl border border-pitahaya-border bg-[#0A0612]/90 px-4 py-2.5 text-sm text-white disabled:opacity-50"
                  >
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                  </select>

                  <select
                    value={metricsPeriod}
                    onChange={(event) => setMetricsPeriod(event.target.value as typeof metricsPeriod)}
                    disabled={downloadType !== "metricas"}
                    className="pitahaya-select rounded-xl border border-pitahaya-border bg-[#0A0612]/90 px-4 py-2.5 text-sm text-white disabled:opacity-50"
                  >
                    <option value="day">Este dia</option>
                    <option value="week">Esta semana</option>
                    <option value="month">Este mes</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="rounded-xl bg-linear-to-r from-[#CF3790] to-[#B828E8] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#CF3790]/20"
                  >
                    Descargar reporte
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    const result = await exportAnalyticsPDF(
                      filtered.map((prospect) => ({
                        id: prospect.id,
                        nombre_cliente: prospect.nombre_cliente,
                        estatus_general: prospect.estatus_general,
                        probabilidad_cierre: prospect.probabilidad_cierre,
                        monto_total: prospect.monto_total,
                        apartado_realizado: prospect.apartado_realizado,
                        proximo_seguimiento: prospect.proximo_seguimiento ?? null,
                        fecha_apartado: prospect.fecha_apartado,
                        profiles: prospect.profiles,
                      })),
                      filters.corte || null
                    );
                    if (result.usedFallback) {
                      toast.success("PDF generado con resumen alterno");
                      if (result.warnings.length > 0) {
                        // Keep details in console for debugging without blocking users.
                        console.warn("PDF export warnings:", result.warnings);
                      }
                    } else {
                      toast.success("PDF generado correctamente");
                    }
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "No se pudo generar el PDF");
                  }
                }}
                className="bg-linear-to-r from-[#CF3790] to-[#B828E8] text-white h-11 px-5 rounded-xl flex items-center gap-2 font-semibold text-sm shadow-lg shadow-[#CF3790]/20 hover:shadow-[#CF3790]/40 transition-all"
              >
                <FiDownload size={16} /> Exportar dashboard PDF
              </motion.button>
            </div>
            <AnalyticsDashboard prospects={prospects} asesores={asesores} />
          </>
        ) : (
          <>
            {(tab === "action" || tab === "pipeline") && (
              <SearchAndFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filters={uiFilters}
                setFilters={setUiFilters}
                asesores={asesores}
                showAsesorFilter
                showCorteFilter
                showPipelineSegmentFilter={tab === "pipeline"}
                showPeriodFilter={tab === "pipeline"}
                corteOptions={corteOptions}
                onNewProspect={() => {
                  setEditingProspect(null);
                  setModalOpen(true);
                }}
              />
            )}
            {tab === "pipeline" ? (
              <PipelineExcelTable
                data={pipelineData}
                loading={loading}
                onRowClick={(prospect) => {
                  setEditingProspect(prospect);
                  setModalOpen(true);
                }}
              />
            ) : tab === "dailyClose" ? (
              <DailyClosureManagerPanel
                asesores={asesores}
                reports={dailyReports}
                reportDate={selectedReportDate}
                onReportDateChange={setSelectedReportDate}
                globalReport={globalReport}
                metrics={dailyClosureMetrics}
                pendingRequests={pendingEditRequests}
                loading={dailyReportsLoading}
                syncingGlobal={globalReportSaving}
                onSaveGlobal={handleSaveGlobalReport}
                onApproveRequest={handleApproveEditRequest}
                onRejectRequest={handleRejectEditRequest}
                unavailableMessage={dailyClosureMessage}
              />
            ) : tab === "chat" ? (
              <TeamChatPanel
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                role="gerenta"
                advisors={asesores}
                teamMembers={chatTeamMembers}
              />
            ) : (
              <ActionCenterDashboard
                data={pipelineData}
                loading={loading}
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
