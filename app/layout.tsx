import type { Metadata, Viewport } from "next";
import { Manrope, Orbitron } from "next/font/google";
import PWARegister from "@/components/providers/PWARegister";
import PWAInstallPrompt from "@/components/providers/PWAInstallPrompt";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pitahaya Tracker",
  description: "Control de Prospeccion Comercial",
  applicationName: "Pitahaya Tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pitahaya Tracker",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#CF3790",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className={`${bodyFont.variable} ${displayFont.variable} text-white`}>
        <PWARegister />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  );
}
