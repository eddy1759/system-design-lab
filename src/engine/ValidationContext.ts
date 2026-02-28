import type { Node, Edge } from "reactflow";
import type { SystemNodeData, SystemEdgeData } from "../types/components";
import type { MetricSnapshot } from "../types/metrics";
import type { ScenarioDefinition } from "../types/scenarios";

// ─── Scale Tier ─────────────────────────────────────────────────────────

export type ScaleTier =
  | "prototype"
  | "startup"
  | "growth"
  | "scale"
  | "enterprise";

export interface ScaleTierSignals {
  trafficTier: ScaleTier;
  complexityTier: ScaleTier;
  componentTier: ScaleTier;
  scenarioTier: ScaleTier | null;
  resolvedTier: ScaleTier;
}

export interface ValidationContext {
  currentRPS: number;
  trafficPattern: string;
  scaleTier: ScaleTier;
  scaleTierLabel: string;
  scaleTierSignals: ScaleTierSignals;
  mode: "learning" | "scenario" | "freeform";
  scenarioName?: string;
  componentCount: number;
  hasAIComponents: boolean;
  isMonolith: boolean;
  thresholds: ContextThresholds;
}

export interface ContextThresholds {
  maxAcceptableP99Ms: number;
  minAcceptableAvailability: number;
  replicasRequiredForHA: number;
  requiresLoadBalancer: boolean;
  requiresCache: boolean;
  requiresObservability: boolean;
  requiresGuardrails: boolean;
}

// ─── Tier Labels ──────────────────────────────────────────────────────────

const TIER_LABELS: Record<ScaleTier, string> = {
  prototype: "Prototype (≤500 req/s)",
  startup: "Startup (500–5K req/s)",
  growth: "Growth (5K–50K req/s)",
  scale: "At Scale (50K–500K req/s)",
  enterprise: "Enterprise / Internet Scale (500K+ req/s)",
};

export const SCALE_TIER_COLORS: Record<ScaleTier, string> = {
  prototype: "#64748b",
  startup: "#00ff88",
  growth: "#00f5ff",
  scale: "#ffb800",
  enterprise: "#ff3860",
};

// ─── Default Thresholds Per Tier ──────────────────────────────────────────

const TIER_THRESHOLDS: Record<ScaleTier, ContextThresholds> = {
  prototype: {
    maxAcceptableP99Ms: 2000,
    minAcceptableAvailability: 0.95,
    replicasRequiredForHA: 1,
    requiresLoadBalancer: false,
    requiresCache: false,
    requiresObservability: false,
    requiresGuardrails: false,
  },
  startup: {
    maxAcceptableP99Ms: 1000,
    minAcceptableAvailability: 0.99,
    replicasRequiredForHA: 1,
    requiresLoadBalancer: false,
    requiresCache: false,
    requiresObservability: false,
    requiresGuardrails: false,
  },
  growth: {
    maxAcceptableP99Ms: 500,
    minAcceptableAvailability: 0.999,
    replicasRequiredForHA: 2,
    requiresLoadBalancer: true,
    requiresCache: true,
    requiresObservability: false,
    requiresGuardrails: false,
  },
  scale: {
    maxAcceptableP99Ms: 200,
    minAcceptableAvailability: 0.9999,
    replicasRequiredForHA: 2,
    requiresLoadBalancer: true,
    requiresCache: true,
    requiresObservability: true,
    requiresGuardrails: true,
  },
  enterprise: {
    maxAcceptableP99Ms: 100,
    minAcceptableAvailability: 0.99999,
    replicasRequiredForHA: 3,
    requiresLoadBalancer: true,
    requiresCache: true,
    requiresObservability: true,
    requiresGuardrails: true,
  },
};

// ─── Signal 1: Traffic → Tier ────────────────────────────────────────────

function trafficToTier(rps: number): ScaleTier {
  if (rps <= 500) return "prototype";
  if (rps <= 5_000) return "startup";
  if (rps <= 50_000) return "growth";
  if (rps <= 500_000) return "scale";
  return "enterprise";
}

// ─── Signal 2: Architecture complexity → Tier ────────────────────────────

