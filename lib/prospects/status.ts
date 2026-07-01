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