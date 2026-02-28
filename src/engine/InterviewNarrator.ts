// ─── Interview Narrator Engine ──────────────────────────────────────────────
// Converts the canvas graph state into a structured first-person system design
// interview narration. Pure deterministic — no AI API calls.

import type { Node, Edge } from "reactflow";
import type { SystemNodeData, SystemEdgeData } from "../types/components";
import type { MetricSnapshot } from "../types/metrics";
import type { ValidationContext, ScaleTier } from "./ValidationContext";
import { resolveValidationContext } from "./ValidationContext";
import {
  ArchitectureValidator,
  type ValidationReport,
} from "./ArchitectureValidator";
import * as T from "../constants/narratorTemplates";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NarrationResult {
  text: string;
  sections: NarrationSection[];
  variantSeed: number;
  wordCount: number;
  estimatedMinutes: number;
}

export interface NarrationSection {
  id: string;
  label: string;
  text: string;
  nodeIds: string[];
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class InterviewNarrator {
  /** Pick a template variant using seed-based modular indexing */
  private static pick(
    variants: T.TemplateVariants,
    data: Record<string, unknown>,
    seed: number,
    index: number
  ): string {
    const i = (seed + index) % variants.length;
    return variants[i](data);
  }

  static generate(
    nodes: Node<SystemNodeData>[],
    edges: Edge<SystemEdgeData>[],
    metrics: MetricSnapshot,
    trafficLoad: number,
    trafficPattern: string,
    spofNodeIds: string[],
    title: string,
    variantSeed: number = 0
  ): NarrationResult {
    // Resolve context and validation report
    const ctx = resolveValidationContext(
      nodes,
      edges,
      metrics,
      trafficLoad,
      trafficPattern,
      null
    );

    let report: ValidationReport | null = null;
    try {
      report = ArchitectureValidator.validate(
        nodes,
        edges,
        spofNodeIds,
        metrics,
        trafficLoad,
        trafficPattern,
        null
      );
    } catch {
      // Validation may fail on minimal graphs — that's fine
    }

    const sections: NarrationSection[] = [];
    let idx = 0;
    const p = (
      variants: T.TemplateVariants,
      data: Record<string, unknown> = {}
    ) => this.pick(variants, data, variantSeed, idx++);

    // Helpers — all keyed by componentType, NOT n.type
    const has = (ct: string) => nodes.some((n) => n.data.componentType === ct);
    const hasAny = (...cts: string[]) => cts.some((ct) => has(ct));
    const countOf = (ct: string) =>
      nodes.filter((n) => n.data.componentType === ct).length;
    const byType = (ct: string) =>
      nodes.filter((n) => n.data.componentType === ct);
    const byTypes = (...cts: string[]) =>
      nodes.filter((n) => cts.includes(n.data.componentType));

    // Component facts
    const serverNodes = byTypes(
      "web-server",
      "microservice",
      "serverless-function",
      "container-pod"
    );
    const serverCount =
      serverNodes.reduce((sum, n) => sum + (n.data.config.replicas ?? 1), 0) ||
      1;
    const serverLabel =
      countOf("microservice") >= 2 ? "microservice" : "server";

    const dbNode = nodes.find((n) =>
      ["postgresql", "mysql", "mongodb", "cassandra", "dynamodb"].includes(
        n.data.componentType
      )
    );
    const cacheNode = nodes.find((n) =>
      ["redis-cache", "memcached"].includes(n.data.componentType)
    );
    const lbNode = nodes.find((n) => n.data.componentType === "load-balancer");
    const clientNodes = byTypes("web-client", "mobile-client", "api-consumer");
    const llmNode = nodes.find((n) => n.data.componentType === "llm-inference");

    // SPOF nodes
    const spofNames = nodes
      .filter((n) => n.data.isSPOF)
      .map((n) => n.data.config.label);

    // Derived values
    const lbAlgorithm = lbNode?.data.config?.algorithm ?? "round-robin";
    const cacheType =
      cacheNode?.data.componentType === "redis-cache" ? "Redis" : "Memcached";
    const cacheTTL = (cacheNode?.data.config?.ttl as number) ?? 300;
    const cacheHitRate = metrics.cacheHitRate ?? 82;
    const dbReadRatio = Math.round((metrics.dbReadWriteRatio ?? 0.8) * 100);
    const clientTypes =
      clientNodes.length > 0
        ? clientNodes.map((n) => n.data.config.label).join(" and ")
        : "web and mobile clients";
    const consistencyReason = resolveConsistencyReason(nodes);
    const topCostDriver = resolveTopCostDriver(nodes);
    const costHint = resolveCostHint(nodes);
    const topNextStep = resolveTopNextStep(report);
    const loadPct = Math.round(
      (metrics.throughput / Math.max(trafficLoad, 1)) * 100
    );

    // ── OPENING ───────────────────────────────────────────────────────
    const openText = [
      p(T.OPENING, { title }),
      p(T.SCALE_FRAMING, {
        rps: trafficLoad.toLocaleString(),
        scaleTierLabel: ctx.scaleTierLabel,
        priority: T.SCALE_PRIORITY[ctx.scaleTier] ?? "reliability",
        scaleContext:
          T.SCALE_CONTEXT[ctx.scaleTier] ?? "building incrementally",
        p99Target: ctx.thresholds.maxAcceptableP99Ms,
      }),
    ].join(" ");
    sections.push({
      id: "opening",
      label: "Overview",
      text: openText,
      nodeIds: [],
    });

    // ── INGRESS ───────────────────────────────────────────────────────
    const ingressParts: string[] = [];
    if (clientNodes.length > 0 || has("cdn") || has("firewall-waf")) {
      ingressParts.push(p(T.CLIENT_INTRO, { clientTypes }));
      if (has("cdn")) {
        ingressParts.push(p(T.CDN_PRESENT, {}));
      } else if (ctx.scaleTier === "scale" || ctx.scaleTier === "enterprise") {
        ingressParts.push(p(T.CDN_ABSENT_LARGE_SCALE, {}));
      }
      if (has("firewall-waf")) {
        ingressParts.push(p(T.WAF_PRESENT, {}));
      }
    }
    if (ingressParts.length > 0) {
      sections.push({
        id: "ingress",
        label: "Ingress Layer",
        text: ingressParts.join(" "),
        nodeIds: byTypes("cdn", "firewall-waf", "dns-server").map((n) => n.id),
      });
    }

    // ── LOAD BALANCING ────────────────────────────────────────────────
    const lbParts: string[] = [];
    if (lbNode && serverCount > 0) {
      lbParts.push(
        p(T.LOAD_BALANCER_PRESENT, {
          algorithm: lbAlgorithm,
          serverCount,
          serverLabel,
        })
      );
    } else if (
      !lbNode &&
      (ctx.scaleTier === "prototype" || ctx.scaleTier === "startup")
    ) {
      lbParts.push(p(T.LOAD_BALANCER_ABSENT_OK, { rps: trafficLoad }));
    } else if (!lbNode && serverCount > 0) {
      lbParts.push(p(T.LOAD_BALANCER_ABSENT_WARNING, {}));
    }
    if (has("api-gateway")) {
      lbParts.push(p(T.API_GATEWAY_PRESENT, {}));
    }
    if (lbParts.length > 0) {
      sections.push({
        id: "load-balancing",
        label: "Load Balancing & Routing",
        text: lbParts.join(" "),
        nodeIds: byTypes("load-balancer", "api-gateway", "reverse-proxy").map(
          (n) => n.id
        ),
      });
    }

    // ── COMPUTE ───────────────────────────────────────────────────────
    const computeParts: string[] = [];
    if (countOf("microservice") >= 2) {
      const names = byType("microservice")
        .map((n) => n.data.config.label)
        .join(", ");
      computeParts.push(
        p(T.MICROSERVICES_PRESENT, {
          serviceCount: countOf("microservice"),
          serviceNames: names,
        })
      );
    } else if (serverNodes.length > 0) {
      computeParts.push(
        p(T.COMPUTE_INTRO, { serverCount, serverLabel, loadPct })
      );
    }
    if (has("serverless-function")) {
      const fnNames = byType("serverless-function")
        .map((n) => n.data.config.label)
        .join(", ");
      computeParts.push(p(T.SERVERLESS_PRESENT, { functionNames: fnNames }));
    }
    if (computeParts.length > 0) {
      sections.push({
        id: "compute",
        label: "Compute Layer",
        text: computeParts.join(" "),
        nodeIds: byTypes(
          "web-server",
          "microservice",
          "serverless-function",
          "container-pod"
        ).map((n) => n.id),
      });
    }

    // ── CACHING ───────────────────────────────────────────────────────
    if (cacheNode) {
      sections.push({
        id: "cache",
        label: "Caching Layer",
        text: p(T.CACHE_PRESENT, {
          cacheType,
          ttl: cacheTTL,
          hitRate: cacheHitRate,
        }),
        nodeIds: [cacheNode.id],
      });
    } else if (dbReadRatio > 70 && dbNode) {
      sections.push({
        id: "cache-advisory",
        label: "Caching",
        text: p(T.CACHE_ABSENT_WARNING, { readRatio: dbReadRatio }),
        nodeIds: [],
      });
    }

    // ── DATABASE ──────────────────────────────────────────────────────
    if (dbNode) {
      const dbParts: string[] = [];
      const hasReplica =
        (dbNode.data.config.replicas ?? 1) >= 2 ||
        nodes.filter((n) => n.data.componentType === dbNode.data.componentType)
          .length >= 2;

      if (["postgresql", "mysql"].includes(dbNode.data.componentType)) {
        const engineName =
          dbNode.data.componentType === "postgresql" ? "PostgreSQL" : "MySQL";
        dbParts.push(
          p(T.DB_RELATIONAL, {
            dbEngine: engineName,
            consistencyReason,
          })
        );
      } else if (T.DB_NOSQL[dbNode.data.componentType]) {
        dbParts.push(
          this.pick(
            T.DB_NOSQL[dbNode.data.componentType],
            {},
            variantSeed,
            idx++
          )
        );
      }

      if (hasReplica) {
        dbParts.push(p(T.DB_REPLICA_PRESENT, {}));
      } else if (ctx.scaleTier !== "prototype") {
        dbParts.push(p(T.DB_REPLICA_ABSENT, {}));
      }

      sections.push({
        id: "database",
        label: "Data Layer",
        text: dbParts.join(" "),
        nodeIds: byTypes(
          "postgresql",
          "mysql",
          "mongodb",
          "cassandra",
          "dynamodb",
          "object-storage",
          "data-warehouse"
        ).map((n) => n.id),
      });
    }

    // ── MESSAGING ─────────────────────────────────────────────────────
    if (hasAny("event-stream", "pub-sub")) {
      sections.push({
        id: "messaging",
        label: "Async / Messaging",
        text: p(T.MESSAGING_PRESENT, {}),
        nodeIds: byTypes("event-stream", "pub-sub").map((n) => n.id),
      });
    } else if (has("message-queue")) {
      sections.push({
        id: "messaging",
        label: "Async / Messaging",
        text: p(T.QUEUE_PRESENT, {}),
        nodeIds: byType("message-queue").map((n) => n.id),
      });
    }

    // ── AI LAYER ──────────────────────────────────────────────────────
    if (llmNode) {
      const aiParts: string[] = [];
      const ai = metrics.aiMetrics;
      aiParts.push(
        p(T.LLM_PRESENT, {
          ttft: ai?.ttftP95 ?? "N/A",
          tokenThroughput: ai?.tokenThroughput?.toLocaleString() ?? "N/A",
          gpuMemPct: Math.round((ai?.gpuMemoryPressure ?? 0) * 100),
        })
      );

      if (has("rag-pipeline") && has("vector-database")) {
        const ragNode = nodes.find(
          (n) => n.data.componentType === "rag-pipeline"
        );
        aiParts.push(
          p(T.RAG_PRESENT, {
            topK: (ragNode?.data.config?.topK as number) ?? 5,
            ragAccuracy: Math.round((ai?.ragRetrievalAccuracy ?? 0.85) * 100),
          })
        );
      }

      if (has("agent-orchestrator")) {
        aiParts.push(
          p(T.AGENT_PRESENT, {
            avgSteps: ai?.agentStepsAvg ?? 4,
          })
        );
      }

      if (has("guardrails")) {
        aiParts.push(p(T.GUARDRAILS_PRESENT, {}));
      }

      sections.push({
        id: "ai",
        label: "AI / ML Layer",
        text: aiParts.join(" "),
        nodeIds: nodes.filter((n) => n.data.isAI).map((n) => n.id),
      });
    }

    // ── OBSERVABILITY ─────────────────────────────────────────────────
    const obsNodes = byTypes(
      "metrics-collector",
      "log-aggregator",
      "distributed-tracer",
      "llm-observability",
      "drift-detector"
    );
    if (obsNodes.length >= 1) {
      const obsNames = obsNodes.map((n) => n.data.config.label).join(", ");
      sections.push({
        id: "observability",
        label: "Observability",
        text: p(T.OBSERVABILITY_PRESENT, {
          observabilityComponents: obsNames,
          observabilityDetail: resolveObservabilityDetail(nodes),
        }),
        nodeIds: obsNodes.map((n) => n.id),
      });
    } else if (ctx.scaleTier !== "prototype") {
      sections.push({
        id: "observability-advisory",
        label: "Observability",
        text: p(T.OBSERVABILITY_ABSENT, {}),
        nodeIds: [],
      });
    }

    // ── TRADEOFFS ─────────────────────────────────────────────────────
    const tradeParts: string[] = [];
    tradeParts.push(p(T.TRADEOFFS_INTRO, {}));

    if (spofNames.length > 0) {
      tradeParts.push(
        p(T.SPOF_TRADEOFF, {
          spofNames: spofNames.join(" and "),
          spofCount: spofNames.length,
          scaleTierLabel: ctx.scaleTierLabel,
        })
      );
    }

    const capState = metrics.capState ?? "CP";
    if (T.CAP_TRADEOFF[capState]) {
      tradeParts.push(
        this.pick(T.CAP_TRADEOFF[capState], {}, variantSeed, idx++)
      );
    }

    if (metrics.monthlyCost > 0) {
      tradeParts.push(
        p(T.COST_OBSERVATION, {
          monthlyCost: Math.round(metrics.monthlyCost).toLocaleString(),
          topCostDriver,
          costOptimizationHint: costHint,
        })
      );
    }

    sections.push({
      id: "tradeoffs",
      label: "Tradeoffs & Gaps",
      text: tradeParts.join(" "),
      nodeIds: [],
    });

    // ── CLOSING ───────────────────────────────────────────────────────
    sections.push({
      id: "closing",
      label: "Summary",
      text: p(T.CLOSING, {
        scaleTierLabel: ctx.scaleTierLabel,
        score: report?.overallScore ?? "—",
        topNextStep,
        componentCount: nodes.length,
        p99: Math.round(metrics.latencyP99),
        availability: metrics.availability,
        monthlyCost: Math.round(metrics.monthlyCost).toLocaleString(),
      }),
      nodeIds: [],
    });

    const fullText = sections.map((s) => s.text).join("\n\n");
    const wordCount = fullText.split(/\s+/).length;

    return {
      text: fullText,
      sections,
      variantSeed,
      wordCount,
      estimatedMinutes: Math.ceil(wordCount / 130),
    };
  }
}

// ─── Resolver Helpers ───────────────────────────────────────────────────────

function resolveConsistencyReason(nodes: Node<SystemNodeData>[]): string {
  if (nodes.some((n) => n.data.componentType === "api-gateway"))
    return "we need consistent auth state across all requests";
  if (
    nodes.some((n) =>
      ["message-queue", "event-stream"].includes(n.data.componentType)
    )
  )
    return "transactional integrity matters on the write path";
  return "data integrity and relational constraints are important for this use case";
}

function resolveObservabilityDetail(nodes: Node<SystemNodeData>[]): string {
  const has = (ct: string) => nodes.some((n) => n.data.componentType === ct);
  const parts: string[] = [];
  if (has("metrics-collector"))
    parts.push("metrics give us system-level health and alerting");
  if (has("log-aggregator"))
    parts.push("log aggregation centralizes application-level events");
  if (has("distributed-tracer"))
    parts.push(
      "distributed tracing connects request timelines across service boundaries"
    );
  if (has("llm-observability"))
    parts.push(
      "LLM observability tracks token costs, latency, and prompt quality"
    );
  return parts.length > 0 ? parts.join("; ") + "." : "";
}

function resolveTopCostDriver(nodes: Node<SystemNodeData>[]): string {
  const has = (ct: string) => nodes.some((n) => n.data.componentType === ct);
  if (has("training-cluster")) return "the GPU training cluster";
  if (has("llm-inference")) return "LLM inference GPU costs and token usage";
  if (has("cdn")) return "CDN bandwidth at high traffic volumes";
  if (nodes.some((n) => ["postgresql", "mysql"].includes(n.data.componentType)))
    return "database instance costs";
  return "compute instances";
}

function resolveCostHint(nodes: Node<SystemNodeData>[]): string {
  const has = (ct: string) => nodes.some((n) => n.data.componentType === ct);
  if (has("llm-inference") && !has("prompt-cache"))
    return "adding a Prompt Cache to avoid redundant LLM calls";
  if (has("llm-inference") && !has("model-router"))
    return "a Model Router to route simple queries to a cheaper smaller model";
  if (!has("redis-cache") && !has("memcached"))
    return "adding a cache to reduce database read load";
  return "right-sizing instance types based on actual utilization";
}

function resolveTopNextStep(report: ValidationReport | null): string {
  if (!report)
    return "running the architecture validator for a full assessment";
  const allChecks = report.dimensions.flatMap((d) => d.checks);
  const topFail = allChecks.find(
    (c) => c.outcome === "fail" && c.severity === "critical"
  );
  if (topFail?.fix) return topFail.fix.split(".")[0].toLowerCase();
  const topAdvisory = allChecks.find((c) => c.outcome === "advisory");
  if (topAdvisory?.advisoryNote)
    return topAdvisory.advisoryNote.split(".")[0].toLowerCase();
  return "running a load test to validate behavior under peak traffic";
}
