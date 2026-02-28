import type { Node, Edge } from "reactflow";
import type { SystemNodeData, SystemEdgeData } from "../types/components";

// ── Types ────────────────────────────────────────────────────────────────────

type ComponentType =
  | "web-server"
  | "microservice"
  | "postgresql"
  | "mysql"
  | "mongodb"
  | "redis-cache"
  | "load-balancer"
  | "reverse-proxy"
  | "message-queue"
  | "event-stream"
  | "llm-inference"
  | "vector-database"
  | "object-storage"
  | "cdn";

interface DockerServiceBlock {
  /** Primary service name (used as the yaml key) */
  name: string;
  /** Full YAML block for this service, indented 2 spaces */
  yaml: string;
  /** Named volumes this service declares (deduplicated later) */
  volumes: string[];
  /** Service names this block depends on (resolved after all nodes are visited) */
  dependsOn: string[];
}

interface TerraformBlock {
  hcl: string;
}

// ── Name helpers ─────────────────────────────────────────────────────────────

/**
 * Converts a node label to a valid Docker Compose service name.
 * Ensures uniqueness across the whole render pass via `usedNames`.
 */
function toServiceName(label: string, usedNames: Map<string, number>): string {
  const base = label
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "") || "service";

  const count = (usedNames.get(base) ?? 0) + 1;
  usedNames.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

// ── Docker Compose renderers ─────────────────────────────────────────────────

function renderWebServer(name: string, replicas: number): DockerServiceBlock {
  return {
    name,
    volumes: [],
    dependsOn: [],
    yaml: `  ${name}:
    image: node:22-alpine
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    networks:
      - app-network
    deploy:
      replicas: ${replicas}`,
  };
}

function renderMicroservice(name: string, replicas: number): DockerServiceBlock {
  return {
    name,
    volumes: [],
    dependsOn: [],
    yaml: `  ${name}:
    image: node:22-alpine
    restart: unless-stopped
    networks:
      - app-network
    deploy:
      replicas: ${replicas}`,
  };
}

function renderPostgres(name: string): DockerServiceBlock {
  const vol = `${name}-data`;
  return {
    name,
    volumes: [`  ${vol}:`],
    dependsOn: [],
    yaml: `  ${name}:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
    volumes:
      - ${vol}:/var/lib/postgresql/data
    networks:
      - app-network`,
  };
}

function renderMySQL(name: string): DockerServiceBlock {
  const vol = `${name}-data`;
  return {
    name,
    volumes: [`  ${vol}:`],
    dependsOn: [],
    yaml: `  ${name}:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      - MYSQL_DATABASE=appdb
      - MYSQL_USER=appuser
      - MYSQL_PASSWORD=\${DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=\${DB_ROOT_PASSWORD}
    volumes:
      - ${vol}:/var/lib/mysql
    networks:
      - app-network`,
  };
}

function renderMongoDB(name: string): DockerServiceBlock {
  const vol = `${name}-data`;
  return {
    name,
    volumes: [`  ${vol}:`],
    dependsOn: [],
    yaml: `  ${name}:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - ${vol}:/data/db
    networks:
      - app-network`,
  };
}

function renderRedis(name: string): DockerServiceBlock {
  return {
    name,
    volumes: [],
    dependsOn: [],
    yaml: `  ${name}:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    networks:
      - app-network`,
  };
}

function renderNginx(name: string): DockerServiceBlock {
  return {
    name,
    volumes: [],
    dependsOn: [],
    yaml: `  ${name}:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - app-network`,
  };
}

/**
 * Kafka requires a Zookeeper sidecar. 
 * Returns the primary Kafka service block, but includes Zookeeper YAML.
 * Dependencies are tracked on the primary Kafka service.
 */
function renderKafka(kafkaName: string): DockerServiceBlock {
  const zkName = `${kafkaName}-zookeeper`;
  return {
    name: kafkaName,
    volumes: [],
    // Zookeeper is a hard dependency for this block, add it here so it gets merged in Pass 3
    dependsOn: [zkName], 
    yaml: `  ${zkName}:
    image: confluentinc/cp-zookeeper:7.5.0
    restart: unless-stopped
    environment:
      - ZOOKEEPER_CLIENT_PORT=2181
    networks:
      - app-network

  ${kafkaName}:
    image: confluentinc/cp-kafka:7.5.0
    restart: unless-stopped
    environment:
      - KAFKA_BROKER_ID=1
      - KAFKA_ZOOKEEPER_CONNECT=${zkName}:2181
      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://${kafkaName}:9092
    networks:
      - app-network`,
  };
}

