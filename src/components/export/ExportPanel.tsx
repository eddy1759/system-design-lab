import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore";
import { useSimulationStore } from "../../store/simulationStore";
import { ShareEncoder } from "../../utils/ShareEncoder";
import { DocumentExporter } from "../../engine/DocumentExporter";
import { IaCExporter } from "../../engine/IaCExporter";
import {
  ArchitectureValidator,
  type ValidationReport,
} from "../../engine/ArchitectureValidator";
import { useScenarioStore } from "../../store/scenarioStore";
import { SCENARIOS } from "../../engine/ScenarioEngine";

// ─── Export Panel ───────────────────────────────────────────────────────────

type ExportMode = "share" | "doc" | "image" | "iac";
type IaCFormat = "docker" | "terraform";

export function ExportPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const metrics = useSimulationStore((s) => s.currentMetrics);
  const trafficLoad = useSimulationStore((s) => s.trafficLoad);
  const trafficPattern = useSimulationStore((s) => s.trafficPattern);
  const spofNodeIds = useSimulationStore((s) => s.spofNodeIds);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);

  const [title, setTitle] = useState("My Architecture");
  const [notes, setNotes] = useState("");
  const [activeMode, setActiveMode] = useState<ExportMode>("share");
  const [iacFormat, setIacFormat] = useState<IaCFormat>("docker");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [imageExporting, setImageExporting] = useState(false);

  // Generate share URL on open
  useEffect(() => {
    if (isOpen && nodes.length > 0) {
      setShareUrl(ShareEncoder.encode(nodes, edges, title));
    }
  }, [isOpen, nodes, edges, title]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  const getReport = useCallback((): ValidationReport | null => {
    if (nodes.length < 2) return null;
    const activeScenario = activeScenarioId
      ? SCENARIOS.find((s) => s.id === activeScenarioId) ?? null
      : null;
    return ArchitectureValidator.validate(
      nodes,
      edges,
      spofNodeIds,
      metrics,
      trafficLoad,
      trafficPattern,
      activeScenario
    );
  }, [
    nodes,
    edges,
    spofNodeIds,
    metrics,
    trafficLoad,
    trafficPattern,
    activeScenarioId,
  ]);

  const handleExportPDF = useCallback(() => {
    const report = getReport();
    const md = DocumentExporter.generateMarkdown(
      nodes,
      edges,
      metrics,
      report,
      report?.context ?? null,
      title,
      notes
    );
    DocumentExporter.exportAsPDF(md, title);
  }, [nodes, edges, metrics, title, notes, getReport]);

  const handleExportMarkdown = useCallback(() => {
    const report = getReport();
    const md = DocumentExporter.generateMarkdown(
      nodes,
      edges,
      metrics,
      report,
      report?.context ?? null,
      title,
      notes
    );
    DocumentExporter.downloadMarkdown(md, title);
  }, [nodes, edges, metrics, title, notes, getReport]);

  const handleExportIaC = useCallback(() => {
    const code =
      iacFormat === "docker"
        ? IaCExporter.generateDockerCompose(nodes, edges)
        : IaCExporter.generateTerraform(nodes, edges);

    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = iacFormat === "docker" ? "docker-compose.yml" : "main.tf";
    link.click();
    URL.revokeObjectURL(url);
  }, [iacFormat, nodes, edges]);

  const handleExportPNG = useCallback(async () => {
    setImageExporting(true);
    try {
      const el = document.querySelector(".react-flow") as HTMLElement | null;
      if (!el) {
        alert("Canvas element not found.");
        return;
      }
      // Dynamic import html-to-image to avoid hard dep if not installed
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, {
        backgroundColor: "#050d1a",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${title.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
      alert(
        "PNG export failed. Make sure html-to-image is installed: npm install html-to-image"
      );
    } finally {
      setImageExporting(false);
    }
  }, [title]);

  if (!isOpen) return null;

  const iacPreview =
    iacFormat === "docker"
      ? IaCExporter.generateDockerCompose(nodes, edges)
      : IaCExporter.generateTerraform(nodes, edges);

  const modes: { id: ExportMode; label: string; desc: string }[] = [
    { id: "share", label: "🔗 Share Link", desc: "Shareable URL" },
    { id: "doc", label: "📋 Document", desc: "PDF / Markdown" },
    { id: "image", label: "🖼️ Image", desc: "PNG screenshot" },
    { id: "iac", label: "💻 Code", desc: "Terraform / Docker" },
  ];

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5,13,26,0.85)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#0a1628",
          border: "1px solid rgba(0,245,255,0.2)",
          borderRadius: 12,
          width: 580,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                color: "#e2e8f0",
                fontFamily: '"Syne", sans-serif',
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Export & Share
            </h2>
            <p
              style={{
                color: "#64748b",
                fontFamily: '"Inter", sans-serif',
                fontSize: 13,
                margin: "4px 0 0",
              }}
            >
              Share your architecture or export it as a document, image, or code
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              borderRadius: 6,
              padding: 6,
              cursor: "pointer",
            }}
          >
            <X size={16} color="#94a3b8" />
          </button>
        </div>

        {/* Architecture title input */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <label
            style={{
              color: "#94a3b8",
              fontFamily: '"Syne", sans-serif',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            ARCHITECTURE NAME
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              background: "#0f1f38",
              border: "1px solid rgba(0,245,255,0.15)",
              borderRadius: 6,
              padding: "8px 12px",
              color: "#e2e8f0",
              fontFamily: '"Inter", sans-serif',
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
            placeholder="e.g. Basic Web App, Twitter Clone..."
          />
        </div>

        {/* Mode tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              style={{
                flex: 1,
                padding: "12px 8px",
                border: "none",
                cursor: "pointer",
                background:
                  activeMode === mode.id
                    ? "rgba(0,245,255,0.08)"
                    : "transparent",
                borderBottom:
                  activeMode === mode.id
                    ? "2px solid #00f5ff"
                    : "2px solid transparent",
                color: activeMode === mode.id ? "#00f5ff" : "#64748b",
                fontFamily: '"Syne", sans-serif',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <div>{mode.label}</div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  marginTop: 2,
                  fontFamily: '"Inter", sans-serif',
                }}
              >
                {mode.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Mode content */}
        <div style={{ padding: "20px 24px", overflow: "auto", flex: 1 }}>
          {/* ── Share Link ───────────────────── */}
          {activeMode === "share" && (
            <div>
              <p
                style={{
                  color: "#94a3b8",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Anyone with this link can open your architecture in SysDesign
                Simulator — all components, positions, and connections.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={shareUrl}
                  readOnly
                  style={{
                    flex: 1,
                    background: "#0f1f38",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    padding: "8px 12px",
                    color: "#64748b",
                    fontFamily: '"Fira Code", monospace',
                    fontSize: 11,
                    outline: "none",
                  }}
                />
                <button onClick={handleCopyLink} style={btnPrimary(copied)}>
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
              <p
                style={{
                  color: "#475569",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 11,
                  marginTop: 10,
                }}
              >
                The entire architecture is encoded in the URL — no server, no
                account required.
              </p>
            </div>
          )}

          {/* ── Document ─────────────────────── */}
          {activeMode === "doc" && (
            <div>
              <p
                style={{
                  color: "#94a3b8",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Generates a formatted architecture document with components,
                metrics, validation summary, and growth roadmap.
              </p>
              <label
                style={{
                  color: "#94a3b8",
                  fontFamily: '"Syne", sans-serif',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ARCHITECTURE DECISIONS (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why did you choose these components? What tradeoffs did you make?"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  height: 80,
                  background: "#0f1f38",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  color: "#e2e8f0",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={handleExportPDF} style={exportBtnStyle}>
                  Export as PDF
                </button>
                <button onClick={handleExportMarkdown} style={exportBtnAlt}>
                  Export as Markdown
                </button>
              </div>
            </div>
          )}

          {/* ── Image ────────────────────────── */}
          {activeMode === "image" && (
            <div>
              <p
                style={{
                  color: "#94a3b8",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Exports the canvas as a PNG image. Useful for presentations,
                design docs, or Slack.
              </p>
              <button
                onClick={handleExportPNG}
                style={exportBtnStyle}
                disabled={imageExporting}
              >
                {imageExporting ? "Exporting..." : "Download PNG"}
              </button>
              <p
                style={{
                  color: "#475569",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 11,
                  marginTop: 10,
                }}
              >
                The image includes all components and connections at their
                current canvas positions.
              </p>
            </div>
          )}

          {/* ── IaC ──────────────────────────── */}
          {activeMode === "iac" && (
            <div>
              <p
                style={{
                  color: "#94a3b8",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Generates runnable infrastructure code from your architecture.
                Review all settings before deploying.
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {(["docker", "terraform"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setIacFormat(fmt)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background:
                        iacFormat === fmt ? "rgba(0,245,255,0.1)" : "#0f1f38",
                      border: `1px solid ${
                        iacFormat === fmt ? "#00f5ff" : "rgba(255,255,255,0.1)"
                      }`,
                      color: iacFormat === fmt ? "#00f5ff" : "#94a3b8",
                      fontFamily: '"Syne", sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {fmt === "docker"
                      ? "🐳 Docker Compose"
                      : "🏗️ Terraform (AWS)"}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div
                style={{
                  background: "#050d1a",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontFamily: '"Fira Code", monospace',
                    fontSize: 11,
                    color: "#94a3b8",
                    lineHeight: 1.6,
                  }}
                >
                  {iacPreview.slice(0, 800)}
                  {iacPreview.length > 800 ? "\n..." : ""}
                </pre>
              </div>

              <button
                onClick={handleExportIaC}
                style={{ ...exportBtnStyle, marginTop: 12 }}
              >
                Download{" "}
                {iacFormat === "docker" ? "docker-compose.yml" : "main.tf"}
              </button>

              <p
                style={{
                  color: "#475569",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 11,
                  marginTop: 10,
                }}
              >
                ⚠️ Generated code is a starting point. Review resource sizing,
                secrets management, and networking before deploying.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const exportBtnStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  background: "#00f5ff",
  color: "#050d1a",
  fontFamily: '"Syne", sans-serif',
  fontWeight: 700,
  fontSize: 13,
};

const exportBtnAlt: React.CSSProperties = {
  ...exportBtnStyle,
  background: "#0f1f38",
  color: "#00f5ff",
  border: "1px solid rgba(0,245,255,0.3)",
};

function btnPrimary(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    background: active ? "#00ff88" : "#00f5ff",
    color: "#050d1a",
    fontFamily: '"Syne", sans-serif',
    fontWeight: 700,
    fontSize: 13,
    transition: "background 0.2s",
  };
}
