import type { Node, Edge } from "reactflow";
import type { SystemNodeData } from "../types/components";
import type { MetricSnapshot } from "../types/metrics";
import { COMPONENT_MAP } from "../constants/componentDefinitions";
import { analyzeTopology, type TopologyAnalysis } from "./GraphTraversal";

/**
 * Compute all system metrics from current topology and traffic load.
 * All functions are pure — no side effects.
 */

export function computeMetrics(
  nodes: Node<SystemNodeData>[],
  edges: Edge[],
  trafficLoad: number
): MetricSnapshot {
  const topology = analyzeTopology(nodes, edges);

  const throughput = computeThroughput(nodes, topology, trafficLoad);
  const { p50, p95, p99 } = computeLatency(nodes, topology);
  const availability = computeAvailability(nodes, topology);
  const errorRate = computeErrorRate(nodes, topology, trafficLoad);
  const consistencyModel = computeConsistency(nodes);
  const capState = computeCAPState(nodes);
  const cacheHitRate = computeCacheHitRate(nodes, topology);
  const dbReadWriteRatio = computeDBReadWriteRatio(nodes);
  const scalabilityScore = computeScalabilityScore(nodes, topology);
  const monthlyCost = computeMonthlyCost(nodes);
  const queueDepth = computeQueueDepth(
    nodes,
    topology,
    trafficLoad,
    throughput
  );

  return {
    timestamp: Date.now(),
    throughput,
    latencyP50: p50,
    latencyP95: p95,
    latencyP99: p99,
    availability,
    errorRate,
    networkHops: topology.networkHops,
    consistencyModel,
    cacheHitRate,
    dbReadWriteRatio,
    scalabilityScore,
    monthlyCost,
    queueDepth,
    capState,
  };
}

/** Throughput = min capacity along critical path */
function computeThroughput(
  nodes: Node<SystemNodeData>[],
  topology: TopologyAnalysis,
  trafficLoad: number
): number {
  if (topology.criticalPath.length === 0) return 0;

  let minCapacity = Infinity;
  for (const nid of topology.criticalPath) {
    const node = nodes.find((n) => n.id === nid);
    if (!node) continue;
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (!def || def.category === "clients") continue;
    const capacity = def.maxThroughput * (node.data.config.replicas || 1);
    if (capacity < minCapacity) minCapacity = capacity;
  }

  if (minCapacity === Infinity) return trafficLoad;
  return Math.min(trafficLoad, minCapacity);
}

/** Latency = sum of base latencies on critical path + network hop overhead */
function computeLatency(
  nodes: Node<SystemNodeData>[],
  topology: TopologyAnalysis
): { p50: number; p95: number; p99: number } {
  if (topology.criticalPath.length === 0) return { p50: 0, p95: 0, p99: 0 };

  let totalLatency = 0;
  for (const nid of topology.criticalPath) {
    const node = nodes.find((n) => n.id === nid);
    if (!node) continue;
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (!def) continue;
    totalLatency += def.baseLatency;
  }

  // Add network hop overhead (2ms per hop)
  totalLatency += topology.networkHops * 2;

  // Cache hit reduces effective latency
  const hasCaches = nodes.some(
    (n) =>
      n.data.componentType === "redis-cache" ||
      n.data.componentType === "memcached"
  );
  if (hasCaches) {
    totalLatency *= 0.6; // Approximate 40% reduction from caching
  }

  const p50 = Math.round(totalLatency);
  const p95 = Math.round(totalLatency * 1.4);
  const p99 = Math.round(totalLatency * 2.1);

  return { p50, p95, p99 };
}

/** Availability = 1 - product of unavailability for each SPOF */
function computeAvailability(
  nodes: Node<SystemNodeData>[],
  topology: TopologyAnalysis
): number {
  if (nodes.length === 0) return 0;
  if (topology.spofNodeIds.length === 0) return 0.99999;

  let unavailability = 1;
  for (const spofId of topology.spofNodeIds) {
    const node = nodes.find((n) => n.id === spofId);
    if (!node) continue;
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (!def) continue;
    unavailability *= 1 - def.availabilitySLA;
  }

  // availability = 1 - overall unavailability
  return Math.min(0.99999, 1 - unavailability);
}

/** Error rate under load */
function computeErrorRate(
  nodes: Node<SystemNodeData>[],
  topology: TopologyAnalysis,
  trafficLoad: number
): number {
  if (topology.criticalPath.length === 0) return 0;

  let maxErrorRate = 0;
  for (const nid of topology.criticalPath) {
    const node = nodes.find((n) => n.id === nid);
    if (!node) continue;
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (!def || def.category === "clients") continue;

    const capacity = def.maxThroughput * (node.data.config.replicas || 1);
    const loadRatio = trafficLoad / capacity;

    let errorRate = 0;
    if (loadRatio > 1) {
      errorRate = Math.min(
        1,
        def.failureRateAtCapacity + (loadRatio - 1) * 0.5
      );
    } else if (loadRatio > 0.8) {
      errorRate = def.failureRateAtCapacity * ((loadRatio - 0.8) / 0.2);
    }

    if (errorRate > maxErrorRate) maxErrorRate = errorRate;
  }

  // Failed nodes contribute 100% error on their path
  const failedOnPath = topology.criticalPath.some((nid) => {
    const node = nodes.find((n) => n.id === nid);
    return node?.data.isFailed;
  });

  if (failedOnPath) return 1;

  return Math.round(maxErrorRate * 10000) / 10000;
}

