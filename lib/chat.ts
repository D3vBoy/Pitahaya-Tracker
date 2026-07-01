export interface TeamMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  is_global: boolean;
  body: string;
  created_at: string;
  sender_profile?: { full_name: string | null; role?: string | null } | null;
}

export interface TeamMessageReadRow {
  id: string;
  user_id: string;
  conversation_type: "global" | "direct";
  peer_user_id: string | null;
  last_read_at: string;
}

export const TEAM_MANAGER_ROLES = ["gerenta", "gerente", "manager", "admin", "direccion"] as const;
export const TEAM_CHAT_ROLES = ["asesor", ...TEAM_MANAGER_ROLES] as const;

export function normalizeChatRole(role: string | null | undefined) {
  return (role || "").trim().toLowerCase();
}

export function isAdvisorChatRole(role: string | null | undefined) {
  return normalizeChatRole(role) === "asesor";
}

export function isManagementChatRole(role: string | null | undefined) {
  return TEAM_MANAGER_ROLES.includes(normalizeChatRole(role) as (typeof TEAM_MANAGER_ROLES)[number]);
}

export function isTeamChatRole(role: string | null | undefined) {
  return TEAM_CHAT_ROLES.includes(normalizeChatRole(role) as (typeof TEAM_CHAT_ROLES)[number]);
}

export const CHAT_SETUP_MESSAGE = "El modulo de chat aun no esta disponible porque falta ejecutar la actualizacion SQL en Supabase.";

export function isMissingChatRelationError(error: { code?: string; message?: string | null } | null | undefined) {
  const message = (error?.message || "").toLowerCase();
  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("relation \"public.team_")
  );
}
