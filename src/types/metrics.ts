export interface AIMetrics {
  tokenThroughput: number;
  ttftP95: number;
  contextUtilization: number;
  gpuMemoryPressure: number;
  hallucinationRisk: number;
  ragRetrievalAccuracy: number;
  aiCostPer1kRequests: number;
  agentStepsAvg: number;
}

export interface MetricSnapshot {
  timestamp: number;
  throughput: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  availability: number;
  errorRate: number;
  networkHops: number;
  consistencyModel: string;
  cacheHitRate: number | null;
  dbReadWriteRatio: number | null;
  scalabilityScore: number;
  monthlyCost: number;
  queueDepth: number | null;
  capState: string;
  aiMetrics?: AIMetrics;
}

export interface SystemAlert {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  nodeId?: string;
  timestamp: number;
  dismissed: boolean;
}

export interface NodeMetrics {
  nodeId: string;
  cpuPercent: number;
  memoryPercent: number;
  requestRate: number;
  errorRate: number;
  loadPercent: number;
}
