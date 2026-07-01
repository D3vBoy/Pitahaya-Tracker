"use client";

import { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas-pro";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  buildAdvisorReportText,
  canEditDailyClosureReport,
  DAILY_CLOSURE_DEFAULTS,
  DailyClosureEditRequestRow,
  DailyClosureFormValues,
  DailyClosureReportRow,
  formatReportDate,
  getTodayDateKey,
  isPastReportDate,
  isTodayReport,
} from "@/lib/reports/dailyClosure";

interface Props {
  advisorName: string;
  selectedDate: string;
  onSelectedDateChange: (value: string) => void;
  reports: DailyClosureReportRow[];
  requests: DailyClosureEditRequestRow[];
  unavailableMessage?: string;
  loading?: boolean;
  saving?: boolean;
  requestingPermission?: boolean;
  onSave: (reportDate: string, values: DailyClosureFormValues, reportId?: string) => Promise<void>;
  onRequestPermission: (report: DailyClosureReportRow, reason: string) => Promise<void>;
}

const FIELD_CONFIG: Array<{ key: keyof DailyClosureFormValues; label: string }> = [
  { key: "leads_nuevos", label: "Leads nuevos" },
  { key: "llamadas_realizadas", label: "Llamadas realizadas" },
  { key: "llamadas_seguimiento", label: "Llamadas de seguimiento" },
  { key: "videollamadas_ejecutadas", label: "Videollamadas ejecutadas" },
  { key: "videollamadas_agendadas", label: "Videollamadas agendadas" },
  { key: "apartados_del_mes", label: "Apartados del mes" },
  { key: "enganches_del_mes", label: "Enganches del mes" },
  { key: "prospectos_calientes", label: "Prospectos calientes" },
];

function toFormValues(report?: DailyClosureReportRow | null): DailyClosureFormValues {
  if (!report) return DAILY_CLOSURE_DEFAULTS;
  return {
    leads_nuevos: report.leads_nuevos,
    llamadas_realizadas: report.llamadas_realizadas,
    llamadas_seguimiento: report.llamadas_seguimiento,
    videollamadas_ejecutadas: report.videollamadas_ejecutadas,
    videollamadas_agendadas: report.videollamadas_agendadas,
    apartados_del_mes: report.apartados_del_mes,
    enganches_del_mes: report.enganches_del_mes,
    prospectos_calientes: report.prospectos_calientes,
  };
}

