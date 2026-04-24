import { useEffect, useRef, useState } from "react";

export type AnimationState = "idle" | "mounting" | "entering" | "exiting";

export interface UseAnimationStateOptions {
  open: boolean;
  exitDuration?: number | undefined;
}

export interface UseAnimationStateReturn {
  animationState: AnimationState;
  isVisible: boolean;
  onTransitionEnd: (propertyName: string) => void;
}

export function useAnimationState(
  options: UseAnimationStateOptions,
): UseAnimationStateReturn {
  const { open, exitDuration } = options;
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationStateRef = useRef<AnimationState>(animationState);
  animationStateRef.current = animationState;

  useEffect(() => {
    const currentState = animationStateRef.current;
    if (open) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (currentState === "idle" || currentState === "exiting") {
        setAnimationState("mounting");
        const raf1 = requestAnimationFrame(() => {
          const raf2 = requestAnimationFrame(() => {
            setAnimationState("entering");
          });
          rafRef.current = raf2;
        });
        rafRef.current = raf1;
      }
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (currentState === "mounting" || currentState === "entering") {
        setAnimationState("exiting");
        if (exitDuration !== undefined) {
          timerRef.current = setTimeout(() => {
            setAnimationState("idle");
            timerRef.current = null;
          }, exitDuration);
        }
      }
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, exitDuration]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const onTransitionEnd = (propertyName: string) => {
    if (propertyName === "opacity" && animationState === "exiting") {
      setAnimationState("idle");
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const isVisible = open || animationState !== "idle";

  return { animationState, isVisible, onTransitionEnd };
}
