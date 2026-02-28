import type { ScenarioDefinition } from "../types/scenarios";
import type { MetricSnapshot } from "../types/metrics";

// ─── Scenario Definitions ───────────────────────────────────────────────────

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "basic-web-app",
    name: "Basic Web App",
    description:
      "Build a simple 3-tier web application with a load balancer, server, cache, and database.",
    difficulty: "beginner",
    targets: {
      minAvailability: 0.999,
      maxLatencyP95: 200,
      minThroughput: 5000,
      maxSPOFs: 0,
    },
    starterNodes: [{ type: "web-client", position: { x: 100, y: 300 } }],
    starterEdges: [],
    hints: [
      "Start by adding a Web Server to handle requests from the client.",
      "Add a PostgreSQL database to store your data. Connect the server to it.",
      "Add a Redis Cache between the server and database to reduce latency. Then add a Load Balancer before the server and increase server replicas to 2.",
    ],
    completionMessage:
      "Excellent! You've built a classic 3-tier architecture with caching and load balancing. This pattern powers most of the web.",
    realWorldArchitecture:
      "This is the foundation used by companies like GitHub, Stack Overflow, and Basecamp during their early stages.",
  },
  {
    id: "design-twitter",
    name: "Design Twitter",
    description:
      "Handle 500M users with <200ms P95 latency and 99.99% uptime. Think caching, message queues, and horizontal scaling.",
    difficulty: "advanced",
    targets: {
      minAvailability: 0.9999,
      maxLatencyP95: 200,
      minThroughput: 50000,
      maxSPOFs: 0,
      requiredComponents: ["load-balancer", "redis-cache", "message-queue"],
    },
    starterNodes: [
      { type: "web-client", position: { x: 50, y: 200 } },
      { type: "mobile-client", position: { x: 50, y: 450 } },
    ],
    starterEdges: [],
    hints: [
      "You need an API Gateway or Load Balancer as the single entry point for both web and mobile clients.",
      "Twitter is read-heavy — add a Redis Cache for timeline data. Use a Message Queue (Kafka) for async fan-out of tweets.",
      "Add multiple web servers (replicas ≥ 3) behind the load balancer. Use both a primary PostgreSQL (user data) and Cassandra (tweet storage) for different access patterns.",
    ],
    completionMessage:
      "🎉 You've designed a Twitter-scale architecture! The key insights: read-heavy caching, fan-out via message queues, and polyglot persistence.",
    realWorldArchitecture:
      "Twitter uses a combination of MySQL (users), Manhattan (tweets — a Cassandra-like store), Redis (timeline cache), and Kafka (async fan-out).",
  },
  {
    id: "netflix-streaming",
    name: "Netflix Streaming",
    description:
      "Build a global video delivery system with CDN optimization, caching, and microservices.",
    difficulty: "advanced",
    targets: {
      minAvailability: 0.9999,
      maxLatencyP95: 150,
      minThroughput: 100000,
      maxSPOFs: 0,
      requiredComponents: ["cdn", "load-balancer", "redis-cache"],
    },
    starterNodes: [{ type: "web-client", position: { x: 50, y: 300 } }],
    starterEdges: [],
    hints: [
      "Start with a CDN — video content must be served from edge locations, not your origin servers.",
      "Add an API Gateway for the metadata/catalog API, backed by microservices and a cache.",
      "Use object storage (S3) for video files, a database for metadata, and ensure all critical services have replicas.",
    ],
    completionMessage:
      "🎬 Your Netflix architecture handles global streaming! CDN edge caching is the key to low-latency video delivery.",
    realWorldArchitecture:
      "Netflix uses Open Connect (custom CDN), AWS for backend, Cassandra, EVCache (memcached), and 700+ microservices.",
  },
  {
    id: "ride-sharing",
    name: "Ride-Sharing Backend",
    description:
      "Real-time matching, geolocation, event-driven architecture. Target: <100ms matching latency.",
    difficulty: "advanced",
    targets: {
      minAvailability: 0.9999,
      maxLatencyP95: 100,
      minThroughput: 20000,
      maxSPOFs: 0,
      requiredComponents: ["load-balancer", "event-stream", "redis-cache"],
    },
    starterNodes: [{ type: "mobile-client", position: { x: 50, y: 300 } }],
    starterEdges: [],
    hints: [
      "Mobile clients need an API Gateway. Ride matching needs real-time data — use Redis for geolocation caching.",
      "Use Kafka for event streaming — ride requests, driver updates, and trip events can all flow through it.",
      "Add a microservice for matching logic, another for trip management. Use PostgreSQL for persistent data.",
    ],
    completionMessage:
      "🚗 Ride-sharing backend complete! Event-driven architecture enables real-time matching at scale.",
    realWorldArchitecture:
      "Uber uses a microservices architecture with Kafka, Redis (geospatial), MySQL/Cassandra, and custom load balancing (Ringpop).",
  },
  {
    id: "url-shortener",
    name: "URL Shortener",
    description:
      "Classic interview question — high read, low write, heavy caching. Target: <50ms P95 read latency.",
    difficulty: "beginner",
    targets: {
      minAvailability: 0.999,
      maxLatencyP95: 50,
      minThroughput: 10000,
      maxSPOFs: 0,
      requiredComponents: ["redis-cache"],
    },
    starterNodes: [{ type: "web-client", position: { x: 100, y: 300 } }],
    starterEdges: [],
    hints: [
      "Add a web server to handle redirect requests and a database to store URL mappings.",
      "This is extremely read-heavy — add a Redis cache. Most URLs will be accessed multiple times.",
      "Add a load balancer and scale the web server to handle spikes.",
    ],
    completionMessage:
      "🔗 URL shortener complete! Key insight: 100:1 read/write ratio means aggressive caching.",
    realWorldArchitecture:
      "Bitly uses a similar architecture with in-memory caching achieving sub-10ms redirects.",
  },
  {
    id: "flash-sale",
    name: "Flash Sale (E-Commerce)",
    description:
      "Handle 100x traffic spikes during a flash sale. Queue-based buffering is essential.",
    difficulty: "intermediate",
    targets: {
      minAvailability: 0.999,
      maxLatencyP95: 500,
      minThroughput: 50000,
      maxSPOFs: 0,
      requiredComponents: ["load-balancer", "message-queue", "redis-cache"],
    },
    starterNodes: [
      { type: "web-client", position: { x: 50, y: 200 } },
      { type: "mobile-client", position: { x: 50, y: 450 } },
    ],
    starterEdges: [],
    hints: [
      "Start with a load balancer and multiple web servers — you need to handle massive concurrent connections.",
      "Orders must go through a message queue to prevent database overload during the spike.",
      "Use Redis for inventory counting (atomic operations) and rate limiting.",
    ],
    completionMessage:
      "🛒 Flash sale system ready! Queue-based buffering prevents cascade failures during 100x traffic spikes.",
    realWorldArchitecture:
      "Amazon and Shopify use queue-based order processing, with aggressive caching and auto-scaling during peak events.",
  },
];

