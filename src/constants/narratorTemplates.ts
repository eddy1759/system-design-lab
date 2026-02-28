// ─── Narrator Sentence Templates ────────────────────────────────────────────
// Each export is an array of template functions. The narrator engine picks one
// per generation via `(seed + index) % length`; "Rephrase" increments seed.

export type TemplateVariants = ((data: Record<string, unknown>) => string)[];

// ── OPENING ────────────────────────────────────────────────────────────────

export const OPENING: TemplateVariants = [
  (d) => `Let me walk you through the architecture I'd design for ${d.title}.`,
  (d) =>
    `I'll describe the system I've put together for ${d.title}, starting from the client and working inward.`,
  (d) =>
    `Here's how I'd approach ${d.title} — I'll go layer by layer from ingress to data.`,
];

// ── SCALE FRAMING ──────────────────────────────────────────────────────────

export const SCALE_FRAMING: TemplateVariants = [
  (d) =>
    `At our current load of ${d.rps} requests per second, the priority is ${d.priority}.`,
  (d) => `We're designing for ${d.scaleTierLabel}, so ${d.scaleContext}.`,
  (d) =>
    `The system needs to handle ${d.rps} req/s with a P99 target of under ${d.p99Target}ms.`,
];

export const SCALE_CONTEXT: Record<string, string> = {
  prototype: "keeping things simple and avoiding premature optimization",
  startup: "getting reliability right before optimizing for cost",
  growth: "eliminating single points of failure as the top priority",
  scale: "horizontal scalability and fault isolation across every tier",
  enterprise:
    "multi-region resilience, zero-downtime deployments, and full observability",
};

export const SCALE_PRIORITY: Record<string, string> = {
  prototype: "correctness over resilience",
  startup: "reliability over performance optimization",
  growth: "redundancy and horizontal scale",
  scale: "eliminating bottlenecks and SPOFs",
  enterprise: "five-nines availability and global latency",
};

// ── CLIENT / INGRESS ───────────────────────────────────────────────────────

export const CLIENT_INTRO: TemplateVariants = [
  (d) =>
    `Starting at the ingress — ${d.clientTypes} hit the system from the outside.`,
  (d) =>
    `Requests originate from ${d.clientTypes} and enter the system at the edge.`,
];

export const CDN_PRESENT: TemplateVariants = [
  () =>
    `I've placed a CDN at the outermost layer, which handles static asset caching and absorbs a significant portion of traffic — typically 40 to 60 percent — before it reaches our origin servers. This dramatically reduces latency for geographically distributed users.`,
  () =>
    `Traffic first hits a CDN. For a system like this, the CDN handles all static content and caches edge responses, keeping the majority of reads away from the origin entirely.`,
];

export const CDN_ABSENT_LARGE_SCALE: TemplateVariants = [
  () =>
    `One thing I'd add in a production version of this is a CDN at the edge. At this scale, serving static assets from origin adds unnecessary latency and load — a CDN would be the first thing I'd reach for.`,
];

export const WAF_PRESENT: TemplateVariants = [
  () =>
    `Behind the CDN sits a WAF — a Web Application Firewall — which handles DDoS mitigation, rate limiting at the edge, and blocks common attack patterns like SQL injection and XSS before they reach application code.`,
  () =>
    `I've included a WAF at ingress. At scale, you want to filter malicious traffic as early as possible — before it consumes any compute resources.`,
];

// ── LOAD BALANCING ─────────────────────────────────────────────────────────

export const LOAD_BALANCER_PRESENT: TemplateVariants = [
  (d) =>
    `Requests flow through a Load Balancer using ${
      d.algorithm
    } distribution across ${d.serverCount} ${d.serverLabel} instance${
      Number(d.serverCount) !== 1 ? "s" : ""
    }. This eliminates the compute tier as a single point of failure and gives us horizontal scalability — adding capacity is as simple as spinning up another instance.`,
  (d) =>
    `I've put a Load Balancer in front of the compute tier, using ${
      d.algorithm
    }. With ${d.serverCount} server instance${
      Number(d.serverCount) !== 1 ? "s" : ""
    } behind it, we get both redundancy and the ability to scale horizontally under load.`,
];

