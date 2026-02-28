import { create } from "zustand";
import {
  type Node,
  type Edge,
  type Connection,
  Position,
  addEdge as rfAddEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "reactflow";
import type {
  SystemNodeData,
  ComponentType,
  NodeConfig,
} from "../types/components";
import { isAIComponentType } from "../types/components";
import { COMPONENT_MAP } from "../constants/componentDefinitions";

let nodeIdCounter = 0;

function createNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

interface CanvasStore {
  nodes: Node<SystemNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  addNode: (
    type: ComponentType,
    position: { x: number; y: number },
    isAI?: boolean
  ) => string;
  removeNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Partial<NodeConfig>) => void;
  updateNodeData: (id: string, data: Partial<SystemNodeData>) => void;
  addEdge: (connection: Connection) => void;
  removeEdge: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  clearCanvas: () => void;
  loadNodes: (nodes: Node<SystemNodeData>[], edges: Edge[]) => void;
  duplicateNode: (id: string) => void;
  addReplica: (id: string) => void;
  setNodeFailed: (id: string, failed: boolean) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  addNode: (type, position, isAI) => {
    const def = COMPONENT_MAP.get(type);
    if (!def) return "";

    const id = createNodeId();
    const aiFlag = isAI ?? isAIComponentType(type);

    const newNode: Node<SystemNodeData> = {
      id,
      type: "systemNode",
      position,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
      style: { width: 180 },
      data: {
        componentType: type,
        config: {
          label: def.name,
          replicas: 1,
          region: "us-east-1",
          ...def.defaultConfig,
        } as NodeConfig,
        status: "healthy",
        currentLoad: 0,
        currentRPS: 0,
        errorRate: 0,
        isSPOF: false,
        isBottleneck: false,
        isFailed: false,
        isAI: aiFlag,
      },
    };

    set((state) => ({ nodes: [...state.nodes, newNode] }));
    return id;
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  updateNodeConfig: (id, config) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: { ...n.data, config: { ...n.data.config, ...config } },
            }
          : n
      ),
    }));
  },

  updateNodeData: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  addEdge: (connection) => {
    const state = get();
    const sourceNode = state.nodes.find((n) => n.id === connection.source);
    const targetNode = state.nodes.find((n) => n.id === connection.target);
    const isAIEdge = !!(sourceNode?.data.isAI || targetNode?.data.isAI);

    set((s) => ({
      edges: rfAddEdge(
        {
          ...connection,
          type: isAIEdge ? "tokenStream" : "animatedFlow",
          animated: true,
          data: {
            isAIEdge,
            tokensPerSec: isAIEdge ? 0 : undefined,
            timeToFirstToken: isAIEdge ? 0 : undefined,
            costPerRequest: isAIEdge ? 0 : undefined,
          },
        },
        s.edges
      ),
    }));
  },

  removeEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
    }));
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id });
  },

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<SystemNodeData>[],
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  clearCanvas: () => {
    set({ nodes: [], edges: [], selectedNodeId: null });
    nodeIdCounter = 0;
  },

  loadNodes: (nodes, edges) => {
    const maxId = nodes.reduce((max, n) => {
      const num = parseInt(n.id.replace("node-", ""), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    nodeIdCounter = maxId;
    set({ nodes, edges, selectedNodeId: null });
  },

  duplicateNode: (id) => {
    const state = get();
    const original = state.nodes.find((n) => n.id === id);
    if (!original) return;

    const newId = createNodeId();
    const newNode: Node<SystemNodeData> = {
      ...original,
      id: newId,
      position: {
        x: original.position.x + 50,
        y: original.position.y + 50,
      },
      data: {
        ...original.data,
        config: {
          ...original.data.config,
          label: original.data.config.label + " (copy)",
        },
      },
    };

    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  addReplica: (id) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === id);
    if (!node) return;
    const def = COMPONENT_MAP.get(node.data.componentType);
    if (!def?.isHorizontallyScalable) return;

    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                config: {
                  ...n.data.config,
                  replicas: (n.data.config.replicas || 1) + 1,
                },
              },
            }
          : n
      ),
    }));
  },

  setNodeFailed: (id, failed) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                isFailed: failed,
                status: failed ? "failed" : "healthy",
              },
            }
          : n
      ),
    }));
  },
}));
