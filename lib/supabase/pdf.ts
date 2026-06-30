import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

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
  error?: string;
}

interface ExportResult {
  usedFallback: boolean;
  aiIncluded: boolean;
  warnings: string[];
}

interface SliceCaptureParams {
  element: HTMLElement;
  sourceY: number;
  sourceHeight: number;
  sourceWidth: number;
  sourceAbsoluteTop: number;
}

const UNSUPPORTED_COLOR_FN_REPLACE = /(oklch|oklab|lab|lch)\([^)]*\)/gi;
const UNSUPPORTED_COLOR_FN_TEST = /(oklch|oklab|lab|lch)\([^)]*\)/i;
const SAFE_COLOR_FALLBACK = "rgba(17, 24, 39, 0.9)";

function formatCurrency(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

async function waitForAnalyticsReady() {
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading errors and continue with capture.
    }
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function sanitizeColorFunctions(value: string | null | undefined, fallback = SAFE_COLOR_FALLBACK) {
  if (!value) return value || "";
  return value.replace(UNSUPPORTED_COLOR_FN_REPLACE, fallback);
}

function applyCaptureSafeStyles(clonedDocument: Document, rootId: string) {
  const root = clonedDocument.getElementById(rootId);
  if (!root) return;

  const htmlEl = clonedDocument.documentElement;
  const htmlStyles = clonedDocument.defaultView?.getComputedStyle(htmlEl);
  if (htmlStyles) {
    for (let i = 0; i < htmlStyles.length; i += 1) {
      const name = htmlStyles.item(i);
      if (!name.startsWith("--")) continue;
      const value = htmlStyles.getPropertyValue(name);
      if (!UNSUPPORTED_COLOR_FN_TEST.test(value)) continue;
      htmlEl.style.setProperty(name, sanitizeColorFunctions(value, SAFE_COLOR_FALLBACK));
    }
  }

  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  const colorProps = [
    "color",
    "backgroundColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "outlineColor",
    "textDecorationColor",
    "caretColor",
    "fill",
    "stroke",
  ] as const;

  nodes.forEach((node) => {
    const computed = clonedDocument.defaultView?.getComputedStyle(node);
    if (!computed) return;

    colorProps.forEach((prop) => {
      const cssPropName = prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      const raw = computed.getPropertyValue(cssPropName);
      if (UNSUPPORTED_COLOR_FN_TEST.test(raw)) {
        node.style.setProperty(cssPropName, sanitizeColorFunctions(raw, SAFE_COLOR_FALLBACK));
      }
    });

    const boxShadow = computed.getPropertyValue("box-shadow");
    if (UNSUPPORTED_COLOR_FN_TEST.test(boxShadow)) {
      node.style.setProperty("box-shadow", "none");
    }

    const textShadow = computed.getPropertyValue("text-shadow");
    if (UNSUPPORTED_COLOR_FN_TEST.test(textShadow)) {
      node.style.setProperty("text-shadow", "none");
    }

    const bgImage = computed.getPropertyValue("background-image");
    if (UNSUPPORTED_COLOR_FN_TEST.test(bgImage)) {
      node.style.setProperty("background-image", "none");
    }
  });
}

async function captureSliceWithRetries({
  element,
  sourceY,
  sourceHeight,
  sourceWidth,
  sourceAbsoluteTop,
}: SliceCaptureParams) {
  const scales = [2, 1.6, 1.3, 1];
  let lastError: unknown = null;
  const rootId = element.id || "analytics-export-container";

  for (const scale of scales) {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#0A0612",
        scale,
        useCORS: true,
        logging: false,
        width: sourceWidth,
        height: sourceHeight,
        x: 0,
        y: sourceY,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: sourceWidth,
        windowHeight: sourceHeight,
        onclone: (clonedDocument) => {
          applyCaptureSafeStyles(clonedDocument, rootId);
        },
      });

      if (canvas.width <= 0 || canvas.height <= 0) {
        throw new Error("El segmento capturado no tiene dimensiones validas.");
      }

      return canvas;
    } catch (error) {
      lastError = error;

      // Retry with lower scale to reduce memory pressure.
      await new Promise((resolve) => setTimeout(resolve, 40));
      if (sourceAbsoluteTop > 0) {
        window.scrollTo({ top: Math.max(0, sourceAbsoluteTop - 16), behavior: "auto" });
      }
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `No fue posible capturar el dashboard: ${lastError.message}`
      : "No fue posible capturar el dashboard."
  );
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
    if (!data.summary) return null;
    return data.summary;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function addFallbackExecutiveSummary(
  pdf: jsPDF,
  prospects: ProspectForPdf[],
  corte: string | null,
  pageWidth: number,
  pageHeight: number,
  marginX: number
) {
  const activos = prospects.filter((p) => p.estatus_general !== "Cerrado" && p.estatus_general !== "Perdido");
  const apartadosActivos = activos.filter((p) => p.apartado_realizado).length;
  const montoTotal = prospects.reduce((acc, p) => acc + (p.monto_total || 0), 0);
  const montoActivo = activos.reduce((acc, p) => acc + (p.monto_total || 0), 0);

  const top = [...activos]
    .sort((a, b) => (b.probabilidad_cierre || 0) - (a.probabilidad_cierre || 0))
    .slice(0, 8);

  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("Resumen ejecutivo alterno", marginX, 16);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const lines = [
    `Corte aplicado: ${corte || "General"}`,
    `Prospectos totales: ${prospects.length}`,
    `Leads activos: ${activos.length}`,
    `Apartados activos: ${apartadosActivos}`,
    `Pipeline total: ${formatCurrency(montoTotal)}`,
    `Pipeline activo: ${formatCurrency(montoActivo)}`,
    "",
    "Top oportunidades por probabilidad:",
  ];

  let y = 24;
  lines.forEach((line) => {
    pdf.text(line, marginX, y);
    y += 5;
  });

  top.forEach((p, index) => {
    if (y > pageHeight - 16) {
      pdf.addPage();
      y = 16;
    }

    const row = `${index + 1}. ${p.nombre_cliente || "Sin nombre"} | Prob: ${p.probabilidad_cierre ?? 0}% | Monto: ${formatCurrency(p.monto_total || 0)} | Asesor: ${p.profiles?.full_name || "Sin asesor"}`;
    const wrapped = pdf.splitTextToSize(row, pageWidth - marginX * 2);
    wrapped.forEach((segment: string) => {
      if (y > pageHeight - 16) {
        pdf.addPage();
        y = 16;
      }
      pdf.text(segment, marginX, y);
      y += 5;
    });
  });
}

