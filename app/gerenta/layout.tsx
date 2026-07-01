"use client";
import { useRouter } from "next/navigation";
import { createClientSupabase } from "@/lib/supabase/client";
import { FiLogOut } from "react-icons/fi";

export default function GerentaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClientSupabase();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.warn("No se pudo cerrar sesion global, se limpio la sesion local.", error.message);
    }
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <header className="sticky top-0 z-40 border-b border-pitahaya-border/60 bg-pitahaya-surface/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow-cerise">
              <span className="font-orbitron text-sm font-bold text-white">P</span>
            </div>
            <div>
              <h1 className="bg-gradient-primary bg-clip-text text-base leading-tight font-display font-semibold tracking-[0.2em] text-transparent">
                PITAHAYA TRACKER
              </h1>
              <p className="text-[11px] uppercase tracking-[0.28em] text-pitahaya-gray-500">Panel Directivo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-pitahaya-eggplant/50 bg-pitahaya-blackberry/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-pitahaya-gray-300 sm:inline-flex">
              Gerenta Maestro
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-pitahaya-border bg-pitahaya-blackberry/70 px-4 py-2 text-sm font-medium text-pitahaya-gray-300 transition-all hover:border-pitahaya-cerise/50 hover:bg-pitahaya-cerise/10 hover:text-white"
            >
              <FiLogOut size={16} />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}