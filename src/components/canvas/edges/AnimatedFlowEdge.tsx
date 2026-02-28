import React from "react";
import {
  type EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow,
} from "reactflow";
import { useSimulationStore } from "../../../store/simulationStore";

const AnimatedFlowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  selected,
}) => {
  const { deleteElements } = useReactFlow();
  const trafficLoad = useSimulationStore((s) => s.trafficLoad);
  const isRunning = useSimulationStore((s) => s.isRunning);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const loadFactor = Math.min(trafficLoad / 50000, 1);
  const strokeWidth = 1.5 + loadFactor * 3;
  const color =
    loadFactor > 0.8 ? "#ff3860" : loadFactor > 0.5 ? "#ffb800" : "#00ff88";
  const dashSpeed = 0.5 + loadFactor * 2;

  return (
    <>
      {/* Glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth + 4}
        strokeOpacity={0.1}
        className="react-flow__edge-path"
      />
      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={0.7}
        strokeDasharray="6 4"
        className="react-flow__edge-path"
        style={{
          ...style,
          animation: isRunning ? `dash ${dashSpeed}s linear infinite` : "none",
        }}
      />
      {/* Selection highlight */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#00f5ff"
          strokeWidth={strokeWidth + 2}
          strokeOpacity={0.3}
          className="react-flow__edge-path"
        />
      )}
      {/* Animated particles */}
      {isRunning && (
        <>
          <circle r={2.5} fill={color} opacity={0.9}>
            <animateMotion
              dur={`${Math.max(0.5, 3 - loadFactor * 2.5)}s`}
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>
          <circle r={2} fill={color} opacity={0.6}>
            <animateMotion
              dur={`${Math.max(0.5, 3 - loadFactor * 2.5)}s`}
              repeatCount="indefinite"
              path={edgePath}
              begin={`${Math.max(0.25, (3 - loadFactor * 2.5) * 0.5)}s`}
            />
          </circle>
        </>
      )}
      {/* Delete button */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <button
            className="w-4 h-4 rounded-full bg-bg-surface/80 border border-white/20 text-white/50 hover:text-accent-red hover:border-accent-red/50 text-[10px] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 hover:opacity-100"
            style={{ opacity: selected ? 1 : undefined }}
            onClick={() => deleteElements({ edges: [{ id }] })}
            title="Delete edge"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default React.memo(AnimatedFlowEdge);