/** Consistency = most relaxed model in the write path */
function computeConsistency(nodes: Node<SystemNodeData>[]): string {
  const storageNodes = nodes.filter((n) => {
    const def = COMPONENT_MAP.get(n.data.componentType);
    return def?.category === "storage";
  });

  if (storageNodes.length === 0) return "N/A";

  const models = storageNodes.map((n) => {
    const def = COMPONENT_MAP.get(n.data.componentType);
    return def?.consistencyModel ?? "eventual";
  });

  if (models.includes("eventual")) return "Eventual";
  if (models.includes("causal")) return "Causal";
  return "Strong";
}

/** CAP state derived from database nodes */
function computeCAPState(nodes: Node<SystemNodeData>[]): string {
  const storageNodes = nodes.filter((n) => {
    const def = COMPONENT_MAP.get(n.data.componentType);
    return def?.category === "storage";
  });

  if (storageNodes.length === 0) return "N/A";

  const alignments = new Set(
    storageNodes.map((n) => {
      const def = COMPONENT_MAP.get(n.data.componentType);
      return def?.capAlignment ?? "AP";
    })
  );

  if (alignments.size === 1) return [...alignments][0];
  if (alignments.has("CP") && alignments.has("AP")) return "CP + AP (mixed)";
  return [...alignments].join(" + ");
}

/** Cache hit rate (simulated) */
function computeCacheHitRate(
  nodes: Node<SystemNodeData>[],
  topology: TopologyAnalysis
): number | null {
  if (!topology.hasCaches) return null;
  // Base 80% hit rate, improves slightly with more cache replicas
  const cacheNodes = nodes.filter(
    (n) =>
      n.data.componentType === "redis-cache" ||
      n.data.componentType === "memcached"
  );
  const totalReplicas = cacheNodes.reduce(
    (sum, n) => sum + (n.data.config.replicas || 1),
    0
  );
  return Math.min(0.95, 0.8 + totalReplicas * 0.02);
}

/** DB read/write ratio */
function computeDBReadWriteRatio(nodes: Node<SystemNodeData>[]): number | null {
  const hasDB = nodes.some((n) => {
    const def = COMPONENT_MAP.get(n.data.componentType);
    return (
      def?.category === "storage" &&
      !["redis-cache", "memcached", "object-storage"].includes(
        n.data.componentType
      )
    );
  });
  if (!hasDB) return null;
  // Default 80/20 read/write ratio
  return 0.8;
}

/** Scalability score 0-100 */
function computeScalabilityScore(
  nodes: Node<SystemNodeData>[],
  topology: TopologyAnalysis
): number {
  if (nodes.length === 0) return 0;

  let score = 50; // baseline

  // Bonus for horizontally scalable components
  const nonClientNodes = nodes.filter((n) => {
    const def = COMPONENT_MAP.get(n.data.componentType);
    return def && def.category !== "clients";
  });

  if (nonClientNodes.length === 0) return 0;

  const scalableRatio =
    nonClientNodes.filter((n) => {
      const def = COMPONENT_MAP.get(n.data.componentType);
      return def?.isHorizontallyScalable;
    }).length / nonClientNodes.length;

  score += scalableRatio * 20;

  // Bonus for having load balancer
  if (nodes.some((n) => n.data.componentType === "load-balancer")) score += 10;

  // Bonus for having cache
  if (topology.hasCaches) score += 10;

  // Penalty for SPOFs
  score -= topology.spofNodeIds.length * 5;

  // Bonus for replicas
  const avgReplicas =
    nonClientNodes.reduce((s, n) => s + (n.data.config.replicas || 1), 0) /
    nonClientNodes.length;
  if (avgReplicas > 1) score += Math.min(10, (avgReplicas - 1) * 5);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Monthly cost */
function computeMonthlyCost(nodes: Node<SystemNodeData>[]): number {
  return nodes.reduce((total, node) => {
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (!def) return total;
    return (
      total + def.costPerInstancePerMonth * (node.data.config.replicas || 1)
    );
  }, 0);
}

/** Queue depth (simulated) */
function computeQueueDepth(
  nodes: Node<SystemNodeData>[],
  topology: TopologyAnalysis,
  trafficLoad: number,
  throughput: number
): number | null {
  if (!topology.hasQueues) return null;
  // Queue depth grows when traffic > throughput
  const overflow = Math.max(0, trafficLoad - throughput);
  return Math.round(overflow * 0.1);
}
