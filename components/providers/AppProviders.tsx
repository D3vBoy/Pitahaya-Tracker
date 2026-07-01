"use client";

import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
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
