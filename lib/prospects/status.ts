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