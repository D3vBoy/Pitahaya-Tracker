import jsPDF from "jspdf";
import {
  getProspectReferenceDate,
  isDateInPreset,
  isProspectInSalesProcess,
  isProspectInSeguimiento,
} from "@/lib/prospects/status";
import { DailyClosureReportRow, formatReportDate, getTodayDateKey, sumReportCalls } from "@/lib/reports/dailyClosure";

interface ProspectExportRow {
  id: string;
  nombre_cliente: string;
  user_id: string;
  estatus_general: string;
  probabilidad_cierre: number | null;
  monto_total: number | null;
  metros_cuadrados_tentativos?: number | null;
  metraje_exacto?: number | null;
  apartado_realizado: boolean;
  fecha_apartado: string | null;
  fecha_enganche?: string | null;
  fecha_cierre?: string | null;
  proximo_seguimiento: string | null;
  fecha_primer_contacto?: string | null;
  profiles?: { full_name: string | null } | null;
}

interface AdvisorRow {
  id: string;
  full_name: string | null;
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(input: string | number | boolean | null | undefined) {
  if (input === null || input === undefined) return "";
  const text = String(input);
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  });
  return lines.join("\n");
}

function formatMxDate(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("es-MX");
}

function diffDaysFromToday(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.floor((startToday.getTime() - startTarget.getTime()) / 86400000);
}

export function exportGeneralProspectsReport(prospects: ProspectExportRow[]) {
  const rows = prospects.map((prospect) => ({
    asesor: prospect.profiles?.full_name || "Sin nombre",
    cliente: prospect.nombre_cliente,
    estatus: prospect.estatus_general,
    probabilidad_cierre: prospect.probabilidad_cierre ?? 0,
    monto_total: prospect.monto_total ?? 0,
    m2_tentativos: prospect.metros_cuadrados_tentativos ?? 0,
    m2_exactos: prospect.metraje_exacto ?? 0,
    apartado: prospect.apartado_realizado ? "Si" : "No",
    fecha_apartado: formatMxDate(prospect.fecha_apartado),
    fecha_cierre: formatMxDate(prospect.fecha_cierre),
    proximo_seguimiento: formatMxDate(prospect.proximo_seguimiento),
  }));

  downloadFile(toCsv(rows), `reporte-general-asesores-${getTodayDateKey()}.csv`, "text/csv;charset=utf-8");
}

export function exportApartadosStateReport(prospects: ProspectExportRow[]) {
  const rows = prospects
    .filter((prospect) => isProspectInSalesProcess(prospect))
    .map((prospect) => {
      const daysFromApartado = diffDaysFromToday(prospect.fecha_apartado);
      const closed = Boolean(prospect.fecha_cierre);
      const monthKey = (prospect.fecha_apartado || "").slice(0, 7);
      const segmentoTiempo =
        daysFromApartado === null
          ? "Sin fecha de apartado"
          : daysFromApartado > 15
            ? "Mas de 15 dias"
            : "15 dias o menos";

      return {
        asesor: prospect.profiles?.full_name || "Sin nombre",
        cliente: prospect.nombre_cliente,
        estado_apartado: closed ? "Apartado con cierre" : "Apartado activo",
        segmento_tiempo: segmentoTiempo,
        apartado_del_mes: monthKey || "Sin corte",
        dias_desde_apartado: daysFromApartado ?? "",
        fecha_apartado: formatMxDate(prospect.fecha_apartado),
        fecha_compromiso: formatMxDate(prospect.fecha_enganche),
        fecha_cierre: formatMxDate(prospect.fecha_cierre),
        monto_total: prospect.monto_total ?? 0,
      };
    });

  downloadFile(toCsv(rows), `reporte-apartados-${getTodayDateKey()}.csv`, "text/csv;charset=utf-8");
}

export function exportVentasCaidasReport(prospects: ProspectExportRow[]) {
  const rows = prospects
    .filter((prospect) => prospect.estatus_general.trim() === "Venta caída. Motivo en observaciones.")
    .map((prospect) => ({
      asesor: prospect.profiles?.full_name || "Sin nombre",
      cliente: prospect.nombre_cliente,
      fecha_primer_contacto: formatMxDate(prospect.fecha_primer_contacto),
      fecha_apartado: formatMxDate(prospect.fecha_apartado),
      fecha_cierre: formatMxDate(prospect.fecha_cierre),
      monto_total: prospect.monto_total ?? 0,
      probabilidad_ultimo_registro: prospect.probabilidad_cierre ?? 0,
      estatus: prospect.estatus_general,
    }));

  downloadFile(toCsv(rows), `reporte-ventas-caidas-${getTodayDateKey()}.csv`, "text/csv;charset=utf-8");
}

