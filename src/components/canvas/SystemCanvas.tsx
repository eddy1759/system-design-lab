import React, { useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
  ConnectionMode,
} from "reactflow";
import "reactflow/dist/style.css";

import BaseNode from "./nodes/BaseNode";
import AnimatedFlowEdge from "./edges/AnimatedFlowEdge";
import TokenStreamEdge from "./edges/TokenStreamEdge";
import { useCanvasStore } from "../../store/canvasStore";
import { useUIStore } from "../../store/uiStore";
import { useDragDrop } from "../../hooks/useDragDrop";

// ─── DEFINED AT MODULE LEVEL (outside component) ────────────────────────────
// This prevents node/edge remounting on every render.

const nodeTypes: NodeTypes = {
  systemNode: BaseNode,
};

const edgeTypes: EdgeTypes = {
  animatedFlow: AnimatedFlowEdge,
  tokenStream: TokenStreamEdge,
};

const defaultEdgeOptions = {
  type: "animatedFlow",
  animated: true,
};

// ─── Canvas Component ───────────────────────────────────────────────────────

const SystemCanvas: React.FC = () => {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const setDetailDrawer = useUIStore((s) => s.setDetailDrawer);

  const { onDragOver, onDrop } = useDragDrop();
  const reactFlowInstance = useRef<any>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      addEdge(connection);
    },
    [addEdge]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNode(node.id);
      setDetailDrawer(true);
    },
    [setSelectedNode, setDetailDrawer]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setDetailDrawer(false);
  }, [setSelectedNode, setDetailDrawer]);

  // ─── Drop handler — reads from dataTransfer, uses raw clientX/clientY ───
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!reactFlowInstance.current) return;
      onDrop(e, reactFlowInstance.current.screenToFlowPosition);
    },
    [onDrop]
  );

  const onInit = useCallback((instance: any) => {
    reactFlowInstance.current = instance;
  }, []);

  return (
    <div
      data-tour="system-canvas"
      className="flex-1 h-full relative"
      onDragOver={onDragOver}
      onDrop={handleDrop}
    >
      {/* Empty canvas state when no nodes */}
      {nodes.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              animation: "emptyFloat 3s ease-in-out infinite",
            }}
          >
            ⬡
          </div>
          <h2
            style={{
              color: "#334e6b",
              fontFamily: '"Syne", sans-serif',
              fontSize: 22,
              margin: 0,
              fontWeight: 700,
            }}
          >
            Drag a component to start building
          </h2>
          <p
            style={{
              color: "#1e3a52",
              fontFamily: '"Inter", sans-serif',
              fontSize: 13,
              marginTop: 8,
            }}
          >
            or choose a scenario from the bar above
          </p>
          <style>{`
            @keyframes emptyFloat {
              0%,100% { transform: translateY(0) rotate(0deg); }
              50%      { transform: translateY(-12px) rotate(30deg); }
            }
          `}</style>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={onInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        minZoom={0.25}
        maxZoom={3}
        className="bg-bg-primary"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="rgba(255,255,255,0.05)"
          gap={20}
          size={1}
        />
        <Controls
          className="!bg-bg-surface !border-white/10 !rounded-lg !shadow-xl [&>button]:!bg-bg-elevated [&>button]:!border-white/10 [&>button]:!text-white/60 [&>button:hover]:!bg-bg-hover"
          position="bottom-left"
        />
        <MiniMap
          className="!bg-bg-surface !border-white/10 !rounded-lg"
          nodeColor={(node) => {
            const d = node.data as any;
            if (d?.isFailed) return "#ff3860";
            if (d?.isAI) return "#c77dff";
            if (d?.status === "critical") return "#ff3860";
            if (d?.status === "warning") return "#ffb800";
            return "#00ff88";
          }}
          maskColor="rgba(5,13,26,0.7)"
          position="bottom-right"
          style={{ marginBottom: 60 }}
        />
      </ReactFlow>
    </div>
  );
};

export default React.memo(SystemCanvas);