export async function exportAnalyticsPDF(
  prospects: ProspectForPdf[] = [],
  corte: string | null = null
): Promise<ExportResult> {
  const warnings: string[] = [];

  try {
    await waitForAnalyticsReady();

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 10;
    const footerY = pageHeight - 6;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("Reporte Pitahaya Investments", pageWidth / 2, 16, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`Generado: ${new Date().toLocaleString("es-MX")}`, pageWidth / 2, 23, { align: "center" });

    const total = prospects.length;
    const activos = prospects.filter((p) => p.estatus_general !== "Cerrado" && p.estatus_general !== "Perdido").length;
    const apartadosActivos = prospects.filter(
      (p) => p.apartado_realizado && p.estatus_general !== "Cerrado" && p.estatus_general !== "Perdido"
    ).length;
    const montoTotal = prospects.reduce((acc, p) => acc + (p.monto_total || 0), 0);

    pdf.setFontSize(10);
    pdf.text(
      `Corte: ${corte || "General"} | Prospectos: ${total} | Activos: ${activos} | Apartados activos: ${apartadosActivos} | Pipeline: ${formatCurrency(montoTotal)}`,
      marginX,
      30
    );

    let usedFallback = false;
    const element = document.getElementById("analytics-export-container");

    if (!element) {
      usedFallback = true;
      warnings.push("No se encontro el contenedor visual de analiticas. Se genero resumen alterno.");
      addFallbackExecutiveSummary(pdf, prospects, corte, pageWidth, pageHeight, marginX);
    } else {
      try {
        const sourceWidth = Math.max(1, Math.ceil(element.scrollWidth));
        const sourceHeightTotal = Math.max(1, Math.ceil(element.scrollHeight));
        const sourceAbsoluteTop = Math.max(0, Math.floor(element.getBoundingClientRect().top + window.scrollY));

        if (sourceWidth <= 1 || sourceHeightTotal <= 1) {
          throw new Error("El dashboard no tiene dimensiones suficientes para exportar.");
        }

        const imgWidthMm = pageWidth - marginX * 2;
        const mmPerPx = imgWidthMm / sourceWidth;
        const targetTopMm = 36;
        const availableHeightMm = pageHeight - targetTopMm - 12;

        const captureSlices: Array<{ dataUrl: string; heightPx: number; widthPx: number }> = [];
        let totalRenderHeightMm = 0;

        let sourceY = 0;

        while (sourceY < sourceHeightTotal) {
          const targetHeightMm = pageHeight - 10 - 12;
          const maxSourceSliceHeight = Math.max(1, Math.floor(targetHeightMm / mmPerPx));
          const sourceSliceHeight = Math.min(sourceHeightTotal - sourceY, maxSourceSliceHeight);

          if (sourceSliceHeight <= 0) {
            throw new Error("No se pudo calcular el alto de una pagina del PDF.");
          }

          const sliceCanvas = await captureSliceWithRetries({
            element,
            sourceY,
            sourceHeight: sourceSliceHeight,
            sourceWidth,
            sourceAbsoluteTop,
          });

          const renderHeightMm = sliceCanvas.height * (imgWidthMm / sliceCanvas.width);
          totalRenderHeightMm += renderHeightMm;
          captureSlices.push({
            dataUrl: sliceCanvas.toDataURL("image/png", 0.95),
            heightPx: sliceCanvas.height,
            widthPx: sliceCanvas.width,
          });

          sourceY += sourceSliceHeight;
        }

        const fitScale = totalRenderHeightMm > availableHeightMm ? availableHeightMm / totalRenderHeightMm : 1;
        let currentTopMm = targetTopMm;

        captureSlices.forEach((slice) => {
          const rawHeightMm = slice.heightPx * (imgWidthMm / slice.widthPx);
          const finalHeightMm = rawHeightMm * fitScale;
          pdf.addImage(slice.dataUrl, "PNG", marginX, currentTopMm, imgWidthMm, finalHeightMm, undefined, "FAST");
          currentTopMm += finalHeightMm;
        });

        if (fitScale < 1) {
          warnings.push("La captura visual fue escalada para ajustarse a una sola hoja.");
        }
      } catch (captureError) {
        usedFallback = true;
        warnings.push(
          captureError instanceof Error
            ? `Fallo captura visual: ${captureError.message}`
            : "Fallo captura visual del dashboard."
        );
        addFallbackExecutiveSummary(pdf, prospects, corte, pageWidth, pageHeight, marginX);
      }
    }

    const aiSummary = await getAiSummary(prospects, corte);
    let aiIncluded = false;
    if (aiSummary) {
      aiIncluded = true;
      pdf.addPage();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.text("Analisis IA de seguimientos activos", marginX, 16);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(aiSummary, pageWidth - marginX * 2);

      let lineY = 24;
      lines.forEach((line: string) => {
        if (lineY > pageHeight - 12) {
          pdf.addPage();
          lineY = 16;
        }
        pdf.text(line, marginX, lineY);
        lineY += 5;
      });
    }

    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      pdf.setPage(i);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(
        `Pitahaya Investments - Pagina ${i} de ${pageCount}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );
    }

    pdf.save(`pitahaya-reporte-${new Date().toISOString().slice(0, 10)}.pdf`);
    return { usedFallback, aiIncluded, warnings };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `No se pudo generar el PDF: ${error.message}`
        : "No se pudo generar el PDF por un error inesperado."
    );
  }
}
