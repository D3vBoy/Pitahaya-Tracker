"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createClientSupabase } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { useTeamNotifications } from "@/components/providers/TeamNotificationsProvider";
import {
  CHAT_SETUP_MESSAGE,
  getDirectConversationKey,
  getGlobalConversationKey,
  isAdvisorChatRole,
  isManagementChatRole,
  isMissingChatRelationError,
  normalizeChatRole,
  TeamMessageRow,
} from "@/lib/chat";

interface TeamMember {
  id: string;
  full_name: string | null;
  role?: string | null;
}

interface Props {
  currentUserId: string;
  currentUserName: string;
  role: "asesor" | "gerenta";
  advisors?: TeamMember[];
  managers?: TeamMember[];
  teamMembers?: TeamMember[];
  directoryHint?: string;
}

type Conversation =
  | { type: "general"; label: string }
  | { type: "direct"; label: string; peerId: string }
  | { type: "observed"; label: string; participantIds: [string, string] };

interface TeamMessageParticipantRow {
  sender_id: string;
  recipient_id: string | null;
  sender_profile?: Array<{ full_name: string | null; role?: string | null }> | null;
  recipient_profile?: Array<{ full_name: string | null; role?: string | null }> | null;
}

const GENERIC_CHAT_LABELS = new Set(["asesor", "gerencia", "integrante 1", "integrante 2", "equipo"]);

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function mergeMembers(members: TeamMember[]) {
  const seen = new Map<string, TeamMember>();

  members.forEach((member) => {
    if (!member.id) return;
    const previous = seen.get(member.id);
    const nextName = pickPreferredMemberName(previous?.full_name || null, member.full_name || null);
    seen.set(member.id, {
      id: member.id,
      full_name: nextName,
      role: member.role || previous?.role || null,
    });
  });

  return Array.from(seen.values()).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "es-MX"));
}

function appendUniqueMessage(previous: TeamMessageRow[], nextMessage: TeamMessageRow) {
  if (previous.some((message) => message.id === nextMessage.id)) {
    return previous;
  }

  return [...previous, nextMessage];
}

function sortPairIds(firstId: string, secondId: string): [string, string] {
  return firstId < secondId ? [firstId, secondId] : [secondId, firstId];
}

function getConversationKey(conversation: Conversation) {
  if (conversation.type === "general") return "general";
  if (conversation.type === "direct") return `direct:${conversation.peerId}`;
  return `observed:${conversation.participantIds[0]}:${conversation.participantIds[1]}`;
}

function getFirstProfile(profile: TeamMessageParticipantRow["sender_profile"] | TeamMessageParticipantRow["recipient_profile"]) {
  return Array.isArray(profile) ? (profile[0] ?? null) : null;
}

function normalizeMemberName(value: string | null | undefined) {
  return (value || "").trim();
}

function isGenericMemberName(value: string | null | undefined) {
  const normalized = normalizeMemberName(value).toLowerCase();
  return normalized.length === 0 || GENERIC_CHAT_LABELS.has(normalized);
}

function pickPreferredMemberName(currentName: string | null, nextName: string | null) {
  const current = normalizeMemberName(currentName);
  const next = normalizeMemberName(nextName);

  if (!current) return next || null;
  if (!next) return current;
  if (isGenericMemberName(current) && !isGenericMemberName(next)) return next;
  if (!isGenericMemberName(current) && isGenericMemberName(next)) return current;
  return current;
}

function getShortUserIdLabel(userId: string) {
  return `Usuario ${userId.slice(0, 8)}`;
}

