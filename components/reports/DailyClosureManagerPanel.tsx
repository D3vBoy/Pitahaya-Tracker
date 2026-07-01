"use client";

import { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas-pro";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import {
  buildManagerReportText,
  DailyClosureEditRequestRow,
  DailyClosureGlobalReportRow,
  DailyClosureReportRow,
  formatReportDate,
  getTodayDateKey,
  TEAM_NAME,
} from "@/lib/reports/dailyClosure";

interface Asesor {
  id: string;
  full_name: string | null;
}

interface MetricsInput {
  videollamadasEjecutadas: number;
  apartadosDelDia: number;
  enganchesDelDia: number;
  totalLlamadas: number;
  videollamadasAgendadas: number;
  apartadosDelMes: number;
  apartadosFormalizados: number;
  enganchesDelMes: number;
}

interface Props {
  asesores: Asesor[];
  reports: DailyClosureReportRow[];
  reportDate: string;
  onReportDateChange: (value: string) => void;
  globalReport: DailyClosureGlobalReportRow | null;
  metrics: MetricsInput;
  pendingRequests: DailyClosureEditRequestRow[];
  unavailableMessage?: string;
  loading?: boolean;
  syncingGlobal?: boolean;
  onSaveGlobal: (input: { videollamadasConPresencia: number; notas: string }) => Promise<void>;
  onApproveRequest: (request: DailyClosureEditRequestRow) => Promise<void>;
  onRejectRequest: (request: DailyClosureEditRequestRow) => Promise<void>;
}

