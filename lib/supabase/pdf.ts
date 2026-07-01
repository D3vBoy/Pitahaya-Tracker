import jsPDF from "jspdf";
import { displayValue, isActiveStatus, isClosedLostStatus, isClosedWonStatus } from "@/lib/prospects/status";

interface ProspectForPdf {
  id: string;
  nombre_cliente: string;
  estatus_general: string;
  probabilidad_cierre: number | null;
  monto_total: number | null;
  apartado_realizado: boolean;
  proximo_seguimiento: string | null;
  fecha_apartado: string | null;
  profiles?: { full_name: string | null } | null;
}

interface AiSummaryResponse {
  summary?: string;
}

interface ExportResult {
  usedFallback: boolean;
  aiIncluded: boolean;
  warnings: string[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("es-MX");
}

function computeMetrics(prospects: ProspectForPdf[]) {
  const activos = prospects.filter((p) => isActiveStatus(p.estatus_general));
  const cerrados = prospects.filter((p) => isClosedWonStatus(p.estatus_general));
  const perdidos = prospects.filter((p) => isClosedLostStatus(p.estatus_general));
  const apartadosActivos = activos.filter((p) => p.apartado_realizado).length;

  const pipelineTotal = prospects.reduce((acc, p) => acc + (p.monto_total || 0), 0);
  const pipelineActivo = activos.reduce((acc, p) => acc + (p.monto_total || 0), 0);
  const pipelinePonderado = prospects.reduce((acc, p) => {
    return acc + (p.monto_total || 0) * ((p.probabilidad_cierre || 0) / 100);
  }, 0);

  return {
    total: prospects.length,
    activos: activos.length,
    cerrados: cerrados.length,
    perdidos: perdidos.length,
    apartadosActivos,
    pipelineTotal,
    pipelineActivo,
    pipelinePonderado,
  };
}

function getStatusBreakdown(prospects: ProspectForPdf[]) {
  const map = new Map<string, number>();
  prospects.forEach((p) => {
    const key = displayValue(p.estatus_general || null);
    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

function writeWrappedText(pdf: jsPDF, text: string, x: number, y: number, maxWidth: number) {
  const lines = pdf.splitTextToSize(text, maxWidth);
  lines.forEach((line: string, index: number) => {
    pdf.text(line, x, y + index * 5);
  });
  return y + lines.length * 5;
}

async function getAiSummary(prospects: ProspectForPdf[], corte: string | null): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("/api/analytics/ai-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospects, corte }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as AiSummaryResponse;
    return data.summary?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function addHeader(pdf: jsPDF, corte: string | null, generatedAt: string, pageWidth: number) {
  pdf.setFillColor(12, 8, 22);
  pdf.rect(0, 0, pageWidth, 34, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Pitahaya Investments", 12, 13);

  pdf.setFontSize(12);
  pdf.text("Reporte Ejecutivo de Pipeline", 12, 21);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Corte: ${corte || "General"}`, 12, 28);
  pdf.text(`Generado: ${generatedAt}`, pageWidth - 12, 28, { align: "right" });

  pdf.setTextColor(20, 20, 20);
}

function addKpiCards(
  pdf: jsPDF,
  metrics: ReturnType<typeof computeMetrics>,
  pageWidth: number,
  startY: number
) {
  const gap = 6;
  const cardW = (pageWidth - 24 - gap) / 2;
  const cardH = 20;
  const x1 = 12;
  const x2 = 12 + cardW + gap;

  const cards = [
    { label: "Prospectos activos", value: String(metrics.activos), x: x1, y: startY },
    { label: "Pipeline activo", value: formatCurrency(metrics.pipelineActivo), x: x2, y: startY },
    { label: "Tasa de cierre", value: `${metrics.total ? ((metrics.cerrados / metrics.total) * 100).toFixed(1) : "0.0"}%`, x: x1, y: startY + cardH + 4 },
    { label: "Pipeline ponderado", value: formatCurrency(metrics.pipelinePonderado), x: x2, y: startY + cardH + 4 },
  ];

  cards.forEach((card) => {
    pdf.setFillColor(246, 243, 253);
    pdf.roundedRect(card.x, card.y, cardW, cardH, 2, 2, "F");
    pdf.setDrawColor(215, 203, 240);
    pdf.roundedRect(card.x, card.y, cardW, cardH, 2, 2);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(80, 72, 106);
    pdf.text(card.label, card.x + 3, card.y + 6);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 20, 20);
    const valueLines = pdf.splitTextToSize(card.value, cardW - 6);
    pdf.text(valueLines[0] || "N/A", card.x + 3, card.y + 14);
  });

  return startY + cardH * 2 + 8;
}

function addStatusBlock(pdf: jsPDF, breakdown: Array<{ status: string; count: number }>, startY: number) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Distribucion por status", 12, startY);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  let y = startY + 6;
  breakdown.slice(0, 8).forEach((item) => {
    y = writeWrappedText(pdf, `- ${item.status}: ${item.count} prospectos`, 14, y, 182);
  });

  return y + 2;
}

function addTopOpportunities(pdf: jsPDF, prospects: ProspectForPdf[], startY: number, pageHeight: number) {
  const top = [...prospects]
    .sort((a, b) => (b.probabilidad_cierre || 0) - (a.probabilidad_cierre || 0))
    .slice(0, 12);

  let y = startY;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Top oportunidades de cierre", 12, y);
  y += 6;

  const headers = ["Cliente", "Status", "Prob.", "Monto", "Asesor", "Seguimiento"];
  const widths = [42, 56, 16, 26, 28, 20];

  pdf.setFillColor(238, 231, 249);
  pdf.rect(12, y, 188, 7, "F");

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  let cursor = 14;
  headers.forEach((header, index) => {
    pdf.text(header, cursor, y + 4.5);
    cursor += widths[index];
  });
  y += 8;

  pdf.setFont("helvetica", "normal");
  top.forEach((item) => {
    if (y > pageHeight - 14) {
      pdf.addPage();
      addHeader(pdf, null, new Date().toLocaleString("es-MX"), pdf.internal.pageSize.getWidth());
      y = 42;
    }

    const row = [
      displayValue(item.nombre_cliente),
      displayValue(item.estatus_general),
      `${item.probabilidad_cierre ?? 0}%`,
      formatCurrency(item.monto_total || 0),
      displayValue(item.profiles?.full_name),
      formatDate(item.proximo_seguimiento),
    ];

    cursor = 14;
    row.forEach((cell, index) => {
      const line = pdf.splitTextToSize(cell, widths[index] - 2)[0] || "N/A";
      pdf.text(line, cursor, y + 4.2);
      cursor += widths[index];
    });

    pdf.setDrawColor(231, 226, 241);
    pdf.line(12, y + 5.2, 200, y + 5.2);
    y += 6;
  });
}

function addAiSection(pdf: jsPDF, aiSummary: string | null, metrics: ReturnType<typeof computeMetrics>, corte: string | null) {
  pdf.addPage();
  const pageWidth = pdf.internal.pageSize.getWidth();
  addHeader(pdf, corte, new Date().toLocaleString("es-MX"), pageWidth);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Analisis IA y recomendaciones", 12, 44);

  const fallback = [
    "1) Resumen ejecutivo",
    `- Se evaluaron ${metrics.total} prospectos con ${metrics.activos} activos en seguimiento.`,
    `- El pipeline total asciende a ${formatCurrency(metrics.pipelineTotal)} y el ponderado a ${formatCurrency(metrics.pipelinePonderado)}.`,
    `- Hay ${metrics.apartadosActivos} apartados activos pendientes de conversion.`,
    "2) Riesgos criticos",
    `- Prospectos perdidos identificados: ${metrics.perdidos}.`,
    "- Revisar casos en status de baja traccion para definir cierre o descarte.",
    "3) Recomendaciones para 7 dias",
    "- Priorizar contactos con probabilidad de cierre >= 70%.",
    "- Agendar seguimiento puntual a apartados pendientes.",
    "- Documentar motivo comercial en casos pausados o caidos.",
  ];

  const lines = (aiSummary || fallback.join("\n"))
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let y = 52;
  lines.forEach((line) => {
    if (y > 280) {
      pdf.addPage();
      addHeader(pdf, corte, new Date().toLocaleString("es-MX"), pageWidth);
      y = 42;
    }

    const isHeading = /^\d+\)/.test(line);
    pdf.setFont("helvetica", isHeading ? "bold" : "normal");
    pdf.setFontSize(isHeading ? 11 : 10);

    const normalized = line.startsWith("-") || line.startsWith("*") ? `• ${line.replace(/^[-*]\s*/, "")}` : line;
    const wrapped = pdf.splitTextToSize(normalized, 186);
    wrapped.forEach((segment: string) => {
      if (y > 280) {
        pdf.addPage();
        addHeader(pdf, corte, new Date().toLocaleString("es-MX"), pageWidth);
        y = 42;
      }
      pdf.text(segment, 12, y);
      y += 5;
    });

    y += isHeading ? 1 : 0.5;
  });
}

export async function exportAnalyticsPDF(
  prospects: ProspectForPdf[] = [],
  corte: string | null = null
): Promise<ExportResult> {
  const warnings: string[] = [];

  try {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const generatedAt = new Date().toLocaleString("es-MX");

    const metrics = computeMetrics(prospects);
    const breakdown = getStatusBreakdown(prospects);

    addHeader(pdf, corte, generatedAt, pageWidth);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Resumen ejecutivo", 12, 42);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    let y = 49;
    y = writeWrappedText(
      pdf,
      `Este reporte consolida el panorama comercial del pipeline para el corte ${corte || "General"}.`,
      12,
      y,
      186
    );
    y = writeWrappedText(
      pdf,
      `Total prospectos: ${metrics.total}. Activos: ${metrics.activos}. Cerrados: ${metrics.cerrados}. Perdidos: ${metrics.perdidos}.`,
      12,
      y + 1,
      186
    );

    y = addKpiCards(pdf, metrics, pageWidth, y + 4);
    y = addStatusBlock(pdf, breakdown, y + 2);
    addTopOpportunities(pdf, prospects, y + 2, pageHeight);

    const aiSummary = await getAiSummary(prospects, corte);
    if (!aiSummary) {
      warnings.push("No se recibio resumen IA; se incluyo version ejecutiva base.");
    }

    addAiSection(pdf, aiSummary, metrics, corte);

    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      pdf.setPage(i);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Pitahaya Investments | Pagina ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 6, {
        align: "center",
      });
      pdf.setTextColor(20, 20, 20);
    }

    pdf.save(`pitahaya-reporte-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`);

    return { usedFallback: false, aiIncluded: Boolean(aiSummary), warnings };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `No se pudo generar el PDF: ${error.message}`
        : "No se pudo generar el PDF por un error inesperado."
    );
  }
}
