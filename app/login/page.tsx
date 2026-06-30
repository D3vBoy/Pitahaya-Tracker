"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { FiUser, FiLock, FiLogIn } from "react-icons/fi";

const cardMotion = {
  initial: { opacity: 0, scale: 0.96, y: 26 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientSupabase();

  // ⚠️ LÓGICA SIN CAMBIOS — idéntica al original
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else {
        toast.success("¡Bienvenido de vuelta!");
        router.push("/");
        router.refresh();
      }
    } catch {
      toast.error("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0612] p-4">
      <motion.div
        aria-hidden
        animate={{ x: [0, 16, 0], y: [0, -10, 0] }}
        transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-24 top-[12%] h-72 w-72 rounded-full bg-[#F38D62]/18 blur-[115px]"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, -14, 0], y: [0, 12, 0] }}
        transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-24 bottom-[10%] h-80 w-80 rounded-full bg-[#B828E8]/20 blur-[130px]"
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 62% at 50% 0%, rgba(57,6,94,0.6) 0%, rgba(10,6,18,0) 62%), radial-gradient(ellipse 62% 54% at 100% 100%, rgba(207,55,144,0.16) 0%, rgba(10,6,18,0) 62%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #CF3790 0px, transparent 1px, transparent 90px), repeating-linear-gradient(25deg, #F38D62 0px, transparent 1px, transparent 140px)",
        }}
      />

      <motion.div
        {...cardMotion}
        className="relative w-full max-w-md"
      >
        <div className="absolute -top-px left-6 right-6 h-px bg-linear-to-r from-transparent via-pitahaya-accent to-pitahaya-coral" />
        <div className="pointer-events-none absolute -inset-px rounded-3xl border border-white/5" />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative rounded-3xl border border-pitahaya-accent/15 bg-pitahaya-dark/72 px-8 py-10 backdrop-blur-xl shadow-[0_28px_80px_-20px_rgba(207,55,144,0.34)] sm:px-10"
        >
          <motion.div variants={itemIn} className="mb-10 text-center">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-pitahaya-accent to-pitahaya-accent-light shadow-[0_8px_24px_-6px_rgba(207,55,144,0.5)]">
              <span className="font-orbitron text-2xl text-white">P</span>
            </div>
            <h1 className="font-orbitron text-2xl sm:text-3xl font-bold tracking-wide bg-linear-to-r from-white to-pitahaya-gray-300 bg-clip-text text-transparent">
              PITAHAYA
            </h1>
            <p className="text-pitahaya-gray-300 text-sm mt-2">
              Inicia sesión en tu panel de seguimiento
            </p>
          </motion.div>

          <motion.form variants={staggerContainer} onSubmit={handleLogin} className="space-y-5">
            <motion.div variants={itemIn} className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-pitahaya-gray-500 text-lg" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-pitahaya-accent/18 bg-black/30 py-3.5 pl-12 pr-4 text-white placeholder-pitahaya-gray-500 transition-all focus:border-pitahaya-accent focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-pitahaya-accent/10"
              />
            </motion.div>
            <motion.div variants={itemIn} className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-pitahaya-gray-500 text-lg" />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-pitahaya-accent/18 bg-black/30 py-3.5 pl-12 pr-4 text-white placeholder-pitahaya-gray-500 transition-all focus:border-pitahaya-accent focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-pitahaya-accent/10"
              />
            </motion.div>

            <motion.button
              variants={itemIn}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-pitahaya-accent to-pitahaya-accent-light text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_8px_24px_-6px_rgba(207,55,144,0.45)] hover:shadow-[0_8px_28px_-4px_rgba(207,55,144,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="animate-pulse">Verificando...</span>
              ) : (
                <>
                  <FiLogIn /> Ingresar
                </>
              )}
            </motion.button>
          </motion.form>

          <motion.p variants={itemIn} className="mt-8 text-center text-xs tracking-wide text-pitahaya-gray-500">
            Acceso exclusivo para el equipo de Pitahaya Investments
          </motion.p>
        </motion.div>
      </motion.div>
    </main>
  );
} 