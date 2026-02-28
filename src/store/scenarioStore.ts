import { create } from "zustand";
import type { ScenarioProgress } from "../types/scenarios";

interface ScenarioStore {
  activeScenarioId: string | null;
  progress: Record<string, ScenarioProgress>;
  hintsUsed: Record<string, number>;

  setActiveScenario: (id: string | null) => void;
  updateProgress: (
    scenarioId: string,
    score: number,
    targetsMet: Record<string, boolean>
  ) => void;
  markCompleted: (scenarioId: string) => void;
  useHint: (scenarioId: string) => number;
  reset: () => void;
}

export const useScenarioStore = create<ScenarioStore>((set, get) => ({
  activeScenarioId: null,
  progress: {},
  hintsUsed: {},

  setActiveScenario: (id) => set({ activeScenarioId: id }),

  updateProgress: (scenarioId, score, targetsMet) =>
    set((state) => ({
      progress: {
        ...state.progress,
        [scenarioId]: {
          scenarioId,
          score,
          completed: score >= 100,
          hintsUsed: state.hintsUsed[scenarioId] || 0,
          targetsMet,
        },
      },
    })),

  markCompleted: (scenarioId) =>
    set((state) => ({
      progress: {
        ...state.progress,
        [scenarioId]: {
          ...state.progress[scenarioId],
          completed: true,
          score: 100,
        },
      },
    })),

  useHint: (scenarioId) => {
    const current = get().hintsUsed[scenarioId] || 0;
    set((state) => ({
      hintsUsed: { ...state.hintsUsed, [scenarioId]: current + 1 },
    }));
    return current + 1;
  },

  reset: () => set({ progress: {}, hintsUsed: {}, activeScenarioId: null }),
}));