function renderLLM(name: string): DockerServiceBlock {
  return {
    name,
    volumes: [],
    dependsOn: [],
    yaml: `  ${name}:
    image: vllm/vllm-openai:latest
    restart: unless-stopped
    runtime: nvidia
    environment:
      - MODEL=meta-llama/Llama-3.1-8B-Instruct
      - MAX_MODEL_LEN=8192
    ports:
      - "8000:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    networks:
      - app-network`,
  };
}

function renderVectorDB(name: string): DockerServiceBlock {
  const vol = `${name}-data`;
  return {
    name,
    volumes: [`  ${vol}:`],
    dependsOn: [],
    yaml: `  ${name}:
    image: qdrant/qdrant:latest
    restart: unless-stopped
    ports:
      - "6333:6333"
    volumes:
      - ${vol}:/qdrant/storage
    networks:
      - app-network`,
  };
}

function renderMinio(name: string): DockerServiceBlock {
  const vol = `${name}-data`;
  return {
    name,
    volumes: [`  ${vol}:`],
    dependsOn: [],
    yaml: `  ${name}:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - ${vol}:/data
    networks:
      - app-network`,
  };
}

// CDN has no local Docker equivalent — emit a clearly commented stub
function renderCDNStub(name: string): DockerServiceBlock {
  return {
    name,
    volumes: [],
    dependsOn: [],
    yaml: `  # ${name}: CDN is a managed service (e.g. CloudFront, Fastly).
  # No local Docker equivalent — configure via your cloud provider.`,
  };
}

// ── Docker Compose renderer map ───────────────────────────────────────────────

type DockerRenderer = (name: string, replicas: number) => DockerServiceBlock;

const DOCKER_RENDERERS: Record<ComponentType, DockerRenderer> = {
  "web-server":      (n, r) => renderWebServer(n, r),
  "microservice":    (n, r) => renderMicroservice(n, r),
  "postgresql":      (n, _) => renderPostgres(n),
  "mysql":           (n, _) => renderMySQL(n),
  "mongodb":         (n, _) => renderMongoDB(n),
  "redis-cache":     (n, _) => renderRedis(n),
  "load-balancer":   (n, _) => renderNginx(n),
  "reverse-proxy":   (n, _) => renderNginx(n),
  "message-queue":   (n, _) => renderKafka(n),
  "event-stream":    (n, _) => renderKafka(n),
  "llm-inference":   (n, _) => renderLLM(n),
  "vector-database": (n, _) => renderVectorDB(n),
  "object-storage":  (n, _) => renderMinio(n),
  "cdn":             (n, _) => renderCDNStub(n),
};

// ── Terraform renderers ───────────────────────────────────────────────────────

function tfALB(env: string): TerraformBlock {
  return {
    hcl: `
resource "aws_lb" "main" {
  name               = "\${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  tags               = { Environment = "${env}" }
}`,
  };
}

function tfECS(replicas: number): TerraformBlock {
  return {
    hcl: `
resource "aws_ecs_cluster" "main" {
  name = "\${var.environment}-cluster"
}

resource "aws_ecs_service" "app" {
  name          = "\${var.environment}-app"
  cluster       = aws_ecs_cluster.main.id
  desired_count = ${replicas}
  launch_type   = "FARGATE"
  tags          = { Environment = var.environment }
}`,
  };
}

function tfRDS(engine: "postgres" | "mysql", multiAZ: boolean): TerraformBlock {
  return {
    hcl: `
resource "aws_db_instance" "main" {
  identifier              = "\${var.environment}-db"
  engine                  = "${engine}"
  engine_version          = "${engine === "postgres" ? "16.1" : "8.0"}"
  instance_class          = "db.t3.medium"
  allocated_storage       = 20
  multi_az                = ${multiAZ}
  db_name                 = "appdb"
  username                = "appuser"
  password                = var.db_password
  backup_retention_period = 7
  skip_final_snapshot     = false
  tags                    = { Environment = var.environment }
}`,
  };
}

function tfDocumentDB(): TerraformBlock {
  return {
    hcl: `
resource "aws_docdb_cluster" "mongo" {
  cluster_identifier      = "\${var.environment}-docdb"
  engine                  = "docdb"
  master_username         = "appuser"
  master_password         = var.db_password
  backup_retention_period = 7
  skip_final_snapshot     = false
  tags                    = { Environment = var.environment }
}`,
  };
}

function tfElasticache(): TerraformBlock {
  return {
    hcl: `
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "\${var.environment}-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  tags                 = { Environment = var.environment }
}`,
  };
}

