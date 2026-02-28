import { useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { useSimulationStore } from "../store/simulationStore";
import { simulationTick } from "../engine/SimulationEngine";

/**
 * Main simulation loop hook.
 * Runs on requestAnimationFrame, computing metrics each tick.
 */
export function useSimulation() {
  const lastTickRef = useRef(0);
  const animFrameRef = useRef(0);

  const tick = useCallback(() => {
    const { nodes, edges } = useCanvasStore.getState();
    const simState = useSimulationStore.getState();

    if (!simState.isRunning || nodes.length === 0) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    const now = performance.now();
    const interval = 1000 / simState.simulationSpeed;

    if (now - lastTickRef.current < interval) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }
    lastTickRef.current = now;

    // Apply traffic pattern modulation
    let effectiveLoad = simState.trafficLoad;
    const t = Date.now() / 1000;
    switch (simState.trafficPattern) {
      case "sine-wave":
        effectiveLoad *= 0.5 + 0.5 * Math.sin(t * 0.5);
        break;
      case "spike":
        effectiveLoad *= Math.random() > 0.95 ? 5 : 1;
        break;
      case "flash-sale":
        effectiveLoad *= 1 + 3 * Math.max(0, Math.sin(t * 0.2));
        break;
      case "steady":
      default:
        // Small jitter
        effectiveLoad *= 0.95 + Math.random() * 0.1;
        break;
    }

    const result = simulationTick(nodes, edges, effectiveLoad, simState.alerts);

    // Update node states in canvas store
    const canvasStore = useCanvasStore.getState();
    const updatedNodes = canvasStore.nodes.map((node) => {
      const update = result.nodeUpdates.get(node.id);
      if (!update) return node;
      return {
        ...node,
        data: {
          ...node.data,
          currentLoad: update.currentLoad,
          currentRPS: update.currentRPS,
          errorRate: update.errorRate,
          status: node.data.isFailed ? ("failed" as const) : update.status,
          isBottleneck: update.isBottleneck,
          isSPOF: update.isSPOF,
        },
      };
    });

    // Batch updates
    useCanvasStore.setState({ nodes: updatedNodes });
    simState.setMetrics(result.metrics);
    simState.setBottleneckNodes(result.bottleneckNodeIds);
    simState.setSPOFNodes(result.spofNodeIds);
    if (result.alerts.length > 0) {
      simState.addAlerts(result.alerts);
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [tick]);
}
