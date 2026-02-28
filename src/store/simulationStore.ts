import { create } from "zustand";
import type { MetricSnapshot, SystemAlert } from "../types/metrics";
import type { TrafficPattern } from "../types/components";

const defaultMetrics: MetricSnapshot = {
  timestamp: Date.now(),
  throughput: 0,
  latencyP50: 0,
  latencyP95: 0,
  latencyP99: 0,
  availability: 0,
  errorRate: 0,
  networkHops: 0,
  consistencyModel: "N/A",
  cacheHitRate: null,
  dbReadWriteRatio: null,
  scalabilityScore: 0,
  monthlyCost: 0,
  queueDepth: null,
  capState: "N/A",
};

interface SimulationStore {
  isRunning: boolean;
  trafficLoad: number;
  trafficPattern: TrafficPattern;
  simulationSpeed: number;
  currentMetrics: MetricSnapshot;
  metricHistory: MetricSnapshot[];
  alerts: SystemAlert[];
  bottleneckNodeIds: string[];
  spofNodeIds: string[];
  isLoadTesting: boolean;
  loadTestProgress: number;

  setRunning: (running: boolean) => void;
  setTrafficLoad: (load: number) => void;
  setTrafficPattern: (pattern: TrafficPattern) => void;
  setSimulationSpeed: (speed: number) => void;
  setMetrics: (metrics: MetricSnapshot) => void;
  addAlert: (alert: SystemAlert) => void;
  addAlerts: (alerts: SystemAlert[]) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  setBottleneckNodes: (ids: string[]) => void;
  setSPOFNodes: (ids: string[]) => void;
  setLoadTesting: (testing: boolean) => void;
  setLoadTestProgress: (progress: number) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  isRunning: true,
  trafficLoad: 1000,
  trafficPattern: "steady",
  simulationSpeed: 1,
  currentMetrics: defaultMetrics,
  metricHistory: [],
  alerts: [],
  bottleneckNodeIds: [],
  spofNodeIds: [],
  isLoadTesting: false,
  loadTestProgress: 0,

  setRunning: (running) => set({ isRunning: running }),
  setTrafficLoad: (load) => set({ trafficLoad: load }),
  setTrafficPattern: (pattern) => set({ trafficPattern: pattern }),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  setMetrics: (metrics) =>
    set((state) => ({
      currentMetrics: metrics,
      metricHistory: [...state.metricHistory.slice(-29), metrics],
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        ...state.alerts.filter((a) => a.message !== alert.message),
        alert,
      ].slice(-20),
    })),

  addAlerts: (alerts) =>
    set((state) => {
      const existing = new Set(state.alerts.map((a) => a.message));
      const newAlerts = alerts.filter((a) => !existing.has(a.message));
      return { alerts: [...state.alerts, ...newAlerts].slice(-20) };
    }),

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, dismissed: true } : a
      ),
    })),

  clearAlerts: () => set({ alerts: [] }),
  setBottleneckNodes: (ids) => set({ bottleneckNodeIds: ids }),
  setSPOFNodes: (ids) => set({ spofNodeIds: ids }),
  setLoadTesting: (testing) => set({ isLoadTesting: testing }),
  setLoadTestProgress: (progress) => set({ loadTestProgress: progress }),

  reset: () =>
    set({
      currentMetrics: defaultMetrics,
      metricHistory: [],
      alerts: [],
      bottleneckNodeIds: [],
      spofNodeIds: [],
      isLoadTesting: false,
      loadTestProgress: 0,
    }),
}));