export default function TeamChatPanel({
  currentUserId,
  currentUserName,
  role,
  advisors = [],
  managers = [],
  teamMembers = [],
  directoryHint = "",
}: Props) {
  const supabase = createClientSupabase();
  const { unreadByConversation, markConversationRead } = useTeamNotifications();
  const [messages, setMessages] = useState<TeamMessageRow[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatAvailable, setChatAvailable] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const [historyMembers, setHistoryMembers] = useState<TeamMember[]>([]);
  const [observedConversations, setObservedConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation>({ type: "general", label: "Chat general" });

  const knownMembersById = useMemo(() => {
    const members = mergeMembers([...teamMembers, ...advisors, ...managers, ...historyMembers]);
    return new Map(members.map((member) => [member.id, member]));
  }, [advisors, historyMembers, managers, teamMembers]);

  const directMembers = useMemo(() => {
    const baseMembers = teamMembers.length > 0
      ? teamMembers.filter((member) => member.id !== currentUserId)
      : role === "gerenta"
        ? advisors
        : managers;
    const relevantHistoryMembers = historyMembers.filter((member) => {
      if (teamMembers.length > 0) {
        return member.id !== currentUserId;
      }

      if (role === "gerenta") {
        return normalizeChatRole(member.role) === "asesor" || !member.role;
      }

      return isManagementChatRole(member.role) || !member.role;
    });

    return mergeMembers([...baseMembers, ...relevantHistoryMembers]);
  }, [advisors, currentUserId, historyMembers, managers, role, teamMembers]);

  const channels = useMemo<Conversation[]>(() => {
    const directs = directMembers.map((member) => ({
      type: "direct" as const,
      peerId: member.id,
      label: member.full_name || (isAdvisorChatRole(member.role) ? "Asesor" : "Gerencia"),
    }));

    return [{ type: "general", label: "Chat general" }, ...directs, ...observedConversations];
  }, [directMembers, observedConversations]);

  useEffect(() => {
    if (selectedConversation.type === "direct") {
      const exists = directMembers.some((member) => member.id === selectedConversation.peerId);
      if (!exists && channels.length > 0) {
        const timer = window.setTimeout(() => {
          setSelectedConversation(channels[0]);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }
    if (selectedConversation.type === "observed") {
      const exists = observedConversations.some((conversation) =>
        conversation.type === "observed" &&
        conversation.participantIds[0] === selectedConversation.participantIds[0] &&
        conversation.participantIds[1] === selectedConversation.participantIds[1]
      );
      if (!exists && channels.length > 0) {
        const timer = window.setTimeout(() => {
          setSelectedConversation(channels[0]);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }
  }, [channels, directMembers, observedConversations, selectedConversation]);

  useEffect(() => {
    if (!currentUserId) return;

    let active = true;

    const fetchMessages = async () => {
      setLoading(true);
      let response;

      if (selectedConversation.type === "general") {
        response = await supabase
          .from("team_messages")
          .select("*, sender_profile:profiles!team_messages_sender_id_fkey(full_name, role)")
          .eq("is_global", true)
          .order("created_at", { ascending: true });
      } else if (selectedConversation.type === "observed") {
        response = await supabase
          .from("team_messages")
          .select("*, sender_profile:profiles!team_messages_sender_id_fkey(full_name, role)")
          .eq("is_global", false)
          .or(`and(sender_id.eq.${selectedConversation.participantIds[0]},recipient_id.eq.${selectedConversation.participantIds[1]}),and(sender_id.eq.${selectedConversation.participantIds[1]},recipient_id.eq.${selectedConversation.participantIds[0]})`)
          .order("created_at", { ascending: true });
      } else {
        response = await supabase
          .from("team_messages")
          .select("*, sender_profile:profiles!team_messages_sender_id_fkey(full_name, role)")
          .eq("is_global", false)
          .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${selectedConversation.peerId}),and(sender_id.eq.${selectedConversation.peerId},recipient_id.eq.${currentUserId})`)
          .order("created_at", { ascending: true });
      }

      if (!active) return;

      if (isMissingChatRelationError(response.error)) {
        setChatAvailable(false);
        setChatMessage(CHAT_SETUP_MESSAGE);
        setMessages([]);
        setLoading(false);
        return;
      }

      if (response.error) {
        toast.error(response.error.message);
        setMessages([]);
      } else {
        setChatAvailable(true);
        setChatMessage("");
        setMessages((response.data || []) as TeamMessageRow[]);
      }
      setLoading(false);
    };

    void fetchMessages();

    return () => {
      active = false;
    };
  }, [currentUserId, selectedConversation, supabase]);

  useEffect(() => {
    if (!currentUserId || !chatAvailable) return;

    let active = true;

    const fetchHistoryMembers = async () => {
      const response = role === "gerenta"
        ? await supabase
            .from("team_messages")
            .select("sender_id, recipient_id, sender_profile:profiles!team_messages_sender_id_fkey(full_name, role), recipient_profile:profiles!team_messages_recipient_id_fkey(full_name, role)")
            .eq("is_global", false)
            .order("created_at", { ascending: false })
            .limit(300)
        : await supabase
            .from("team_messages")
            .select("sender_id, recipient_id, sender_profile:profiles!team_messages_sender_id_fkey(full_name, role), recipient_profile:profiles!team_messages_recipient_id_fkey(full_name, role)")
            .eq("is_global", false)
            .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
            .order("created_at", { ascending: false })
            .limit(100);

      if (!active) return;

      if (isMissingChatRelationError(response.error)) {
        setChatAvailable(false);
        setChatMessage(CHAT_SETUP_MESSAGE);
        setHistoryMembers([]);
        return;
      }

      if (response.error) {
        setHistoryMembers([]);
        return;
      }

      const peers = ((response.data || []) as TeamMessageParticipantRow[]).flatMap((row) => {
        const senderProfile = getFirstProfile(row.sender_profile);
        const recipientProfile = getFirstProfile(row.recipient_profile);

        if (row.sender_id === currentUserId && row.recipient_id) {
          return [{
            id: row.recipient_id,
            full_name: pickPreferredMemberName(
              knownMembersById.get(row.recipient_id)?.full_name || null,
              recipientProfile?.full_name || (role === "gerenta" ? "Asesor" : "Gerencia")
            ),
            role: recipientProfile?.role || null,
          }];
        }

        if (row.recipient_id === currentUserId) {
          return [{
            id: row.sender_id,
            full_name: pickPreferredMemberName(
              knownMembersById.get(row.sender_id)?.full_name || null,
              senderProfile?.full_name || (role === "gerenta" ? "Asesor" : "Gerencia")
            ),
            role: senderProfile?.role || null,
          }];
        }

        return [];
      });

      setHistoryMembers(mergeMembers(peers));

      if (role === "gerenta") {
        const observed = new Map<string, Conversation>();

        ((response.data || []) as TeamMessageParticipantRow[]).forEach((row) => {
          if (!row.recipient_id) return;
          if (row.sender_id === currentUserId || row.recipient_id === currentUserId) return;

          const participantIds = sortPairIds(row.sender_id, row.recipient_id);
          const key = participantIds.join(":");
          if (observed.has(key)) return;

          const senderProfile = getFirstProfile(row.sender_profile);
          const recipientProfile = getFirstProfile(row.recipient_profile);
          const first = participantIds[0] === row.sender_id ? senderProfile : recipientProfile;
          const second = participantIds[1] === row.recipient_id ? recipientProfile : senderProfile;
          const firstLabel = pickPreferredMemberName(
            knownMembersById.get(participantIds[0])?.full_name || null,
            first?.full_name || getShortUserIdLabel(participantIds[0])
          ) || getShortUserIdLabel(participantIds[0]);
          const secondLabel = pickPreferredMemberName(
            knownMembersById.get(participantIds[1])?.full_name || null,
            second?.full_name || getShortUserIdLabel(participantIds[1])
          ) || getShortUserIdLabel(participantIds[1]);

          observed.set(key, {
            type: "observed",
            participantIds,
            label: `Seguimiento: ${firstLabel} + ${secondLabel}`,
          });
        });

        setObservedConversations(Array.from(observed.values()));
      } else {
        setObservedConversations([]);
      }
    };

    void fetchHistoryMembers();

    return () => {
      active = false;
    };
  }, [chatAvailable, currentUserId, knownMembersById, role, supabase]);

  useEffect(() => {
    if (!chatAvailable || !currentUserId) return;

    const channel = supabase
      .channel(`chat-panel-${currentUserId}-${getConversationKey(selectedConversation)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages" },
        (payload) => {
          const incoming = payload.new as TeamMessageRow;
          const matchesConversation = selectedConversation.type === "general"
            ? incoming.is_global
            : selectedConversation.type === "observed"
              ? !incoming.is_global && incoming.recipient_id !== null && (() => {
                  const pair = sortPairIds(incoming.sender_id, incoming.recipient_id);
                  return pair[0] === selectedConversation.participantIds[0] && pair[1] === selectedConversation.participantIds[1];
                })()
            : !incoming.is_global &&
              ((incoming.sender_id === currentUserId && incoming.recipient_id === selectedConversation.peerId) ||
                (incoming.sender_id === selectedConversation.peerId && incoming.recipient_id === currentUserId));

          if (!matchesConversation) return;
          setMessages((prev) => appendUniqueMessage(prev, incoming));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatAvailable, currentUserId, selectedConversation, supabase]);

  useEffect(() => {
    if (!chatAvailable || !currentUserId) return;
    if (selectedConversation.type === "observed") return;

    void markConversationRead(
      selectedConversation.type === "general"
        ? { type: "general" }
        : { type: "direct", peerUserId: selectedConversation.peerId }
    );
  }, [chatAvailable, currentUserId, markConversationRead, selectedConversation]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    if (!chatAvailable) {
      toast.error(CHAT_SETUP_MESSAGE);
      return;
    }
    if (selectedConversation.type === "observed") {
      toast.error("Esta conversacion es solo de lectura para gerencia");
      return;
    }

    setSending(true);
    try {
      const payload: {
        sender_id: string;
        is_global: boolean;
        recipient_id: string | null;
        body: string;
      } = selectedConversation.type === "general"
        ? { sender_id: currentUserId, is_global: true, recipient_id: null, body: trimmed }
        : { sender_id: currentUserId, is_global: false, recipient_id: selectedConversation.peerId, body: trimmed };

      const { data, error } = await supabase
        .from("team_messages")
        .insert(payload)
        .select("*, sender_profile:profiles!team_messages_sender_id_fkey(full_name, role)")
        .single();

      if (isMissingChatRelationError(error)) {
        setChatAvailable(false);
        setChatMessage(CHAT_SETUP_MESSAGE);
        throw new Error(CHAT_SETUP_MESSAGE);
      }
      if (error) throw error;

      setMessages((prev) => appendUniqueMessage(prev, data as TeamMessageRow));
      if (selectedConversation.type === "direct") {
        setHistoryMembers((prev) => mergeMembers([
          ...prev,
          {
            id: selectedConversation.peerId,
            full_name: selectedConversation.label,
            role: role === "gerenta" ? "asesor" : "gerenta",
          },
        ]));
      }
      setBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="premium-panel rounded-2xl p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Mensajes</h3>
          <p className="text-sm text-pitahaya-gray-500">{role === "gerenta" ? "Chat general, mensajes directos y visibilidad de conversaciones del equipo" : "Chat general y mensajes directos con todo el equipo"}</p>
        </div>
        <div className="space-y-2">
          {channels.map((channel) => {
            const active = getConversationKey(channel) === getConversationKey(selectedConversation);
            const unreadCount = channel.type === "general"
              ? unreadByConversation[getGlobalConversationKey()] || 0
              : channel.type === "direct"
                ? unreadByConversation[getDirectConversationKey(channel.peerId)] || 0
                : 0;
            return (
              <button
                key={getConversationKey(channel)}
                type="button"
                onClick={() => setSelectedConversation(channel)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${active ? "border-[#CF3790]/55 bg-[#39065E]/18 text-white" : "border-[#39065E]/30 bg-[#100B1B]/45 text-pitahaya-gray-300 hover:bg-[#39065E]/12"}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate">{channel.label}</span>
                  {unreadCount > 0 ? (
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/18 text-white" : "bg-pitahaya-cerise/12 text-pitahaya-cerise"}`}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
          {directMembers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#39065E]/35 bg-[#100B1B]/35 px-4 py-3 text-xs text-pitahaya-gray-500">
              {role === "gerenta"
                ? "Aun no encontramos integrantes del equipo para chats directos."
                : "Aun no encontramos integrantes del equipo para chats directos. Si esto sigue igual, ejecuta la actualizacion SQL del directorio de chat."}
            </p>
          ) : null}
        </div>
      </aside>

      <section className="premium-panel flex min-h-155 flex-col rounded-2xl p-5">
        <div className="mb-4 border-b border-[#39065E]/30 pb-4">
          <h4 className="text-base font-semibold text-white">{selectedConversation.label}</h4>
          <p className="text-xs text-pitahaya-gray-500">Conectado como {currentUserName}</p>
        </div>

        {chatMessage ? (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            {chatMessage}
          </div>
        ) : null}

        {!chatMessage && directoryHint ? (
          <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {directoryHint}
          </div>
        ) : null}

        {selectedConversation.type === "observed" ? (
          <div className="mb-4 rounded-xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            Vista de supervision. Gerencia puede leer esta conversacion, pero no responder dentro de este hilo ajeno.
          </div>
        ) : null}

        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-2">
          {!currentUserId ? (
            <p className="py-10 text-center text-pitahaya-gray-500">Cargando chat...</p>
          ) : loading ? (
            <p className="py-10 text-center text-pitahaya-gray-500">Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-pitahaya-gray-500">Aun no hay mensajes en esta conversacion.</p>
          ) : (
            messages.map((message) => {
              const own = message.sender_id === currentUserId;
              return (
                <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl border px-4 py-3 ${own ? "border-[#CF3790]/30 bg-[#CF3790]/15 text-white" : "border-[#39065E]/35 bg-[#100B1B]/55 text-pitahaya-gray-200"}`}>
                    <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-pitahaya-gray-500">
                      {own ? "Tu" : message.sender_profile?.full_name || "Equipo"}
                    </p>
                    <p className="text-sm whitespace-pre-wrap wrap-break-word">{message.body}</p>
                    <p className="mt-2 text-right text-[11px] text-pitahaya-gray-500">{formatTime(message.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex gap-3 border-t border-[#39065E]/30 pt-4">
          <textarea
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={!chatAvailable || selectedConversation.type === "observed"}
            placeholder={selectedConversation.type === "general" ? "Escribe un mensaje para todo el equipo" : selectedConversation.type === "observed" ? "Vista solo lectura" : `Escribe un mensaje para ${selectedConversation.label}`}
            className="w-full rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-3 text-white focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20 disabled:opacity-60"
          />
          <div className="flex items-end">
            <Button onClick={handleSend} disabled={sending || !body.trim() || !chatAvailable || selectedConversation.type === "observed"}>
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
