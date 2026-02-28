import React from "react";
import {
  type EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow,
} from "reactflow";
import { useSimulationStore } from "../../../store/simulationStore";

const TokenStreamEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  selected,
  data,
}) => {
  const { deleteElements } = useReactFlow();
  const isRunning = useSimulationStore((s) => s.isRunning);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const tokensPerSec = data?.tokensPerSec ?? 0;
  const health = data?.health ?? "healthy";
  const strokeColor =
    health === "overloaded"
      ? "#ff3860"
      : health === "warning"
      ? "#ffb800"
      : "#c77dff"; // violet for AI

  const loadFactor = Math.min(tokensPerSec / 50000, 1);
  const strokeWidth = Math.max(1.5, Math.min(5, 1.5 + loadFactor * 3.5));
  const animDuration = Math.max(0.5, 3 - loadFactor * 2.5);

  return (
    <>
      {/* Glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth + 4}
        strokeOpacity={0.12}
        className="react-flow__edge-path"
      />
      {/* Main path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={0.8}
        strokeDasharray="6 3"
        className="react-flow__edge-path"
        style={{
          ...style,
          animation: isRunning
            ? `tokenFlow ${animDuration}s linear infinite`
            : "none",
        }}
      />
      {/* Selection highlight */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#c77dff"
          strokeWidth={strokeWidth + 2}
          strokeOpacity={0.3}
          className="react-flow__edge-path"
        />
      )}
      {/* Animated particles */}
      {isRunning && (
        <>
          {[0, 0.33, 0.66].map((offset, i) => (
            <circle key={i} r={3} fill={strokeColor} opacity={0.9}>
              <animateMotion
                dur={`${animDuration}s`}
                begin={`${-offset * animDuration}s`}
                repeatCount="indefinite"
                path={edgePath}
              />
            </circle>
          ))}
        </>
      )}
      {/* Edge label + delete button */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan flex items-center gap-1.5"
        >
          {tokensPerSec > 0 && (
            <span className="text-[8px] font-mono text-violet-300/80 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
              {(tokensPerSec / 1000).toFixed(1)}k tok/s
              {data?.timeToFirstToken
                ? ` · TTFT: ${data.timeToFirstToken}ms`
                : ""}
            </span>
          )}
          <button
            className="w-4 h-4 rounded-full bg-bg-surface/80 border border-white/20 text-white/50 hover:text-accent-red hover:border-accent-red/50 text-[10px] flex items-center justify-center transition-colors"
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

export default React.memo(TokenStreamEdge);
