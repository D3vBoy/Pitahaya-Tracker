import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

function formatCurrency(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

async function getAiSummary(prospects: ProspectForPdf[], corte: string | null): Promise<string | null> {
  try {
    const response = await fetch("/api/analytics/ai-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospects, corte }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as AiSummaryResponse;
    if (!data.summary) return null;
    return data.summary;
  } catch {
    return null;
  }
}

export async function exportAnalyticsPDF(prospects: ProspectForPdf[] = [], corte: string | null = null) {
  try {
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

    const element = document.getElementById("analytics-export-container");
    if (!element) {
      throw new Error("No se encontro el contenedor de analiticas para exportar.");
    }

    const canvas = await html2canvas(element, {
      backgroundColor: "#0A0612",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgWidthMm = pageWidth - marginX * 2;
    const pxPerMm = canvas.width / imgWidthMm;

    let sourceY = 0;
    let firstPage = true;

    while (sourceY < canvas.height) {
      const targetTop = firstPage ? 36 : 10;
      const targetHeightMm = pageHeight - targetTop - 12;
      const sourceSliceHeight = Math.min(canvas.height - sourceY, Math.floor(targetHeightMm * pxPerMm));

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sourceSliceHeight;

      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("No fue posible procesar la imagen para el PDF.");
      }

      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sourceSliceHeight,
        0,
        0,
        canvas.width,
        sourceSliceHeight
      );

      const sliceData = sliceCanvas.toDataURL("image/png");
      const renderHeightMm = sourceSliceHeight / pxPerMm;
      pdf.addImage(sliceData, "PNG", marginX, targetTop, imgWidthMm, renderHeightMm, undefined, "FAST");

      sourceY += sourceSliceHeight;
      firstPage = false;
      if (sourceY < canvas.height) {
        pdf.addPage();
      }
    }

    const aiSummary = await getAiSummary(prospects, corte);
    if (aiSummary) {
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
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `No se pudo generar el PDF: ${error.message}`
        : "No se pudo generar el PDF por un error inesperado."
    );
  }
}
