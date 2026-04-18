import { type CSSProperties, useEffect, useRef } from "react";
import type { CommandPaletteListProps } from "./CommandPalette.types";
import { useCommandPalette } from "./CommandPaletteRoot";

const STAGGER_KEYFRAMES_ID = "plastic-commandpalette-stagger";

function ensureStaggerKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STAGGER_KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = STAGGER_KEYFRAMES_ID;
  style.textContent =
    "@keyframes plastic-cp-stagger { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }";
  document.head.appendChild(style);
}

export function CommandPaletteList({
  children,
  className,
  style,
  ...rest
}: CommandPaletteListProps) {
  const ctx = useCommandPalette();
  const listRef = useRef<HTMLDivElement | null>(null);

  ensureStaggerKeyframes();

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (ctx.activeIndex < 0) return;
    const active = list.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    const raf = requestAnimationFrame(() => {
      active.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(raf);
  }, [ctx.activeIndex, ctx.results]);

  const baseStyle: CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
    minHeight: 0,
    ...style,
  };

  const dataMode = ctx.query.trim() === "" ? "browse" : "search";

  return (
    <div
      ref={listRef}
      id={ctx.listId}
      role="listbox"
      aria-label="Commands"
      data-mode={dataMode}
      className={className}
      style={baseStyle}
      {...rest}
    >
      {children}
    </div>
  );
}
