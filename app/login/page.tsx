"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { FiUser, FiLock, FiLogIn } from "react-icons/fi";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientSupabase();

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
    } catch (err) {
      toast.error("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-linear-to-br dark:from-pitahaya-black dark:via-pitahaya-dark dark:to-pitahaya-black p-4 transition-colors">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass w-full max-w-md rounded-2xl p-8 shadow-neumorph"
      >
        <div className="text-center mb-8">
          <h1 className="font-orbitron text-3xl font-bold text-pitahaya-accent-light mb-2">
            PITAHAYA
          </h1>
          <p className="text-pitahaya-gray-300 text-sm">
            Inicia sesión en tu panel de seguimiento
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-pitahaya-gray-500" />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder-pitahaya-gray-500 focus:outline-none focus:border-pitahaya-accent transition-all"
            />
          </div>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-pitahaya-gray-500" />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder-pitahaya-gray-500 focus:outline-none focus:border-pitahaya-accent transition-all"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 16px rgba(255,45,120,0.6)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-pitahaya-accent to-pitahaya-accent-light text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Verificando...</span>
            ) : (
              <>
                <FiLogIn /> Ingresar
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-6 text-xs text-center text-gray-400 dark:text-pitahaya-gray-500">
          Acceso exclusivo para el equipo de Pitahaya Investments
        </p>
      </motion.div>
    </main>
  );
}