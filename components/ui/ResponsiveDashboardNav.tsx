"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

interface ResponsiveDashboardNavProps<T extends string> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  items: Array<{
    id: T;
    label: string;
    icon: React.ReactNode;
    badgeCount?: number;
  }>;
}

export default function ResponsiveDashboardNav<T extends string>({
  activeTab,
  setActiveTab,
  items,
}: ResponsiveDashboardNavProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeTab) || items[0],
    [activeTab, items]
  );

  return (
    <>
      <div className="hidden md:flex md:items-center md:justify-start">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="theme-surface-soft inline-flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold theme-text-primary shadow-glass transition-all hover:-translate-y-0.5"
        >
          <FiMenu size={18} />
          <span>Menu</span>
          {activeItem ? (
            <span className="theme-text-secondary hidden text-xs font-medium lg:inline">
              {activeItem.label}
            </span>
          ) : null}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-95 hidden bg-black/45 backdrop-blur-sm md:block"
            />
            <motion.aside
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-100 hidden w-[320px] border-r border-pitahaya-border bg-[#0D0816]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex md:flex-col"
            >
              <div className="mb-5 flex items-center justify-between border-b border-pitahaya-border/70 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pitahaya-gray-500">Navegacion</p>
                  <h3 className="mt-1 text-base font-semibold text-white">Panel</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg p-2 text-pitahaya-gray-500 transition-colors hover:bg-pitahaya-cerise/12 hover:text-white"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {items.map((item) => {
                  const isActive = item.id === activeTab;
                  const badgeCount = item.badgeCount || 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                        isActive
                          ? "border-pitahaya-cerise/45 bg-pitahaya-cerise/16 text-white"
                          : "border-pitahaya-border bg-pitahaya-surface/65 text-pitahaya-gray-300 hover:bg-pitahaya-cerise/10"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-sm font-semibold">{item.label}</span>
                      </span>
                      {badgeCount > 0 ? (
                        <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive ? "bg-white/18 text-white" : "bg-pitahaya-cerise/15 text-pitahaya-cerise"}`}>
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-pitahaya-border bg-pitahaya-surface/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 backdrop-blur-xl md:hidden">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const isActive = item.id === activeTab;
            const badgeCount = item.badgeCount || 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex min-h-14 flex-col items-center justify-center rounded-xl px-1 py-1.5 transition-all ${
                  isActive ? "bg-pitahaya-cerise/16 text-white" : "text-pitahaya-gray-500"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="mt-1 text-[10px] font-semibold tracking-wide">{item.label}</span>
                {badgeCount > 0 ? (
                  <span className="absolute right-2 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-pitahaya-cerise px-1 text-[9px] font-bold text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}