// ─── Progress Scoring ───────────────────────────────────────────────────────

export function computeScenarioProgress(
  scenario: ScenarioDefinition,
  metrics: MetricSnapshot,
  nodeTypes: string[]
): { score: number; targetsMet: Record<string, boolean> } {
  const targetsMet: Record<string, boolean> = {};
  let metCount = 0;
  let totalTargets = 0;

  if (scenario.targets.minAvailability !== undefined) {
    totalTargets++;
    const met = metrics.availability >= scenario.targets.minAvailability;
    targetsMet["availability"] = met;
    if (met) metCount++;
  }

  if (scenario.targets.maxLatencyP95 !== undefined) {
    totalTargets++;
    const met = metrics.latencyP95 <= scenario.targets.maxLatencyP95;
    targetsMet["latencyP95"] = met;
    if (met) metCount++;
  }

  if (scenario.targets.minThroughput !== undefined) {
    totalTargets++;
    const met = metrics.throughput >= scenario.targets.minThroughput;
    targetsMet["throughput"] = met;
    if (met) metCount++;
  }

  if (scenario.targets.maxCost !== undefined) {
    totalTargets++;
    const met = metrics.monthlyCost <= scenario.targets.maxCost;
    targetsMet["cost"] = met;
    if (met) metCount++;
  }

  if (scenario.targets.maxSPOFs !== undefined) {
    totalTargets++;
    // We check SPOFs from the metric: if scalabilityScore > 60, assume low SPOFs
    const met = metrics.scalabilityScore >= 60;
    targetsMet["spofs"] = met;
    if (met) metCount++;
  }

  if (scenario.targets.requiredComponents) {
    for (const req of scenario.targets.requiredComponents) {
      totalTargets++;
      const met = nodeTypes.includes(req);
      targetsMet[`component:${req}`] = met;
      if (met) metCount++;
    }
  }

  const score =
    totalTargets > 0 ? Math.round((metCount / totalTargets) * 100) : 0;
  return { score, targetsMet };
}
