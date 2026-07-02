export const STATUS_OPTIONS = [
  "Información y propuesta enviadas. Pendiente de respuesta.",
  "Buscando segundo contacto (llamada o videollamada).",
  "Inversionista analizando la propuesta.",
  "Segunda sesión realizada. Pendiente de decisión.",
  "Sin respuesta a llamadas y mensajes.",
  "Inversionista incontactable.",
  "Seguimiento solicitado para fecha específica.",
  "Apartado pendiente.",
  "Apartado realizado. Integrando documentación.",
  "Contrato en revisión.",
  "Pendiente de firma de contrato.",
  "Enganche realizado.",
  "Venta formalizada.",
  "Venta pausada. (Observaciones)",
  "Venta caída. Motivo en observaciones.",
] as const;

export const VENTA_FINANCING_OPTIONS = ["36_meses", "24_meses", "contado", "otro"] as const;

export type VentaFinancingOption = (typeof VENTA_FINANCING_OPTIONS)[number];

export const NOT_AVAILABLE_LABEL = "N/A";

export function displayValue(value?: string | number | null): string {
  if (value === null || value === undefined) return NOT_AVAILABLE_LABEL;
  if (typeof value === "string" && value.trim() === "") return NOT_AVAILABLE_LABEL;
  return String(value);
}

export function isAllowedStatus(value: string): boolean {
  return (STATUS_OPTIONS as readonly string[]).includes(value);
}

export function isClosedWonStatus(status: string | null | undefined): boolean {
  return (status || "").trim() === "Venta formalizada.";
}

export function isClosedLostStatus(status: string | null | undefined): boolean {
  return (status || "").trim() === "Venta caída. Motivo en observaciones.";
}

export function isClosedStatus(status: string | null | undefined): boolean {
  return isClosedWonStatus(status) || isClosedLostStatus(status);
}

export function isActiveStatus(status: string | null | undefined): boolean {
  return !isClosedStatus(status);
}

const APARTADO_HISTORY_STATUSES = new Set<string>([
  "Apartado realizado. Integrando documentación.",
  "Contrato en revisión.",
  "Pendiente de firma de contrato.",
  "Enganche realizado.",
  "Venta formalizada.",
  "Venta pausada. (Observaciones)",
  "Venta caída. Motivo en observaciones.",
]);

export function hasApartadoHistory(input: {
  apartado_realizado?: boolean | null;
  estatus_general?: string | null;
  fecha_apartado?: string | null;
  fecha_enganche?: string | null;
  firma_pcv?: string | null;
}): boolean {
  const status = (input.estatus_general || "").trim();

  return Boolean(
    input.apartado_realizado ||
    input.fecha_apartado ||
    input.fecha_enganche ||
    input.firma_pcv ||
    APARTADO_HISTORY_STATUSES.has(status)
  );
}

export function hasMissingRequiredProspectFields(input: {
  nombre_cliente?: string | null;
  fecha_primer_contacto?: string | null;
  estatus_general?: string | null;
}): boolean {
  const name = (input.nombre_cliente || "").trim();
  const firstContact = (input.fecha_primer_contacto || "").trim();
  const status = (input.estatus_general || "").trim();

  return !name || !firstContact || !isAllowedStatus(status);
}

export function isProspectInSalesProcess(input: {
  estatus_general?: string | null;
  apartado_realizado?: boolean | null;
  fecha_apartado?: string | null;
  fecha_enganche?: string | null;
  firma_pcv?: string | null;
}): boolean {
  return hasApartadoHistory(input);
}

export function isProspectInSeguimiento(input: {
  estatus_general?: string | null;
  apartado_realizado?: boolean | null;
  fecha_apartado?: string | null;
  fecha_enganche?: string | null;
  firma_pcv?: string | null;
}): boolean {
  return isActiveStatus(input.estatus_general) && !isProspectInSalesProcess(input);
}

export function isDateInPreset(
  value: string | null | undefined,
  preset: "today" | "this_week" | "this_month" | "previous_months"
): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (preset === "today") {
    return target.getTime() === today.getTime();
  }

  if (preset === "this_week") {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return target >= weekStart && target <= weekEnd;
  }

  if (preset === "this_month") {
    return target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth();
  }

  return target < new Date(today.getFullYear(), today.getMonth(), 1);
}

export function getProspectReferenceDate(input: {
  proximo_seguimiento?: string | null;
  fecha_apartado?: string | null;
  fecha_primer_contacto?: string | null;
  fecha_cierre?: string | null;
}): string | null {
  return input.proximo_seguimiento || input.fecha_apartado || input.fecha_cierre || input.fecha_primer_contacto || null;
}

export function getPipelineBreakdownTotals<T extends {
  monto_total?: number | null;
  metros_cuadrados_tentativos?: number | null;
  metraje_exacto?: number | null;
  estatus_general?: string | null;
  apartado_realizado?: boolean | null;
  fecha_apartado?: string | null;
  fecha_enganche?: string | null;
  firma_pcv?: string | null;
}> (prospects: T[]) {
  const result = {
    cerradoMonto: 0,
    cerradoM2: 0,
    procesoMonto: 0,
    procesoM2: 0,
    tentativoMonto: 0,
    tentativoM2: 0,
  };

  prospects.forEach((prospect) => {
    const monto = prospect.monto_total || 0;
    const m2Tentativo = prospect.metros_cuadrados_tentativos || 0;
    const m2Exacto = prospect.metraje_exacto || 0;

    if (isClosedWonStatus(prospect.estatus_general)) {
      result.cerradoMonto += monto;
      result.cerradoM2 += m2Exacto || m2Tentativo;
      return;
    }

    if (isProspectInSalesProcess(prospect)) {
      result.procesoMonto += monto;
      result.procesoM2 += m2Exacto || m2Tentativo;
      return;
    }

    result.tentativoMonto += monto;
    result.tentativoM2 += m2Tentativo || m2Exacto;
  });

  return result;
}