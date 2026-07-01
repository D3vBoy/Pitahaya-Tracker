"use client";

import { motion } from "framer-motion";

interface TabsNavigationProps<T extends string> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  items: Array<{
    id: T;
    label: string;
    badgeCount?: number;
  }>;
}

export default function TabsNavigation<T extends string>({
  activeTab,
  setActiveTab,
  items,
}: TabsNavigationProps<T>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-surface-soft inline-flex h-12 items-center gap-1 rounded-2xl p-1 shadow-glass backdrop-blur-xl"
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;

        return (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(item.id)}
            className={`relative h-10 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
              isActive
                ? "bg-gradient-primary text-white shadow-glow-cerise"
                : "theme-text-secondary hover:theme-text-primary hover:bg-pitahaya-cerise/8"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span>{item.label}</span>
              {item.badgeCount ? (
                <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive ? "bg-white/18 text-white" : "bg-pitahaya-cerise/12 text-pitahaya-cerise"}`}>
                  {item.badgeCount > 99 ? "99+" : item.badgeCount}
                </span>
              ) : null}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}