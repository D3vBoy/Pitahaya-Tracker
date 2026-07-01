"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

function ChunkRecovery() {
  useEffect(() => {
    const recover = () => {
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem("pitahaya-chunk-reload") === "1") return;
      window.sessionStorage.setItem("pitahaya-chunk-reload", "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const message = event.message || "";
      if (message.includes("ChunkLoadError") || message.includes("Failed to load chunk")) {
        recover();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason || "");
      if (message.includes("ChunkLoadError") || message.includes("Failed to load chunk")) {
        recover();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ChunkRecovery />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#120C1C",
            color: "#F3F4F6",
            border: "1px solid rgba(138,86,189,0.22)",
          },
        }}
      />
    </ThemeProvider>
  );
}
