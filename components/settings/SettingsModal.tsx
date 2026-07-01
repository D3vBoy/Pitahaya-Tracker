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
        className="theme-card inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-pitahaya-cerise/50"
      >
        <FiSettings size={16} />
        <span className="hidden md:inline">Configuracion</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Configuracion">
        <div className="space-y-6">
          <section className="theme-card rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-[0_10px_28px_rgba(207,55,144,0.22)]">
                <FiSettings size={20} />
              </div>
              <div>
                <p className="theme-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">Preferencias</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Tema visual</h3>
                <p className="theme-muted mt-2 text-sm">Elige una experiencia clara, oscura o alineada con el sistema. El tema claro ahora usa una base perla con grafito suave y acentos borgona para verse premium y profesional.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { value: "light", label: "Claro", hint: "Perla y borgona", icon: <FiSun size={18} /> },
                { value: "dark", label: "Oscuro", hint: "Nocturno premium", icon: <FiMoon size={18} /> },
                { value: "system", label: "Sistema", hint: "Automatico", icon: <FiMonitor size={18} /> },
              ].map((option) => {
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                    data-active={active}
                    className="theme-segment rounded-2xl px-4 py-4 text-left transition-all"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pitahaya-cerise/12 text-pitahaya-cerise">
                        {option.icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="theme-soft-text text-xs">{option.hint}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="h-2 rounded-full bg-[#EEF2F7]" />
                      <span className="h-2 rounded-full bg-[#8F2E5C]" />
                      <span className="h-2 rounded-full bg-[#C46A46]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="theme-card rounded-3xl p-5 sm:p-6">
            <div className="mb-5">
              <p className="theme-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">Seguridad</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Actualizar contraseña</h3>
              <p className="theme-muted mt-2 text-sm">Cambia tu contraseña para que cada persona conserve su acceso propio y el panel permanezca protegido.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="theme-muted text-sm font-medium">Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 8 caracteres"
                  className="theme-input w-full rounded-2xl px-4 py-3 outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="theme-muted text-sm font-medium">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="theme-input w-full rounded-2xl px-4 py-3 outline-none transition-all"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={handlePasswordChange} disabled={savingPassword} className="px-6">
                {savingPassword ? "Guardando..." : "Actualizar contraseña"}
              </Button>
            </div>
          </section>
        </div>
      </Modal>
    </>
  );
}
