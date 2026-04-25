import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  Children,
  isValidElement,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useComboboxContext } from "./ComboboxContext";
import { comboboxPalette } from "./colors";
import { ComboboxItem } from "./ComboboxItem";
import { ComboboxEmpty } from "./ComboboxEmpty";
import { ComboboxLoading } from "./ComboboxLoading";
import { ComboboxGroup } from "./ComboboxGroup";
import type { ComboboxContentProps, ComboboxOption } from "./Combobox.types";

function hasEmptyChild(children: ReactNode): boolean {
  let found = false;
  Children.forEach(children, (c) => {
    if (isValidElement(c) && c.type === ComboboxEmpty) found = true;
  });
  return found;
}

function hasLoadingChild(children: ReactNode): boolean {
  let found = false;
  Children.forEach(children, (c) => {
    if (isValidElement(c) && c.type === ComboboxLoading) found = true;
  });
  return found;
}

function hasItemOrGroupChild(children: ReactNode): boolean {
  let found = false;
  Children.forEach(children, (c) => {
    if (isValidElement(c) && (c.type === ComboboxItem || c.type === ComboboxGroup)) {
      found = true;
    }
  });
  return found;
}

function groupByGroup(options: ComboboxOption[]): Array<{
  heading: string | null;
  items: ComboboxOption[];
}> {
  const groups: Array<{ heading: string | null; items: ComboboxOption[] }> = [];
  const indexByHeading = new Map<string | null, number>();
  for (const o of options) {
    const key = o.group ?? null;
    const idx = indexByHeading.get(key);
    if (idx === undefined) {
      indexByHeading.set(key, groups.length);
      groups.push({ heading: key, items: [o] });
    } else {
      const g = groups[idx];
      if (g) g.items.push(o);
    }
  }
  return groups;
}

export function ComboboxContent(props: ComboboxContentProps) {
  const {
    maxHeight,
    offset = 4,
    placement: placementProp = "bottom-start",
    className,
    style,
    children,
    ...rest
  } = props;

  const ctx = useComboboxContext();
  const {
    open,
    theme,
    anchorRef,
    listRef,
    listId,
    results,
    isLoading,
    multiple,
  } = ctx;
  const p = comboboxPalette[theme];

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "bottom-start" | "top-start";
  }>({ top: 0, left: 0, width: 0, placement: "bottom-start" });

  const computePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const listEl = listRef.current;
    const listH = listEl ? listEl.offsetHeight : 160;

    let place: "bottom-start" | "top-start" = "bottom-start";
    if (placementProp === "top-start") place = "top-start";
    else if (placementProp === "auto") {
      place =
        spaceBelow < Math.min(listH + offset, 160) && spaceAbove > spaceBelow
          ? "top-start"
          : "bottom-start";
    } else {
      if (spaceBelow < listH + offset && spaceAbove > spaceBelow) {
        place = "top-start";
      }
    }

    const top =
      place === "bottom-start" ? rect.bottom + offset : rect.top - listH - offset;
    setCoords({ top, left: rect.left, width: rect.width, placement: place });
  }, [anchorRef, listRef, offset, placementProp]);

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const onScroll = () => computePosition();
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    const ro = new ResizeObserver(() => computePosition());
    ro.observe(anchor);
    const listEl = listRef.current;
    if (listEl) ro.observe(listEl);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      ro.disconnect();
    };
  }, [open, computePosition, anchorRef, listRef]);

  const listRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      (listRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [listRef],
  );

  if (!open) return null;

  const renderFallback = () => {
    const groups = groupByGroup(results);
    const nodes: ReactNode[] = [];
    for (const g of groups) {
      if (g.heading !== null) {
        nodes.push(
          <ComboboxGroup key={`g-${g.heading}`} heading={g.heading}>
            {g.items.map((o) => (
              <ComboboxItem
                key={o.value}
                value={o.value}
                label={o.label}
                disabled={o.disabled ?? false}
              />
            ))}
          </ComboboxGroup>,
        );
      } else {
        for (const o of g.items) {
          nodes.push(
            <ComboboxItem
              key={o.value}
              value={o.value}
              label={o.label}
              disabled={o.disabled ?? false}
            />,
          );
        }
      }
    }
    return nodes;
  };

  const userHasItemOrGroup = hasItemOrGroupChild(children);
  const userHasEmpty = hasEmptyChild(children);
  const userHasLoading = hasLoadingChild(children);
  const showEmpty = !isLoading && results.length === 0;
  const showLoading = isLoading;

  const maxH =
    maxHeight === undefined
      ? "min(320px, 40vh)"
      : typeof maxHeight === "number"
        ? `${maxHeight}px`
        : maxHeight;

  const containerStyle: CSSProperties = {
    position: "fixed",
    top: coords.top,
    left: coords.left,
    width: coords.width,
    maxHeight: maxH,
    overflowY: "auto",
    background: p.contentBg,
    border: `1px solid ${p.contentBorder}`,
    borderRadius: 6,
    boxShadow: p.contentShadow,
    padding: 4,
    zIndex: 9999,
    boxSizing: "border-box",
    ...style,
  };

  return (
    <div
      ref={listRefCallback}
      id={listId}
      role="listbox"
      tabIndex={-1}
      aria-multiselectable={multiple || undefined}
      data-state={open ? "open" : "closed"}
      data-placement={coords.placement}
      className={className}
      style={containerStyle}
      {...rest}
    >
      {showLoading && !userHasLoading && (
        <ComboboxLoading>Loading...</ComboboxLoading>
      )}
      {showLoading && userHasLoading && children}
      {!showLoading && showEmpty && !userHasEmpty && (
        <ComboboxEmpty>No results</ComboboxEmpty>
      )}
      {!showLoading && showEmpty && userHasEmpty && children}
      {!showLoading && !showEmpty && (userHasItemOrGroup ? children : renderFallback())}
      {!showLoading && !showEmpty && !userHasItemOrGroup && userHasEmpty && null}
    </div>
  );
}

ComboboxContent.displayName = "Combobox.Content";