export const LOAD_BALANCER_ABSENT_OK: TemplateVariants = [
  (d) =>
    `At ${d.rps} req/s a single server is sufficient, so I've kept the ingress simple — no Load Balancer yet. I'd add one before horizontally scaling the compute tier.`,
];

export const LOAD_BALANCER_ABSENT_WARNING: TemplateVariants = [
  () =>
    `I should note that without a Load Balancer, the server tier is a single point of failure. At this scale I would add one — it's a straightforward addition that significantly improves availability.`,
];

export const API_GATEWAY_PRESENT: TemplateVariants = [
  () =>
    `Before traffic reaches the servers, it passes through an API Gateway. This is where I centralize authentication, authorization, and rate limiting — keeping that logic out of individual services and ensuring consistent enforcement across all endpoints.`,
  () =>
    `The API Gateway acts as the single entry point for all backend traffic. It handles auth, rate limiting, and request routing — if we need to add a new service later, the gateway is the only layer that needs to know about it.`,
];

// ── COMPUTE ────────────────────────────────────────────────────────────────

export const COMPUTE_INTRO: TemplateVariants = [
  (d) =>
    `The compute tier consists of ${d.serverCount} ${d.serverLabel} instance${
      Number(d.serverCount) !== 1 ? "s" : ""
    }, currently running at ${d.loadPct}% load.`,
  (d) =>
    `Behind the load balancer, I have ${d.serverCount} ${
      d.serverLabel
    } instance${
      Number(d.serverCount) !== 1 ? "s" : ""
    } handling the business logic. Load is sitting at ${
      d.loadPct
    }%, so we have good headroom.`,
];

export const MICROSERVICES_PRESENT: TemplateVariants = [
  (d) =>
    `I've decomposed the application into ${d.serviceCount} microservices — ${d.serviceNames}. Each service owns its domain and can be deployed and scaled independently. The tradeoff is operational complexity: you need service discovery, distributed tracing, and careful management of inter-service latency.`,
  (d) =>
    `The application layer is a microservices architecture with ${d.serviceCount} services. This gives us independent scaling and deployment, which matters at this scale, but it does introduce distributed systems complexity that a monolith avoids.`,
];

export const SERVERLESS_PRESENT: TemplateVariants = [
  (d) =>
    `I've used Serverless Functions for ${d.functionNames}. The advantage here is zero idle cost and automatic scaling — the platform provisions capacity on demand. The tradeoff to call out is cold starts: the first invocation after a period of inactivity adds latency, typically 100 to 500ms depending on the runtime.`,
];

// ── CACHING ────────────────────────────────────────────────────────────────

export const CACHE_PRESENT: TemplateVariants = [
  (d) =>
    `I've placed a ${d.cacheType} cache between the server tier and the database. With a ${d.ttl}-second TTL and a cache hit rate sitting at ${d.hitRate}%, we're serving the majority of reads without touching the database at all. That's keeping our DB load low and our read latency fast.`,
  (d) =>
    `${d.cacheType} sits in front of the database as a read-through cache. At ${d.hitRate}% hit rate with a ${d.ttl}-second TTL, roughly ${d.hitRate}% of read requests never reach the database. The key design question here is TTL — too short and you lose the cache benefit, too long and you risk serving stale data.`,
];

export const CACHE_ABSENT_WARNING: TemplateVariants = [
  (d) =>
    `One thing I'd add is a caching layer between the server and database. With a ${d.readRatio}% read ratio, a Redis cache with an appropriate TTL could serve the majority of reads without hitting the database — that's a significant latency and cost reduction.`,
];

// ── DATABASE ───────────────────────────────────────────────────────────────

