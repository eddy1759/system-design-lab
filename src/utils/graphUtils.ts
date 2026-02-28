import type { Node, Edge } from "reactflow";
import type { SystemNodeData } from "../types/components";

/** Get all nodes connected downstream of a given node */
export function getDownstreamNodes(
  nodeId: string,
  nodes: Node<SystemNodeData>[],
  edges: Edge[]
): string[] {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  const result: string[] = [];
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current !== nodeId) result.push(current);
    for (const next of adj.get(current) || []) {
      queue.push(next);
    }
  }

  return result;
}

/** Get all nodes connected upstream of a given node */
export function getUpstreamNodes(nodeId: string, edges: Edge[]): string[] {
  const rev = new Map<string, string[]>();
  for (const edge of edges) {
    if (!rev.has(edge.target)) rev.set(edge.target, []);
    rev.get(edge.target)!.push(edge.source);
  }

  const result: string[] = [];
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current !== nodeId) result.push(current);
    for (const next of rev.get(current) || []) {
      queue.push(next);
    }
  }

  return result;
}
