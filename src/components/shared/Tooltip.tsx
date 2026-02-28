import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: React.ReactNode;
  title?: string;
  shortcut?: string;
  learnMoreId?: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  disabled?: boolean;
  isAI?: boolean;
  children: React.ReactNode;
}

export function Tooltip({
  content,
  title,
  shortcut,
  learnMoreId,
  position = "top",
  delay = 400,
  disabled = false,
  isAI = false,
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback(
    (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const GAP = 10;
      switch (position) {
        case "top":
          return { top: rect.top - GAP, left: rect.left + rect.width / 2 };
        case "bottom":
          return { top: rect.bottom + GAP, left: rect.left + rect.width / 2 };
        case "left":
          return { top: rect.top + rect.height / 2, left: rect.left - GAP };
        case "right":
          return { top: rect.top + rect.height / 2, left: rect.right + GAP };
      }
    },
    [position]
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        setCoords(computePosition(triggerRef.current));
        setVisible(true);
      }
    }, delay);
  }, [disabled, delay, computePosition]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  // Suppress tooltips during any active drag
  useEffect(() => {
    const suppress = () => {
      setVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    window.addEventListener("dragstart", suppress);
    return () => window.removeEventListener("dragstart", suppress);
  }, []);

  // Cleanup timer on unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const accentColor = isAI ? "rgba(199,125,255,0.35)" : "rgba(0,245,255,0.25)";
  const accentText = isAI ? "#c77dff" : "#00f5ff";

  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 99999,
    pointerEvents: "none",
    maxWidth: 280,
    padding: "10px 14px",
    background: "#0a1628",
    border: `1px solid ${accentColor}`,
    borderRadius: 8,
    boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 12px ${accentColor}`,
    color: "#e2e8f0",
    fontFamily: '"Fira Code", monospace',
    fontSize: 12,
    lineHeight: 1.6,
    opacity: visible ? 1 : 0,
    visibility: visible ? ("visible" as const) : ("hidden" as const),
    transition: "opacity 0.15s ease, visibility 0.15s ease",
    ...(position === "top" && {
      transform: "translate(-50%, -100%)",
      top: coords.top,
      left: coords.left,
    }),
    ...(position === "bottom" && {
      transform: "translate(-50%, 0)",
      top: coords.top,
      left: coords.left,
    }),
    ...(position === "left" && {
      transform: "translate(-100%, -50%)",
      top: coords.top,
      left: coords.left,
    }),
    ...(position === "right" && {
      transform: "translate(0, -50%)",
      top: coords.top,
      left: coords.left,
    }),
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: "contents" }}
      >
        {children}
      </div>

      {createPortal(
        <div style={tooltipStyle} role="tooltip">
          {title && (
            <div
              style={{
                fontWeight: 700,
                color: accentText,
                marginBottom: 4,
                fontSize: 12,
                fontFamily: '"Syne", sans-serif',
              }}
            >
              {title}
            </div>
          )}
          <div style={{ color: "#cbd5e1" }}>{content}</div>
          {shortcut && (
            <div style={{ marginTop: 6 }}>
              <kbd
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 3,
                  padding: "1px 6px",
                  fontSize: 11,
                  color: "#94a3b8",
                }}
              >
                {shortcut}
              </kbd>
            </div>
          )}
          {learnMoreId && (
            <div style={{ marginTop: 6, color: accentText, fontSize: 11 }}>
              Learn more →
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
