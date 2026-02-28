import type { Node, Edge } from "reactflow";
import type { SystemNodeData } from "../types/components";
import { COMPONENT_MAP } from "../constants/componentDefinitions";

export interface TopologyAnalysis {
  criticalPath: string[];
  criticalPathLatency: number;
  spofNodeIds: string[];
  bottleneckNodeId: string | null;
  networkHops: number;
  redundancyGroups: Map<string, string[]>;
  hasClients: boolean;
  hasStorage: boolean;
  hasCaches: boolean;
  hasQueues: boolean;
}

/** Build an adjacency list from React Flow edges */
function buildAdjacencyList(edges: Edge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }
  return adj;
}

/** Build reverse adjacency list */
function buildReverseAdjacency(edges: Edge[]): Map<string, string[]> {
  const rev = new Map<string, string[]>();
  for (const edge of edges) {
    if (!rev.has(edge.target)) rev.set(edge.target, []);
    rev.get(edge.target)!.push(edge.source);
  }
  return rev;
}

/** Find all source nodes (no incoming edges) */
function findSourceNodes(
  nodes: Node<SystemNodeData>[],
  edges: Edge[]
): string[] {
  const targets = new Set(edges.map((e) => e.target));
  return nodes.filter((n) => !targets.has(n.id)).map((n) => n.id);
}

/** Find all sink nodes (no outgoing edges) */
function findSinkNodes(nodes: Node<SystemNodeData>[], edges: Edge[]): string[] {
  const sources = new Set(edges.map((e) => e.source));
  return nodes.filter((n) => !sources.has(n.id)).map((n) => n.id);
}

/** Find the longest-latency path from any source to any sink (critical path) */
function findCriticalPath(
  nodes: Node<SystemNodeData>[],
  edges: Edge[]
): { path: string[]; latency: number } {
  const adj = buildAdjacencyList(edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const sources = findSourceNodes(nodes, edges);

  if (sources.length === 0 && nodes.length > 0) {
    // All nodes have incoming edges - pick first node
    return { path: [nodes[0].id], latency: getNodeLatency(nodes[0]) };
  }

  let bestPath: string[] = [];
  let bestLatency = 0;

  function dfs(
    nodeId: string,
    path: string[],
    totalLatency: number,
    visited: Set<string>
  ) {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const latency = totalLatency + getNodeLatency(node);
    path.push(nodeId);

    const neighbors = adj.get(nodeId) || [];
    const unvisited = neighbors.filter((n) => !visited.has(n));

    if (unvisited.length === 0) {
      // Leaf — check if best
      if (latency > bestLatency) {
        bestLatency = latency;
        bestPath = [...path];
      }
    } else {
      for (const next of unvisited) {
        visited.add(next);
        dfs(next, path, latency, visited);
        visited.delete(next);
      }
    }

    path.pop();
  }

  for (const src of sources) {
    const visited = new Set([src]);
    dfs(src, [], 0, visited);
  }

  if (bestPath.length === 0 && nodes.length > 0) {
    bestPath = [nodes[0].id];
    bestLatency = getNodeLatency(nodes[0]);
  }

  return { path: bestPath, latency: bestLatency };
}

function getNodeLatency(node: Node<SystemNodeData>): number {
  const def = COMPONENT_MAP.get(node.data.componentType);
  return def?.baseLatency ?? 10;
}

/** Identify SPOFs: nodes that, if removed, disconnect a source from a sink */
function findSPOFs(nodes: Node<SystemNodeData>[], edges: Edge[]): string[] {
  if (nodes.length <= 1) return nodes.map((n) => n.id);

  const spofs: string[] = [];
  const adj = buildAdjacencyList(edges);
  const sources = findSourceNodes(nodes, edges);
  const sinks = findSinkNodes(nodes, edges);

  // A node is a SPOF if it has no replica and lies on the only path between a source and sink
  const reverseAdj = buildReverseAdjacency(edges);

  for (const node of nodes) {
    // Clients and observability nodes aren't SPOFs in the traditional sense
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (def?.category === "clients" || def?.category === "observability")
      continue;

    // Check if node has replicas
    if (node.data.config.replicas > 1) continue;

    // Check if removing this node disconnects any source → sink path
    const nodeId = node.id;
    const remainingNodes = new Set(nodes.map((n) => n.id));
    remainingNodes.delete(nodeId);

    const remainingAdj = new Map<string, string[]>();
    for (const [src, tgts] of adj) {
      if (src === nodeId) continue;
      remainingAdj.set(
        src,
        tgts.filter((t) => t !== nodeId)
      );
    }

    // BFS from each source to check if any sink is still reachable
    let disconnects = false;
    for (const src of sources) {
      if (src === nodeId) continue;
      const reachable = new Set<string>();
      const queue = [src];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (reachable.has(cur)) continue;
        reachable.add(cur);
        for (const next of remainingAdj.get(cur) || []) {
          if (!reachable.has(next)) queue.push(next);
        }
      }
      // Check if any sink that was previously reachable is now unreachable
      for (const sink of sinks) {
        if (sink === nodeId) continue;
        // Was this sink reachable via this node? Check if sink had path through nodeId
        if (!reachable.has(sink)) {
          // Check if there was a path before
          const origReachable = new Set<string>();
          const origQueue = [src];
          while (origQueue.length > 0) {
            const c = origQueue.shift()!;
            if (origReachable.has(c)) continue;
            origReachable.add(c);
            for (const n of adj.get(c) || []) {
              if (!origReachable.has(n)) origQueue.push(n);
            }
          }
          if (origReachable.has(sink)) {
            disconnects = true;
            break;
          }
        }
      }
      if (disconnects) break;
    }

    if (disconnects) {
      spofs.push(nodeId);
    }
  }

  // If there's only one node on a critical path segment and it's not a client, it's an SPOF
  // Simplified: non-client nodes with replicas=1 on the critical path are SPOFs
  const { path: critPath } = findCriticalPath(nodes, edges);
  for (const nid of critPath) {
    const node = nodes.find((n) => n.id === nid);
    if (!node) continue;
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (def?.category === "clients" || def?.category === "observability")
      continue;
    if (node.data.config.replicas <= 1 && !spofs.includes(nid)) {
      spofs.push(nid);
    }
  }

  return [...new Set(spofs)];
}