export const DB_RELATIONAL: TemplateVariants = [
  (d) =>
    `For the primary data store I've chosen ${d.dbEngine}. This gives us ACID transactions and strong consistency on the write path, which is important for ${d.consistencyReason}. The tradeoff versus a NoSQL option is that horizontal write scaling is harder — we'd need to introduce sharding or a distributed SQL layer to go beyond what a single primary can handle.`,
  (d) =>
    `${d.dbEngine} is the primary store. I chose a relational database here because ${d.consistencyReason}. Strong consistency and foreign key constraints are worth the tradeoff of more complex horizontal scaling at very high write volumes.`,
];

export const DB_NOSQL: Record<string, TemplateVariants> = {
  mongodb: [
    () =>
      `I've chosen MongoDB as the document store. It gives us flexible schema evolution and good horizontal scalability via sharding. The consistency model here is tunable — we can dial between eventual and strong consistency per operation depending on the use case.`,
  ],
  cassandra: [
    () =>
      `Cassandra is the right choice here — we need write-heavy, globally distributed data with linear horizontal scalability. The tradeoff is that Cassandra favors availability and partition tolerance over strong consistency — it's an AP system under CAP.`,
  ],
  dynamodb: [
    () =>
      `DynamoDB gives us fully managed, auto-scaling key-value storage. It's the right call when we want to avoid operational overhead and need predictable single-digit millisecond latency at any scale. The constraint is the data model — you need to think carefully about access patterns upfront.`,
  ],
};

export const DB_REPLICA_PRESENT: TemplateVariants = [
  () =>
    `I've added a read replica to the database tier. Writes go to the primary and reads are distributed to the replica — this both removes the database as a single point of failure and offloads read pressure. Replication lag is the key thing to monitor here; if a replica falls behind, users may briefly see stale data.`,
];

export const DB_REPLICA_ABSENT: TemplateVariants = [
  () =>
    `The database is currently a single instance — I'd call that out as the most significant resilience gap. If the database goes down, the entire system goes with it. At minimum I'd add a read replica with automatic failover for a production deployment.`,
];

// ── MESSAGING ──────────────────────────────────────────────────────────────

export const MESSAGING_PRESENT: TemplateVariants = [
  () =>
    `I've introduced an event streaming layer for asynchronous processing. Rather than services calling each other synchronously, producers emit events and consumers process them independently. This decouples services — a spike in producer traffic gets buffered instead of cascading into consumer failures. The tradeoff is eventual consistency on the async path and operational complexity of managing the message infrastructure.`,
  () =>
    `An event stream sits between the write path and downstream processing. Events are durable — even if a consumer goes down, it picks up where it left off when it recovers. This is the right pattern when you need to handle bursty write traffic without dropping data.`,
];

export const QUEUE_PRESENT: TemplateVariants = [
  () =>
    `I've added a message queue between the server tier and downstream processing. This decouples request acceptance from processing — the server acknowledges requests immediately, and the queue buffers work for async processing. The key benefit is resilience under bursty traffic: the queue absorbs the spike instead of overwhelming downstream services.`,
];

// ── AI LAYER ───────────────────────────────────────────────────────────────

export const LLM_PRESENT: TemplateVariants = [
  (d) =>
    `The AI layer centers on an LLM Inference Server. The key metrics here are Time to First Token — currently ${d.ttft}ms — and token throughput at ${d.tokenThroughput} tokens per second. Streaming is enabled so users see output progressively rather than waiting for the full response. At scale, GPU memory pressure is the primary bottleneck — we're currently at ${d.gpuMemPct}% VRAM utilization.`,
  (d) =>
    `I've built the AI layer around LLM inference. LLM inference has fundamentally different performance characteristics than traditional APIs — latency is measured in tokens per second, not milliseconds per request, and cost is a function of token count rather than compute time. TTFT is ${d.ttft}ms, which is acceptable for a streaming interface.`,
];

