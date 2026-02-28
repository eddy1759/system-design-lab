import type { Node, Edge } from "reactflow";
import type { SystemNodeData } from "../types/components";
import type { MetricSnapshot } from "../types/metrics";
import type { AdvisorMessage } from "../store/aiAdvisorStore";

/**
 * Rule-based architecture analysis engine.
 * Produces prioritized recommendations based on current canvas topology and metrics.
 */
export class ArchitectureAdvisor {
  static analyze(
    nodes: Node<SystemNodeData>[],
    edges: Edge[],
    metrics: MetricSnapshot,
    spofNodeIds: string[]
  ): AdvisorMessage[] {
    const messages: AdvisorMessage[] = [];

    const has = (type: string) =>
      nodes.some((n) => n.data.componentType === type);
    const count = (type: string) =>
      nodes.filter((n) => n.data.componentType === type).length;
    const aiNodes = nodes.filter((n) => n.data.isAI);
    const aiSPOFs = aiNodes.filter((n) => spofNodeIds.includes(n.id));
    const hasLLM = has("llm-inference");
    const hasVectorDB = has("vector-database");
    const hasGuardrails = has("guardrails");
    const hasPromptCache = has("prompt-cache");
    const hasModelRouter = has("model-router");
    const hasAIGateway = has("ai-gateway");
    const hasMemoryStore = has("memory-store");
    const hasAgentOrchestrator = has("agent-orchestrator");
    const hasDriftDetector = has("drift-detector");
    const hasLLMObservability = has("llm-observability");
    const isAISystem = aiNodes.length > 0;
    const ai = metrics.aiMetrics;

    // ── CRITICAL ──
    if (aiSPOFs.length > 0) {
      messages.push({
        id: "ai-spof",
        type: "critical",
        title: `${aiSPOFs.length} AI SPOF${
          aiSPOFs.length > 1 ? "s" : ""
        } Detected`,
        body: `${aiSPOFs.map((n) => n.data.config.label).join(", ")} ${
          aiSPOFs.length > 1 ? "are" : "is"
        } a single point of failure. A GPU failure will take down your AI feature. Add redundant instances or a fallback model via Model Router.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (hasLLM && !hasGuardrails && isAISystem) {
      messages.push({
        id: "no-guardrails",
        type: "warning",
        title: "No Output Guardrails on LLM",
        body: "Your LLM serves responses directly to users with no validation. Without guardrails, harmful content and prompt injections reach users. Add Guardrails — adds only ~20ms.",
        action: { label: "Add Guardrails", nodeType: "guardrails" },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (ai && ai.hallucinationRisk > 0.6) {
      messages.push({
        id: "high-hallucination",
        type: "critical",
        title: "Critical Hallucination Risk",
        body: `Hallucination risk is ${Math.round(
          ai.hallucinationRisk * 100
        )}%. Add a RAG Pipeline to ground responses in verified facts, or connect a Guardrails filter.`,
        action: { label: "Add RAG Pipeline", templateId: "rag-pipeline" },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (ai && ai.gpuMemoryPressure > 0.9) {
      messages.push({
        id: "gpu-oom",
        type: "critical",
        title: "GPU Memory Near Limit — OOM Risk",
        body: `GPU memory at ${Math.round(
          ai.gpuMemoryPressure * 100
        )}%. At 100%, your LLM crashes. Add more GPU instances, reduce batch size, or quantize.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    // ── WARNINGS ──
    if (hasLLM && !hasPromptCache && ai && ai.tokenThroughput > 50000) {
      messages.push({
        id: "no-prompt-cache",
        type: "warning",
        title: "High Token Volume — No Prompt Cache",
        body: `At ${(ai.tokenThroughput / 1000).toFixed(
          0
        )}k tokens/sec, a Prompt Cache could serve ~35% of similar queries without the LLM.`,
        action: { label: "Add Prompt Cache", nodeType: "prompt-cache" },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (hasLLM && !hasVectorDB && ai && ai.hallucinationRisk > 0.4) {
      messages.push({
        id: "no-rag",
        type: "warning",
        title: "LLM Without Grounding — Consider RAG",
        body: "Your LLM generates answers entirely from training data. A RAG pipeline with Vector Database reduces hallucination by ~60%.",
        action: { label: "Add RAG Pipeline", templateId: "rag-pipeline" },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (hasAgentOrchestrator && !hasMemoryStore) {
      messages.push({
        id: "agent-no-memory",
        type: "warning",
        title: "Agent Has No Persistent Memory",
        body: "Your Agent Orchestrator has no Memory Store. Each session starts from scratch. Add a Memory Store for context persistence.",
        action: { label: "Add Memory Store", nodeType: "memory-store" },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (
      hasLLM &&
      !hasAIGateway &&
      count("llm-inference") >= 1 &&
      (has("web-server") || has("load-balancer") || has("api-gateway"))
    ) {
      messages.push({
        id: "no-ai-gateway",
        type: "warning",
        title: "No AI Gateway — Uncontrolled LLM Access",
        body: "Without an AI Gateway, you have no rate limiting or cost control for LLM. One runaway client could exhaust GPU capacity.",
        action: { label: "Add AI Gateway", nodeType: "ai-gateway" },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (ai && ai.contextUtilization > 0.8 && hasLLM) {
      messages.push({
        id: "context-nearly-full",
        type: "warning",
        title: "Context Window Nearly Full",
        body: `Context utilization at ${Math.round(
          ai.contextUtilization * 100
        )}%. At 100%, older context is truncated. Add conversation summarization or chunk context more aggressively.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    // ── OPTIMIZATIONS ──
    if (
      hasLLM &&
      !hasModelRouter &&
      aiNodes.length > 1 &&
      ai &&
      ai.aiCostPer1kRequests > 5
    ) {
      messages.push({
        id: "add-model-router",
        type: "optimization",
        title: "Add Model Router to Cut AI Costs",
        body: `AI cost is $${ai.aiCostPer1kRequests.toFixed(
          2
        )}/1k requests. A Model Router could reduce costs 40–70% by sending simple queries to cheaper models.`,
        action: { label: "Add Model Router", nodeType: "model-router" },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (hasLLM && !hasLLMObservability) {
      messages.push({
        id: "no-llm-observability",
        type: "optimization",
        title: "No LLM Observability",
        body: "Without LLM observability, you cannot see which prompts fail, token costs by endpoint, or latency sources. Add LLM Observability.",
        action: {
          label: "Add LLM Observability",
          nodeType: "llm-observability",
        },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (
      isAISystem &&
      !hasDriftDetector &&
      (has("postgresql") || has("feature-store"))
    ) {
      messages.push({
        id: "no-drift-detection",
        type: "optimization",
        title: "No Model Drift Detection",
        body: "Input distributions shift over time and your model silently degrades. A Drift Detector alerts you before quality impact.",
        action: { label: "Add Drift Detector", nodeType: "drift-detector" },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    // SPOFs for classical nodes
    const classicalSPOFs = nodes.filter(
      (n) =>
        !n.data.isAI &&
        spofNodeIds.includes(n.id) &&
        n.data.componentType !== "web-client" &&
        n.data.componentType !== "mobile-client"
    );
    if (classicalSPOFs.length > 0) {
      messages.push({
        id: "classical-spof",
        type: "warning",
        title: `${classicalSPOFs.length} Classical SPOF${
          classicalSPOFs.length > 1 ? "s" : ""
        }`,
        body: `${classicalSPOFs
          .map((n) => n.data.config.label)
          .join(", ")} — add replicas for redundancy.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    // Missing load balancer
    if (!has("load-balancer") && nodes.length > 2) {
      messages.push({
        id: "no-lb",
        type: "optimization",
        title: "No Load Balancer",
        body: "Consider adding a Load Balancer to distribute incoming traffic and improve availability.",
        action: { label: "Add Load Balancer", nodeType: "load-balancer" },
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    return messages
      .filter((m) => !m.dismissed)
      .sort((a, b) => {
        const priority = {
          critical: 0,
          warning: 1,
          optimization: 2,
          learning: 3,
        };
        return priority[a.type] - priority[b.type];
      })
      .slice(0, 6);
  }
}