function tfMSK(): TerraformBlock {
  return {
    hcl: `
resource "aws_msk_cluster" "kafka" {
  cluster_name           = "\${var.environment}-kafka"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = []  # ⚠️  populate with your subnet IDs
    storage_info {
      ebs_storage_info { volume_size = 100 }
    }
  }

  tags = { Environment = var.environment }
}`,
  };
}

function tfOpenSearch(): TerraformBlock {
  return {
    hcl: `
resource "aws_opensearch_domain" "vector_db" {
  domain_name    = "\${var.environment}-vector"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type  = "m6g.large.search"
    instance_count = 2
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 50
  }

  tags = { Environment = var.environment }
}`,
  };
}

function tfS3(): TerraformBlock {
  return {
    hcl: `
resource "aws_s3_bucket" "storage" {
  bucket = "\${var.environment}-app-storage"
  tags   = { Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "storage" {
  bucket = aws_s3_bucket.storage.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}`,
  };
}

function tfCloudFront(hasALB: boolean): TerraformBlock {
  return {
    hcl: `
resource "aws_cloudfront_distribution" "main" {
  enabled = true

  origin {
    domain_name = ${hasALB ? "aws_lb.main.dns_name" : '"origin.example.com" # ⚠️  set your origin'}
    origin_id   = "primary"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"]
    cached_methods         = ["GET","HEAD"]
    target_origin_id       = "primary"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Environment = var.environment }
}`,
  };
}

function tfSageMaker(): TerraformBlock {
  return {
    hcl: `
resource "aws_sagemaker_endpoint" "llm" {
  name                 = "\${var.environment}-llm"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.llm.name
  tags                 = { Environment = var.environment }
}

resource "aws_sagemaker_endpoint_configuration" "llm" {
  name = "\${var.environment}-llm-config"

  production_variants {
    variant_name           = "primary"
    model_name             = aws_sagemaker_model.llm.name
    initial_instance_count = 1
    instance_type          = "ml.g5.2xlarge"
  }

  tags = { Environment = var.environment }
}`,
  };
}

// ── Main exporter ─────────────────────────────────────────────────────────────

export class IaCExporter {
  // ── Docker Compose ──────────────────────────────────────────────────────────

  static generateDockerCompose(
    nodes: Node<SystemNodeData>[],
    edges: Edge<SystemEdgeData>[]
  ): string {
    const usedNames = new Map<string, number>();
    const warnings: string[] = [];

    // Pass 1: render all nodes, build nodeId → serviceName map
    const nodeServiceMap = new Map<string, string>();
    const blocks: DockerServiceBlock[] = [];

    for (const node of nodes) {
      const componentType = node.data.componentType as ComponentType;
      const renderer = DOCKER_RENDERERS[componentType];

      if (!renderer) {
        warnings.push(`Unknown component type "${componentType}" (node: ${node.id}) — skipped.`);
        continue;
      }

      const name = toServiceName(node.data.config.label, usedNames);
      const replicas = node.data.config.replicas ?? 1;
      const block = renderer(name, replicas);

      nodeServiceMap.set(node.id, block.name);
      blocks.push(block);
    }

    // Pass 2: resolve depends_on from edges
    for (const edge of edges) {
      const sourceName = nodeServiceMap.get(edge.source);
      const targetName = nodeServiceMap.get(edge.target);
      if (!sourceName || !targetName) continue;

      const block = blocks.find((b) => b.name === sourceName);
      if (block && !block.dependsOn.includes(targetName)) {
        block.dependsOn.push(targetName);
      }
    }

    // Pass 3: inject depends_on into yaml
    const serviceYamls = blocks.map((block) => {
      if (block.dependsOn.length === 0) return block.yaml;
      
      const depLines = block.dependsOn.map((d) => `      - ${d}`).join("\n");
      const depsYaml = `\n    depends_on:\n${depLines}`;

      // FIX: Use a regex that targets the specific service block by name.
      // This prevents injection into sidecars (like Zookeeper) and ensures
      // dependencies are attached to the correct service.
      // Matches: "  service-name:" ... "    networks:" (with anything in between)
      const pattern = new RegExp(
        `(^  ${block.name}:\\n[\\s\\S]*?)(\\n    networks:)`, 
        "m"
      );
      
      // If the pattern matches, inject dependencies before networks.
      // If it fails (shouldn't for valid blocks), append to end as fallback.
      if (pattern.test(block.yaml)) {
        return block.yaml.replace(pattern, `$1${depsYaml}$2`);
      }
      
      // Fallback for malformed blocks (should theoretically not be reached)
      return block.yaml + depsYaml;
    });

    // Deduplicate volumes
    const allVolumes = [...new Set(blocks.flatMap((b) => b.volumes))];
    const volumeBlock =
      allVolumes.length > 0 ? `\nvolumes:\n${allVolumes.join("\n")}\n` : "";

    const warningBlock =
      warnings.length > 0
        ? warnings.map((w) => `# ⚠️  ${w}`).join("\n") + "\n"
        : "";

    const componentSummary = nodes
      .map((n) => n.data.config.label)
      .slice(0, 3)
      .join(", ");
    const ellipsis = nodes.length > 3 ? "..." : "";

    return `# Generated by SysDesign Simulator
# Architecture: ${componentSummary}${ellipsis}
# Generated: ${new Date().toISOString()}
# ⚠️  Review and adjust before production use
${warningBlock}
services:
${serviceYamls.join("\n\n")}

networks:
  app-network:
    driver: bridge
${volumeBlock}`;
  }

