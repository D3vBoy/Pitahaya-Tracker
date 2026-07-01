"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { FiMonitor, FiMoon, FiSettings, FiSun } from "react-icons/fi";
import { createClientSupabase } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function SettingsModal() {
  const supabase = createClientSupabase();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handlePasswordChange = async () => {
    if (password.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada correctamente");
      setPassword("");
      setConfirmPassword("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la contraseña");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-pitahaya-border bg-pitahaya-blackberry/70 px-3 py-2 text-sm font-medium text-pitahaya-gray-300 transition-all hover:border-pitahaya-cerise/50 hover:bg-pitahaya-cerise/10 hover:text-white"
      >
        <FiSettings size={16} />
        <span className="hidden md:inline">Configuracion</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Configuracion">
        <div className="space-y-8">
          <section className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white">Acceso</h3>
              <p className="text-sm text-pitahaya-gray-500">Cambia tu contraseña para que cada persona conserve su acceso propio.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-pitahaya-gray-300">Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-3 text-white focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-pitahaya-gray-300">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-3 text-white focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handlePasswordChange} disabled={savingPassword}>
                {savingPassword ? "Guardando..." : "Actualizar contraseña"}
              </Button>
            </div>
          </section>

          <section className="space-y-4 border-t border-white/5 pt-6">
            <div>
              <h3 className="text-base font-semibold text-white">Tema visual</h3>
              <p className="text-sm text-pitahaya-gray-500">Elige entre tema claro, oscuro o el mismo del sistema.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { value: "light", label: "Claro", icon: <FiSun size={18} /> },
                { value: "dark", label: "Oscuro", icon: <FiMoon size={18} /> },
                { value: "system", label: "Sistema", icon: <FiMonitor size={18} /> },
              ].map((option) => {
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                      active
                        ? "border-pitahaya-cerise bg-pitahaya-cerise/15 text-white"
                        : "border-pitahaya-border bg-pitahaya-surface text-pitahaya-gray-300 hover:border-pitahaya-cerise/40"
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </Modal>
    </>
  );
}
