// ─── Share Encoder ──────────────────────────────────────────────────────────
// Serializes canvas state to a compact URL param and deserializes it back.

import type { Node, Edge } from "reactflow";
import type { SystemNodeData, ComponentType } from "../types/components";
import { isAIComponentType } from "../types/components";

interface CompactNode {
  i: string;
  t: string;
  x: number;
  y: number;
  l: string;
  r: number;
  ai: boolean;
}

interface CompactEdge {
  i: string;
  s: string;
  t: string;
  tp: string;
}

interface SharePayload {
  v: number;
  t: string;
  n: CompactNode[];
  e: CompactEdge[];
}

export class ShareEncoder {
  static encode(
    nodes: Node<SystemNodeData>[],
    edges: Edge[],
    title: string
  ): string {
    const payload: SharePayload = {
      v: 1,
      t: title,
      n: nodes.map((n) => ({
        i: n.id,
        t: n.data.componentType,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        l: n.data.config.label,
        r: n.data.config.replicas ?? 1,
        ai: !!n.data.isAI,
      })),
      e: edges.map((e) => ({
        i: e.id,
        s: e.source,
        t: e.target,
        tp: e.type ?? "animatedFlow",
      })),
    };

    const json = JSON.stringify(payload);
    const compressed = btoa(unescape(encodeURIComponent(json)));
    return `${window.location.origin}${window.location.pathname}?arch=${compressed}`;
  }

  static decode(
    urlParam: string
  ): { nodes: Node<SystemNodeData>[]; edges: Edge[]; title: string } | null {
    try {
      const json = decodeURIComponent(escape(atob(urlParam)));
      const payload: SharePayload = JSON.parse(json);
      if (payload.v !== 1) return null;

      const nodes: Node<SystemNodeData>[] = payload.n.map((cn) => ({
        id: cn.i,
        type: "systemNode",
        position: { x: cn.x, y: cn.y },
        draggable: true,
        style: { width: 180 },
        data: {
          componentType: cn.t as ComponentType,
          config: {
            label: cn.l,
            replicas: cn.r,
            region: "us-east-1",
          },
          status: "healthy" as const,
          currentLoad: 0,
          currentRPS: 0,
          errorRate: 0,
          isSPOF: false,
          isBottleneck: false,
          isFailed: false,
          isAI: cn.ai ?? isAIComponentType(cn.t),
        },
      }));

      const edges: Edge[] = payload.e.map((ce) => ({
        id: ce.i,
        source: ce.s,
        target: ce.t,
        type: ce.tp ?? "animatedFlow",
        animated: true,
      }));

      return { nodes, edges, title: payload.t };
    } catch {
      return null;
    }
  }
}
