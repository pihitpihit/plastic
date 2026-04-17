import { useRef, useEffect, useState, type ReactNode } from "react";
import type { DismissAnimation } from "./Actionable.types";

interface DismissProps {
  children: ReactNode;
  active: boolean;
  animation: DismissAnimation;
  duration: number;
  onComplete: () => void;
}

export function ActionableDismiss({
  children,
  active,
  animation,
  duration,
  onComplete,
}: DismissProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "phase1" | "phase2">("idle");

  useEffect(() => {
    if (!ref.current) return;
    setMeasuredHeight(ref.current.getBoundingClientRect().height);
  }, []);

  useEffect(() => {
    if (!active) return;
    if (animation === "none") {
      onComplete();
      return;
    }
    setPhase("phase1");
    const half = duration / 2;
    const t1 = setTimeout(() => setPhase("phase2"), half);
    const t2 = setTimeout(onComplete, duration);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, animation, duration, onComplete]);

  const halfDuration = duration / 2;

  const getPhase1Style = (): React.CSSProperties => {
    if (phase !== "phase1" && phase !== "phase2") return {};
    const base: React.CSSProperties = {
      transition: `opacity ${halfDuration}ms ease, transform ${halfDuration}ms ease`,
    };
    switch (animation) {
      case "slide-left":
        return { ...base, opacity: 0, transform: "translateX(-100%)" };
      case "slide-right":
        return { ...base, opacity: 0, transform: "translateX(100%)" };
      case "fade":
        return { ...base, opacity: 0 };
      case "collapse":
        return {};
      default:
        return {};
    }
  };

  const getPhase2Style = (): React.CSSProperties => {
    if (phase !== "phase2") return {};
    return {
      maxHeight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: 0,
      marginBottom: 0,
      overflow: "hidden",
      transition: `max-height ${halfDuration}ms ease, padding ${halfDuration}ms ease, margin ${halfDuration}ms ease`,
    };
  };

  return (
    <div
      ref={ref}
      style={{
        ...(measuredHeight !== null && phase !== "idle"
          ? { maxHeight: phase === "phase2" ? 0 : measuredHeight }
          : {}),
        ...getPhase1Style(),
        ...getPhase2Style(),
      }}
    >
      {children}
    </div>
  );
}
