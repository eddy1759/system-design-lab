import type { ComponentType } from "./components";

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  targets: ScenarioTargets;
  starterNodes: ScenarioNode[];
  starterEdges: ScenarioEdge[];
  hints: string[];
  completionMessage: string;
  realWorldArchitecture: string;
}

export interface ScenarioTargets {
  minAvailability?: number;
  maxLatencyP95?: number;
  minThroughput?: number;
  maxCost?: number;
  maxSPOFs?: number;
  requiredComponents?: ComponentType[];
}

export interface ScenarioNode {
  type: ComponentType;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
}

export interface ScenarioEdge {
  sourceIndex: number;
  targetIndex: number;
}

export interface ScenarioProgress {
  scenarioId: string;
  score: number; // 0-100
  completed: boolean;
  hintsUsed: number;
  targetsMet: Record<string, boolean>;
}
