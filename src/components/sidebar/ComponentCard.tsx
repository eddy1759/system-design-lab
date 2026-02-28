import React, { useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import type { ComponentDefinition } from "../../types/components";

function getIcon(name: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.Box;
}

interface ComponentCardProps {
  definition: ComponentDefinition;
}

export const ComponentCard: React.FC<ComponentCardProps> = React.memo(
  ({ definition }) => {
    const IconComponent = getIcon(definition.icon);
    const isAI = definition.category === "ai";

    const handleDragStart = useCallback(
      (e: React.DragEvent) => {
        e.dataTransfer.setData("application/reactflow", definition.type);
        e.dataTransfer.setData("text/plain", definition.type);
        e.dataTransfer.effectAllowed = "move";
      },
      [definition.type]
    );

    return (
      <div
        draggable="true"
        onDragStart={handleDragStart}
        className="
          group relative cursor-grab active:cursor-grabbing
          flex items-center gap-2.5 px-3 py-2
          rounded-lg border border-white/5 bg-bg-elevated/50
          hover:border-white/15 hover:bg-bg-elevated
          transition-all duration-200
          hover:shadow-lg select-none
        "
        style={
          {
            perspective: "600px",
            userSelect: "none",
            WebkitUserDrag: "element",
          } as React.CSSProperties
        }
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          e.currentTarget.style.transform = `rotateY(${x * 8}deg) rotateX(${
            -y * 8
          }deg)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "rotateY(0deg) rotateX(0deg)";
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: definition.color + "15",
            border: `1px solid ${definition.color}30`,
          }}
        >
          <IconComponent
            className="w-4 h-4"
            style={{ color: definition.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-heading font-bold text-white/90 truncate">
            {definition.name}
          </p>
          <p className="text-[10px] text-white/40 truncate">
            {definition.description}
          </p>
        </div>
        <Icons.GripVertical className="w-3 h-3 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        {/* AI badge */}
        {isAI && (
          <span className="absolute bottom-1 right-1 text-[7px] font-mono font-bold text-violet-400/80 bg-violet-500/10 px-1 rounded">
            ⚡ AI
          </span>
        )}
      </div>
    );
  }
);

ComponentCard.displayName = "ComponentCard";
