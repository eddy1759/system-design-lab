import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore";
import { useSimulationStore } from "../../store/simulationStore";
import { useScenarioStore } from "../../store/scenarioStore";
import { SCENARIOS } from "../../engine/ScenarioEngine";
import {
  ArchitectureValidator,
  type ValidationReport,
  type ValidationDimension,
  type ValidationCheck,
  type CheckOutcome,
} from "../../engine/ArchitectureValidator";
import {
  type ValidationContext,
  type ScaleTier,
  type ScaleTierSignals,
  SCALE_TIER_COLORS,
} from "../../engine/ValidationContext";

// ─── Score Ring ──────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const animate = () => {
      const progress = Math.min(1, (Date.now() - start) / 1500);
      setDisplayed(Math.round(score * progress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const color =
    score >= 90
      ? "#00f5ff"
      : score >= 80
      ? "#00ff88"
      : score >= 60
      ? "#ffb800"
      : "#ff3860";
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (displayed / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <svg width="140" height="140">
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            color,
            fontFamily: '"Syne", sans-serif',
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {displayed}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#64748b",
            fontFamily: '"Fira Code", monospace',
          }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

// ─── Context Banner ─────────────────────────────────────────────────────

function ContextBanner({ ctx }: { ctx: ValidationContext }) {
  return (
    <div
      style={{
        background: "rgba(0,245,255,0.05)",
        border: "1px solid rgba(0,245,255,0.15)",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            color: "#00f5ff",
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          VALIDATION CONTEXT
        </span>
        <span
          style={{
            background: SCALE_TIER_COLORS[ctx.scaleTier],
            color: "#050d1a",
            fontFamily: '"Fira Code", monospace',
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 12,
          }}
        >
          {ctx.scaleTierLabel}
        </span>
      </div>

      <div
        style={{
          color: "#94a3b8",
          fontFamily: '"Inter", sans-serif',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        Evaluating against{" "}
        <strong style={{ color: "#e2e8f0" }}>{ctx.scaleTierLabel}</strong>{" "}
        standards. Checks marked{" "}
        <span style={{ color: "#ffb800" }}>⚠️ Advisory</span> are not required
        at your current scale but will be needed as you grow. Only{" "}
        <span style={{ color: "#ff3860" }}>❌ Failed</span> checks represent
        genuine issues at your current traffic (
        {ctx.currentRPS.toLocaleString()} req/s).
      </div>

      {/* Scale tier signal explainer */}
      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          fontFamily: '"Fira Code", monospace',
          marginTop: 2,
        }}
      >
        Scale signals: Traffic→{ctx.scaleTierSignals.trafficTier}
        {" · "}Complexity→{ctx.scaleTierSignals.complexityTier}
        {" · "}Components→{ctx.scaleTierSignals.componentTier}
        {ctx.scaleTierSignals.scenarioTier && (
          <>
            {" · "}Scenario→{ctx.scaleTierSignals.scenarioTier}
          </>
        )}
        {" → "}
        <span style={{ color: "#00f5ff" }}>
          Using: {ctx.scaleTierSignals.resolvedTier}
        </span>
      </div>

      {ctx.mode === "scenario" && ctx.scenarioName && (
        <div
          style={{
            marginTop: 4,
            padding: "8px 12px",
            background: "rgba(255,184,0,0.08)",
            border: "1px solid rgba(255,184,0,0.2)",
            borderRadius: 6,
            color: "#ffb800",
            fontFamily: '"Fira Code", monospace',
            fontSize: 12,
          }}
        >
          🎯 Scenario mode: evaluating against{" "}
          <strong>{ctx.scenarioName}</strong> SLA targets
        </div>
      )}
    </div>
  );
}

// ─── Check Item ─────────────────────────────────────────────────────────

const OUTCOME_ICONS: Record<CheckOutcome, string> = {
  pass: "✅",
  advisory: "⚠️",
  fail: "❌",
};
const OUTCOME_COLORS: Record<CheckOutcome, string> = {
  pass: "#00ff88",
  advisory: "#ffb800",
  fail: "#ff3860",
};
const OUTCOME_LABELS: Record<CheckOutcome, string> = {
  pass: "PASS",
  advisory: "ADVISORY",
  fail: "FAIL",
};

function CheckItem({ check }: { check: ValidationCheck }) {
  const color = OUTCOME_COLORS[check.outcome];
  return (
    <div
      style={{
        padding: "10px 12px",
        borderLeft: `3px solid ${color}`,
        background: "rgba(255,255,255,0.02)",
        borderRadius: "0 6px 6px 0",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 12 }}>{OUTCOME_ICONS[check.outcome]}</span>
        <span
          style={{
            color: "#e2e8f0",
            fontFamily: '"Syne", sans-serif',
            fontWeight: 600,
            fontSize: 13,
            flex: 1,
          }}
        >
          {check.name}
        </span>
        <span
          style={{
            color,
            fontFamily: '"Fira Code", monospace',
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 6px",
            border: `1px solid ${color}40`,
            borderRadius: 10,
          }}
        >
          {OUTCOME_LABELS[check.outcome]}
        </span>
      </div>

      <p
        style={{
          color: "#94a3b8",
          fontFamily: '"Inter", sans-serif',
          fontSize: 12,
          margin: "0 0 4px 0",
          lineHeight: 1.5,
        }}
      >
        {check.contextNote}
      </p>
      <p
        style={{
          color: "#64748b",
          fontFamily: '"Inter", sans-serif',
          fontSize: 12,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {check.explanation}
      </p>

      {check.outcome === "advisory" && check.advisoryNote && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            background: "rgba(255,184,0,0.06)",
            border: "1px solid rgba(255,184,0,0.15)",
            borderRadius: 4,
            color: "#ffb800",
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          📈 {check.advisoryNote}
          {check.scaleTierTrigger && (
            <span style={{ marginLeft: 6, opacity: 0.7 }}>
              (Required at: {check.scaleTierTrigger} stage)
            </span>
          )}
        </div>
      )}

      {check.outcome === "fail" && check.fix && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            background: "rgba(255,56,96,0.06)",
            border: "1px solid rgba(255,56,96,0.15)",
            borderRadius: 4,
            color: "#ff8fa3",
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          🔧 Fix: {check.fix}
        </div>
      )}
    </div>
  );
}

// ─── Dimension Row ──────────────────────────────────────────────────────

function DimensionRow({ dim }: { dim: ValidationDimension }) {
  const [expanded, setExpanded] = useState(false);
  const barColor =
    dim.score >= 80 ? "#00ff88" : dim.score >= 60 ? "#ffb800" : "#ff3860";
  const statusIcon = dim.score >= 80 ? "✅" : dim.score >= 60 ? "⚠️" : "🔴";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 8,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {expanded ? (
          <ChevronDown size={14} color="#64748b" />
        ) : (
          <ChevronRight size={14} color="#64748b" />
        )}
        <span style={{ fontSize: 16 }}>{dim.icon}</span>
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            color: "#e2e8f0",
            fontFamily: '"Syne", sans-serif',
          }}
        >
          {dim.name}
        </span>
        <div
          style={{
            width: 100,
            height: 6,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 3,
          }}
        >
          <div
            style={{
              width: `${dim.score}%`,
              height: "100%",
              borderRadius: 3,
              background: barColor,
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: barColor,
            fontFamily: '"Fira Code", monospace',
            width: 50,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {dim.score}
        </span>
        <span style={{ fontSize: 14 }}>{statusIcon}</span>
      </button>

      {expanded && (
        <div style={{ padding: "4px 16px 16px 16px" }}>
          {dim.checks.map((check) => (
            <CheckItem key={check.id} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Growth Roadmap ─────────────────────────────────────────────────────

function GrowthRoadmap({
  ctx,
  allChecks,
}: {
  ctx: ValidationContext;
  allChecks: ValidationCheck[];
}) {
  const TIERS: ScaleTier[] = [
    "prototype",
    "startup",
    "growth",
    "scale",
    "enterprise",
  ];
  const currentIdx = TIERS.indexOf(ctx.scaleTier);
  const futureTiers = TIERS.slice(currentIdx + 1);
  if (futureTiers.length === 0) return null;

  const TIER_LABELS: Record<ScaleTier, string> = {
    prototype: "Prototype",
    startup: "Startup (500–5K req/s)",
    growth: "Growth (5K–50K req/s)",
    scale: "At Scale (50K–500K req/s)",
    enterprise: "Enterprise (500K+ req/s)",
  };

  const advisoryByTier = futureTiers.reduce((acc, tier) => {
    acc[tier] = allChecks.filter(
      (c) => c.outcome === "advisory" && c.scaleTierTrigger === tier
    );
    return acc;
  }, {} as Record<string, ValidationCheck[]>);

  return (
    <div style={{ marginTop: 24 }}>
      <h3
        style={{
          color: "#e2e8f0",
          fontFamily: '"Syne", sans-serif',
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        📈 Growth Roadmap
      </h3>
      <p
        style={{
          color: "#64748b",
          fontFamily: '"Inter", sans-serif',
          fontSize: 12,
          marginBottom: 16,
        }}
      >
        Changes you'll need as your system scales up from {ctx.scaleTierLabel}.
      </p>
      {futureTiers.map((tier) => {
        const items = advisoryByTier[tier] ?? [];
        return (
          <div
            key={tier}
            style={{ marginBottom: 12, opacity: items.length === 0 ? 0.4 : 1 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: SCALE_TIER_COLORS[tier],
                }}
              />
              <span
                style={{
                  color: "#e2e8f0",
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                {TIER_LABELS[tier]}
              </span>
            </div>
            {items.length === 0 ? (
              <p
                style={{
                  color: "#475569",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 11,
                  marginLeft: 16,
                }}
              >
                No additional changes needed at this tier.
              </p>
            ) : (
              <ul style={{ marginLeft: 16, padding: 0, listStyle: "none" }}>
                {items.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      color: "#94a3b8",
                      fontFamily: '"Inter", sans-serif',
                      fontSize: 12,
                      marginBottom: 4,
                      display: "flex",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: SCALE_TIER_COLORS[tier] }}>→</span>
                    {item.advisoryNote ?? item.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────────────────

export function ValidationReportModal() {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const spofNodeIds = useSimulationStore((s) => s.spofNodeIds);
  const currentMetrics = useSimulationStore((s) => s.currentMetrics);
  const trafficLoad = useSimulationStore((s) => s.trafficLoad);
  const trafficPattern = useSimulationStore((s) => s.trafficPattern);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);

  const runValidation = useCallback(() => {
    setIsAnalysing(true);
    setTimeout(() => {
      const activeScenario = activeScenarioId
        ? SCENARIOS.find((s) => s.id === activeScenarioId) ?? null
        : null;
      const result = ArchitectureValidator.validate(
        nodes,
        edges,
        spofNodeIds,
        currentMetrics,
        trafficLoad,
        trafficPattern,
        activeScenario
      );
      setReport(result);
      setIsAnalysing(false);
    }, 600);
  }, [
    nodes,
    edges,
    spofNodeIds,
    currentMetrics,
    trafficLoad,
    trafficPattern,
    activeScenarioId,
  ]);

  useEffect(() => {
    const handler = () => runValidation();
    window.addEventListener("open-validation-report", handler);
    return () => window.removeEventListener("open-validation-report", handler);
  }, [runValidation]);

  const close = useCallback(() => {
    setReport(null);
    setIsAnalysing(false);
  }, []);

  if (!report && !isAnalysing) return null;

  const gradeColor = report
    ? report.grade === "A"
      ? "#00f5ff"
      : report.grade === "B"
      ? "#00ff88"
      : report.grade === "C"
      ? "#ffb800"
      : "#ff3860"
    : "#64748b";

  const allChecks = report ? report.dimensions.flatMap((d) => d.checks) : [];

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5,13,26,0.88)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Analysing state */}
      {isAnalysing && !report && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid rgba(0,245,255,0.2)",
              borderTopColor: "#00f5ff",
              borderRadius: "50%",
              animation: "validationSpin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p
            style={{
              fontSize: 14,
              color: "#94a3b8",
              fontFamily: '"Syne", sans-serif',
              fontWeight: 600,
            }}
          >
            Analysing architecture...
          </p>
        </div>
      )}

      {/* Report */}
      {report && (
        <div
          style={{
            width: 760,
            maxHeight: "88vh",
            overflow: "hidden",
            background: "#0a1628",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#e2e8f0",
                fontFamily: '"Syne", sans-serif',
                margin: 0,
              }}
            >
              Architecture Validation Report
            </h2>
            <button
              onClick={close}
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

          {/* Body */}
          <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
            {/* Context Banner */}
            <ContextBanner ctx={report.context} />

            {/* Top row: Score + Verdict + Top Issues */}
            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
              {/* Score + Grade */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: 24,
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  minWidth: 200,
                }}
              >
                <ScoreRing score={report.overallScore} />
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 24,
                    fontWeight: 800,
                    color: gradeColor,
                    fontFamily: '"Syne", sans-serif',
                  }}
                >
                  Grade: {report.grade}
                </div>
                {/* Contextual Verdict Badge */}
                <div
                  style={{
                    marginTop: 8,
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: '"Fira Code", monospace',
                    background: report.verdict.isPositive
                      ? "rgba(0,255,136,0.1)"
                      : "rgba(255,56,96,0.1)",
                    color: report.verdict.badgeColor,
                    border: `1px solid ${report.verdict.badgeColor}30`,
                  }}
                >
                  {report.verdict.badge}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    fontFamily: '"Inter", sans-serif',
                    textAlign: "center",
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {report.verdict.headline}
                </p>
              </div>

              {/* Top Issues + Strengths */}
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#94a3b8",
                    fontFamily: '"Syne", sans-serif',
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {report.topIssues.length > 0
                    ? "Top Issues to Fix"
                    : "Architecture Summary"}
                </h3>

                {report.topIssues.length === 0 ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#00ff88",
                      fontFamily: '"Inter", sans-serif',
                    }}
                  >
                    ✅ No critical issues found — nice work!
                  </p>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {report.topIssues.map((issue) => (
                      <div
                        key={issue.id}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 8,
                          background:
                            issue.severity === "critical"
                              ? "rgba(255,56,96,0.06)"
                              : "rgba(255,184,0,0.06)",
                          borderLeft: `3px solid ${
                            issue.severity === "critical"
                              ? "#ff3860"
                              : "#ffb800"
                          }`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: '"Inter", sans-serif',
                            color:
                              issue.severity === "critical"
                                ? "#ff3860"
                                : "#ffb800",
                            marginBottom: 4,
                          }}
                        >
                          {issue.severity === "critical" ? "🔴" : "🟡"}{" "}
                          {issue.name}
                        </div>
                        {issue.fix && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "#94a3b8",
                              fontFamily: '"Inter", sans-serif',
                              margin: 0,
                              lineHeight: 1.6,
                            }}
                          >
                            {issue.fix}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Verdict Detail */}
                <p
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontFamily: '"Inter", sans-serif',
                    marginTop: 12,
                    lineHeight: 1.6,
                  }}
                >
                  {report.verdict.detail}
                </p>

                {/* Strengths */}
                {report.strengths.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h3
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#64748b",
                        fontFamily: '"Syne", sans-serif',
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Strengths
                    </h3>
                    {report.strengths.map((s) => (
                      <div
                        key={s}
                        style={{
                          fontSize: 12,
                          color: "#00ff88",
                          fontFamily: '"Inter", sans-serif',
                          marginBottom: 4,
                        }}
                      >
                        ✓ {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dimension Breakdown */}
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#94a3b8",
                fontFamily: '"Syne", sans-serif',
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Dimension Breakdown
            </h3>
            {report.dimensions.map((dim) => (
              <DimensionRow key={dim.id} dim={dim} />
            ))}

            {/* Growth Roadmap */}
            <GrowthRoadmap ctx={report.context} allChecks={allChecks} />
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "#475569",
                fontFamily: '"Fira Code", monospace',
              }}
            >
              Generated at {new Date(report.generatedAt).toLocaleTimeString()}
            </span>
            <button
              onClick={runValidation}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                background: "rgba(0,245,255,0.15)",
                border: "1px solid rgba(0,245,255,0.3)",
                color: "#00f5ff",
                fontFamily: '"Syne", sans-serif',
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ↻ Re-validate
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes validationSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
