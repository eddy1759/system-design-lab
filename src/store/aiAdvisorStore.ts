import { create } from "zustand";
import type { Node } from "reactflow";
import type { SystemNodeData } from "../types/components";
import type { MetricSnapshot } from "../types/metrics";

export interface AdvisorMessage {
  id: string;
  type: "critical" | "warning" | "optimization" | "learning";
  title: string;
  body: string;
  action?: { label: string; nodeType?: string; templateId?: string };
  timestamp: number;
  dismissed: boolean;
}

export interface ChatMessage {
  role: "user" | "advisor";
  content: string;
  timestamp: number;
}

interface AIAdvisorStore {
  isOpen: boolean;
  activeRecommendations: AdvisorMessage[];
  chatHistory: ChatMessage[];
  isAnalyzing: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setRecommendations: (msgs: AdvisorMessage[]) => void;
  dismissRecommendation: (id: string) => void;
  sendMessage: (
    text: string,
    nodes: Node<SystemNodeData>[],
    metrics: MetricSnapshot
  ) => void;
}

export const useAIAdvisorStore = create<AIAdvisorStore>((set, get) => ({
  isOpen: false,
  activeRecommendations: [],
  chatHistory: [],
  isAnalyzing: false,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  setRecommendations: (msgs) => set({ activeRecommendations: msgs }),

  dismissRecommendation: (id) =>
    set((s) => ({
      activeRecommendations: s.activeRecommendations.map((m) =>
        m.id === id ? { ...m, dismissed: true } : m
      ),
    })),

  sendMessage: (text, nodes, metrics) => {
    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    set((s) => ({
      chatHistory: [...s.chatHistory, userMsg],
      isAnalyzing: true,
    }));

    // Pattern-match the question to give a meaningful response
    const response = answerQuestion(text, nodes, metrics);
    setTimeout(() => {
      const advisorMsg: ChatMessage = {
        role: "advisor",
        content: response,
        timestamp: Date.now(),
      };
      set((s) => ({
        chatHistory: [...s.chatHistory, advisorMsg],
        isAnalyzing: false,
      }));
    }, 600);
  },
}));

