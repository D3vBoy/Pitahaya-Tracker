"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!portalTarget || !open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, portalTarget]);

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <div className="fixed inset-0 z-120 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="absolute inset-0 backdrop-blur-xl"
            style={{ backgroundColor: "var(--app-overlay)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 22 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 22 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="modal-shell relative my-auto w-full max-w-3xl overflow-hidden rounded-[1.75rem]"
          >
            <div className="pointer-events-none absolute -left-16 -top-12 h-44 w-44 rounded-full bg-pitahaya-cerise/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-pitahaya-glowEnd/18 blur-3xl" />
            <div className="absolute left-6 right-6 top-0 h-px bg-linear-to-r from-transparent via-pitahaya-coral/70 to-transparent" />

            <div className="modal-divider flex items-center justify-between border-b px-6 py-5 sm:px-8">
              <h2 className="modal-title text-xl font-bold tracking-[0.01em]">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="theme-soft-text rounded-full p-2 transition-all hover:scale-105 hover:bg-pitahaya-cerise/12"
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
    </AnimatePresence>,
    portalTarget
  );
}