/** Find the bottleneck node on the critical path */
function findBottleneck(
  nodes: Node<SystemNodeData>[],
  criticalPath: string[]
): string | null {
  if (criticalPath.length === 0) return null;

  let minThroughput = Infinity;
  let bottleneckId: string | null = null;

  for (const nid of criticalPath) {
    const node = nodes.find((n) => n.id === nid);
    if (!node) continue;
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (!def) continue;
    if (def.category === "clients") continue;

    const effectiveThroughput =
      def.maxThroughput * (node.data.config.replicas || 1);
    if (effectiveThroughput < minThroughput) {
      minThroughput = effectiveThroughput;
      bottleneckId = nid;
    }
  }

  return bottleneckId;
}

/** Group nodes by component type to identify redundancy */
function findRedundancyGroups(
  nodes: Node<SystemNodeData>[]
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const node of nodes) {
    const type = node.data.componentType;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(node.id);
  }
  return groups;
}

/** Full topology analysis */
export function analyzeTopology(
  nodes: Node<SystemNodeData>[],
  edges: Edge[]
): TopologyAnalysis {
  if (nodes.length === 0) {
    return {
      criticalPath: [],
      criticalPathLatency: 0,
      spofNodeIds: [],
      bottleneckNodeId: null,
      networkHops: 0,
      redundancyGroups: new Map(),
      hasClients: false,
      hasStorage: false,
      hasCaches: false,
      hasQueues: false,
    };
  }

  const { path, latency } = findCriticalPath(nodes, edges);
  const spofs = findSPOFs(nodes, edges);
  const bottleneck = findBottleneck(nodes, path);
  const groups = findRedundancyGroups(nodes);

  const typeCheck = (cats: string[]) =>
    nodes.some((n) => {
      const def = COMPONENT_MAP.get(n.data.componentType);
      return def && cats.includes(def.category);
    });

  const cacheTypes = ["redis-cache", "memcached"];
  const queueTypes = ["message-queue", "event-stream", "pub-sub"];

  return {
    criticalPath: path,
    criticalPathLatency: latency,
    spofNodeIds: spofs,
    bottleneckNodeId: bottleneck,
    networkHops: Math.max(0, path.length - 1),
    redundancyGroups: groups,
    hasClients: typeCheck(["clients"]),
    hasStorage: typeCheck(["storage"]),
    hasCaches: nodes.some((n) => cacheTypes.includes(n.data.componentType)),
    hasQueues: nodes.some((n) => queueTypes.includes(n.data.componentType)),
  };
}
