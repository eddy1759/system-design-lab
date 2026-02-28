import React, { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  ChevronRight,
  Lightbulb,
  Target,
  CheckCircle2,
} from "lucide-react";
import {
  SCENARIOS,
  computeScenarioProgress,
} from "../../engine/ScenarioEngine";
import { useScenarioStore } from "../../store/scenarioStore";
import { useCanvasStore } from "../../store/canvasStore";
import { useSimulationStore } from "../../store/simulationStore";
import { useUIStore } from "../../store/uiStore";
import type { Node } from "reactflow";
import type { SystemNodeData, ComponentType } from "../../types/components";

const ScenarioBar: React.FC = () => {
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const progress = useScenarioStore((s) => s.progress);
  const updateProgress = useScenarioStore((s) => s.updateProgress);
  const useHint = useScenarioStore((s) => s.useHint);
  const hintsUsed = useScenarioStore((s) => s.hintsUsed);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const addNode = useCanvasStore((s) => s.addNode);
  const currentMetrics = useSimulationStore((s) => s.currentMetrics);
  const nodes = useCanvasStore((s) => s.nodes);
  const hintsOpen = useUIStore((s) => s.hintsOpen);
  const setHintsOpen = useUIStore((s) => s.setHintsOpen);

  const activeScenario = useMemo(
    () => SCENARIOS.find((s) => s.id === activeScenarioId),
    [activeScenarioId]
  );

  const scenarioProgress = useMemo(() => {
    if (!activeScenario) return null;
    const types = nodes.map((n) => n.data.componentType);
    return computeScenarioProgress(activeScenario, currentMetrics, types);
  }, [activeScenario, currentMetrics, nodes]);

  // Update progress when it changes
  React.useEffect(() => {
    if (activeScenario && scenarioProgress) {
      updateProgress(
        activeScenario.id,
        scenarioProgress.score,
        scenarioProgress.targetsMet
      );
    }
  }, [scenarioProgress, activeScenario, updateProgress]);

  const loadScenario = useCallback(
    (scenarioId: string) => {
      const scenario = SCENARIOS.find((s) => s.id === scenarioId);
      if (!scenario) return;
      clearCanvas();
      setActiveScenario(scenarioId);
      setHintsOpen(false);

      // Stagger-add start nodes
      scenario.starterNodes.forEach((sn, i) => {
        setTimeout(() => {
          addNode(sn.type as ComponentType, sn.position);
        }, i * 200);
      });
    },
    [clearCanvas, setActiveScenario, addNode, setHintsOpen]
  );

  const currentHintsUsed = activeScenarioId
    ? hintsUsed[activeScenarioId] || 0
    : 0;

  return (
    <div
      data-tour="scenario-bar"
      className="flex-shrink-0 border-b border-white/5 bg-bg-surface/80"
    >
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto custom-scrollbar">
        <Trophy className="w-3.5 h-3.5 text-accent-amber flex-shrink-0 mr-1" />
        {SCENARIOS.map((scenario) => {
          const isActive = activeScenarioId === scenario.id;
          const prog = progress[scenario.id];
          const completed = prog?.completed;

          return (
            <button
              key={scenario.id}
              onClick={() => loadScenario(scenario.id)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-heading font-bold
                whitespace-nowrap transition-all
                ${
                  isActive
                    ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                    : completed
                    ? "bg-accent-green/10 text-accent-green/70 border border-accent-green/20"
                    : "text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent"
                }
              `}
            >
              {completed ? <CheckCircle2 className="w-3 h-3" /> : null}
              {scenario.name}
            </button>
          );
        })}
      </div>

      {/* Active scenario info */}
      {activeScenario && scenarioProgress && (
        <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3 h-3 text-accent-cyan" />
              <span className="text-xs font-heading font-bold text-white/60">
                {activeScenario.description}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-accent-cyan"
                  animate={{ width: `${scenarioProgress.score}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs font-mono text-accent-cyan">
                {scenarioProgress.score}%
              </span>
            </div>
          </div>

          {/* Targets */}
          <div className="flex items-center gap-2">
            {Object.entries(scenarioProgress.targetsMet).map(([key, met]) => (
              <div
                key={key}
                className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                  met
                    ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
                    : "bg-white/5 text-white/30 border border-white/10"
                }`}
              >
                {key.replace("component:", "")}
              </div>
            ))}
          </div>

          {/* Hints */}
          <button
            onClick={() => setHintsOpen(!hintsOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-heading bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20 transition-colors"
          >
            <Lightbulb className="w-3 h-3" />
            Hints ({currentHintsUsed}/{activeScenario.hints.length})
          </button>
        </div>
      )}

      {/* Hints panel */}
      {activeScenario && hintsOpen && (
        <div className="px-4 py-2 border-t border-white/5 bg-accent-purple/5">
          <div className="space-y-1.5">
            {activeScenario.hints.map((hint, i) => {
              const unlocked = i < currentHintsUsed;
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-mono text-accent-purple/50 mt-0.5">
                    {i + 1}.
                  </span>
                  {unlocked ? (
                    <p className="text-xs text-white/60 font-body">{hint}</p>
                  ) : (
                    <button
                      onClick={() => useHint(activeScenario.id)}
                      className="text-xs text-accent-purple/50 hover:text-accent-purple transition-colors"
                    >
                      Click to reveal hint...
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ScenarioBar);
