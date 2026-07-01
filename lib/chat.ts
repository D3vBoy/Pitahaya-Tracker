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

export interface TeamMessageLiteRow {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  is_global: boolean;
  created_at: string;
}

export type ChatUnreadKey = "general" | `direct:${string}`;

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

export function getGlobalConversationKey(): ChatUnreadKey {
  return "general";
}

export function getDirectConversationKey(peerUserId: string): ChatUnreadKey {
  return `direct:${peerUserId}`;
}

export function getUnreadConversationKeyFromReadRow(readRow: Pick<TeamMessageReadRow, "conversation_type" | "peer_user_id">) {
  return readRow.conversation_type === "global"
    ? getGlobalConversationKey()
    : getDirectConversationKey(readRow.peer_user_id || "");
}

export function getUnreadConversationKeyFromMessage(message: Pick<TeamMessageLiteRow, "sender_id" | "recipient_id" | "is_global">, currentUserId: string) {
  if (message.is_global) return getGlobalConversationKey();
  const peerUserId = message.sender_id === currentUserId ? message.recipient_id : message.sender_id;
  return peerUserId ? getDirectConversationKey(peerUserId) : null;
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
