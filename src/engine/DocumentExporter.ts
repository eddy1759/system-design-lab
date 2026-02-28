import type { Node, Edge } from "reactflow";
import type { SystemNodeData, SystemEdgeData } from "../types/components";
import type { MetricSnapshot } from "../types/metrics";
import type { ValidationReport } from "./ArchitectureValidator";
import type { ValidationContext } from "./ValidationContext";
import { COMPONENT_MAP } from "../constants/componentDefinitions";

export class DocumentExporter {
  static generateMarkdown(
    nodes: Node<SystemNodeData>[],
    edges: Edge<SystemEdgeData>[],
    metrics: MetricSnapshot,
    report: ValidationReport | null,
    ctx: ValidationContext | null,
    title: string,
    userNotes: string
  ): string {
    const date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const scalePart = ctx ? ` | Scale: ${ctx.scaleTierLabel}` : "";
    const scorePart = report
      ? ` | Validation Score: ${report.overallScore}/100`
      : "";

    const lines: string[] = [];
    lines.push(`# Architecture: ${title}`);
    lines.push(`Generated: ${date}${scalePart}${scorePart}`);
    lines.push("");

    // System overview
    lines.push("## System Overview");
    const componentTypes = [...new Set(nodes.map((n) => n.data.componentType))];
    lines.push(
      `A system with ${nodes.length} component${
        nodes.length !== 1 ? "s" : ""
      } (${componentTypes.length} distinct types) and ${
        edges.length
      } connection${edges.length !== 1 ? "s" : ""}.`
    );
    lines.push("");

    // Components
    lines.push(`## Components (${nodes.length} total)`);
    lines.push("");
    for (const node of nodes) {
      const def = COMPONENT_MAP.get(node.data.componentType);
      const icon = def?.category === "ai" ? "🤖" : "🔧";
      lines.push(`### ${icon} ${node.data.config.label}`);
      lines.push(`- Type: ${def?.name ?? node.data.componentType}`);
      if (node.data.config.replicas > 1) {
        lines.push(`- Instances: ${node.data.config.replicas} ✅ (replicated)`);
      } else {
        lines.push(`- Instances: 1${node.data.isSPOF ? " ⚠️ (SPOF)" : ""}`);
      }
      if (node.data.currentRPS > 0) {
        lines.push(
          `- Current load: ${Math.round(
            node.data.currentLoad * 100
          )}% (${Math.round(node.data.currentRPS)} rps)`
        );
      }
      lines.push("");
    }

    // Data flow
    lines.push("## Data Flow");
    const flowLabels = computeFlowLabels(nodes, edges);
    lines.push(
      flowLabels ||
        "_No data flow computed — connect components to see the critical path._"
    );
    lines.push("");

    // Metrics
    lines.push("## Current Metrics");
    lines.push("| Metric | Value | Status |");
    lines.push("|--------|-------|--------|");
    lines.push(
      `| P50 Latency | ${Math.round(metrics.latencyP50)}ms | ${
        metrics.latencyP50 < 100 ? "✅" : "⚠️"
      } |`
    );
    lines.push(
      `| P99 Latency | ${Math.round(metrics.latencyP99)}ms | ${
        metrics.latencyP99 < 500 ? "✅" : "⚠️"
      } |`
    );
    lines.push(
      `| Throughput | ${metrics.throughput.toLocaleString()} req/s | ✅ |`
    );
    lines.push(
      `| Error Rate | ${(metrics.errorRate * 100).toFixed(2)}% | ${
        metrics.errorRate < 0.01 ? "✅" : "⚠️"
      } |`
    );
    lines.push(
      `| Availability | ${(metrics.availability * 100).toFixed(2)}% | ${
        metrics.availability >= 0.999 ? "✅" : "⚠️"
      } |`
    );
    lines.push(`| Monthly Cost | ~$${Math.round(metrics.monthlyCost)} | ✅ |`);
    lines.push("");

    // Validation
    if (report) {
      lines.push(
        `## Validation Summary (Score: ${report.overallScore}/100 — Grade: ${report.grade})`
      );
      if (report.strengths.length > 0) {
        lines.push("### ✅ Strengths");
        report.strengths.forEach((s) => lines.push(`- ${s}`));
        lines.push("");
      }
      const advisories = report.dimensions.flatMap((d) =>
        d.checks.filter((c) => c.outcome === "advisory" && c.advisoryNote)
      );
      if (advisories.length > 0) {
        lines.push("### ⚠️ Advisory");
        advisories.forEach((a) => lines.push(`- ${a.name}: ${a.advisoryNote}`));
        lines.push("");
      }
      const fails = report.dimensions.flatMap((d) =>
        d.checks.filter((c) => c.outcome === "fail")
      );
      if (fails.length > 0) {
        lines.push("### ❌ Issues");
        fails.forEach((f) =>
          lines.push(`- ${f.name}: ${f.fix ?? f.contextNote}`)
        );
        lines.push("");
      }
    }

    // User notes
    if (userNotes.trim()) {
      lines.push("## Architecture Decisions");
      lines.push(userNotes.trim());
      lines.push("");
    }

    return lines.join("\n");
  }

  static exportAsPDF(markdown: string, title: string): void {
    const html = markdownToBasicHTML(markdown);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title} — Architecture Document</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 800px; margin: 40px auto; color: #1e293b; line-height: 1.7; }
    h1 { color: #0f172a; border-bottom: 2px solid #00f5ff; padding-bottom: 8px; font-size: 24px; }
    h2 { color: #0f172a; margin-top: 32px; font-size: 18px; }
    h3 { color: #334155; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    ul { padding-left: 24px; }
    li { margin-bottom: 4px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>${html}</body>
</html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  static downloadMarkdown(markdown: string, title: string): void {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title
      .replace(/\s+/g, "-")
      .toLowerCase()}-architecture.md`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function computeFlowLabels(
  nodes: Node<SystemNodeData>[],
  edges: Edge<SystemEdgeData>[]
): string {
  if (edges.length === 0) return "";
  const nodeMap = new Map(nodes.map((n) => [n.id, n.data.config.label]));
  const chains: string[] = [];
  for (const edge of edges.slice(0, 10)) {
    const src = nodeMap.get(edge.source) ?? edge.source;
    const tgt = nodeMap.get(edge.target) ?? edge.target;
    chains.push(`${src} → ${tgt}`);
  }
  return chains.join("  \n");
}

function markdownToBasicHTML(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      if (cells.every((c) => /^[-]+$/.test(c))) return "";
      const tag = match.includes("---") ? "td" : "td";
      return (
        "<tr>" + cells.map((c) => `<${tag}>${c}</${tag}>`).join("") + "</tr>"
      );
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, (match) => `<table>${match}</table>`)
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "\n");
}