export default function DailyClosureAdvisorPanel({
  advisorName,
  selectedDate,
  onSelectedDateChange,
  reports,
  requests,
  unavailableMessage = "",
  loading = false,
  saving = false,
  requestingPermission = false,
  onSave,
  onRequestPermission,
}: Props) {
  const [form, setForm] = useState<DailyClosureFormValues>(DAILY_CLOSURE_DEFAULTS);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.report_date.localeCompare(a.report_date)),
    [reports]
  );

  const selectedReport = useMemo(
    () => reports.find((report) => report.report_date === selectedDate) || null,
    [reports, selectedDate]
  );

  const pendingRequest = useMemo(() => {
    if (!selectedReport) return null;
    return requests.find((request) => request.report_id === selectedReport.id && request.status === "pending") || null;
  }, [requests, selectedReport]);

  const canEdit = useMemo(() => {
    if (isTodayReport(selectedDate) && !selectedReport) return true;
    if (!selectedReport) return false;
    return canEditDailyClosureReport(selectedReport);
  }, [selectedDate, selectedReport]);

  const previewReport = useMemo<DailyClosureReportRow>(() => {
    return selectedReport
      ? { ...selectedReport, ...form }
      : {
          id: "draft",
          user_id: "draft",
          report_date: selectedDate,
          submitted_at: new Date().toISOString(),
          ...form,
        };
  }, [form, selectedDate, selectedReport]);

  const reportText = useMemo(
    () => buildAdvisorReportText(previewReport, advisorName || "Asesor"),
    [advisorName, previewReport]
  );

  useEffect(() => {
    const nextValues = toFormValues(selectedReport);
    const timer = window.setTimeout(() => {
      setForm(nextValues);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedReport, selectedDate]);

  const handleFieldChange = (key: keyof DailyClosureFormValues, value: string) => {
    const parsed = Number.parseInt(value, 10);
    setForm((prev) => ({
      ...prev,
      [key]: Number.isNaN(parsed) || parsed < 0 ? 0 : parsed,
    }));
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      toast.success("Reporte copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el reporte");
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById("advisor-daily-report-card");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#0A0612",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `cierre-dia-${selectedDate}.png`;
      link.href = canvas.toDataURL("image/png", 1);
      link.click();
    } catch {
      toast.error("No se pudo generar la imagen del reporte");
    }
  };

  const stateBadge = (() => {
    if (canEdit && isTodayReport(selectedDate)) {
      return "Puedes editar este reporte hasta las 11:59 pm.";
    }
    if (canEdit && isPastReportDate(selectedDate)) {
      return "Edicion historica autorizada temporalmente por gerencia.";
    }
    if (pendingRequest) {
      return "Solicitud de edición enviada. Pendiente de aprobación.";
    }
    return "Dia cerrado. Si necesitas cambiarlo, solicita permiso a gerencia.";
  })();

  return (
    <div className="space-y-6">
      <div className="premium-panel rounded-2xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Cierre de día del asesor</h3>
            <p className="text-sm text-pitahaya-gray-500">Consulta y edita tu cierre hasta las 11:59 pm del mismo día.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm font-medium text-pitahaya-gray-300">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              max={getTodayDateKey()}
              onChange={(event) => onSelectedDateChange(event.target.value)}
              className="rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-2.5 text-white focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <div className="premium-panel rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-white">Histórico</h4>
              <p className="text-xs text-pitahaya-gray-500">Tus cierres enviados por fecha</p>
            </div>
          </div>

          <div className="space-y-2">
            {sortedReports.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#39065E]/35 px-3 py-6 text-center text-xs text-pitahaya-gray-500">
                Aun no tienes cierres de día registrados.
              </p>
            ) : (
              sortedReports.map((report) => {
                const active = report.report_date === selectedDate;
                const editable = canEditDailyClosureReport(report);
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => onSelectedDateChange(report.report_date)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${active ? "border-[#CF3790]/55 bg-[#39065E]/18" : "border-[#39065E]/30 bg-[#100B1B]/45 hover:bg-[#39065E]/12"}`}
                  >
                    <p className="text-sm font-semibold text-white">{formatReportDate(report.report_date)}</p>
                    <p className="mt-1 text-xs text-pitahaya-gray-500">
                      {editable ? "Editable" : "Cerrado"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="premium-panel rounded-2xl p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-base font-semibold text-white">Formulario de cierre</h4>
              <p className="text-xs text-pitahaya-gray-500">Fecha seleccionada: {formatReportDate(selectedDate)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${canEdit ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border border-amber-400/30 bg-amber-500/10 text-amber-200"}`}>
              {stateBadge}
            </span>
          </div>

          {unavailableMessage ? (
            <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
              {unavailableMessage}
            </div>
          ) : null}

          {loading ? (
            <p className="py-10 text-center text-pitahaya-gray-500">Cargando cierre de día...</p>
          ) : unavailableMessage ? (
            <p className="py-10 text-center text-pitahaya-gray-500">
              Esta funcionalidad se habilita en cuanto se ejecuten las migraciones pendientes en Supabase.
            </p>
          ) : !canEdit && !selectedReport ? (
            <p className="rounded-xl border border-dashed border-[#39065E]/35 px-4 py-10 text-center text-sm text-pitahaya-gray-500">
              No existe reporte histórico para esta fecha.
            </p>
          ) : !canEdit ? (
            <div className="space-y-4">
              <p className="text-sm text-pitahaya-gray-300">
                Este día ya está cerrado. Puedes ver el histórico, copiarlo o pedir autorización para corregirlo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" onClick={handleCopyText}>Copiar texto</Button>
                <Button size="sm" variant="secondary" onClick={handleDownloadImage}>Descargar imagen</Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedReport || Boolean(pendingRequest) || requestingPermission}
                  onClick={() => setRequestOpen(true)}
                >
                  {pendingRequest ? "Permiso solicitado" : "Solicitar permiso para editar"}
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setConfirmOpen(true);
              }}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              {FIELD_CONFIG.map((field) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-pitahaya-gray-300">{field.label}</label>
                  <input
                    type="number"
                    min={0}
                    value={form[field.key]}
                    onChange={(event) => handleFieldChange(field.key, event.target.value)}
                    className="w-full rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-3 text-white focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20"
                  />
                </div>
              ))}

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={handleCopyText}>Copiar texto</Button>
                <Button type="submit" disabled={saving}>{saving ? "Guardando..." : selectedReport ? "Guardar cambios" : "Enviar cierre de día"}</Button>
              </div>
            </form>
          )}
        </div>

        <div className="premium-panel rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-white">Vista previa</h4>
              <p className="text-xs text-pitahaya-gray-500">Texto e imagen listos para enviar</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleCopyText}>Copiar</Button>
              <Button size="sm" variant="secondary" onClick={handleDownloadImage}>Imagen</Button>
            </div>
          </div>

          <div id="advisor-daily-report-card" className="rounded-2xl border border-[#39065E]/35 bg-[#0D0916] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pitahaya-gray-500">Pitahaya Tracker</p>
            <h5 className="mt-2 text-lg font-bold text-white">Reporte de cierre de día</h5>
            <div className="mt-4 space-y-2 text-sm text-pitahaya-gray-300">
              <p><span className="font-semibold text-white">Asesor:</span> {advisorName || "Asesor"}</p>
              <p><span className="font-semibold text-white">Fecha:</span> {formatReportDate(selectedDate)}</p>
              {FIELD_CONFIG.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4 border-b border-[#39065E]/20 py-1.5 last:border-none">
                  <span>{field.label}</span>
                  <span className="font-semibold text-white">{previewReport[field.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={selectedReport ? "Confirmar actualización" : "Confirmar envío"}>
        <div className="space-y-4">
          <p className="text-sm text-pitahaya-gray-300">
            {selectedReport
              ? "Se guardarán los cambios del reporte seleccionado."
              : "Se guardará tu cierre de día. Podrás seguir editándolo hasta las 11:59 pm de hoy."}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                try {
                  await onSave(selectedDate, form, selectedReport?.id);
                  toast.success(selectedReport ? "Reporte actualizado" : "Cierre de día enviado correctamente");
                  setConfirmOpen(false);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo guardar el reporte");
                }
              }}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="Solicitar permiso para editar">
        <div className="space-y-4">
          <p className="text-sm text-pitahaya-gray-300">
            Explica brevemente por qué necesitas modificar este cierre histórico. La gerencia deberá aprobarlo.
          </p>
          <textarea
            rows={4}
            value={requestReason}
            onChange={(event) => setRequestReason(event.target.value)}
            className="w-full rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-3 text-white focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20"
            placeholder="Motivo de la corrección"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRequestOpen(false)}>Cancelar</Button>
            <Button
              disabled={!selectedReport || !requestReason.trim() || requestingPermission}
              onClick={async () => {
                if (!selectedReport) return;
                try {
                  await onRequestPermission(selectedReport, requestReason.trim());
                  toast.success("Solicitud enviada a gerencia");
                  setRequestOpen(false);
                  setRequestReason("");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo enviar la solicitud");
                }
              }}
            >
              {requestingPermission ? "Enviando..." : "Solicitar permiso"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
