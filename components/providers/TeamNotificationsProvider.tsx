"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createClientSupabase } from "@/lib/supabase/client";
import {
  ChatUnreadKey,
  getDirectConversationKey,
  getGlobalConversationKey,
  getUnreadConversationKeyFromMessage,
  getUnreadConversationKeyFromReadRow,
  isManagementChatRole,
  TeamMessageLiteRow,
  TeamMessageReadRow,
} from "@/lib/chat";

interface TeamNotificationsContextValue {
  totalUnreadCount: number;
  unreadByConversation: Partial<Record<ChatUnreadKey, number>>;
  markConversationRead: (conversation: { type: "general" } | { type: "direct"; peerUserId: string }) => Promise<void>;
}

const TeamNotificationsContext = createContext<TeamNotificationsContextValue>({
  totalUnreadCount: 0,
  unreadByConversation: {},
  markConversationRead: async () => {},
});

export function useTeamNotifications() {
  return useContext(TeamNotificationsContext);
}

export default function TeamNotificationsProvider({ children }: { children?: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState("");
  const [unreadByConversation, setUnreadByConversation] = useState<Partial<Record<ChatUnreadKey, number>>>({});

  const supabase = useMemo(() => createClientSupabase(), []);

  const playNotificationTone = useCallback(() => {
    if (typeof window === "undefined") return;
    const audioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioContextConstructor) return;

    try {
      const ctx = new audioContextConstructor();
      const gain = ctx.createGain();
      gain.gain.value = 0.04;
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      const makeBeep = (offset: number, frequency: number) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = frequency;
        osc.connect(gain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      };

      makeBeep(0, 880);
      makeBeep(0.2, 990);

      window.setTimeout(() => {
        void ctx.close();
      }, 700);
    } catch {
      // Audio is best-effort and may be blocked until user interaction.
    }
  }, []);

  const showBrowserNotification = useCallback(async (title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          tag: "pitahaya-chat-live",
          renotify: true,
          icon: "/api/pwa-icon/192",
          badge: "/api/pwa-icon/192",
          vibrate: [180, 80, 180],
          data: { url: window.location.pathname },
        });
        return;
      }

      new Notification(title, { body });
    } catch {
      // Fallback to toast only if Notification API fails.
    }
  }, []);

  const markConversationRead = useCallback(async (conversation: { type: "general" } | { type: "direct"; peerUserId: string }) => {
    if (!currentUserId) return;

    const key = conversation.type === "general"
      ? getGlobalConversationKey()
      : getDirectConversationKey(conversation.peerUserId);

    setUnreadByConversation((prev) => ({ ...prev, [key]: 0 }));

    await supabase.from("team_message_reads").upsert({
      user_id: currentUserId,
      conversation_type: conversation.type === "general" ? "global" : "direct",
      peer_user_id: conversation.type === "general" ? null : conversation.peerUserId,
      last_read_at: new Date().toISOString(),
    }, { onConflict: "user_id,conversation_type,peer_user_id" });
  }, [currentUserId, supabase]);

  useEffect(() => {
    let active = true;

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      const userId = data.user.id;
      setCurrentUserId(userId);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      const managerRole = isManagementChatRole(profile?.role);
      if (!active) return;

      const [messagesResponse, readsResponse] = await Promise.all([
        managerRole
          ? supabase
              .from("team_messages")
              .select("id, sender_id, recipient_id, is_global, created_at")
              .order("created_at", { ascending: false })
              .limit(500)
          : supabase
              .from("team_messages")
              .select("id, sender_id, recipient_id, is_global, created_at")
              .or(`is_global.eq.true,and(is_global.eq.false,sender_id.eq.${userId}),and(is_global.eq.false,recipient_id.eq.${userId})`)
              .order("created_at", { ascending: false })
              .limit(500),
        supabase.from("team_message_reads").select("id, user_id, conversation_type, peer_user_id, last_read_at").eq("user_id", userId),
      ]);

      if (!active) return;

      const readMap = new Map<string, string>();
      ((readsResponse.data || []) as TeamMessageReadRow[]).forEach((readRow) => {
        readMap.set(getUnreadConversationKeyFromReadRow(readRow), readRow.last_read_at);
      });

      const nextUnread: Partial<Record<ChatUnreadKey, number>> = {};
      ((messagesResponse.data || []) as TeamMessageLiteRow[])
        .slice()
        .reverse()
        .forEach((message) => {
          const touchesCurrentUser = message.is_global || message.sender_id === userId || message.recipient_id === userId;
          if (!touchesCurrentUser) return;
          if (message.sender_id === userId) return;

          const key = getUnreadConversationKeyFromMessage(message, userId);
          if (!key) return;

          const lastReadAt = readMap.get(key);
          if (lastReadAt && new Date(message.created_at).getTime() <= new Date(lastReadAt).getTime()) {
            return;
          }

          nextUnread[key] = (nextUnread[key] || 0) + 1;
        });

      setUnreadByConversation(nextUnread);

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }

      const channel = supabase
        .channel(`team-messages-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "team_messages" },
          (payload) => {
            const message = payload.new as TeamMessageLiteRow & { body: string };

            const touchesCurrentUser = message.is_global || message.sender_id === userId || message.recipient_id === userId;
            if (!touchesCurrentUser) return;
            if (message.sender_id === userId) return;

            const unreadKey = getUnreadConversationKeyFromMessage(message, userId);
            if (unreadKey) {
              setUnreadByConversation((prev) => ({
                ...prev,
                [unreadKey]: (prev[unreadKey] || 0) + 1,
              }));
            }

            const title = message.is_global ? "Nuevo mensaje en chat general" : "Nuevo mensaje directo";
            toast(title, { icon: "💬" });
            playNotificationTone();
            void showBrowserNotification(title, message.body.slice(0, 120));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;
    void setup().then((fn) => {
      cleanup = fn;
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [playNotificationTone, showBrowserNotification, supabase]);

  const totalUnreadCount = useMemo(
    () => Object.values(unreadByConversation).reduce<number>((acc, count) => acc + (count || 0), 0),
    [unreadByConversation]
  );

  return (
    <TeamNotificationsContext.Provider value={{ totalUnreadCount, unreadByConversation, markConversationRead }}>
      {children ?? null}
    </TeamNotificationsContext.Provider>
  );
}