function filterReportsByWindow(
  reports: DailyClosureReportRow[],
  period: "day" | "week" | "month",
  baseDate: string
) {
  const base = new Date(`${baseDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return reports;

  if (period === "day") {
    return reports.filter((report) => report.report_date === baseDate);
  }

  if (period === "week") {
    const day = base.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(base);
    weekStart.setDate(base.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return reports.filter((report) => {
      const reportDate = new Date(`${report.report_date}T00:00:00`);
      if (Number.isNaN(reportDate.getTime())) return false;
      return reportDate >= weekStart && reportDate <= weekEnd;
    });
  }

  return reports.filter((report) => {
    const reportDate = new Date(`${report.report_date}T00:00:00`);
    if (Number.isNaN(reportDate.getTime())) return false;
    return reportDate.getFullYear() === base.getFullYear() && reportDate.getMonth() === base.getMonth();
  });
}

export function exportDailyMetricsPdf(
  reports: DailyClosureReportRow[],
  advisors: AdvisorRow[],
  period: "day" | "week" | "month",
  baseDate: string
) {
  const filteredReports = filterReportsByWindow(reports, period, baseDate);
  const grouped = new Map<string, DailyClosureReportRow[]>();

  filteredReports.forEach((report) => {
    const current = grouped.get(report.user_id) || [];
    current.push(report);
    grouped.set(report.user_id, current);
  });

  const advisorRows = advisors.map((advisor) => {
    const advisorReports = grouped.get(advisor.id) || [];
    const totals = advisorReports.reduce(
      (acc, report) => {
        acc.llamadas += sumReportCalls(report);
        acc.videollamadasAgendadas += report.videollamadas_agendadas;
        acc.videollamadasEjecutadas += report.videollamadas_ejecutadas;
        acc.leads += report.leads_nuevos;
        acc.apartadosMes += report.apartados_del_mes;
        return acc;
      },
      {
        llamadas: 0,
        videollamadasAgendadas: 0,
        videollamadasEjecutadas: 0,
        leads: 0,
        apartadosMes: 0,
      }
    );

    return {
      name: advisor.full_name || "Sin nombre",
      ...totals,
    };
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(12, 8, 22);
  pdf.rect(0, 0, pageWidth, 34, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Pitahaya Tracker", 12, 13);
  pdf.setFontSize(11);
  pdf.text("Metricas de asesores - cierre de dia", 12, 21);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  const periodLabel = period === "day" ? "Este dia" : period === "week" ? "Esta semana" : "Este mes";
  pdf.text(`Periodo: ${periodLabel}`, 12, 28);
  pdf.text(`Fecha base: ${formatReportDate(baseDate)}`, pageWidth - 12, 28, { align: "right" });

  pdf.setTextColor(30, 30, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);

  const headers = ["Asesor", "Llamadas", "Sesiones agendadas", "Sesiones ejecutadas", "Leads", "Apartados mes"];
  const widths = [52, 20, 30, 30, 20, 30];
  let y = 44;
  let x = 12;

  headers.forEach((header, index) => {
    pdf.text(header, x, y);
    x += widths[index];
  });

  y += 4;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(12, y, 198, y);
  y += 5;

  pdf.setFont("helvetica", "normal");
  advisorRows.forEach((row) => {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }

    x = 12;
    const cells = [
      row.name,
      String(row.llamadas),
      String(row.videollamadasAgendadas),
      String(row.videollamadasEjecutadas),
      String(row.leads),
      String(row.apartadosMes),
    ];

    cells.forEach((cell, index) => {
      const line = pdf.splitTextToSize(cell, widths[index] - 2)[0] || "0";
      pdf.text(line, x, y);
      x += widths[index];
    });
    y += 6;
  });

  pdf.save(`metricas-asesores-${period}-${baseDate}.pdf`);
}

export function filterProspectsForManagerPipeline(
  prospects: ProspectExportRow[],
  segmento: string,
  periodo: string
) {
  return prospects.filter((prospect) => {
    const segmentMatch =
      !segmento ||
      (segmento === "seguimiento" && isProspectInSeguimiento(prospect)) ||
      (segmento === "proceso_venta" && isProspectInSalesProcess(prospect));

    if (!segmentMatch) return false;

    if (!periodo) return true;
    if (periodo === "today" || periodo === "this_week" || periodo === "this_month" || periodo === "previous_months") {
      return isDateInPreset(getProspectReferenceDate(prospect), periodo);
    }

    return true;
  });
}
