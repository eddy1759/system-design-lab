import { useMemo } from "react";
import { useSimulationStore } from "../store/simulationStore";

/**
 * Hook returning the last N metric snapshots for sparkline rendering.
 */
export function useMetricHistory(count: number = 30) {
  const metricHistory = useSimulationStore((s) => s.metricHistory);

  return useMemo(() => metricHistory.slice(-count), [metricHistory, count]);
}
