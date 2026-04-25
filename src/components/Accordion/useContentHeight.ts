import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useContentHeight(
  ref: RefObject<HTMLDivElement | null>,
): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setHeight(el.scrollHeight);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const mo = new MutationObserver(measure);
    mo.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [ref]);

  return height;
}
