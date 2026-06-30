"use client";

import { motion } from "framer-motion";

interface TabsNavigationProps<T extends string> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  items: Array<{
    id: T;
    label: string;
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
      className="inline-flex h-12 items-center gap-1 rounded-2xl border border-pitahaya-border bg-pitahaya-surface/80 p-1 shadow-glass backdrop-blur-xl"
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
                : "text-pitahaya-gray-500 hover:text-white hover:bg-pitahaya-cerise/8"
            }`}
          >
            {item.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}