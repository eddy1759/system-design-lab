import type { Node, Edge } from "reactflow";
import type { SystemNodeData, SystemEdgeData } from "../types/components";
import type { MetricSnapshot } from "../types/metrics";
import type { ScenarioDefinition } from "../types/scenarios";
import { isAIComponentType } from "../types/components";
import {
  type ValidationContext,
  type ContextualVerdict,
  type ScaleTier,
  resolveValidationContext,
  computeVerdict,
} from "./ValidationContext";

// ─── Types ────────────────────────────────────────────────────────────────

export type CheckOutcome = "pass" | "advisory" | "fail";

export interface ValidationCheck {
  id: string;
  name: string;
  outcome: CheckOutcome;
  severity: "critical" | "warning" | "info";
  contextNote: string;
  explanation: string;
  fix?: string;
  advisoryNote?: string;
  scoreImpact: number;
  scaleTierTrigger?: ScaleTier;
}

export interface ValidationDimension {
  id: string;
  name: string;
  icon: string;
  score: number;
  checks: ValidationCheck[];
}

export interface ValidationReport {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  verdict: ContextualVerdict;
  context: ValidationContext;
  dimensions: ValidationDimension[];
  topIssues: ValidationCheck[];
  strengths: string[];
  generatedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function hasType(nodes: Node<SystemNodeData>[], ...types: string[]): boolean {
  return nodes.some((n) => types.includes(n.data.componentType));
}

function nodesOfType(
  nodes: Node<SystemNodeData>[],
  ...types: string[]
): Node<SystemNodeData>[] {
  return nodes.filter((n) => types.includes(n.data.componentType));
}

function dimScore(checks: ValidationCheck[]): number {
  if (checks.length === 0) return 100;
  const total = checks.reduce((s, c) => s + c.scoreImpact, 0);
  if (total === 0) return 100;
  const earned = checks
    .filter((c) => c.outcome === "pass")
    .reduce((s, c) => s + c.scoreImpact, 0);
  const advisory = checks
    .filter((c) => c.outcome === "advisory")
    .reduce((s, c) => s + c.scoreImpact * 0.7, 0);
  return Math.round(((earned + advisory) / total) * 100);
}

// ─── Reliability ──────────────────────────────────────────────────────────

function checkReliability(
  nodes: Node<SystemNodeData>[],
  edges: Edge<SystemEdgeData>[],
  spofNodeIds: string[],
  ctx: ValidationContext
): ValidationDimension {
  const checks: ValidationCheck[] = [];
  const spofCount = spofNodeIds.length;
  const spofNames = nodes
    .filter((n) => spofNodeIds.includes(n.id))
    .map((n) => n.data.config.label)
    .join(", ");

  // ── SPOFs ──────────────────────────────────
  if (spofCount === 0) {
    checks.push({
      id: "rel-no-spof",
      name: "No Single Points of Failure",
      outcome: "pass",
      severity: "critical",
      scoreImpact: 40,
      contextNote: "Your critical path has redundancy at every tier.",
      explanation:
        "All components have at least one parallel redundant instance.",
    });
  } else if (ctx.scaleTier === "prototype" || ctx.scaleTier === "startup") {
    checks.push({
      id: "rel-spof-advisory",
      name: `${spofCount} Single Point${spofCount > 1 ? "s" : ""} of Failure`,
      outcome: "advisory",
      severity: "warning",
      scoreImpact: 10,
      contextNote: `At ${ctx.scaleTierLabel}, single-instance components are common and acceptable.`,
      explanation: `${
        spofNames || "Some components"
      } running as single instance${spofCount > 1 ? "s" : ""}.`,
      advisoryNote: `Add redundancy when you target 99.9%+ availability or handle revenue-critical traffic. At ${ctx.currentRPS.toLocaleString()} req/s, this is acceptable.`,
      scaleTierTrigger: "growth",
    });
  } else {
    checks.push({
      id: "rel-spof-fail",
      name: `${spofCount} Critical SPOF${spofCount > 1 ? "s" : ""}`,
      outcome: "fail",
      severity: "critical",
      scoreImpact: 40,
      contextNote: `At ${ctx.scaleTierLabel}, SPOFs are unacceptable — any failure causes outage.`,
      explanation: `${spofNames || "Some components"} ha${
        spofCount > 1 ? "ve" : "s"
      } no redundancy at ${ctx.currentRPS.toLocaleString()} req/s.`,
      fix: "Add parallel redundant instances of each SPOF component. For compute, add servers behind the Load Balancer. For databases, add a read replica with failover.",
    });
  }

  // ── Database Replica ───────────────────────
  const dbTypes = [
    "postgresql",
    "mongodb",
    "mysql",
    "cassandra",
    "dynamodb",
  ] as const;
  const dbNodes = nodesOfType(nodes, ...dbTypes);
  const hasDBReplica =
    dbNodes.length >= 2 ||
    dbNodes.some((n) => (n.data.config?.replicas ?? 1) >= 2);

  if (dbNodes.length === 0) {
    // No DB at all — handled in data integrity
  } else if (hasDBReplica) {
    checks.push({
      id: "rel-db-replica",
      name: "Database Replica Present",
      outcome: "pass",
      severity: "warning",
      scoreImpact: 20,
      contextNote:
        "Database tier has redundancy — a single DB failure won't take down the system.",
      explanation:
        "At least 2 database instances or a configured replica found.",
    });
  } else if (ctx.thresholds.replicasRequiredForHA <= 1) {
    checks.push({
      id: "rel-db-replica-adv",
      name: "Database Has No Replica",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 5,
      contextNote: `A single database is fine at ${ctx.scaleTierLabel}. Replicas become important as read traffic grows.`,
      explanation: `${dbNodes.length} database instance${
        dbNodes.length !== 1 ? "s" : ""
      } with no replica configured.`,
      advisoryNote:
        "Add a read replica when DB read load exceeds 70%, for zero-downtime deployments, or for 99.9%+ availability. Typically at Growth stage (5K+ req/s).",
      scaleTierTrigger: "growth",
    });
  } else {
    checks.push({
      id: "rel-db-replica-fail",
      name: "Database Lacks Replica",
      outcome: "fail",
      severity: "critical",
      scoreImpact: 25,
      contextNote: `At ${ctx.scaleTierLabel}, a database without a replica is a critical risk.`,
      explanation: "Your database has no replica or failover instance.",
      fix: "Add a second database node as a read replica. Route read traffic to the replica, writes to the primary.",
    });
  }

  // ── Load Balancer ──────────────────────────
  const hasLB = hasType(nodes, "load-balancer", "api-gateway", "reverse-proxy");
  const serverTypes = [
    "api-server",
    "web-server",
    "microservice",
    "serverless-function",
    "container-pod",
  ] as const;
  const serverCount = nodesOfType(nodes, ...serverTypes).length;
  const totalServerReplicas = nodesOfType(nodes, ...serverTypes).reduce(
    (s, n) => s + (n.data.config?.replicas ?? 1),
    0
  );

  if (hasLB) {
    checks.push({
      id: "rel-lb",
      name: "Load Balancer Present",
      outcome: "pass",
      severity: "warning",
      scoreImpact: 20,
      contextNote:
        "Traffic distribution enables horizontal scaling and eliminates compute SPOFs.",
      explanation:
        "A Load Balancer distributes traffic across your compute tier.",
    });
  } else if (serverCount > 1 || totalServerReplicas > 1) {
    checks.push({
      id: "rel-lb-fail",
      name: "Multiple Servers Without Load Balancer",
      outcome: "fail",
      severity: "critical",
      scoreImpact: 30,
      contextNote:
        "Multiple server instances exist but no traffic distribution — replicas are effectively unused.",
      explanation: `${serverCount} server instance(s) with ${totalServerReplicas} total replicas but no Load Balancer routing traffic.`,
      fix: "Add a Load Balancer between the API Gateway/Client and your server instances.",
    });
  } else if (!ctx.thresholds.requiresLoadBalancer) {
    checks.push({
      id: "rel-lb-adv",
      name: "No Load Balancer",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 0,
      contextNote: `At ${ctx.scaleTierLabel} with a single server, a Load Balancer adds complexity without benefit.`,
      explanation:
        "No Load Balancer found. All traffic routes directly to your server.",
      advisoryNote:
        "Add a Load Balancer when you need horizontal scaling or zero-downtime deployments. Typically at Startup–Growth (1K+ req/s).",
      scaleTierTrigger: "startup",
    });
  } else {
    checks.push({
      id: "rel-lb-rec",
      name: "No Load Balancer",
      outcome: "advisory",
      severity: "warning",
      scoreImpact: 15,
      contextNote: `At ${ctx.scaleTierLabel}, a Load Balancer is recommended for horizontal scaling.`,
      explanation: "No Load Balancer present.",
      advisoryNote:
        "Add a Load Balancer before your server tier to enable horizontal scaling.",
      scaleTierTrigger: "growth",
    });
  }

  // ── Connected Graph ────────────────────────
  const disconnected = nodes.filter(
    (n) => !edges.some((e) => e.source === n.id || e.target === n.id)
  );
  checks.push({
    id: "rel-connected",
    name: "All Components Connected",
    outcome: disconnected.length === 0 ? "pass" : "fail",
    severity: "warning",
    scoreImpact: 15,
    contextNote:
      disconnected.length > 0
        ? `${disconnected.length} component${
            disconnected.length > 1 ? "s are" : " is"
          } disconnected.`
        : "All components are connected to the graph.",
    explanation:
      disconnected.length > 0
        ? `${disconnected.map((n) => n.data.config.label).join(", ")} ${
            disconnected.length > 1 ? "are" : "is"
          } not connected.`
        : "Full graph connectivity verified.",
    fix:
      disconnected.length > 0
        ? "Connect isolated components to the rest of your architecture."
        : undefined,
  });

  return {
    id: "reliability",
    name: "Reliability & Availability",
    icon: "🛡️",
    score: dimScore(checks),
    checks,
  };
}

// ─── Performance ──────────────────────────────────────────────────────────

function checkPerformance(
  nodes: Node<SystemNodeData>[],
  metrics: MetricSnapshot,
  ctx: ValidationContext
): ValidationDimension {
  const checks: ValidationCheck[] = [];
  const p99 = metrics.latencyP99;
  const threshold = ctx.thresholds.maxAcceptableP99Ms;

  // ── Latency ────────────────────────────────
  if (p99 <= threshold * 0.5) {
    checks.push({
      id: "perf-latency",
      name: "Latency Excellent",
      outcome: "pass",
      severity: "info",
      scoreImpact: 30,
      contextNote: `P99 of ${Math.round(
        p99
      )}ms is well under ${threshold}ms target for ${ctx.scaleTierLabel}.`,
      explanation: `P99: ${Math.round(
        p99
      )}ms. Target: <${threshold}ms. ${Math.round(
        (1 - p99 / threshold) * 100
      )}% headroom.`,
    });
  } else if (p99 <= threshold) {
    checks.push({
      id: "perf-latency",
      name: "Latency Within Target",
      outcome: "pass",
      severity: "info",
      scoreImpact: 20,
      contextNote: `P99 of ${Math.round(
        p99
      )}ms meets the ${threshold}ms target for ${ctx.scaleTierLabel}.`,
      explanation: `P99: ${Math.round(p99)}ms. Target: <${threshold}ms.`,
    });
  } else {
    checks.push({
      id: "perf-latency",
      name: "P99 Latency Exceeds Target",
      outcome: "fail",
      severity: p99 > threshold * 2 ? "critical" : "warning",
      scoreImpact: 30,
      contextNote: `P99 of ${Math.round(
        p99
      )}ms exceeds ${threshold}ms target for ${ctx.scaleTierLabel}.`,
      explanation: `P99 latency is ${Math.round(p99)}ms — ${Math.round(
        (p99 / threshold) * 100 - 100
      )}% over the limit.`,
      fix: identifyLatencyFix(nodes),
    });
  }

  // ── Error Rate ─────────────────────────────
  const errorRate = metrics.errorRate;
  if (errorRate < 0.001) {
    checks.push({
      id: "perf-errors",
      name: "Error Rate Excellent",
      outcome: "pass",
      severity: "info",
      scoreImpact: 25,
      contextNote: `Error rate is ${(errorRate * 100).toFixed(
        3
      )}% — effectively zero.`,
      explanation: `${(errorRate * 100).toFixed(
        3
      )}% error rate. Industry standard: <0.1%.`,
    });
  } else if (errorRate < 0.01) {
    checks.push({
      id: "perf-errors",
      name: "Error Rate Acceptable",
      outcome: "pass",
      severity: "info",
      scoreImpact: 15,
      contextNote: `${(errorRate * 100).toFixed(
        2
      )}% error rate is within acceptable bounds.`,
      explanation: `Error rate: ${(errorRate * 100).toFixed(2)}%.`,
    });
  } else {
    checks.push({
      id: "perf-errors",
      name: "High Error Rate",
      outcome: "fail",
      severity: errorRate > 0.05 ? "critical" : "warning",
      scoreImpact: 25,
      contextNote: `${(errorRate * 100).toFixed(
        1
      )}% error rate is unacceptable at any scale.`,
      explanation: `${(errorRate * 100).toFixed(1)}% of requests are failing.`,
      fix: "Identify the bottleneck node (red on canvas). Add capacity or a circuit breaker for graceful degradation.",
    });
  }

  // ── Cache ──────────────────────────────────
  const hasCache = hasType(nodes, "redis-cache", "memcached", "prompt-cache");
  const hasDB = hasType(
    nodes,
    "postgresql",
    "mongodb",
    "mysql",
    "cassandra",
    "dynamodb"
  );
  const dbReadRatio = metrics.dbReadWriteRatio ?? 0.5;

  if (hasCache) {
    const hitRate = metrics.cacheHitRate;
    checks.push({
      id: "perf-cache",
      name: "Cache Layer Present",
      outcome: "pass",
      severity: "info",
      scoreImpact: 15,
      contextNote:
        hitRate !== null
          ? `Cache hit rate: ${(hitRate * 100).toFixed(0)}% — reducing DB load.`
          : "Cache layer reducing database read load.",
      explanation: "A caching layer is present.",
    });
  } else if (!ctx.thresholds.requiresCache || !hasDB) {
    checks.push({
      id: "perf-cache",
      name: "No Cache Layer",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 0,
      contextNote: `At ${ctx.scaleTierLabel}, caching is a performance enhancement, not a requirement.`,
      explanation:
        "No caching layer found. All reads go directly to the database.",
      advisoryNote:
        "Add Redis or Memcached when DB reads become a bottleneck. Typically worthwhile at 1K+ req/s.",
      scaleTierTrigger: "startup",
    });
  } else {
    checks.push({
      id: "perf-cache",
      name: `No Cache Layer — ${Math.round(dbReadRatio * 100)}% DB reads`,
      outcome: "fail",
      severity: "warning",
      scoreImpact: 15,
      contextNote: `At ${ctx.scaleTierLabel} with ${Math.round(
        dbReadRatio * 100
      )}% read ratio, a cache would serve most traffic without hitting the DB.`,
      explanation: "No caching layer between servers and database.",
      fix: "Add a Redis Cache between your server tier and database. Configure TTL appropriate to your data freshness needs.",
    });
  }

  // ── CDN ────────────────────────────────────
  const hasCDN = hasType(nodes, "cdn");
  if (hasCDN) {
    checks.push({
      id: "perf-cdn",
      name: "CDN for Edge Caching",
      outcome: "pass",
      severity: "info",
      scoreImpact: 10,
      contextNote:
        "CDN serves static assets from edge locations, reducing origin load.",
      explanation: "CDN present for edge caching.",
    });
  } else if (ctx.scaleTier === "prototype" || ctx.scaleTier === "startup") {
    checks.push({
      id: "perf-cdn",
      name: "No CDN",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 0,
      contextNote: `CDN is optional at ${ctx.scaleTierLabel}.`,
      explanation: "No CDN to serve static assets closer to users.",
      advisoryNote:
        "Add a CDN when you need global low-latency asset delivery. Recommended at Growth stage.",
      scaleTierTrigger: "growth",
    });
  } else {
    checks.push({
      id: "perf-cdn",
      name: "No CDN",
      outcome: "advisory",
      severity: "warning",
      scoreImpact: 10,
      contextNote: `At ${ctx.scaleTierLabel}, a CDN significantly reduces origin load and latency.`,
      explanation: "No CDN present. All assets served from origin.",
      advisoryNote:
        "Add a CDN to serve static assets with low latency globally.",
      scaleTierTrigger: "growth",
    });
  }

  return {
    id: "performance",
    name: "Performance & Scalability",
    icon: "⚡",
    score: dimScore(checks),
    checks,
  };
}

function identifyLatencyFix(nodes: Node<SystemNodeData>[]): string {
  const hasCache = hasType(nodes, "redis-cache", "memcached");
  const hasDB = hasType(
    nodes,
    "postgresql",
    "mongodb",
    "mysql",
    "cassandra",
    "dynamodb"
  );
  if (!hasCache && hasDB)
    return "Add a Redis Cache between your server and database. Cache hit rates of 80%+ can reduce latency by 60%.";
  return "Identify the highest-latency component (red on canvas) and add more instances or caching upstream of it.";
}

// ─── Data Integrity ───────────────────────────────────────────────────────

function checkDataIntegrity(
  nodes: Node<SystemNodeData>[],
  edges: Edge<SystemEdgeData>[],
  ctx: ValidationContext
): ValidationDimension {
  const checks: ValidationCheck[] = [];
  const dbTypes = [
    "postgresql",
    "mongodb",
    "mysql",
    "cassandra",
    "dynamodb",
  ] as const;
  const dbNodes = nodesOfType(nodes, ...dbTypes);

  // ── Data store present ─────────────────────
  checks.push({
    id: "data-store",
    name: "Data Store Present",
    outcome: dbNodes.length > 0 ? "pass" : "fail",
    severity: "critical",
    scoreImpact: 30,
    contextNote:
      dbNodes.length === 0
        ? "No persistent data store — data will be lost on restart."
        : "Persistent data storage present.",
    explanation:
      dbNodes.length === 0
        ? "No database found in the architecture."
        : `${dbNodes.length} database instance(s) found.`,
    fix:
      dbNodes.length === 0
        ? "Add a database (PostgreSQL, MongoDB, DynamoDB) to persist data."
        : undefined,
  });

  // ── No direct client→DB ────────────────────
  const clientTypes = ["web-client", "mobile-client", "api-consumer"] as const;
  const clientIds = new Set(
    nodesOfType(nodes, ...clientTypes).map((n) => n.id)
  );
  const dbIds = new Set(dbNodes.map((n) => n.id));
  const directDB = edges.some(
    (e) => clientIds.has(e.source) && dbIds.has(e.target)
  );

  checks.push({
    id: "data-no-direct",
    name: "No Direct Client-to-DB Connection",
    outcome: directDB ? "fail" : "pass",
    severity: "critical",
    scoreImpact: 25,
    contextNote: directDB
      ? "A client accesses the database directly, bypassing auth and validation layers."
      : "Clients access data through server intermediaries.",
    explanation: directDB
      ? "Direct client→database edge found."
      : "All data access goes through server layers.",
    fix: directDB
      ? "Route all client requests through an API server layer."
      : undefined,
  });

  // ── Backup path ────────────────────────────
  const hasObjStore = hasType(nodes, "object-storage");
  if (hasObjStore || dbNodes.length >= 2) {
    checks.push({
      id: "data-backup",
      name: "Backup Path Exists",
      outcome: "pass",
      severity: "warning",
      scoreImpact: 20,
      contextNote: "Backup or redundant storage available.",
      explanation: hasObjStore
        ? "Object storage available for backups."
        : "Multiple database instances provide redundancy.",
    });
  } else if (ctx.scaleTier === "prototype" || ctx.scaleTier === "startup") {
    checks.push({
      id: "data-backup",
      name: "No Backup Storage",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 5,
      contextNote: `Backup storage is recommended but not critical at ${ctx.scaleTierLabel}.`,
      explanation: "No backup storage or secondary database.",
      advisoryNote:
        "Add Object Storage (S3) for backups or a secondary database before handling production data.",
      scaleTierTrigger: "growth",
    });
  } else {
    checks.push({
      id: "data-backup",
      name: "No Backup Storage",
      outcome: "fail",
      severity: "warning",
      scoreImpact: 20,
      contextNote: `At ${ctx.scaleTierLabel}, a single database without backup is a data loss risk.`,
      explanation: "No backup storage or secondary database.",
      fix: "Add Object Storage (S3) for backups or a secondary database.",
    });
  }

  return {
    id: "dataIntegrity",
    name: "Data Integrity & Consistency",
    icon: "💾",
    score: dimScore(checks),
    checks,
  };
}

// ─── Security ─────────────────────────────────────────────────────────────

function checkSecurity(
  nodes: Node<SystemNodeData>[],
  edges: Edge<SystemEdgeData>[],
  ctx: ValidationContext
): ValidationDimension {
  const checks: ValidationCheck[] = [];

  // ── API Gateway ────────────────────────────
  const hasGW = hasType(nodes, "api-gateway");
  if (hasGW) {
    checks.push({
      id: "sec-gw",
      name: "API Gateway Present",
      outcome: "pass",
      severity: "warning",
      scoreImpact: 30,
      contextNote:
        "API Gateway handles rate limiting, auth enforcement, and request validation.",
      explanation: "API Gateway found at ingress.",
    });
  } else if (ctx.scaleTier === "prototype") {
    checks.push({
      id: "sec-gw",
      name: "No API Gateway",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 0,
      contextNote: `API Gateway is optional at ${ctx.scaleTierLabel}. Direct server access is acceptable for prototyping.`,
      explanation: "No API Gateway for centralized rate limiting or auth.",
      advisoryNote:
        "Add an API Gateway when you need auth enforcement, rate limiting, or multiple client types.",
      scaleTierTrigger: "startup",
    });
  } else {
    checks.push({
      id: "sec-gw",
      name: "No API Gateway",
      outcome: "advisory",
      severity: "warning",
      scoreImpact: 15,
      contextNote: `At ${ctx.scaleTierLabel}, an API Gateway is recommended for centralized security.`,
      explanation: "No API Gateway for rate limiting, auth, or validation.",
      advisoryNote:
        "Add an API Gateway between external clients and your server tier.",
      scaleTierTrigger: "startup",
    });
  }

  // ── Firewall/WAF ───────────────────────────
  const hasWAF = hasType(nodes, "firewall-waf");
  if (hasWAF) {
    checks.push({
      id: "sec-waf",
      name: "WAF / Firewall Present",
      outcome: "pass",
      severity: "warning",
      scoreImpact: 25,
      contextNote: "WAF protects against common web attacks (SQLi, XSS, DDoS).",
      explanation: "Firewall/WAF found at ingress.",
    });
  } else if (ctx.scaleTier === "prototype" || ctx.scaleTier === "startup") {
    checks.push({
      id: "sec-waf",
      name: "No WAF/Firewall",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 0,
      contextNote: `WAF is not required at ${ctx.scaleTierLabel}.`,
      explanation: "No Web Application Firewall.",
      advisoryNote:
        "Add a WAF when your system is public-facing and handles untrusted input.",
      scaleTierTrigger: "growth",
    });
  } else {
    checks.push({
      id: "sec-waf",
      name: "No WAF/Firewall",
      outcome: "advisory",
      severity: "warning",
      scoreImpact: 15,
      contextNote: `At ${ctx.scaleTierLabel}, a WAF is strongly recommended.`,
      explanation: "No WAF to protect against web attacks.",
      advisoryNote:
        "Add a Firewall/WAF at the ingress point for DDoS, SQLi, and XSS protection.",
      scaleTierTrigger: "growth",
    });
  }

  // ── No direct DB exposure ──────────────────
  const clientIds = new Set(
    nodesOfType(nodes, "web-client", "mobile-client", "api-consumer").map(
      (n) => n.id
    )
  );
  const dbIds = new Set(
    nodesOfType(
      nodes,
      "postgresql",
      "mongodb",
      "mysql",
      "cassandra",
      "dynamodb"
    ).map((n) => n.id)
  );
  const directDB = edges.some(
    (e) => clientIds.has(e.source) && dbIds.has(e.target)
  );
  if (!directDB) {
    checks.push({
      id: "sec-no-direct-db",
      name: "No Direct DB Exposure",
      outcome: "pass",
      severity: "critical",
      scoreImpact: 25,
      contextNote: "Database is not directly exposed to clients.",
      explanation: "All data access goes through server/gateway layers.",
    });
  } else {
    checks.push({
      id: "sec-no-direct-db",
      name: "Database Directly Exposed",
      outcome: "fail",
      severity: "critical",
      scoreImpact: 25,
      contextNote:
        "Clients can reach your database directly, bypassing all security controls.",
      explanation: "Direct client→database edge found.",
      fix: "Route all traffic through server or gateway layers.",
    });
  }

  // ── TLS termination ────────────────────────
  const hasTLS = hasType(
    nodes,
    "cdn",
    "api-gateway",
    "reverse-proxy",
    "load-balancer"
  );
  checks.push({
    id: "sec-tls",
    name: "TLS Termination",
    outcome: hasTLS
      ? "pass"
      : ctx.scaleTier === "prototype"
      ? "advisory"
      : "advisory",
    severity: "info",
    scoreImpact: hasTLS ? 10 : 5,
    contextNote: hasTLS
      ? "TLS is handled at the edge (CDN/Gateway/LB)."
      : "No centralized TLS termination point detected.",
    explanation: hasTLS
      ? "Edge component handles TLS."
      : "No CDN, LB, or API Gateway for TLS termination.",
    advisoryNote: !hasTLS
      ? "Add a CDN or API Gateway to handle TLS termination."
      : undefined,
    scaleTierTrigger: !hasTLS ? "startup" : undefined,
  });

  return {
    id: "security",
    name: "Security & Compliance",
    icon: "🔒",
    score: dimScore(checks),
    checks,
  };
}

// ─── Observability ────────────────────────────────────────────────────────

function checkObservability(
  nodes: Node<SystemNodeData>[],
  ctx: ValidationContext
): ValidationDimension {
  const checks: ValidationCheck[] = [];
  const hasMetrics = hasType(nodes, "metrics-collector");
  const hasTracing = hasType(nodes, "distributed-tracer");
  const hasLogs = hasType(nodes, "log-aggregator");

  if (hasMetrics) {
    checks.push({
      id: "obs-metrics",
      name: "Metrics Collection",
      outcome: "pass",
      severity: "warning",
      scoreImpact: 40,
      contextNote: "Metrics collector monitors system health.",
      explanation: "Metrics collection in place.",
    });
  } else if (!ctx.thresholds.requiresObservability) {
    checks.push({
      id: "obs-metrics",
      name: "No Metrics Collection",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 0,
      contextNote: `Observability is optional at ${ctx.scaleTierLabel}. The simulator provides built-in metrics.`,
      explanation: "No metrics collector node.",
      advisoryNote:
        "Add Prometheus/Datadog when you need production-grade monitoring.",
      scaleTierTrigger: "scale",
    });
  } else {
    checks.push({
      id: "obs-metrics",
      name: "No Metrics Collection",
      outcome: "fail",
      severity: "warning",
      scoreImpact: 40,
      contextNote: `At ${ctx.scaleTierLabel}, you cannot operate without metrics.`,
      explanation: "No metrics collector in the architecture.",
      fix: "Add a Metrics Collector (Prometheus/Datadog) for monitoring.",
    });
  }

  if (hasTracing) {
    checks.push({
      id: "obs-tracing",
      name: "Distributed Tracing",
      outcome: "pass",
      severity: "info",
      scoreImpact: 30,
      contextNote: "Request tracing across services is enabled.",
      explanation: "Distributed tracing present.",
    });
  } else {
    checks.push({
      id: "obs-tracing",
      name: "No Distributed Tracing",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 0,
      contextNote: `Tracing is beneficial for microservice debugging but optional at ${ctx.scaleTierLabel}.`,
      explanation: "No distributed tracing.",
      advisoryNote:
        "Add Jaeger/Zipkin when debugging cross-service latency issues.",
      scaleTierTrigger: "scale",
    });
  }

  if (hasLogs) {
    checks.push({
      id: "obs-logs",
      name: "Log Aggregation",
      outcome: "pass",
      severity: "info",
      scoreImpact: 30,
      contextNote: "Centralized log aggregation in place.",
      explanation: "Log aggregation present.",
    });
  } else {
    checks.push({
      id: "obs-logs",
      name: "No Log Aggregation",
      outcome: "advisory",
      severity: "info",
      scoreImpact: 0,
      contextNote: `Centralized logs are recommended but optional at ${ctx.scaleTierLabel}.`,
      explanation: "No centralized log aggregation.",
      advisoryNote: "Add a Log Aggregator for production log management.",
      scaleTierTrigger: "scale",
    });
  }

  return {
    id: "observability",
    name: "Observability",
    icon: "🔍",
    score: dimScore(checks),
    checks,
  };
}

// ─── AI Best Practices ────────────────────────────────────────────────────

function checkAIBestPractices(
  nodes: Node<SystemNodeData>[],
  ctx: ValidationContext
): ValidationDimension {
  const checks: ValidationCheck[] = [];
  const llmNodes = nodesOfType(nodes, "llm-inference");
  const hasGuardrails = hasType(nodes, "guardrails");
  const hasRAG = hasType(nodes, "rag-pipeline");
  const hasVectorDB = hasType(nodes, "vector-database");
  const hasAIGW = hasType(nodes, "ai-gateway");
  const hasPromptCache = hasType(nodes, "prompt-cache");
  const hasLLMObs = hasType(nodes, "llm-observability");
  const hasDrift = hasType(nodes, "drift-detector");
  const hasTraining = hasType(nodes, "training-cluster");

  if (llmNodes.length === 0) {
    checks.push({
      id: "ai-none",
      name: "No AI Components",
      outcome: "pass",
      severity: "info",
      scoreImpact: 100,
      contextNote: "No AI-specific checks needed.",
      explanation: "No AI components in topology.",
    });
    return {
      id: "ai",
      name: "AI Best Practices",
      icon: "🤖",
      score: 100,
      checks,
    };
  }

  // ── Guardrails ─────────────────────────────
  if (hasGuardrails) {
    checks.push({
      id: "ai-guardrails",
      name: "Guardrails on LLM Output",
      outcome: "pass",
      severity: "critical",
      scoreImpact: 20,
      contextNote:
        "Guardrails filter validates LLM output for safety and correctness.",
      explanation: "Guardrails node present after LLM inference.",
    });
  } else if (ctx.scaleTier === "prototype") {
    checks.push({
      id: "ai-guardrails",
      name: "No Guardrails on LLM",
      outcome: "advisory",
      severity: "warning",
      scoreImpact: 5,
      contextNote: `Guardrails are recommended even for prototypes, but not blocking at ${ctx.scaleTierLabel}.`,
      explanation: "LLM output has no validation filter.",
      advisoryNote:
        "Add Guardrails before exposing LLM output to users. Blocks hallucinations, toxic content, and prompt injection.",
      scaleTierTrigger: "startup",
    });
  } else {
    checks.push({
      id: "ai-guardrails",
      name: "No Guardrails on LLM",
      outcome: "fail",
      severity: "critical",
      scoreImpact: 20,
      contextNote: `At ${ctx.scaleTierLabel}, unfiltered LLM output is a safety and compliance risk.`,
      explanation:
        "LLM output has no guardrails. Hallucinations, toxic content, and prompt injection go unchecked.",
      fix: "Add a Guardrails Filter after your LLM Inference node.",
    });
  }

  // ── RAG / Grounding ────────────────────────
  checks.push({
    id: "ai-rag",
    name: "RAG Grounding",
    outcome: hasRAG || hasVectorDB ? "pass" : "advisory",
    severity: hasRAG || hasVectorDB ? "info" : "warning",
    scoreImpact: hasRAG || hasVectorDB ? 15 : 5,
    contextNote:
      hasRAG || hasVectorDB
        ? "Knowledge grounding reduces hallucination risk."
        : "No RAG pipeline or vector database for grounding.",
    explanation:
      hasRAG || hasVectorDB
        ? "RAG Pipeline and/or Vector Database present."
        : "LLM relies entirely on training data.",
    advisoryNote: !(hasRAG || hasVectorDB)
      ? "Add a RAG Pipeline with Vector Database to reduce hallucination risk."
      : undefined,
    scaleTierTrigger: !(hasRAG || hasVectorDB) ? "startup" : undefined,
  });

  // ── AI Gateway ─────────────────────────────
  checks.push({
    id: "ai-gw",
    name: "AI Gateway",
    outcome: hasAIGW ? "pass" : "advisory",
    severity: hasAIGW ? "info" : "warning",
    scoreImpact: hasAIGW ? 15 : 5,
    contextNote: hasAIGW
      ? "AI Gateway provides rate limiting, cost tracking, and model routing."
      : "No centralized AI traffic management.",
    explanation: hasAIGW
      ? "AI Gateway present."
      : "No AI Gateway for cost control.",
    advisoryNote: !hasAIGW
      ? "Add an AI Gateway for rate limiting, cost tracking, and model routing."
      : undefined,
    scaleTierTrigger: !hasAIGW ? "growth" : undefined,
  });

  // ── Prompt Cache ───────────────────────────
  checks.push({
    id: "ai-cache",
    name: "Prompt Caching",
    outcome: hasPromptCache ? "pass" : "advisory",
    severity: "info",
    scoreImpact: hasPromptCache ? 10 : 0,
    contextNote: hasPromptCache
      ? "Prompt cache reduces redundant LLM calls."
      : "No prompt caching — identical prompts re-run full inference.",
    explanation: hasPromptCache ? "Prompt cache present." : "No prompt cache.",
    advisoryNote: !hasPromptCache
      ? "Add a Prompt Cache to reduce GPU cost on repeated queries."
      : undefined,
    scaleTierTrigger: !hasPromptCache ? "growth" : undefined,
  });

  // ── LLM Observability ──────────────────────
  checks.push({
    id: "ai-obs",
    name: "LLM Observability",
    outcome: hasLLMObs ? "pass" : "advisory",
    severity: "info",
    scoreImpact: hasLLMObs ? 10 : 0,
    contextNote: hasLLMObs
      ? "LLM observability tracks token costs and quality metrics."
      : "No LLM-specific monitoring.",
    explanation: hasLLMObs
      ? "LLM Observability present."
      : "Cannot track token costs or model quality.",
    advisoryNote: !hasLLMObs
      ? "Add LLM Observability to monitor token costs and model performance."
      : undefined,
    scaleTierTrigger: !hasLLMObs ? "scale" : undefined,
  });

  // ── LLM SPOF ───────────────────────────────
  const llmReplicas = llmNodes.reduce(
    (s, n) => s + (n.data.config?.replicas ?? 1),
    0
  );
  const hasModelRouter = hasType(nodes, "model-router");
  if (llmReplicas >= 2 || hasModelRouter) {
    checks.push({
      id: "ai-spof",
      name: "LLM Redundancy",
      outcome: "pass",
      severity: "critical",
      scoreImpact: 15,
      contextNote: "LLM has redundancy through replicas or model routing.",
      explanation: hasModelRouter
        ? "Model Router provides fallback."
        : `${llmReplicas} LLM replicas.`,
    });
  } else if (ctx.scaleTier === "prototype" || ctx.scaleTier === "startup") {
    checks.push({
      id: "ai-spof",
      name: "Single LLM Instance",
      outcome: "advisory",
      severity: "warning",
      scoreImpact: 5,
      contextNote: `A single LLM instance is acceptable at ${ctx.scaleTierLabel}.`,
      explanation: "Only 1 LLM inference server.",
      advisoryNote:
        "Add a second LLM instance or Model Router for redundancy at higher scale.",
      scaleTierTrigger: "growth",
    });
  } else {
    checks.push({
      id: "ai-spof",
      name: "Single LLM Instance — SPOF",
      outcome: "fail",
      severity: "critical",
      scoreImpact: 15,
      contextNote: `At ${ctx.scaleTierLabel}, a single LLM server is a critical SPOF.`,
      explanation:
        "Single LLM inference server. GPU failure takes down all AI features.",
      fix: "Add a second LLM instance or a Model Router with fallback.",
    });
  }

  // ── Drift Detection ────────────────────────
  if (hasTraining) {
    checks.push({
      id: "ai-drift",
      name: "Model Drift Detection",
      outcome: hasDrift ? "pass" : "advisory",
      severity: hasDrift ? "info" : "warning",
      scoreImpact: hasDrift ? 10 : 5,
      contextNote: hasDrift
        ? "Drift detector monitors model quality."
        : "No drift detection on training pipeline.",
      explanation: hasDrift
        ? "Drift detector present."
        : "Training pipeline exists without quality monitoring.",
      advisoryNote: !hasDrift
        ? "Add a Drift Detector to monitor model quality after retraining."
        : undefined,
      scaleTierTrigger: !hasDrift ? "growth" : undefined,
    });
  }

  return {
    id: "ai",
    name: "AI Best Practices",
    icon: "🤖",
    score: dimScore(checks),
    checks,
  };
}

// ─── Main Validator ───────────────────────────────────────────────────────

export class ArchitectureValidator {
  static validate(
    nodes: Node<SystemNodeData>[],
    edges: Edge<SystemEdgeData>[],
    spofNodeIds: string[],
    metrics: MetricSnapshot,
    trafficLoad: number,
    trafficPattern: string,
    activeScenario: ScenarioDefinition | null
  ): ValidationReport {
    const ctx = resolveValidationContext(
      nodes,
      edges,
      metrics,
      trafficLoad,
      trafficPattern,
      activeScenario
    );
    const hasAI = nodes.some(
      (n) => n.data.isAI || isAIComponentType(n.data.componentType)
    );

    const dimensions: ValidationDimension[] = [];
    dimensions.push(checkReliability(nodes, edges, spofNodeIds, ctx));
    dimensions.push(checkPerformance(nodes, metrics, ctx));
    dimensions.push(checkDataIntegrity(nodes, edges, ctx));
    dimensions.push(checkSecurity(nodes, edges, ctx));
    dimensions.push(checkObservability(nodes, ctx));
    if (hasAI) dimensions.push(checkAIBestPractices(nodes, ctx));

    // Weighted average
    const weights: Record<string, number> = {
      reliability: 25,
      performance: 20,
      dataIntegrity: 15,
      security: 15,
      observability: 10,
      ai: 15,
    };
    const totalWeight = hasAI ? 100 : 85;
    const overallScore = Math.round(
      dimensions.reduce((acc, d) => acc + d.score * (weights[d.id] ?? 0), 0) /
        totalWeight
    );

    const grade: ValidationReport["grade"] =
      overallScore >= 90
        ? "A"
        : overallScore >= 80
        ? "B"
        : overallScore >= 70
        ? "C"
        : overallScore >= 60
        ? "D"
        : "F";

    const allChecks = dimensions.flatMap((d) => d.checks);
    const failedCritical = allChecks.filter(
      (c) => c.outcome === "fail" && c.severity === "critical"
    );
    const advisories = allChecks.filter((c) => c.outcome === "advisory");

    const verdict = computeVerdict(
      overallScore,
      failedCritical.length,
      advisories.length,
      ctx
    );

    const topIssues = allChecks
      .filter((c) => c.outcome === "fail")
      .sort((a, b) => {
        const sev = { critical: 3, warning: 2, info: 1 };
        return (sev[b.severity] || 0) - (sev[a.severity] || 0);
      })
      .slice(0, 3);

    const strengths = allChecks
      .filter((c) => c.outcome === "pass" && c.severity !== "info")
      .slice(0, 4)
      .map((c) => c.name);

    return {
      overallScore,
      grade,
      verdict,
      context: ctx,
      dimensions,
      topIssues,
      strengths,
      generatedAt: Date.now(),
    };
  }
}
