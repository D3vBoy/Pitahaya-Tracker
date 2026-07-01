import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface DailyClosureReportRow {
  id: string;
  user_id: string;
  report_date: string;
  leads_nuevos: number;
  llamadas_realizadas: number;
  llamadas_seguimiento: number;
  videollamadas_ejecutadas: number;
  videollamadas_agendadas: number;
  apartados_del_mes: number;
  enganches_del_mes: number;
  prospectos_calientes: number;
  submitted_at: string;
  created_at?: string;
  updated_at?: string;
  edit_unlocked_until?: string | null;
  profiles?: { full_name: string | null } | null;
}

export interface DailyClosureGlobalReportRow {
  id: string;
  report_date: string;
  team_name: string;
  videollamadas_ejecutadas: number;
  videollamadas_con_presencia: number;
  apartados_del_dia: number;
  enganches_del_dia: number;
  total_llamadas: number;
  videollamadas_agendadas: number;
  apartados_del_mes: number;
  apartados_formalizados: number;
  enganches_del_mes: number;
  notas: string | null;
  generated_at: string;
  updated_at?: string;
}

export interface DailyClosureEditRequestRow {
  id: string;
  report_id: string;
  report_date: string;
  requested_by: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  requested_by_profile?: { full_name: string | null } | null;
}

export interface DailyClosureFormValues {
  leads_nuevos: number;
  llamadas_realizadas: number;
  llamadas_seguimiento: number;
  videollamadas_ejecutadas: number;
  videollamadas_agendadas: number;
  apartados_del_mes: number;
  enganches_del_mes: number;
  prospectos_calientes: number;
}

export const DAILY_CLOSURE_DEFAULTS: DailyClosureFormValues = {
  leads_nuevos: 0,
  llamadas_realizadas: 0,
  llamadas_seguimiento: 0,
  videollamadas_ejecutadas: 0,
  videollamadas_agendadas: 0,
  apartados_del_mes: 0,
  enganches_del_mes: 0,
  prospectos_calientes: 0,
};

export const TEAM_NAME = "VALERIA";
export const DAILY_CLOSURE_SETUP_MESSAGE = "El modulo de cierre de dia aun no esta disponible porque falta ejecutar las migraciones de Supabase.";

export function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatReportDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd 'de' MMMM yyyy", { locale: es });
}

export function getMonthKey(value: string) {
  return value.slice(0, 7);
}

export function buildAdvisorReportText(report: DailyClosureReportRow, advisorName: string) {
  return [
    "REPORTE DE CIERRE DE DIA",
    `Asesor: ${advisorName}`,
    `Fecha: ${formatReportDate(report.report_date)}`,
    `Leads nuevos: ${report.leads_nuevos}`,
    `Llamadas realizadas: ${report.llamadas_realizadas}`,
    `Llamadas de seguimiento: ${report.llamadas_seguimiento}`,
    `Videollamadas ejecutadas: ${report.videollamadas_ejecutadas}`,
    `Videollamadas agendadas: ${report.videollamadas_agendadas}`,
    `Apartados del mes: ${report.apartados_del_mes}`,
    `Enganches del mes: ${report.enganches_del_mes}`,
    `Prospectos calientes: ${report.prospectos_calientes}`,
  ].join("\n");
}

export function buildManagerReportText(input: {
  reportDate: string;
  videollamadasEjecutadas: number;
  videollamadasConPresencia: number;
  apartadosDelDia: number;
  enganchesDelDia: number;
  totalLlamadas: number;
  videollamadasAgendadas: number;
  apartadosDelMes: number;
  apartadosFormalizados: number;
  enganchesDelMes: number;
  notas: string;
}) {
  return [
    "REPORTE DE CIERRE DE DIA",
    `Equipo: ${TEAM_NAME}`,
    `Fecha: ${formatReportDate(input.reportDate)}`,
    `Videollamadas ejecutadas: ${input.videollamadasEjecutadas}`,
    `Videollamadas con mi presencia: ${input.videollamadasConPresencia}`,
    `Apartados: ${input.apartadosDelDia}`,
    `Enganches: ${input.enganchesDelDia}`,
    `Total de llamadas: ${input.totalLlamadas}`,
    `Total de videollamadas agendadas: ${input.videollamadasAgendadas}`,
    "",
    "ACUMULADO DEL MES:",
    `Apartados del mes: ${input.apartadosDelMes}`,
    `Apartados formalizados: ${input.apartadosFormalizados}`,
    `Enganches: ${input.enganchesDelMes}`,
    "",
    `NOTAS: ${input.notas.trim() || "Sin notas adicionales."}`,
  ].join("\n");
}

export function sumReportCalls(report: Pick<DailyClosureReportRow, "llamadas_realizadas" | "llamadas_seguimiento">) {
  return report.llamadas_realizadas + report.llamadas_seguimiento;
}

export function isMissingDailyClosureRelationError(error: { code?: string; message?: string | null } | null | undefined) {
  const message = (error?.message || "").toLowerCase();
  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("relation \"public.daily_closure_")
  );
}

export function isTodayReport(reportDate: string) {
  return reportDate === getTodayDateKey();
}

export function isPastReportDate(reportDate: string) {
  return reportDate < getTodayDateKey();
}

export function getEndOfTodayIso() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

export function canEditDailyClosureReport(report: Pick<DailyClosureReportRow, "report_date" | "edit_unlocked_until">) {
  if (isTodayReport(report.report_date)) return true;
  if (!report.edit_unlocked_until) return false;

  const unlockDate = new Date(report.edit_unlocked_until);
  return !Number.isNaN(unlockDate.getTime()) && unlockDate.getTime() > Date.now();
}