import { type CSSProperties, useEffect, useRef } from "react";
import type { CommandPaletteListProps } from "./CommandPalette.types";
import { useCommandPalette } from "./CommandPaletteRoot";

export function CommandPaletteList({
  children,
  className,
  style,
  ...rest
}: CommandPaletteListProps) {
  const ctx = useCommandPalette();
  const listRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div
      ref={listRef}
      id={ctx.listId}
      role="listbox"
      aria-label="Commands"
      className={className}
      style={baseStyle}
      {...rest}
    >
      {children}
    </div>
  );
}
