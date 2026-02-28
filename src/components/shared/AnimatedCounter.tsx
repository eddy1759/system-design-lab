import React, { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = React.memo(
  ({ value, format, duration = 600, className = "" }) => {
    const [display, setDisplay] = useState(value);
    const prevRef = useRef(value);
    const frameRef = useRef(0);

    useEffect(() => {
      const start = prevRef.current;
      const diff = value - start;
      if (Math.abs(diff) < 0.001) {
        setDisplay(value);
        prevRef.current = value;
        return;
      }

      const startTime = performance.now();

      function animate(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + diff * eased;
        setDisplay(current);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        } else {
          prevRef.current = value;
        }
      }

      frameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frameRef.current);
    }, [value, duration]);

    const formatted = format ? format(display) : Math.round(display).toString();

    return (
      <span className={`font-mono transition-colors duration-300 ${className}`}>
        {formatted}
      </span>
    );
  }
);

AnimatedCounter.displayName = "AnimatedCounter";
