"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { createClientSupabase } from "@/lib/supabase/client";

export default function TeamNotificationsProvider() {
  useEffect(() => {
    const supabase = createClientSupabase();
    let active = true;
    let currentUserId = "";

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      currentUserId = data.user.id;

      const channel = supabase
        .channel(`team-messages-${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "team_messages" },
          (payload) => {
            const message = payload.new as {
              sender_id: string;
              recipient_id: string | null;
              is_global: boolean;
              body: string;
            };

            if (message.sender_id === currentUserId) return;
            if (!message.is_global && message.recipient_id !== currentUserId) return;

            const title = message.is_global ? "Nuevo mensaje en chat general" : "Nuevo mensaje directo";
            toast(title, { icon: "💬" });

            if (typeof window !== "undefined" && "Notification" in window) {
              if (Notification.permission === "granted") {
                new Notification(title, { body: message.body.slice(0, 120) });
              }
            }
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
  }, []);

  return null;
}