export const RAG_PRESENT: TemplateVariants = [
  (d) =>
    `To reduce hallucination risk, I've added a RAG pipeline. Before the LLM sees a query, the embedding service converts it to a vector, the vector database retrieves the top-${d.topK} most semantically similar documents, and that context is injected into the LLM prompt. This grounds responses in verified source material. Retrieval accuracy is currently at ${d.ragAccuracy}%.`,
];

export const GUARDRAILS_PRESENT: TemplateVariants = [
  () =>
    `LLM output passes through a Guardrails filter before reaching users. This validates responses for harmful content, PII exposure, and prompt injection attempts. It adds roughly 15 to 30ms but eliminates an entire class of safety risk. In any production AI system, this is non-negotiable.`,
];

export const AGENT_PRESENT: TemplateVariants = [
  (d) =>
    `The system uses an Agent Orchestrator to coordinate multi-step AI workflows. Rather than a single LLM call, the agent reasons iteratively — calling tools, evaluating results, and deciding next steps. The design challenge with agents is bounding behavior: we need loop detection, a maximum step count, and cost controls to prevent runaway execution. Average task completion currently takes ${d.avgSteps} steps.`,
];

// ── OBSERVABILITY ──────────────────────────────────────────────────────────

export const OBSERVABILITY_PRESENT: TemplateVariants = [
  (d) =>
    `On the observability side, I've included ${d.observabilityComponents}. ${d.observabilityDetail} You can't manage what you can't measure — these aren't optional in a production system.`,
];

export const OBSERVABILITY_ABSENT: TemplateVariants = [
  () =>
    `One thing this architecture is missing is an observability stack. In production I'd add distributed tracing and a metrics collector at minimum — without them, debugging latency spikes or error surges is essentially guesswork.`,
];

// ── TRADEOFFS ──────────────────────────────────────────────────────────────

export const TRADEOFFS_INTRO: TemplateVariants = [
  () => `Let me call out the key tradeoffs in this design.`,
  () => `There are a few deliberate tradeoffs worth discussing.`,
  () => `I want to flag the most important tradeoffs before wrapping up.`,
];

export const SPOF_TRADEOFF: TemplateVariants = [
  (d) =>
    `The most significant gap is that ${d.spofNames} ${
      Number(d.spofCount) > 1 ? "are" : "is"
    } still a single point of failure. At ${
      d.scaleTierLabel
    }, this is an acceptable risk, but I'd address it before going to production at higher availability targets.`,
];

export const CAP_TRADEOFF: Record<string, TemplateVariants> = {
  CP: [
    () =>
      `On the CAP theorem — this system prioritizes Consistency and Partition Tolerance. Under a network partition, we'll sacrifice availability rather than serve stale data. That's the right call for any system handling financial or transactional data.`,
  ],
  AP: [
    () =>
      `This is an AP system under CAP — we favor Availability and Partition Tolerance over strict Consistency. Reads may return slightly stale data during partitions, but the system stays up. For social or content workloads, that's the right tradeoff.`,
  ],
};

export const COST_OBSERVATION: TemplateVariants = [
  (d) =>
    `Current estimated cost is around $${d.monthlyCost} per month. The biggest cost driver is ${d.topCostDriver}. If cost optimization becomes a priority, ${d.costOptimizationHint} would be the first lever to pull.`,
];

// ── CLOSING ────────────────────────────────────────────────────────────────

export const CLOSING: TemplateVariants = [
  (d) =>
    `Overall, this design handles the current requirements at ${d.scaleTierLabel}. The most important next step from a resilience standpoint would be ${d.topNextStep}. Happy to go deeper on any layer.`,
  (d) =>
    `That's the high-level design. It's tuned for ${d.scaleTierLabel}, with a validation score of ${d.score} out of 100. The area I'd focus on next is ${d.topNextStep}. What would you like to drill into?`,
  (d) =>
    `To summarize: ${d.componentCount} components, P99 at ${d.p99}ms, ${(
      Number(d.availability) * 100
    ).toFixed(2)}% estimated availability, and a monthly cost around $${
      d.monthlyCost
    }. The top improvement I'd make is ${d.topNextStep}.`,
];
