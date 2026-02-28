import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from "lucide-react";
import { ComponentCard } from "./ComponentCard";
import {
  COMPONENT_DEFINITIONS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "../../constants/componentDefinitions";
import type { ComponentCategory } from "../../types/components";
import { useUIStore } from "../../store/uiStore";

const categories: ComponentCategory[] = [
  "clients",
  "loadbalancing",
  "compute",
  "storage",
  "messaging",
  "observability",
  "network",
  "ai",
];

const ComponentLibrary: React.FC = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    clients: true,
    loadbalancing: true,
    compute: true,
    storage: true,
    messaging: false,
    observability: false,
    network: false,
    ai: true,
  });

  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const toggle = (cat: string) => {
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="absolute left-2 top-2 z-20 p-2 rounded-lg bg-bg-surface/80 border border-white/10 hover:bg-bg-elevated transition-colors"
      >
        <PanelLeft className="w-4 h-4 text-white/60" />
      </button>
    );
  }

  return (
    <motion.aside
      data-tour="component-library"
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      exit={{ x: -280 }}
      className="
        relative w-[260px] flex-shrink-0
        bg-bg-surface/95 backdrop-blur-lg
        border-r border-white/5
        flex flex-col
        overflow-hidden
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-heading font-bold text-white/90">
          Components
        </h2>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <PanelLeftClose className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Scrollable categories */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
        {categories.map((cat) => {
          const components = COMPONENT_DEFINITIONS.filter(
            (d) => d.category === cat
          );
          const isExpanded = expanded[cat];
          const color = CATEGORY_COLORS[cat];
          const isAICategory = cat === "ai";

          return (
            <div
              key={cat}
              {...(isAICategory ? { "data-tour": "ai-component-section" } : {})}
            >
              <button
                onClick={() => toggle(cat)}
                className={`
                  flex items-center gap-2 w-full px-2 py-1.5
                  rounded-md hover:bg-white/5 transition-colors
                  ${
                    isAICategory ? "bg-violet-500/5 hover:bg-violet-500/10" : ""
                  }
                `}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-white/40" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-white/40" />
                )}
                {isAICategory ? (
                  <Sparkles className="w-3 h-3 text-violet-400" />
                ) : (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span
                  className={`text-xs font-heading font-bold uppercase tracking-wider ${
                    isAICategory ? "text-violet-400/90" : "text-white/60"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </span>
                {isAICategory && (
                  <span className="ml-auto text-xs font-mono text-violet-400/60 bg-violet-500/10 px-1.5 rounded">
                    NEW
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pl-2 space-y-1 mt-1 mb-2"
                  >
                    {components.map((def) => (
                      <ComponentCard key={def.type} definition={def} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="px-4 py-2 border-t border-white/5">
        <p className="text-xs text-white/30 font-body">
          Drag components onto the canvas to build your architecture
        </p>
      </div>
    </motion.aside>
  );
};

export default React.memo(ComponentLibrary);
