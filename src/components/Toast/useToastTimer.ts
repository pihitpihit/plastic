import { useEffect, useRef, useState } from "react";

export interface UseToastTimerOptions {
  duration: number;
  isPaused: boolean;
  onExpire: () => void;
}

export interface UseToastTimerReturn {
  elapsed: number;
  progress: number;
}

/**
 * rAF 기반 고정밀 타이머. duration만큼 elapsed를 누적하고, 만료 시 onExpire 호출.
 * duration: Infinity면 비활성. isPaused 중에는 elapsed가 고정되고 재개 시 이어짐.
 */
export function useToastTimer(options: UseToastTimerOptions): UseToastTimerReturn {
  const { duration, isPaused } = options;
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const onExpireRef = useRef(options.onExpire);
  const expiredRef = useRef(false);

  // onExpire ref 동기화
  useEffect(() => {
    onExpireRef.current = options.onExpire;
  }, [options.onExpire]);

  useEffect(() => {
    if (duration === Infinity) return;
    if (isPaused) return;
    if (expiredRef.current) return;

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setElapsed((prev) => {
        const next = prev + delta;
        if (next >= duration) {
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpireRef.current();
          }
          return duration;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [duration, isPaused]);

  const progress =
    duration === Infinity ? 0 : Math.min(elapsed / duration, 1);

  return { elapsed, progress };
}
