import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "Pitahaya Tracker",
  description: "Seguimiento de ventas de Pitahaya Investments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${inter.variable} ${orbitron.variable} bg-pitahaya-light-bg dark:bg-pitahaya-black text-pitahaya-light-text dark:text-white font-sans transition-colors duration-300`}
      >
        <ThemeProvider>
          <Toaster position="top-right" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}