  // ── Terraform (AWS) ─────────────────────────────────────────────────────────

  static generateTerraform(
    nodes: Node<SystemNodeData>[],
    _edges: Edge<SystemEdgeData>[]
  ): string {
    const warnings: string[] = [];
    const blocks: TerraformBlock[] = [];
    const rendered = new Set<string>();

    const has = (...types: ComponentType[]): boolean =>
      nodes.some((n) => types.includes(n.data.componentType as ComponentType));

    const firstOf = (...types: ComponentType[]): Node<SystemNodeData> | undefined =>
      nodes.find((n) => types.includes(n.data.componentType as ComponentType));

    // Validate all node types upfront
    for (const node of nodes) {
      const known: ComponentType[] = [
        "web-server","microservice","postgresql","mysql","mongodb",
        "redis-cache","load-balancer","reverse-proxy","message-queue",
        "event-stream","llm-inference","vector-database","object-storage","cdn",
      ];
      if (!known.includes(node.data.componentType as ComponentType)) {
        warnings.push(`Unknown component type "${node.data.componentType}" — skipped.`);
      }
    }

    const hasALB = has("load-balancer", "reverse-proxy");

    if (hasALB && !rendered.has("alb")) {
      blocks.push(tfALB("var.environment"));
      rendered.add("alb");
    }

    if (has("web-server", "microservice") && !rendered.has("ecs")) {
      const node = firstOf("web-server");
      const replicas = node?.data.config.replicas ?? 1;
      blocks.push(tfECS(replicas));
      rendered.add("ecs");
    }

    if (has("postgresql") && !rendered.has("rds-postgres")) {
      const node = firstOf("postgresql");
      const multiAZ = (node?.data.config.replicas ?? 1) >= 2;
      blocks.push(tfRDS("postgres", multiAZ));
      rendered.add("rds-postgres");
    }

    if (has("mysql") && !rendered.has("rds-mysql")) {
      const node = firstOf("mysql");
      const multiAZ = (node?.data.config.replicas ?? 1) >= 2;
      blocks.push(tfRDS("mysql", multiAZ));
      rendered.add("rds-mysql");
    }

    if (has("mongodb") && !rendered.has("docdb")) {
      blocks.push(tfDocumentDB());
      rendered.add("docdb");
    }

    if (has("redis-cache") && !rendered.has("elasticache")) {
      blocks.push(tfElasticache());
      rendered.add("elasticache");
    }

    if (has("message-queue", "event-stream") && !rendered.has("msk")) {
      blocks.push(tfMSK());
      rendered.add("msk");
    }

    if (has("vector-database") && !rendered.has("opensearch")) {
      blocks.push(tfOpenSearch());
      rendered.add("opensearch");
    }

    if (has("object-storage") && !rendered.has("s3")) {
      blocks.push(tfS3());
      rendered.add("s3");
    }

    if (has("cdn") && !rendered.has("cloudfront")) {
      blocks.push(tfCloudFront(hasALB));
      rendered.add("cloudfront");
    }

    if (has("llm-inference") && !rendered.has("sagemaker")) {
      blocks.push(tfSageMaker());
      rendered.add("sagemaker");
    }

    const warningBlock =
      warnings.length > 0
        ? "\n" + warnings.map((w) => `# ⚠️  ${w}`).join("\n") + "\n"
        : "";

    const header = `# Generated by SysDesign Simulator
# Provider: AWS
# Generated: ${new Date().toISOString()}
# ⚠️  Review all settings before applying — costs may apply
${warningBlock}
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region"   { default = "us-east-1" }
variable "environment"  { default = "production" }
variable "db_password"  { sensitive = true }`;

    return [header, ...blocks.map((b) => b.hcl)].join("\n");
  }
}