function answerQuestion(
  text: string,
  nodes: Node<SystemNodeData>[],
  metrics: MetricSnapshot
): string {
  const lower = text.toLowerCase();
  const nodeCount = nodes.length;
  const aiNodes = nodes.filter((n) => n.data.isAI);
  const hasLLM = nodes.some((n) => n.data.componentType === "llm-inference");
  const hasCache = nodes.some((n) =>
    ["redis-cache", "memcached", "prompt-cache"].includes(n.data.componentType)
  );
  const hasLB = nodes.some((n) => n.data.componentType === "load-balancer");
  const hasGuardrails = nodes.some(
    (n) => n.data.componentType === "guardrails"
  );
  const hasVectorDB = nodes.some(
    (n) => n.data.componentType === "vector-database"
  );

  if (lower.includes("latency") || lower.includes("slow")) {
    if (metrics.latencyP95 > 500) {
      const suggestions: string[] = [];
      if (!hasCache)
        suggestions.push(
          "• Add a Redis Cache to serve repeated reads in sub-millisecond time."
        );
      if (!hasLB)
        suggestions.push(
          "• Add a Load Balancer to distribute traffic across multiple instances."
        );
      if (hasLLM)
        suggestions.push(
          "• Your LLM adds significant latency (300ms–2s per call). Consider a Prompt Cache for repeated queries or a Model Router to send simple queries to a faster model."
        );
      return `Your P95 latency is ${Math.round(
        metrics.latencyP95
      )}ms, which is high. Here's what I'd recommend:\n\n${suggestions.join(
        "\n"
      )}\n\nFocus on the highest-latency components first — check the Metrics tab for per-component breakdown.`;
    }
    return `Your latency looks healthy at P95: ${Math.round(
      metrics.latencyP95
    )}ms. If you're concerned about specific components, click on a node to see its individual metrics.`;
  }

  if (
    lower.includes("cost") ||
    lower.includes("expensive") ||
    lower.includes("save")
  ) {
    const suggestions: string[] = [];
    if (hasLLM && !nodes.some((n) => n.data.componentType === "prompt-cache")) {
      suggestions.push(
        "• Add a Prompt Cache — can save 30–40% on LLM costs by caching semantically similar queries."
      );
    }
    if (hasLLM && !nodes.some((n) => n.data.componentType === "model-router")) {
      suggestions.push(
        "• Add a Model Router — route simple queries to a cheaper model (e.g., Llama 3.1 8B) while keeping GPT-4 for complex ones. Typical savings: 40–70%."
      );
    }
    suggestions.push(
      `• Current estimated monthly cost: $${Math.round(
        metrics.monthlyCost
      ).toLocaleString()}. Scale replicas based on actual traffic, not peak projections.`
    );
    return `Here are ways to optimize costs:\n\n${suggestions.join("\n")}`;
  }

  if (
    lower.includes("hallucination") ||
    lower.includes("hallucinate") ||
    lower.includes("wrong answer")
  ) {
    if (hasLLM && !hasVectorDB) {
      return "Your LLM generates answers purely from training data. For domain-specific or recent information, add a Vector Database + RAG Pipeline to ground responses in verified documents. This typically reduces hallucination by 50–60%.";
    }
    if (hasLLM && !hasGuardrails) {
      return "Add a Guardrails filter to catch and block hallucinated responses before they reach users. Combined with RAG, this provides defense-in-depth against factual errors.";
    }
    return 'Your architecture has both RAG grounding and guardrails — this is a solid anti-hallucination setup. Monitor the "Hallucination Risk" metric and tune your RAG chunking strategy if it stays above 20%.';
  }

  if (
    lower.includes("production") ||
    lower.includes("ready") ||
    lower.includes("deploy")
  ) {
    const issues: string[] = [];
    if (!hasLB)
      issues.push("• No Load Balancer — single point of entry failure");
    if (hasLLM && !hasGuardrails)
      issues.push("• LLM without Guardrails — safety risk");
    if (
      aiNodes.length > 0 &&
      !nodes.some((n) => n.data.componentType === "llm-observability")
    )
      issues.push("• No LLM Observability — flying blind on AI quality");
    if (!nodes.some((n) => n.data.componentType === "metrics-collector"))
      issues.push("• No Metrics Collector — no monitoring");
    if (issues.length === 0)
      return "✅ Your architecture looks production-ready! You have the essential components in place. Consider running a load test to validate behavior under stress.";
    return `Your architecture has ${
      issues.length
    } production-readiness concern${
      issues.length > 1 ? "s" : ""
    }:\n\n${issues.join(
      "\n"
    )}\n\nAddress these before deploying to production.`;
  }

  if (lower.includes("vector database") || lower.includes("what is")) {
    return 'A Vector Database stores data as high-dimensional vectors (embeddings) and finds "similar" items using mathematical distance, not exact keyword matching. Think of it as semantic search — you ask "comfortable shoes for hiking" and it finds relevant results even if no product mentions those exact words.\n\nKey players: Pinecone, Weaviate, Qdrant, pgvector (PostgreSQL extension).';
  }

  if (lower.includes("prevent") && lower.includes("hallucination")) {
    return "The most effective anti-hallucination stack:\n\n1. **RAG Pipeline** — ground answers in verified documents (reduces hallucination ~60%)\n2. **Guardrails** — filter output for factual consistency\n3. **Prompt Cache** — cached verified answers are guaranteed correct\n4. **LLM Observability** — monitor hallucination rates per prompt type\n\nDrag these from the sidebar to add them to your architecture.";
  }

  // Default response
  if (nodeCount === 0) {
    return "Your canvas is empty! Start by dragging components from the sidebar, or pick a template from the Templates menu. I can help analyze your architecture once you have components placed.";
  }

  return `Your architecture has ${nodeCount} components (${aiNodes.length} AI). I can help with latency optimization, cost reduction, production readiness, or explain any system design concept. Try asking:\n\n• "Why is my latency so high?"\n• "How do I reduce AI costs?"\n• "Is my system production ready?"\n• "How do I prevent hallucinations?"`;
}
