import { useEffect, useRef } from "react";

let lockCount = 0;
let originalStyles: {
  overflow: string;
  paddingRight: string;
} | null = null;

function getScrollbarWidth(): number {
  return window.innerWidth - document.documentElement.clientWidth;
}

function lock() {
  lockCount++;
  if (lockCount === 1) {
    originalStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };

    const scrollbarWidth = getScrollbarWidth();
    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && originalStyles) {
    document.body.style.overflow = originalStyles.overflow;
    document.body.style.paddingRight = originalStyles.paddingRight;
    originalStyles = null;
  }
}

export function useScrollLock(enabled: boolean) {
  const wasEnabledRef = useRef(false);

  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      lock();
      wasEnabledRef.current = true;
    }

    return () => {
      if (wasEnabledRef.current) {
        unlock();
        wasEnabledRef.current = false;
      }
    };
  }, [enabled]);
}