function architectureComplexityTier(
  nodes: Node<SystemNodeData>[],
  edges: Edge<SystemEdgeData>[]
): ScaleTier {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const types = nodes.map((n) => n.data.componentType);

  const hasMultipleServices =
    types.filter((t) =>
      [
        "api-server",
        "web-server",
        "microservice",
        "serverless-function",
        "container-pod",
      ].includes(t)
    ).length >= 3;

  const hasServiceMesh =
    types.filter((t) =>
      [
        "api-server",
        "web-server",
        "microservice",
        "serverless-function",
        "container-pod",
      ].includes(t)
    ).length >= 5;

  const dbTypeSet = new Set(
    types.filter((t) =>
      ["postgresql", "mysql", "mongodb", "cassandra", "dynamodb"].includes(t)
    )
  );
  const hasMultipleDBTypes = dbTypeSet.size >= 2;

  const hasMessageQueue = types.some((t) =>
    ["kafka", "message-queue", "pub-sub", "event-stream"].includes(t)
  );
  const hasCDN = types.includes("cdn");

  const regions = nodes.map((n) => n.data.config?.region).filter(Boolean);
  const hasMultipleRegions = new Set(regions).size >= 2;

  const hasMLOps = types.some((t) =>
    [
      "training-cluster",
      "model-registry",
      "feature-store",
      "drift-detector",
    ].includes(t)
  );

  const obsCount = types.filter((t) =>
    ["metrics-collector", "log-aggregator", "distributed-tracer"].includes(t)
  ).length;
  const hasObservabilityStack = obsCount >= 2;

  const advancedAICount = types.filter((t) =>
    [
      "agent-orchestrator",
      "rag-pipeline",
      "model-router",
      "llm-observability",
    ].includes(t)
  ).length;
  const hasAdvancedAI = advancedAICount >= 2;

  let score = 0;
  if (nodeCount >= 4) score += 1;
  if (nodeCount >= 8) score += 1;
  if (nodeCount >= 14) score += 2;
  if (nodeCount >= 20) score += 2;
  if (edgeCount >= 8) score += 1;
  if (hasMultipleServices) score += 2;
  if (hasServiceMesh) score += 2;
  if (hasMultipleDBTypes) score += 1;
  if (hasMessageQueue) score += 2;
  if (hasCDN) score += 2;
  if (hasMultipleRegions) score += 3;
  if (hasMLOps) score += 3;
  if (hasObservabilityStack) score += 2;
  if (hasAdvancedAI) score += 2;

  if (score >= 12) return "enterprise";
  if (score >= 8) return "scale";
  if (score >= 5) return "growth";
  if (score >= 2) return "startup";
  return "prototype";
}

// ─── Signal 3: Scenario → Tier ───────────────────────────────────────────

function scenarioToTier(scenarioId: string): ScaleTier {
  const map: Record<string, ScaleTier> = {
    "basic-web-app": "startup",
    "design-twitter": "enterprise",
    "netflix-streaming": "enterprise",
    "ride-sharing": "scale",
    "url-shortener": "growth",
    "flash-sale": "scale",
    "distributed-database": "scale",
    "build-chatgpt": "enterprise",
    "rag-enterprise": "scale",
    "multi-agent": "scale",
    "fraud-detection": "enterprise",
    "scale-llm-100m": "enterprise",
  };
  return map[scenarioId] ?? "startup";
}

// ─── Signal 4: Component mix → Tier ──────────────────────────────────────

function componentMixTier(nodes: Node<SystemNodeData>[]): ScaleTier {
  const types = nodes.map((n) => n.data.componentType);

  const enterpriseIndicators = [
    "training-cluster",
    "drift-detector",
    "ab-test-controller",
    "feature-store",
    "data-warehouse",
  ];

  const scaleIndicators = [
    "kafka",
    "cdn",
    "distributed-tracer",
    "llm-observability",
    "model-registry",
    "agent-orchestrator",
  ];

  const growthIndicators = [
    "message-queue",
    "api-gateway",
    "reverse-proxy",
    "metrics-collector",
    "rag-pipeline",
    "event-stream",
    "pub-sub",
  ];

  if (types.some((t) => enterpriseIndicators.includes(t))) return "enterprise";
  if (types.some((t) => scaleIndicators.includes(t))) return "scale";
  if (types.some((t) => growthIndicators.includes(t))) return "growth";
  return "prototype";
}

// ─── Resolve: MAX of all signals ─────────────────────────────────────────

const TIER_ORDER: ScaleTier[] = [
  "prototype",
  "startup",
  "growth",
  "scale",
  "enterprise",
];

function maxTier(...tiers: (ScaleTier | null)[]): ScaleTier {
  let best: ScaleTier = "prototype";
  for (const t of tiers) {
    if (t && TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(best)) best = t;
  }
  return best;
}

// ─── Resolve Context ─────────────────────────────────────────────────────

