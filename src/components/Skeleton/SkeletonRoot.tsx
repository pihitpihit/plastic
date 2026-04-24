import type { CSSProperties } from "react";
import type { SkeletonAnimation, SkeletonRootProps } from "./Skeleton.types";
import { resolveDimensions } from "./Skeleton.utils";
import { applyPaletteVars } from "./theme";
import { ensureSkeletonStyles } from "./styles";
import { useReducedMotion } from "./useReducedMotion";

interface InternalRootProps extends SkeletonRootProps {
  _suppressAria?: boolean | undefined;
}

function animationClass(a: SkeletonAnimation): string {
  if (a === "shimmer") return "sk-root--shimmer";
  if (a === "pulse") return "sk-root--pulse";
  return "sk-root--none";
}

export function SkeletonRoot(props: InternalRootProps) {
  ensureSkeletonStyles();
  const reduced = useReducedMotion();

  const {
    shape = "rect",
    animation: animationProp,
    theme = "light",
    className,
    style,
    _suppressAria,
    "aria-label": ariaLabel,
    children,
    visible,
    fadeMs,
    width: _w,
    height: _h,
    size: _s,
    borderRadius: _br,
    ...rest
  } = props;
  void _w;
  void _h;
  void _s;
  void _br;

  const dims = resolveDimensions(props);
  const effectiveAnimation: SkeletonAnimation = reduced
    ? false
    : animationProp ?? "shimmer";

  const classes = [
    "sk-root",
    `sk-root--${theme}`,
    animationClass(effectiveAnimation),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const paletteVars = applyPaletteVars(theme);
  const mergedStyle: CSSProperties = {
    ...paletteVars,
    width: dims.width,
    height: dims.height,
    borderRadius: dims.borderRadius,
    ...style,
  };

  const ariaProps: Record<string, string | undefined> = _suppressAria
    ? {}
    : {
        role: "status",
        "aria-busy": "true",
        "aria-label": ariaLabel ?? "Loading",
      };

  void visible;
  void fadeMs;
  void children;

  return (
    <div
      {...rest}
      {...ariaProps}
      data-shape={shape}
      className={classes}
      style={mergedStyle}
    >
      <span className="sk-shimmer" aria-hidden="true" />
    </div>
  );
}

SkeletonRoot.displayName = "Skeleton.Root";
