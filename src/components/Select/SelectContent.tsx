import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Portal } from "../_shared/Portal";
import { useAnimationState } from "../_shared/useAnimationState";
import { useSelectContext } from "./SelectContext";
import { selectPalette } from "./colors";
import type { Side } from "../_shared/useFloating";
import type { SelectContentProps } from "./Select.types";

const ENTER_DURATION = 150;
const EXIT_DURATION = 100;

function getSlideTransform(side: Side, entering: boolean): string {
  const d = entering ? 0 : 4;
  switch (side) {
    case "top":
      return `translateY(${d}px)`;
    case "bottom":
      return `translateY(-${d}px)`;
    case "left":
      return `translateX(${d}px)`;
    case "right":
      return `translateX(-${d}px)`;
  }
}

export function SelectContent(props: SelectContentProps) {
  const {
    side = "bottom",
    align = "start",
    sideOffset = 4,
    maxHeight = 320,
    matchTriggerWidth = true,
    minWidth,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    className,
    style,
    children,
  } = props;

  const ctx = useSelectContext();
  const {
    open,
    close,
    theme,
    triggerRef,
    floatingRef,
    floatingStyles,
    isPositioned,
    listboxId,
    triggerId,
    placement,
    setFloatingOptions,
  } = ctx;

  const p = selectPalette[theme];

  const { animationState, isVisible, onTransitionEnd } = useAnimationState({
    open,
    exitDuration: EXIT_DURATION + 50,
  });

  useEffect(() => {
    setFloatingOptions({ side, align, sideOffset, matchTriggerWidth });
  }, [side, align, sideOffset, matchTriggerWidth, setFloatingOptions]);

  const [triggerWidth, setTriggerWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const trig = triggerRef.current;
    if (!trig) return;
    const measure = () => {
      setTriggerWidth(trig.getBoundingClientRect().width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(trig);
    return () => ro.disconnect();
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open || !closeOnOutsideClick) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      if (floatingRef.current && floatingRef.current.contains(target)) return;
      close("outside");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closeOnOutsideClick, close, triggerRef, floatingRef]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close("escape");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEscape, close]);

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      (floatingRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    [floatingRef],
  );

  const isEntering = animationState === "entering";
  const side0: Side = (placement.split("-")[0] as Side) ?? "bottom";
  const slide = getSlideTransform(side0, isEntering);
  const baseTransform = floatingStyles.transform ?? "translate(0px, 0px)";
  const combinedTransform = `${baseTransform} ${slide}`;
  const duration = isEntering ? ENTER_DURATION : EXIT_DURATION;
  const easing = isEntering ? "cubic-bezier(0.16, 1, 0.3, 1)" : "ease";
  const opacity = isEntering ? 1 : 0;

  const widthStyle: CSSProperties =
    matchTriggerWidth && triggerWidth != null
      ? { minWidth: triggerWidth, width: triggerWidth }
      : minWidth !== undefined
        ? { minWidth }
        : {};

  const visibleStyle: CSSProperties = {
    ...floatingStyles,
    transform: combinedTransform,
    opacity: isPositioned ? opacity : 0,
    transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
    ...widthStyle,
  };

  const hiddenStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    opacity: 0,
    pointerEvents: "none",
    visibility: "hidden",
  };

  const containerStyle: CSSProperties = {
    ...(isVisible ? visibleStyle : hiddenStyle),
    zIndex: 9998,
    background: p.contentBg,
    border: `1px solid ${p.contentBorder}`,
    borderRadius: 6,
    boxShadow: p.contentShadow,
    padding: 4,
    maxHeight,
    overflowY: "auto",
    overscrollBehavior: "contain",
    boxSizing: "border-box",
    ...style,
  };

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    onTransitionEnd(e.propertyName);
  };

  const listbox = (
    <div
      ref={mergedRef}
      role="listbox"
      id={listboxId}
      aria-labelledby={triggerId}
      aria-hidden={isVisible ? undefined : true}
      data-state={open ? "open" : "closed"}
      className={className}
      style={containerStyle}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </div>
  );

  if (isVisible) {
    return <Portal>{listbox}</Portal>;
  }
  return listbox;
}

SelectContent.displayName = "Select.Content";