export function resolveValidationContext(
  nodes: Node<SystemNodeData>[],
  edges: Edge<SystemEdgeData>[],
  _metrics: MetricSnapshot,
  trafficLoad: number,
  trafficPattern: string,
  activeScenario: ScenarioDefinition | null
): ValidationContext {
  const componentCount = nodes.length;
  const hasAI = nodes.some((n) => n.data.isAI);

  const serverTypes = [
    "api-server",
    "web-server",
    "microservice",
    "serverless-function",
    "container-pod",
  ];
  const dbTypes = ["postgresql", "mysql", "mongodb", "cassandra", "dynamodb"];
  const serverNodes = nodes.filter((n) =>
    serverTypes.includes(n.data.componentType)
  );
  const dbNodes = nodes.filter((n) => dbTypes.includes(n.data.componentType));
  const isMonolith = serverNodes.length <= 1 && dbNodes.length <= 1;

  // 4-signal scale detection
  const trafficTier = trafficToTier(trafficLoad);
  const complexityTier = architectureComplexityTier(nodes, edges);
  const componentTier = componentMixTier(nodes);
  const scenTier = activeScenario ? scenarioToTier(activeScenario.id) : null;

  const scaleTier = maxTier(
    trafficTier,
    complexityTier,
    componentTier,
    scenTier
  );

  const signals: ScaleTierSignals = {
    trafficTier,
    complexityTier,
    componentTier,
    scenarioTier: scenTier,
    resolvedTier: scaleTier,
  };

  // Build thresholds — scenario overrides defaults
  const defaults = TIER_THRESHOLDS[scaleTier];
  const scenarioTargets = activeScenario?.targets;
  const thresholds: ContextThresholds = {
    maxAcceptableP99Ms:
      scenarioTargets?.maxLatencyP95 ?? defaults.maxAcceptableP99Ms,
    minAcceptableAvailability:
      scenarioTargets?.minAvailability ?? defaults.minAcceptableAvailability,
    replicasRequiredForHA: defaults.replicasRequiredForHA,
    requiresLoadBalancer: defaults.requiresLoadBalancer,
    requiresCache: defaults.requiresCache,
    requiresObservability: defaults.requiresObservability,
    requiresGuardrails: defaults.requiresGuardrails,
  };

  return {
    currentRPS: trafficLoad,
    trafficPattern,
    scaleTier,
    scaleTierLabel: TIER_LABELS[scaleTier],
    scaleTierSignals: signals,
    mode: activeScenario ? "scenario" : "freeform",
    scenarioName: activeScenario?.name,
    componentCount,
    hasAIComponents: hasAI,
    isMonolith,
    thresholds,
  };
}

// ─── Contextual Verdict ──────────────────────────────────────────────────

export interface ContextualVerdict {
  badge: string;
  badgeColor: string;
  headline: string;
  detail: string;
  isPositive: boolean;
}

export function computeVerdict(
  overallScore: number,
  failedCriticalCount: number,
  advisoryCount: number,
  ctx: ValidationContext
): ContextualVerdict {
  if (failedCriticalCount === 0 && overallScore >= 85) {
    return {
      badge:
        ctx.scaleTier === "enterprise"
          ? "✅ Production Ready"
          : "✅ Sound Architecture",
      badgeColor: "#00ff88",
      headline: `Well-designed for ${ctx.scaleTierLabel}.`,
      detail:
        advisoryCount > 0
          ? `Your architecture handles current requirements effectively. ${advisoryCount} advisory item${
              advisoryCount > 1 ? "s" : ""
            } to address before scaling to the next tier.`
          : "No significant gaps detected.",
      isPositive: true,
    };
  }

  if (failedCriticalCount === 0 && overallScore >= 65) {
    return {
      badge: "⚠️ Functional — Gaps to Address",
      badgeColor: "#ffb800",
      headline: `Functionally correct at ${ctx.scaleTierLabel}, with gaps to address before scaling.`,
      detail: `No critical failures at your current traffic level (${ctx.currentRPS.toLocaleString()} req/s). The advisory items below will become requirements as traffic grows.`,
      isPositive: true,
    };
  }

  if (
    failedCriticalCount === 0 &&
    ctx.scaleTier === "prototype" &&
    overallScore >= 50
  ) {
    return {
      badge: "✅ Appropriate for Scale",
      badgeColor: "#00f5ff",
      headline: `Reasonable prototype architecture at ${ctx.scaleTierLabel}.`,
      detail:
        "Single-instance components and minimal redundancy are acceptable at this scale. The advisory items will matter when you target higher availability or traffic.",
      isPositive: true,
    };
  }

  return {
    badge: `❌ ${failedCriticalCount} Critical Issue${
      failedCriticalCount > 1 ? "s" : ""
    }`,
    badgeColor: "#ff3860",
    headline: `${failedCriticalCount} critical issue${
      failedCriticalCount > 1 ? "s" : ""
    } require attention.`,
    detail:
      "These issues cause real problems at your current scale and traffic level. Address the top issues first.",
    isPositive: false,
  };
}
