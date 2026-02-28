// ─── Component Type Enums ───────────────────────────────────────────────────

export type ComponentCategory =
  | "clients"
  | "loadbalancing"
  | "compute"
  | "storage"
  | "messaging"
  | "observability"
  | "network"
  | "ai";

export type ComponentType =
  // Classical
  | "web-client"
  | "mobile-client"
  | "api-consumer"
  | "load-balancer"
  | "api-gateway"
  | "cdn"
  | "reverse-proxy"
  | "dns-server"
  | "web-server"
  | "microservice"
  | "serverless-function"
  | "container-pod"
  | "postgresql"
  | "mysql"
  | "mongodb"
  | "cassandra"
  | "dynamodb"
  | "redis-cache"
  | "memcached"
  | "object-storage"
  | "data-warehouse"
  | "message-queue"
  | "event-stream"
  | "pub-sub"
  | "metrics-collector"
  | "log-aggregator"
  | "distributed-tracer"
  | "firewall-waf"
  | "vpn-private-network"
  // AI & ML Infrastructure
  | "llm-inference"
  | "vector-database"
  | "embedding-service"
  | "ai-gateway"
  | "agent-orchestrator"
  | "rag-pipeline"
  | "guardrails"
  | "prompt-cache"
  | "model-registry"
  | "feature-store"
  | "tool-executor"
  | "memory-store"
  | "model-router"
  | "training-cluster"
  | "drift-detector"
  | "llm-observability";

export const AI_COMPONENT_TYPES: ComponentType[] = [
  "llm-inference",
  "vector-database",
  "embedding-service",
  "ai-gateway",
  "agent-orchestrator",
  "rag-pipeline",
  "guardrails",
  "prompt-cache",
  "model-registry",
  "feature-store",
  "tool-executor",
  "memory-store",
  "model-router",
  "training-cluster",
  "drift-detector",
  "llm-observability",
];

export function isAIComponentType(type: string): boolean {
  return AI_COMPONENT_TYPES.includes(type as ComponentType);
}

export type LoadBalancerAlgorithm =
  | "round-robin"
  | "least-connections"
  | "ip-hash";
export type ServerRuntime = "node" | "python" | "java";
export type ConsistencyModel = "strong" | "eventual" | "causal";
export type CAPAlignment = "CP" | "AP" | "CA";
export type TrafficPattern = "steady" | "spike" | "sine-wave" | "flash-sale";

// ─── Component Definition ───────────────────────────────────────────────────

export interface ComponentDefinition {
  type: ComponentType;
  category: ComponentCategory;
  name: string;
  description: string;
  icon: string; // lucide icon name
  maxThroughput: number;
  baseLatency: number;
  failureRateAtCapacity: number;
  isHorizontallyScalable: boolean;
  availabilitySLA: number;
  consistencyModel: ConsistencyModel;
  capAlignment: CAPAlignment;
  costPerInstancePerMonth: number;
  defaultConfig: Record<string, unknown>;
  education: ComponentEducation;
  color: string; // accent color hex
}

export interface ComponentEducation {
  whatIsIt: string;
  whenToUse: string[];
  tradeoffs: { pros: string[]; cons: string[] };
  realWorldExamples: string[];
}

// ─── Node Config ────────────────────────────────────────────────────────────

export interface NodeConfig {
  label: string;
  replicas: number;
  region: string;
  algorithm?: LoadBalancerAlgorithm;
  runtime?: ServerRuntime;
  ttl?: number;
  engine?: string;
  [key: string]: unknown;
}

// ─── System Node / Edge ─────────────────────────────────────────────────────

export interface SystemNodeData {
  componentType: ComponentType;
  config: NodeConfig;
  status: NodeStatus;
  currentLoad: number; // 0-1 ratio
  currentRPS: number;
  errorRate: number;
  isSPOF: boolean;
  isBottleneck: boolean;
  isFailed: boolean;
  isAI?: boolean;
}

export type NodeStatus = "healthy" | "warning" | "critical" | "failed";

export interface SystemEdgeData {
  latency: number;
  throughput: number;
  loadPercent: number;
  isAIEdge?: boolean;
  tokensPerSec?: number;
  timeToFirstToken?: number;
  costPerRequest?: number;
}

// ─── Ports ──────────────────────────────────────────────────────────────────

export interface Port {
  id: string;
  type: "input" | "output";
  position: "left" | "right" | "top" | "bottom";
}
