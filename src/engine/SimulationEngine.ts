import type { Node, Edge } from "reactflow";
import type { SystemNodeData } from "../types/components";
import type { MetricSnapshot, SystemAlert } from "../types/metrics";
import { COMPONENT_MAP } from "../constants/componentDefinitions";
import { computeMetrics } from "./MetricsCalculator";
import { analyzeTopology } from "./GraphTraversal";

/**
 * Core simulation engine.
 * Runs on each tick, propagates load through graph, updates node states,
 * and computes metrics.
 */

export interface SimulationResult {
  metrics: MetricSnapshot;
  nodeUpdates: Map<string, NodeUpdate>;
  alerts: SystemAlert[];
  bottleneckNodeIds: string[];
  spofNodeIds: string[];
}

export interface NodeUpdate {
  currentLoad: number;
  currentRPS: number;
  errorRate: number;
  status: "healthy" | "warning" | "critical" | "failed";
  isBottleneck: boolean;
  isSPOF: boolean;
}

let alertIdCounter = 0;

function makeAlert(
  type: SystemAlert["type"],
  message: string,
  nodeId?: string
): SystemAlert {
  return {
    id: `alert-${++alertIdCounter}`,
    type,
    message,
    nodeId,
    timestamp: Date.now(),
    dismissed: false,
  };
}

/** Propagate traffic load through the graph and compute per-node load */
function propagateLoad(
  nodes: Node<SystemNodeData>[],
  edges: Edge[],
  trafficLoad: number
): Map<string, number> {
  const loadMap = new Map<string, number>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build adjacency
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push(edge.target);
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find source nodes (clients or no incoming edges)
  const sources = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0);

  // Distribute initial traffic evenly among source nodes
  const perSource = sources.length > 0 ? trafficLoad / sources.length : 0;
  for (const src of sources) {
    loadMap.set(src.id, perSource);
  }

  // Topological sort + propagation
  const queue: string[] = sources.map((n) => n.id);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const incomingLoad = loadMap.get(nodeId) || 0;
    const neighbors = adj.get(nodeId) || [];

    if (neighbors.length > 0) {
      // Distribute load among outgoing nodes
      const perNeighbor = incomingLoad / neighbors.length;
      for (const next of neighbors) {
        loadMap.set(next, (loadMap.get(next) || 0) + perNeighbor);
        queue.push(next);
      }
    }
  }

  // Handle nodes that weren't reached
  for (const node of nodes) {
    if (!loadMap.has(node.id)) {
      loadMap.set(node.id, 0);
    }
  }

  return loadMap;
}

/** Run a single simulation tick */
export function simulationTick(
  nodes: Node<SystemNodeData>[],
  edges: Edge[],
  trafficLoad: number,
  previousAlerts: SystemAlert[]
): SimulationResult {
  const topology = analyzeTopology(nodes, edges);
  const loadMap = propagateLoad(nodes, edges, trafficLoad);
  const nodeUpdates = new Map<string, NodeUpdate>();
  const newAlerts: SystemAlert[] = [];

  // Previous alert messages for dedup
  const existingMessages = new Set(previousAlerts.map((a) => a.message));

  for (const node of nodes) {
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (!def) continue;

    const incomingRPS = loadMap.get(node.id) || 0;
    const capacity = def.maxThroughput * (node.data.config.replicas || 1);
    const loadPercent = capacity > 0 ? incomingRPS / capacity : 0;

    let status: NodeUpdate["status"] = "healthy";
    let errorRate = 0;

    if (node.data.isFailed) {
      status = "failed";
      errorRate = 1;
    } else if (loadPercent > 1) {
      status = "critical";
      errorRate = Math.min(
        1,
        def.failureRateAtCapacity + (loadPercent - 1) * 0.5
      );
    } else if (loadPercent > 0.8) {
      status = "warning";
      errorRate = def.failureRateAtCapacity * ((loadPercent - 0.8) / 0.2);
    }

    const isBottleneck = topology.bottleneckNodeId === node.id;
    const isSPOF = topology.spofNodeIds.includes(node.id);

    nodeUpdates.set(node.id, {
      currentLoad: loadPercent,
      currentRPS: incomingRPS,
      errorRate,
      status,
      isBottleneck,
      isSPOF,
    });

    // Generate alerts
    if (
      isSPOF &&
      !existingMessages.has(
        `⚠️ ${node.data.config.label} is a single point of failure`
      )
    ) {
      newAlerts.push(
        makeAlert(
          "warning",
          `⚠️ ${node.data.config.label} is a single point of failure`,
          node.id
        )
      );
    }

    if (
      loadPercent > 0.9 &&
      !existingMessages.has(
        `🔥 ${node.data.config.label} at ${Math.round(
          loadPercent * 100
        )}% capacity — consider scaling`
      )
    ) {
      newAlerts.push(
        makeAlert(
          "error",
          `🔥 ${node.data.config.label} at ${Math.round(
            loadPercent * 100
          )}% capacity — consider scaling`,
          node.id
        )
      );
    }
  }

  const metrics = computeMetrics(nodes, edges, trafficLoad);

  return {
    metrics,
    nodeUpdates,
    alerts: newAlerts,
    bottleneckNodeIds: topology.bottleneckNodeId
      ? [topology.bottleneckNodeId]
      : [],
    spofNodeIds: topology.spofNodeIds,
  };
}

/** Generate educational feedback for user actions */
export function generateFeedback(
  action: string,
  componentType: string,
  previousMetrics: MetricSnapshot | null,
  currentMetrics: MetricSnapshot
): SystemAlert | null {
  const messages: Record<string, string> = {
    "add-redis-cache": `✅ Cache added → Est. latency reduced by ~60%. Cache hit rate assumed 80%. Watch DB load drop.`,
    "add-memcached": `✅ Cache added → Est. latency reduced by ~60%. Cache hit rate assumed 80%.`,
    "add-load-balancer": `✅ Load Balancer added → Throughput doubled. Availability improved. Round Robin distributes evenly.`,
    "add-api-gateway": `✅ API Gateway added → Centralized routing, auth, and rate limiting.`,
    "add-cdn": `✅ CDN added → Static content served from edge. Latency reduced for global users.`,
    "add-message-queue": `📨 Queue added → Decoupled producers/consumers. Throughput buffered. Latency increased by ~15ms but resilience improved.`,
    "add-event-stream": `📨 Kafka added → Event-driven architecture enabled. High throughput with replay capability.`,
    "add-web-server": `✅ Compute added → Additional processing capacity. Consider a load balancer for traffic distribution.`,
    "add-microservice": `✅ Microservice added → Independent deployment and scaling. Watch for network latency between services.`,
    "add-postgresql": `💾 PostgreSQL added → Strong consistency (ACID). CP under CAP theorem. Watch for write scalability limits.`,
    "add-mongodb": `💾 MongoDB added → Flexible schema, horizontal scaling. AP under CAP — eventual consistency.`,
    "add-cassandra": `💾 Cassandra added → Massive write throughput, multi-DC replication. AP under CAP.`,
  };

  const key = `${action}-${componentType}`;
  const msg = messages[key];
  if (!msg) return null;

  return makeAlert("success", msg);
}
