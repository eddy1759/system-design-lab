import React, { useCallback, useState } from "react";
import {
  Activity,
  Play,
  Pause,
  Zap,
  BookOpen,
  Box,
  BarChart3,
  Bot,
  CheckCircle,
  Share2,
} from "lucide-react";
import { useSimulationStore } from "../../store/simulationStore";
import { useCanvasStore } from "../../store/canvasStore";
import { useUIStore } from "../../store/uiStore";
import { useAIAdvisorStore } from "../../store/aiAdvisorStore";
import { AnimatedCounter } from "../shared/AnimatedCounter";
import { Tooltip } from "../shared/Tooltip";
import {
  formatLatency,
  formatThroughput,
  formatCost,
} from "../../utils/formatters";
import { ExportPanel } from "../export/ExportPanel";
import { NarratorPanel } from "../narrator/NarratorPanel";

const SystemHealthBar: React.FC = () => {
  const currentMetrics = useSimulationStore((s) => s.currentMetrics);
  const spofNodeIds = useSimulationStore((s) => s.spofNodeIds);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const setRunning = useSimulationStore((s) => s.setRunning);
  const isLoadTesting = useSimulationStore((s) => s.isLoadTesting);
  const trafficLoad = useSimulationStore((s) => s.trafficLoad);
  const setTrafficLoad = useSimulationStore((s) => s.setTrafficLoad);
  const setLoadTesting = useSimulationStore((s) => s.setLoadTesting);
  const is3DMode = useUIStore((s) => s.is3DMode);
  const set3DMode = useUIStore((s) => s.set3DMode);
  const setLearnOverlay = useUIStore((s) => s.setLearnOverlay);
  const metricsOpen = useUIStore((s) => s.metricsOpen);
  const toggleMetrics = useUIStore((s) => s.toggleMetrics);
  const nodes = useCanvasStore((s) => s.nodes);
  const setNodeFailed = useCanvasStore((s) => s.setNodeFailed);
  const exportPanelOpen = useUIStore((s) => s.exportPanelOpen);
  const setExportPanel = useUIStore((s) => s.setExportPanel);
  const narratorOpen = useUIStore((s) => s.narratorOpen);
  const toggleNarrator = useUIStore((s) => s.toggleNarrator);
  const [validationScore, setValidationScore] = useState<number | null>(null);

  const healthScore =
    currentMetrics.availability > 0.999
      ? "healthy"
      : currentMetrics.availability > 0.99
      ? "degraded"
      : "critical";

  const healthColor =
    healthScore === "healthy"
      ? "text-accent-green"
      : healthScore === "degraded"
      ? "text-accent-amber"
      : "text-accent-red";

  const runLoadTest = useCallback(() => {
    if (isLoadTesting) return;
    setLoadTesting(true);
    const origLoad = trafficLoad;
    const targetLoad = origLoad * 10;
    let step = 0;
    const totalSteps = 100;

    const interval = setInterval(() => {
      step++;
      if (step <= 50) {
        const progress = step / 50;
        setTrafficLoad(
          Math.round(origLoad + (targetLoad - origLoad) * progress)
        );
      } else if (step <= totalSteps) {
        const progress = (step - 50) / 50;
        setTrafficLoad(
          Math.round(targetLoad - (targetLoad - origLoad) * progress)
        );
      }
      if (step >= totalSteps) {
        clearInterval(interval);
        setTrafficLoad(origLoad);
        setLoadTesting(false);
      }
    }, 100);
  }, [trafficLoad, isLoadTesting, setTrafficLoad, setLoadTesting]);

  const injectFailure = useCallback(() => {
    const nonClientNodes = nodes.filter((n) => {
      return !["web-client", "mobile-client", "api-consumer"].includes(
        n.data.componentType
      );
    });
    if (nonClientNodes.length === 0) return;
    const randomNode =
      nonClientNodes[Math.floor(Math.random() * nonClientNodes.length)];
    setNodeFailed(randomNode.id, true);
    setTimeout(() => {
      setNodeFailed(randomNode.id, false);
    }, 10000);
  }, [nodes, setNodeFailed]);

  const handleValidate = useCallback(() => {
    // Dispatch a custom event that the ValidationReportModal listens for
    window.dispatchEvent(new CustomEvent("open-validation-report"));
  }, []);

  return (
    <>
      <header
        className="
      h-10 flex items-center justify-between px-4
      bg-bg-surface/95 backdrop-blur-lg
      border-b border-white/5
      flex-shrink-0 z-20
    "
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Activity className={`w-4 h-4 ${healthColor}`} />
            <span className="text-xs font-heading font-bold text-white/90">
              System Design Lab
            </span>
          </div>
          <div className="h-4 w-px bg-white/10" />
        </div>

        {/* Center: Vitals */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/50 font-mono">Uptime:</span>
            <AnimatedCounter
              value={currentMetrics.availability * 100}
              format={(n) => n.toFixed(2) + "%"}
              className={`text-xs font-bold font-mono ${healthColor}`}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/50 font-mono">P99:</span>
            <AnimatedCounter
              value={currentMetrics.latencyP99}
              format={(n) => formatLatency(n)}
              className="text-xs font-bold font-mono text-accent-cyan"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/50 font-mono">Throughput:</span>
            <AnimatedCounter
              value={currentMetrics.throughput}
              format={(n) => formatThroughput(Math.round(n))}
              className="text-xs font-bold font-mono text-accent-green"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/50 font-mono">SPOFs:</span>
            <span
              className={`text-xs font-mono font-bold ${
                spofNodeIds.length > 0 ? "text-accent-red" : "text-accent-green"
              }`}
            >
              {spofNodeIds.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/50 font-mono">Cost:</span>
            <AnimatedCounter
              value={currentMetrics.monthlyCost}
              format={(n) => formatCost(Math.round(n))}
              className="text-xs font-bold font-mono text-accent-amber"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <Tooltip
            content="Pause or resume live simulation"
            shortcut="Space"
            position="bottom"
          >
            <button
              onClick={() => setRunning(!isRunning)}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            >
              {isRunning ? (
                <Pause className="w-3.5 h-3.5 text-white/50" />
              ) : (
                <Play className="w-3.5 h-3.5 text-white/50" />
              )}
            </button>
          </Tooltip>

          <Tooltip
            content="Simulates a 10× traffic spike over 5 seconds. Watch your system degrade in real time, then recover."
            shortcut="Ctrl+L"
            position="bottom"
          >
            <button
              data-tour="load-test-btn"
              onClick={runLoadTest}
              disabled={isLoadTesting}
              className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-xs font-heading font-bold
              transition-colors
              ${
                isLoadTesting
                  ? "bg-accent-amber/20 text-accent-amber cursor-wait"
                  : "bg-accent-cyan/10 text-accent-cyan/80 hover:bg-accent-cyan/20"
              }
            `}
            >
              <Zap className="w-3 h-3" />
              {isLoadTesting ? "Testing..." : "Load Test"}
            </button>
          </Tooltip>

          <Tooltip
            content="Randomly kills a component for 10 seconds. If it's a SPOF, your error rate hits 100%."
            position="bottom"
          >
            <button
              onClick={injectFailure}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-heading font-bold bg-accent-red/10 text-accent-red/80 hover:bg-accent-red/20 transition-colors"
            >
              💥 Failure
            </button>
          </Tooltip>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <Tooltip
            content="Switch to 3D view. Components become geometric shapes."
            shortcut="3"
            position="bottom"
          >
            <button
              onClick={() => set3DMode(!is3DMode)}
              className={`p-1.5 rounded-md transition-colors ${
                is3DMode
                  ? "bg-accent-cyan/20 text-accent-cyan"
                  : "hover:bg-white/10 text-white/50"
              }`}
            >
              <Box className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <AIAdvisorButton />

          <Tooltip
            content="Validate your architecture against system design best practices. Get a scored report."
            shortcut="V"
            position="bottom"
            disabled={nodes.length < 2}
          >
            <button
              data-tour="validate-btn"
              onClick={handleValidate}
              disabled={nodes.length < 2}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-heading font-bold transition-colors ${
                nodes.length < 2
                  ? "bg-white/5 text-white/20 cursor-not-allowed"
                  : "bg-accent-green/10 text-accent-green/80 hover:bg-accent-green/20"
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              Validate
            </button>
          </Tooltip>

          <Tooltip
            content="Export your architecture as a shareable link, document, image, or infrastructure code."
            shortcut="E"
            position="bottom"
            disabled={nodes.length < 1}
          >
            <button
              data-tour="export-btn"
              onClick={() => setExportPanel(true)}
              disabled={nodes.length < 1}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-heading font-bold transition-colors ${
                nodes.length < 1
                  ? "bg-white/5 text-white/20 cursor-not-allowed"
                  : "bg-accent-cyan/10 text-accent-cyan/80 hover:bg-accent-cyan/20"
              }`}
            >
              <Share2 className="w-3 h-3" />
              Export
            </button>
          </Tooltip>

          <Tooltip
            content="Generate a structured interview answer explaining this architecture."
            shortcut="N"
            position="bottom"
            disabled={nodes.length < 2}
          >
            <button
              data-tour="narrator-btn"
              onClick={toggleNarrator}
              disabled={nodes.length < 2}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-heading font-bold transition-colors ${
                nodes.length < 2
                  ? "bg-white/5 text-white/20 cursor-not-allowed"
                  : narratorOpen
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/20"
              }`}
            >
              🎤 Explain
            </button>
          </Tooltip>

          <Tooltip
            content="Open the concept library: CAP theorem, consistency models, RAG pipelines, and more."
            shortcut="L"
            position="bottom"
          >
            <button
              onClick={() => setLearnOverlay(true)}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-accent-purple" />
            </button>
          </Tooltip>

          {!metricsOpen && (
            <Tooltip content="Toggle metrics panel" position="bottom">
              <button
                onClick={toggleMetrics}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5 text-white/50" />
              </button>
            </Tooltip>
          )}
        </div>
      </header>
      <ExportPanel
        isOpen={exportPanelOpen}
        onClose={() => setExportPanel(false)}
      />
      <NarratorPanel isOpen={narratorOpen} onClose={toggleNarrator} />
    </>
  );
};

// ─── AI Advisor Button ─────────────────────────────────────────────────────

const AIAdvisorButton: React.FC = () => {
  const toggle = useAIAdvisorStore((s) => s.toggle);
  const isOpen = useAIAdvisorStore((s) => s.isOpen);
  const criticalCount = useAIAdvisorStore(
    (s) =>
      s.activeRecommendations.filter(
        (r) => r.type === "critical" && !r.dismissed
      ).length
  );

  return (
    <Tooltip
      content="Your AI architecture advisor. Analyzes your current design and flags issues."
      shortcut="A"
      position="bottom"
      isAI
    >
      <button
        data-tour="ai-advisor-btn"
        onClick={toggle}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-heading font-bold transition-colors ${
          isOpen
            ? "bg-violet-500/20 text-violet-300"
            : "bg-violet-500/10 text-violet-400/80 hover:bg-violet-500/20"
        }`}
      >
        <Bot className="w-3.5 h-3.5" />
        AI Advisor
        {criticalCount > 0 && (
          <span className="ml-1 w-4 h-4 flex items-center justify-center rounded-full bg-accent-red text-white text-[8px] font-bold animate-pulse">
            {criticalCount}
          </span>
        )}
      </button>
    </Tooltip>
  );
};

export default React.memo(SystemHealthBar);
