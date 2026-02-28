import React, { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import type { SystemNodeData, NodeStatus } from "../../../types/components";
import { COMPONENT_MAP } from "../../../constants/componentDefinitions";
import { useCanvasStore } from "../../../store/canvasStore";

const statusBorderColors: Record<NodeStatus, string> = {
  healthy: "rgba(0,255,136,0.4)",
  warning: "rgba(255,184,0,0.4)",
  critical: "rgba(255,56,96,0.4)",
  failed: "rgba(255,56,96,0.8)",
};

const statusGlow: Record<NodeStatus, string> = {
  healthy: "0 0 15px rgba(0,255,136,0.15)",
  warning: "0 0 15px rgba(255,184,0,0.2)",
  critical: "0 0 20px rgba(255,56,96,0.3)",
  failed: "0 0 25px rgba(255,56,96,0.5)",
};

function getIcon(name: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.Box;
}

// ─── Handle styles ─────────────────────────────────────────────────────────
// Handles must sit exactly on the node border (half of handle size = 6px offset).
const handleBase: React.CSSProperties = {
  width: 12,
  height: 12,
  border: "2px solid rgba(255,255,255,0.3)",
  background: "#050d1a",
  borderRadius: "50%",
  zIndex: 10,
};

const BaseNode: React.FC<NodeProps<SystemNodeData>> = memo(
  ({ id, data, selected }) => {
    const def = COMPONENT_MAP.get(data.componentType);
    const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);

    const IconComponent = getIcon(def?.icon ?? "Box");
    const nodeColor = def?.color || "#00f5ff";
    const status: NodeStatus = data.isFailed ? "failed" : data.status;
    const loadPercent = Math.round(data.currentLoad * 100);
    const isAI = data.isAI;

    const handleClick = useCallback(() => {
      setSelectedNode(id);
    }, [id, setSelectedNode]);

    return (
      // ① Outer div = React Flow node wrapper.
      //    Must: position: relative, FIXED width, NO transform, NO overflow: hidden.
      <div
        style={{
          position: "relative",
          width: 180,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={handleClick}
      >
        {/* ② Inner element — animations and visual styling go here */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            width: "100%",
            borderRadius: 12,
            border: `1px solid ${statusBorderColors[status]}`,
            background: "rgba(10,22,40,0.8)",
            backdropFilter: "blur(8px)",
            boxShadow: isAI
              ? `${statusGlow[status]}, 0 0 10px rgba(199,125,255,0.1)`
              : statusGlow[status],
            outline: selected ? "2px solid rgba(0,245,255,0.6)" : "none",
            outlineOffset: 1,
            overflow: "hidden",
          }}
          className={isAI ? "ai-node-shimmer" : ""}
        >
          {/* Node content */}
          <div style={{ padding: "10px 12px" }}>
            {/* Icon and name */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: nodeColor + "20",
                  border: `1px solid ${nodeColor}40`,
                }}
              >
                <IconComponent
                  style={{ width: 16, height: 16, color: nodeColor }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    color: "white",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                  }}
                >
                  {data.config.label}
                </p>
                {data.config.replicas > 1 && (
                  <p
                    style={{
                      fontSize: 9,
                      fontFamily: '"Fira Code", monospace',
                      color: "rgba(255,255,255,0.4)",
                      margin: 0,
                    }}
                  >
                    ×{data.config.replicas} replicas
                  </p>
                )}
              </div>
            </div>

            {/* Load bar */}
            <div
              style={{
                position: "relative",
                height: 6,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 3,
                overflow: "hidden",
                marginTop: 4,
              }}
            >
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  right: "auto",
                  borderRadius: 3,
                  backgroundColor:
                    loadPercent > 90
                      ? "#ff3860"
                      : loadPercent > 70
                      ? "#ffb800"
                      : "#00ff88",
                }}
                animate={{ width: `${Math.min(100, loadPercent)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontFamily: '"Fira Code", monospace',
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {loadPercent}% load
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: '"Fira Code", monospace',
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {data.currentRPS > 0
                  ? `${Math.round(data.currentRPS)} rps`
                  : "idle"}
              </span>
            </div>
          </div>

          {/* Failed overlay */}
          {data.isFailed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,56,96,0.1)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icons.XCircle
                style={{ width: 32, height: 32, color: "rgba(255,56,96,0.6)" }}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Badges — positioned on outer div */}
        {data.isSPOF && (
          <div
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              padding: "2px 6px",
              background: "rgba(255,56,96,0.9)",
              borderRadius: 4,
              fontSize: 8,
              fontFamily: '"Fira Code", monospace',
              fontWeight: 700,
              color: "white",
              zIndex: 10,
            }}
          >
            SPOF
          </div>
        )}
        {data.isBottleneck && !data.isSPOF && (
          <div
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              padding: "2px 6px",
              background: "rgba(255,184,0,0.9)",
              borderRadius: 4,
              fontSize: 8,
              fontFamily: '"Fira Code", monospace',
              fontWeight: 700,
              color: "black",
              zIndex: 10,
            }}
          >
            BOTTLENECK
          </div>
        )}
        {isAI && !data.isSPOF && !data.isBottleneck && (
          <div
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              padding: "2px 6px",
              background: "rgba(139,92,246,0.9)",
              borderRadius: 4,
              fontSize: 8,
              fontFamily: '"Fira Code", monospace',
              fontWeight: 700,
              color: "white",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Icons.Sparkles style={{ width: 10, height: 10 }} />
            AI
          </div>
        )}
        {isAI && data.errorRate > 0.05 && (
          <div
            style={{
              position: "absolute",
              bottom: -8,
              right: -8,
              padding: "1px 4px",
              background: "rgba(239,68,68,0.8)",
              borderRadius: 4,
              fontSize: 7,
              fontFamily: '"Fira Code", monospace',
              fontWeight: 700,
              color: "white",
              zIndex: 10,
            }}
          >
            ⚠ {Math.round(data.errorRate * 100)}% err
          </div>
        )}

        {/* ③ Handles on OUTER div — precisely positioned on the node border */}
        <Handle
          type="target"
          position={Position.Top}
          style={{
            ...handleBase,
            top: -6,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          style={{
            ...handleBase,
            left: -6,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            ...handleBase,
            bottom: -6,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{
            ...handleBase,
            right: -6,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      </div>
    );
  }
);

BaseNode.displayName = "BaseNode";
export default BaseNode;
