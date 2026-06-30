"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { FiX } from "react-icons/fi";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence mode="wait">
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="absolute inset-0 bg-black/65 backdrop-blur-xl"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 22 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 22 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="relative w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-pitahaya-border bg-gradient-panel shadow-[0_30px_90px_rgba(10,6,18,0.55)]"
          >
            <div className="pointer-events-none absolute -left-16 -top-12 h-44 w-44 rounded-full bg-pitahaya-cerise/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-pitahaya-glowEnd/18 blur-3xl" />
            <div className="absolute left-6 right-6 top-0 h-px bg-linear-to-r from-transparent via-pitahaya-coral/70 to-transparent" />

            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 sm:px-8">
              <h2 className="bg-gradient-primary bg-clip-text text-xl font-bold text-transparent">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-pitahaya-gray-500 transition-all hover:scale-105 hover:bg-pitahaya-cerise/15 hover:text-white"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto px-6 py-6 sm:px-8 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}