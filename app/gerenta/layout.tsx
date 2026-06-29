"use client";
export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import { createClientSupabase } from "@/lib/supabase/client";
import { FiLogOut, FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function GerentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClientSupabase();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-pitahaya-light-bg dark:bg-pitahaya-black transition-colors">
      <header className="glass border-b border-pitahaya-yellow/10 px-6 py-3 flex items-center justify-between">
        <h1 className="font-orbitron text-xl bg-linear-to-r from-pitahaya-yellow to-pitahaya-accent bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,184,48,0.3)] dark:drop-shadow-[0_0_8px_rgba(255,184,48,0.5)]">
          PITAHAYA · Gerenta
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-pitahaya-accent/10 hover:bg-pitahaya-accent/20 transition-colors"
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {theme === "dark" ? (
              <FiSun className="text-pitahaya-yellow" />
            ) : (
              <FiMoon className="text-pitahaya-accent-light" />
            )}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-pitahaya-light-secondary dark:text-pitahaya-gray-300 hover:text-pitahaya-accent transition-colors text-sm"
          >
            <FiLogOut /> Cerrar sesión
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}