export default function DailyClosureManagerPanel({
  asesores,
  reports,
  reportDate,
  onReportDateChange,
  globalReport,
  metrics,
  pendingRequests,
  unavailableMessage = "",
  loading = false,
  syncingGlobal = false,
  onSaveGlobal,
  onApproveRequest,
  onRejectRequest,
}: Props) {
  const [videollamadasConPresencia, setVideollamadasConPresencia] = useState(0);
  const [notas, setNotas] = useState("");
  const [approvalLoadingId, setApprovalLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const nextPresence = globalReport?.videollamadas_con_presencia ?? 0;
    const nextNotas = globalReport?.notas ?? "";
    const timer = window.setTimeout(() => {
      setVideollamadasConPresencia(nextPresence);
      setNotas(nextNotas);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [globalReport?.id, globalReport?.notas, globalReport?.videollamadas_con_presencia]);

  const reportsByUser = useMemo(() => {
    const map = new Map<string, DailyClosureReportRow>();
    reports.forEach((report) => map.set(report.user_id, report));
    return map;
  }, [reports]);

  const allSubmitted = asesores.length > 0 && asesores.every((asesor) => reportsByUser.has(asesor.id));

  const reportText = useMemo(
    () =>
      buildManagerReportText({
        reportDate,
        videollamadasEjecutadas: metrics.videollamadasEjecutadas,
        videollamadasConPresencia,
        apartadosDelDia: metrics.apartadosDelDia,
        enganchesDelDia: metrics.enganchesDelDia,
        totalLlamadas: metrics.totalLlamadas,
        videollamadasAgendadas: metrics.videollamadasAgendadas,
        apartadosDelMes: metrics.apartadosDelMes,
        apartadosFormalizados: metrics.apartadosFormalizados,
        enganchesDelMes: metrics.enganchesDelMes,
        notas,
      }),
    [metrics, notas, reportDate, videollamadasConPresencia]
  );

  const isToday = reportDate === getTodayDateKey();

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      toast.success("Reporte global copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el reporte global");
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById("manager-daily-report-card");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#0A0612",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `reporte-global-${reportDate}.png`;
      link.href = canvas.toDataURL("image/png", 1);
      link.click();
    } catch {
      toast.error("No se pudo generar la imagen del reporte global");
    }
  };

  return (
    <div className="space-y-6">
      <div className="premium-panel rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Cierre de día global</h3>
            <p className="text-sm text-pitahaya-gray-500">Histórico consolidado, estado por asesor y permisos de edición.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm font-medium text-pitahaya-gray-300">Fecha</label>
            <input
              type="date"
              value={reportDate}
              max={getTodayDateKey()}
              onChange={(event) => onReportDateChange(event.target.value)}
              className="rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-2.5 text-white focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="premium-panel rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-base font-semibold text-white">Estado por asesor</h4>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${allSubmitted ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border border-amber-400/30 bg-amber-500/10 text-amber-200"}`}>
                {reports.length}/{asesores.length} enviados
              </span>
            </div>

            <div className="space-y-2">
              {loading ? (
                <p className="py-6 text-center text-pitahaya-gray-500">Cargando estatus...</p>
              ) : (
                asesores.map((asesor) => {
                  const report = reportsByUser.get(asesor.id);
                  return (
                    <div key={asesor.id} className="flex items-center justify-between rounded-xl border border-[#39065E]/35 bg-[#0E0918]/60 px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{asesor.full_name || "Sin nombre"}</p>
                        <p className="text-xs text-pitahaya-gray-500">
                          {report ? `Actualizado ${new Date(report.updated_at || report.submitted_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}` : "Pendiente"}
                        </p>
                      </div>
                      <span className={`text-xl ${report ? "text-emerald-300" : "text-rose-300"}`}>{report ? "✓" : "✕"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="premium-panel rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="text-base font-semibold text-white">Solicitudes de edición</h4>
              <p className="text-xs text-pitahaya-gray-500">Autoriza o rechaza cambios de cierres históricos</p>
            </div>
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#39065E]/35 px-3 py-6 text-center text-xs text-pitahaya-gray-500">
                  No hay solicitudes pendientes.
                </p>
              ) : (
                pendingRequests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-[#39065E]/35 bg-[#0E0918]/60 p-3">
                    <p className="text-sm font-semibold text-white">{request.requested_by_profile?.full_name || "Asesor"}</p>
                    <p className="mt-0.5 text-xs text-pitahaya-gray-500">Fecha solicitada: {formatReportDate(request.report_date)}</p>
                    <p className="mt-2 text-sm text-pitahaya-gray-300">{request.reason}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        disabled={approvalLoadingId === request.id}
                        onClick={async () => {
                          try {
                            setApprovalLoadingId(request.id);
                            await onApproveRequest(request);
                            toast.success("Permiso concedido");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "No se pudo aprobar la solicitud");
                          } finally {
                            setApprovalLoadingId(null);
                          }
                        }}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={approvalLoadingId === request.id}
                        onClick={async () => {
                          try {
                            setApprovalLoadingId(request.id);
                            await onRejectRequest(request);
                            toast.success("Solicitud rechazada");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "No se pudo rechazar la solicitud");
                          } finally {
                            setApprovalLoadingId(null);
                          }
                        }}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="premium-panel rounded-2xl p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-base font-semibold text-white">Reporte global histórico</h4>
              <p className="text-xs text-pitahaya-gray-500">
                {isToday
                  ? "Puedes ajustar notas y presencia del gerente para el cierre de hoy."
                  : "Este reporte queda guardado como histórico global de la fecha seleccionada."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleCopyText}>Copiar texto</Button>
              <Button size="sm" variant="secondary" onClick={handleDownloadImage}>Descargar imagen</Button>
            </div>
          </div>

          {unavailableMessage ? (
            <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
              {unavailableMessage}
            </div>
          ) : null}

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-pitahaya-gray-300">Videollamadas con mi presencia</label>
              <input
                type="number"
                min={0}
                value={videollamadasConPresencia}
                onChange={(event) => setVideollamadasConPresencia(Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0))}
                className="rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-3 text-white focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20"
              />
            </div>
            <div className="flex items-end justify-end">
              <Button
                onClick={async () => {
                  try {
                    await onSaveGlobal({ videollamadasConPresencia, notas });
                    toast.success("Reporte global guardado en histórico");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "No se pudo guardar el reporte global");
                  }
                }}
                disabled={syncingGlobal || Boolean(unavailableMessage)}
              >
                {syncingGlobal ? "Guardando..." : "Guardar conglomerado"}
              </Button>
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-pitahaya-gray-300">Notas del gerente</label>
              <textarea
                rows={4}
                value={notas}
                onChange={(event) => setNotas(event.target.value)}
                className="rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-3 text-white focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20"
                placeholder="Comentario o nota adicional importante"
              />
            </div>
          </div>

          <div id="manager-daily-report-card" className="rounded-2xl border border-[#39065E]/35 bg-[#0D0916] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pitahaya-gray-500">Pitahaya Tracker</p>
            <h5 className="mt-2 text-lg font-bold text-white">Reporte de cierre de día</h5>
            <div className="mt-4 space-y-2 text-sm text-pitahaya-gray-300">
              <p><span className="font-semibold text-white">Equipo:</span> {TEAM_NAME}</p>
              <p><span className="font-semibold text-white">Fecha:</span> {formatReportDate(reportDate)}</p>
              <p><span className="font-semibold text-white">Videollamadas ejecutadas:</span> {metrics.videollamadasEjecutadas}</p>
              <p><span className="font-semibold text-white">Videollamadas con mi presencia:</span> {videollamadasConPresencia}</p>
              <p><span className="font-semibold text-white">Apartados:</span> {metrics.apartadosDelDia}</p>
              <p><span className="font-semibold text-white">Enganches:</span> {metrics.enganchesDelDia}</p>
              <p><span className="font-semibold text-white">Total de llamadas:</span> {metrics.totalLlamadas}</p>
              <p><span className="font-semibold text-white">Total de videollamadas agendadas:</span> {metrics.videollamadasAgendadas}</p>
              <div className="my-4 border-t border-[#39065E]/30 pt-4">
                <p className="font-semibold text-white">ACUMULADO DEL MES</p>
                <p className="mt-2"><span className="font-semibold text-white">Apartados del mes:</span> {metrics.apartadosDelMes}</p>
                <p><span className="font-semibold text-white">Apartados formalizados:</span> {metrics.apartadosFormalizados}</p>
                <p><span className="font-semibold text-white">Enganches:</span> {metrics.enganchesDelMes}</p>
              </div>
              <div className="rounded-xl border border-[#39065E]/25 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pitahaya-gray-500">Notas</p>
                <p className="mt-1 text-sm text-white">{notas.trim() || "Sin notas adicionales."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
