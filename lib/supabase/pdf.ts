import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportAnalyticsPDF() {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Título
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("Reporte Pitahaya Investments", pageWidth / 2, 20, { align: "center" });

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generado el ${new Date().toLocaleString()}`, pageWidth / 2, 28, {
    align: "center",
  });

  // Capturar el contenedor de analíticas
  const element = document.getElementById("analytics-export-container");
  if (!element) {
    console.error("No se encontró el contenedor de analíticas");
    return;
  }

  const canvas = await html2canvas(element, {
    backgroundColor: "#0A0E1A",
    scale: 2,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 10, 35, imgWidth, imgHeight);

  // Pie de página
  pdf.setFontSize(8);
  pdf.text("Pitahaya Investments © 2024 - Reporte de productividad", pageWidth / 2, 285, {
    align: "center",
  });

  pdf.save(`pitahaya-reporte-${new Date().toISOString().slice(0, 10)}.pdf`);
}